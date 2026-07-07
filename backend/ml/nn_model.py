"""
SignBridge ML — Neural Network Models & Trainer
================================================
Full deep learning pipeline with proper gradient descent.

Models
------
SignMLP         : 4-layer MLP for pooled frame features (372-dim input)
SignTransformer : Transformer encoder for raw frame sequences (seq, 186)

Trainer
-------
Handles the full training loop:
  - Adam optimizer with weight decay
  - CrossEntropyLoss with label smoothing
  - Cosine annealing LR schedule with linear warmup
  - Gradient clipping
  - Early stopping (saves best checkpoint)
  - Per-epoch history: train_loss, val_loss, train_acc, val_acc

Usage
-----
    from backend.ml.nn_model import SignMLP, SignTransformer, Trainer

    model   = SignMLP(input_dim=372, num_classes=300)
    trainer = Trainer(model, num_classes=300, device='cuda')
    history = trainer.fit(X_train, y_train, X_val, y_val, epochs=100)
    trainer.load_best()   # restore best checkpoint before inference
"""

from __future__ import annotations

import math
import copy
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
from torch.optim.lr_scheduler import LambdaLR


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_loader(X: np.ndarray, y: np.ndarray, batch_size: int, shuffle: bool) -> DataLoader:
    ds = TensorDataset(
        torch.from_numpy(X).float(),
        torch.from_numpy(y).long(),
    )
    # drop_last=True when training: BatchNorm1d crashes on single-sample batches
    drop_last = shuffle and len(ds) % batch_size == 1
    return DataLoader(ds, batch_size=batch_size, shuffle=shuffle,
                      drop_last=drop_last, pin_memory=True, num_workers=0)


def _accuracy(logits: torch.Tensor, labels: torch.Tensor) -> float:
    return logits.argmax(dim=1).eq(labels).float().mean().item()


def _top_k_accuracy(logits: torch.Tensor, labels: torch.Tensor, k: int = 3) -> float:
    top_k = logits.topk(min(k, logits.size(1)), dim=1).indices
    match = top_k.eq(labels.unsqueeze(1)).any(dim=1)
    return match.float().mean().item()


def _augment(x: torch.Tensor) -> torch.Tensor:
    """
    Feature-space augmentation for landmark vectors (training only).

    Three independent perturbations applied per sample:
    1. Gaussian jitter  — simulates MediaPipe landmark detection noise
    2. Random scale     — simulates variation in camera distance / signer size
    3. Landmark dropout — simulates partial occlusion (hand off-screen, etc.)
    """
    # 1. Jitter: independent noise per feature
    x = x + torch.randn_like(x) * 0.02

    # 2. Scale: one scalar per sample, uniform in [0.85, 1.15]
    # Shape: (batch, 1, ...) — works for both 2D and 3D inputs
    scale_shape = (x.size(0),) + (1,) * (x.dim() - 1)
    scale = 0.85 + torch.rand(scale_shape, device=x.device) * 0.30
    x = x * scale

    # 3. Landmark dropout: zero out ~8% of features independently
    keep = (torch.rand_like(x) > 0.08).float()
    x = x * keep

    return x


# ── Model 1: SignMLP ──────────────────────────────────────────────────────────

class SignMLP(nn.Module):
    """
    4-layer MLP for pooled landmark features.

    Input:  (batch, input_dim)   — default 462 (mean + std of 231 per frame)
    Output: (batch, num_classes) — raw logits (no softmax; use CrossEntropyLoss)

    Architecture
    ------------
    Each block: Linear → BatchNorm1d → GELU → Dropout

    BatchNorm normalises each feature across the batch — makes training stable
    and allows higher learning rates.

    GELU (Gaussian Error Linear Unit) outperforms ReLU on classification tasks
    because it has a smooth gradient near zero rather than a hard cutoff.

    Dropout randomly zeroes p% of activations during training — the network
    cannot rely on any single neuron, forcing robust feature learning.
    The dropout rate decreases with depth (0.4 → 0.3 → 0.2 → 0.1) since
    the later, smaller layers benefit less from heavy regularisation.

    Residual skip connection from layer 1 → layer 3 (after projecting to same
    width) helps gradient flow in deep networks — inspired by ResNet.
    """

    def __init__(
        self,
        input_dim:   int = 462,
        num_classes: int = 300,
        hidden_dims: tuple[int, ...] = (256, 256, 128, 64),
        dropouts:    tuple[float, ...] = (0.5, 0.4, 0.3, 0.2),
    ):
        super().__init__()

        def _block(in_d, out_d, drop):
            return nn.Sequential(
                nn.Linear(in_d, out_d, bias=False),  # bias=False: BN has its own bias
                nn.BatchNorm1d(out_d),
                nn.GELU(),
                nn.Dropout(drop),
            )

        dims  = [input_dim] + list(hidden_dims)
        drops = list(dropouts)

        self.blocks = nn.ModuleList([
            _block(dims[i], dims[i + 1], drops[i])
            for i in range(len(hidden_dims))
        ])

        # Skip connection: project input_dim → hidden_dims[2] for residual
        self.skip_proj = nn.Linear(hidden_dims[0], hidden_dims[2], bias=False)

        self.head = nn.Linear(hidden_dims[-1], num_classes)
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, nonlinearity='relu')
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Block 0 and 1
        x0 = self.blocks[0](x)
        x1 = self.blocks[1](x0)
        # Block 2 with residual from block 0 output
        x2 = self.blocks[2](x1) + self.skip_proj(x0)
        # Block 3
        x3 = self.blocks[3](x2)
        return self.head(x3)


# ── Model 2: SignTransformer ──────────────────────────────────────────────────

class _PositionalEncoding(nn.Module):
    """
    Sinusoidal positional encoding (Vaswani et al. 2017).

    Adds a unique wave pattern to each sequence position so the Transformer
    can distinguish frame order — unlike RNNs, Transformers have no built-in
    notion of sequence position.

    PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    """

    def __init__(self, d_model: int, max_len: int = 512, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div[:d_model // 2])
        self.register_buffer('pe', pe.unsqueeze(0))  # (1, max_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq, d_model)
        return self.dropout(x + self.pe[:, :x.size(1)])


class SignTransformer(nn.Module):
    """
    Transformer encoder for raw frame sequences.

    Input:  (batch, seq_len, input_dim=186)  — one feature vector per frame
    Output: (batch, num_classes)             — raw logits

    Architecture
    ------------
    1. Linear projection: 186 → d_model (expand to richer representation)
    2. Positional encoding: tells the model which frame is which
    3. N × TransformerEncoderLayer:
         each layer = MultiHeadAttention + FeedForward + LayerNorm + Dropout
    4. Global average pool across all sequence positions
    5. Classification head

    Self-attention mechanism
    ------------------------
    Each frame attends to ALL other frames simultaneously.
    Attention weight = softmax(QK^T / sqrt(d_k)) × V
    This lets the model learn "what matters for classification is the
    relationship between the hand at frame 5 and the hand at frame 20"
    — something an LSTM struggles with across long sequences.

    Multi-head attention splits d_model into n_heads independent attention
    mechanisms, each learning different relational patterns.
    """

    def __init__(
        self,
        input_dim:   int   = 186,
        num_classes: int   = 300,
        d_model:     int   = 256,
        n_heads:     int   = 8,
        n_layers:    int   = 4,
        d_ff:        int   = 512,
        dropout:     float = 0.1,
        max_seq_len: int   = 64,
    ):
        super().__init__()

        self.proj = nn.Linear(input_dim, d_model)
        self.pos_enc = _PositionalEncoding(d_model, max_len=max_seq_len, dropout=dropout)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_ff,
            dropout=dropout,
            activation='gelu',
            batch_first=True,      # (batch, seq, feature) — not the old (seq, batch, feature)
            norm_first=True,       # Pre-LN: more stable gradients than Post-LN
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        self.norm = nn.LayerNorm(d_model)
        self.head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, num_classes),
        )

    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        # x: (batch, seq, input_dim)
        x = self.proj(x)           # (batch, seq, d_model)
        x = self.pos_enc(x)        # add positional info
        x = self.encoder(x, src_key_padding_mask=mask)  # self-attention × n_layers
        x = self.norm(x)
        x = x.mean(dim=1)          # global average pool: (batch, d_model)
        return self.head(x)        # (batch, num_classes)


# ── Warmup + Cosine LR schedule ────────────────────────────────────────────────

def _warmup_cosine_schedule(optimizer, warmup_steps: int, total_steps: int):
    """
    Linear warmup for warmup_steps, then cosine decay to 0.

    Why warmup?
    -----------
    At the start of training, weights are random and gradients are noisy.
    A high learning rate here causes the loss to diverge.
    Warmup gradually increases lr from 0 → base_lr over the first N steps,
    giving the model time to find a good starting direction.

    After warmup, cosine annealing slowly decreases lr following a cosine
    curve — it decays quickly at first (when improvement is fast) and slows
    near the end (for fine-tuning the final minimum).
    """
    def lr_lambda(step):
        if step < warmup_steps:
            return step / max(1, warmup_steps)
        progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)
        return max(0.0, 0.5 * (1.0 + math.cos(math.pi * progress)))

    return LambdaLR(optimizer, lr_lambda)


# ── Trainer ────────────────────────────────────────────────────────────────────

class Trainer:
    """
    Full gradient-descent training loop.

    Parameters
    ----------
    model       : SignMLP or SignTransformer
    num_classes : number of output classes
    device      : 'cuda', 'cpu', or 'mps'
    lr          : peak learning rate (Adam default 1e-3 is a good start)
    weight_decay: L2 regularisation — penalises large weights, prevents overfit
    label_smoothing: replaces hard 0/1 targets with (ε/(C-1)) and (1-ε)
                     prevents overconfident predictions, improves calibration
    patience    : early stopping — stop if val_loss doesn't improve for N epochs
    batch_size  : samples per gradient update (larger = more stable but less exploration)
    """

    def __init__(
        self,
        model:           nn.Module,
        device:          str   = 'cpu',
        lr:              float = 1e-3,
        weight_decay:    float = 1e-3,
        label_smoothing: float = 0.1,
        patience:        int   = 20,
        batch_size:      int   = 64,
        checkpoint_path: Optional[Path] = None,
    ):
        self.model      = model.to(device)
        self.device     = device
        self.patience   = patience
        self.batch_size = batch_size
        self.checkpoint_path = checkpoint_path or Path('best_model_checkpoint.pt')

        # Loss function
        # CrossEntropyLoss = NLL(log_softmax(logits), labels)
        # label_smoothing mixes in ε/(C-1) probability to wrong classes —
        # model can't be penalised for being "too correct", so it generalises better
        self.criterion = nn.CrossEntropyLoss(
            label_smoothing=label_smoothing,
        )

        # Adam: adaptive per-parameter learning rates
        # β1=0.9 (momentum), β2=0.999 (squared gradient momentum)
        # weight_decay implements decoupled L2 regularisation (AdamW style)
        self.optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=lr,
            weight_decay=weight_decay,
            betas=(0.9, 0.999),
            eps=1e-8,
        )

        # Scheduler is built in fit() once we know the total number of steps
        self.scheduler = None
        self._best_state = None
        self._best_val_loss = float('inf')
        self._no_improve = 0

    def _run_epoch(self, loader: DataLoader, train: bool):
        """One full pass over a DataLoader. Returns (avg_loss, accuracy, top3_acc)."""
        self.model.train(train)
        total_loss = total_acc = total_top3 = total_n = 0

        with torch.set_grad_enabled(train):
            for X_batch, y_batch in loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                if train:
                    X_batch = _augment(X_batch)

                # ── Forward pass ──────────────────────────────────────────────
                logits = self.model(X_batch)

                # ── Loss ──────────────────────────────────────────────────────
                # Gradient flows backward through loss → logits → weights
                loss = self.criterion(logits, y_batch)

                if train:
                    # ── Backward pass ─────────────────────────────────────────
                    self.optimizer.zero_grad()  # clear previous gradients
                    loss.backward()             # compute dL/dW for every weight

                    # Gradient clipping: cap gradient norm at 1.0
                    # Prevents "exploding gradients" — huge parameter updates
                    # that destabilise training (common in deep networks)
                    nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)

                    # ── Weight update ─────────────────────────────────────────
                    # W ← W - lr * (moment-adjusted gradient + weight_decay * W)
                    self.optimizer.step()

                    # ── LR schedule step ──────────────────────────────────────
                    if self.scheduler is not None:
                        self.scheduler.step()

                n = y_batch.size(0)
                total_loss += loss.item() * n
                total_acc  += _accuracy(logits.detach(), y_batch) * n
                total_top3 += _top_k_accuracy(logits.detach(), y_batch, k=3) * n
                total_n    += n

        return total_loss / total_n, total_acc / total_n, total_top3 / total_n

    def fit(
        self,
        X_train:     np.ndarray,
        y_train:     np.ndarray,
        X_val:       np.ndarray,
        y_val:       np.ndarray,
        epochs:      int  = 100,
        verbose:     bool = True,
    ) -> dict:
        """
        Full training loop.

        Returns history dict with per-epoch train/val loss and accuracy.
        Best weights (lowest val_loss) are saved and restored after training.
        """
        train_loader = _to_loader(X_train, y_train, self.batch_size, shuffle=True)
        val_loader   = _to_loader(X_val,   y_val,   self.batch_size, shuffle=False)

        # Build LR schedule now that we know total steps
        total_steps  = epochs * len(train_loader)
        warmup_steps = min(500, total_steps // 10)
        self.scheduler = _warmup_cosine_schedule(
            self.optimizer, warmup_steps, total_steps
        )

        history = {
            'train_loss': [], 'val_loss':  [],
            'train_acc':  [], 'val_acc':   [],
            'train_top3': [], 'val_top3':  [],
            'lr':         [],
        }

        if verbose:
            print(f"\n{'Epoch':>6}  {'Train Loss':>10}  {'Val Loss':>10}  "
                  f"{'Train Acc':>10}  {'Val Acc':>10}  {'Val Top3':>10}  {'LR':>10}")
            print("-" * 80)

        for epoch in range(1, epochs + 1):
            tr_loss, tr_acc, tr_top3 = self._run_epoch(train_loader, train=True)
            vl_loss, vl_acc, vl_top3 = self._run_epoch(val_loader,   train=False)
            current_lr = self.optimizer.param_groups[0]['lr']

            history['train_loss'].append(tr_loss)
            history['val_loss'].append(vl_loss)
            history['train_acc'].append(tr_acc)
            history['val_acc'].append(vl_acc)
            history['train_top3'].append(tr_top3)
            history['val_top3'].append(vl_top3)
            history['lr'].append(current_lr)

            # ── Early stopping + best checkpoint ──────────────────────────────
            if vl_loss < self._best_val_loss - 1e-5:
                self._best_val_loss = vl_loss
                self._best_state    = copy.deepcopy(self.model.state_dict())
                self._no_improve    = 0
                flag = " *"
            else:
                self._no_improve += 1
                flag = ""

            if verbose and (epoch % 5 == 0 or epoch == 1 or flag):
                print(f"{epoch:>6}  {tr_loss:>10.4f}  {vl_loss:>10.4f}  "
                      f"{tr_acc:>10.4f}  {vl_acc:>10.4f}  {vl_top3:>10.4f}  "
                      f"{current_lr:>10.2e}{flag}")

            if self._no_improve >= self.patience:
                if verbose:
                    print(f"\n  Early stopping at epoch {epoch} "
                          f"(no improvement for {self.patience} epochs)")
                break

        # Restore best weights
        if self._best_state is not None:
            self.model.load_state_dict(self._best_state)
            torch.save(self._best_state, self.checkpoint_path)
            if verbose:
                print(f"  Best checkpoint saved -> {self.checkpoint_path}")

        return history

    def load_best(self):
        """Restore best checkpoint weights (e.g. before inference)."""
        if self.checkpoint_path.exists():
            self.model.load_state_dict(
                torch.load(self.checkpoint_path, map_location=self.device)
            )

    @torch.no_grad()
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return class index predictions for X."""
        self.model.eval()
        loader = _to_loader(X, np.zeros(len(X), dtype=np.int32),
                            self.batch_size, shuffle=False)
        preds = []
        for X_batch, _ in loader:
            logits = self.model(X_batch.to(self.device))
            preds.append(logits.argmax(dim=1).cpu().numpy())
        return np.concatenate(preds)

    @torch.no_grad()
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return class probability matrix (N, C) for X."""
        self.model.eval()
        loader = _to_loader(X, np.zeros(len(X), dtype=np.int32),
                            self.batch_size, shuffle=False)
        probs = []
        for X_batch, _ in loader:
            logits = self.model(X_batch.to(self.device))
            probs.append(F.softmax(logits, dim=1).cpu().numpy())
        return np.concatenate(probs)


# ── Model 3: SignBiLSTM ───────────────────────────────────────────────────────

class SignBiLSTM(nn.Module):
    """
    Bidirectional LSTM for raw frame sequences.

    Input:  (batch, seq_len, input_dim)  — one 231-dim vector per frame
    Output: (batch, num_classes)

    Architecture
    ------------
    2-layer BiLSTM: each layer runs forward AND backward over the sequence.
    Final hidden states from both directions are concatenated, then passed
    through a 2-layer MLP classification head.

    Why BiLSTM over standard LSTM?
    A forward LSTM at frame T has seen frames 0..T.
    A backward LSTM at frame T has seen frames T..end.
    Concatenating both gives full context at every frame — especially useful
    because the shape of a sign at the END (return to neutral) is often as
    discriminative as the beginning.
    """

    def __init__(
        self,
        input_dim:   int   = 231,
        num_classes: int   = 300,
        hidden_dim:  int   = 256,
        num_layers:  int   = 2,
        dropout:     float = 0.4,
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        # BiLSTM output dim = hidden_dim * 2 (forward + backward)
        lstm_out_dim = hidden_dim * 2
        self.head = nn.Sequential(
            nn.LayerNorm(lstm_out_dim),
            nn.Linear(lstm_out_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq, input_dim)
        out, (h_n, _) = self.lstm(x)
        # h_n: (num_layers * 2, batch, hidden_dim) — take last layer, both directions
        fwd = h_n[-2]   # last forward layer
        bwd = h_n[-1]   # last backward layer
        pooled = torch.cat([fwd, bwd], dim=1)   # (batch, hidden_dim * 2)
        return self.head(pooled)


# ── Model 4: SignBERT (pre-trained DistilBERT backbone) ──────────────────────

class SignBERT(nn.Module):
    """
    Sign classifier using a pre-trained DistilBERT encoder backbone.

    Input:  (batch, seq_len, input_dim)  — one landmark vector per frame
    Output: (batch, num_classes)

    Transfer learning strategy
    --------------------------
    DistilBERT (Sanh et al. 2019) was pre-trained on 16GB of text with
    masked-language modelling — its multi-head self-attention layers learned
    powerful sequence-modelling capabilities.

    We re-use those attention layers for sign motion sequences:
      1. Linear projection: input_dim → 768 (BERT hidden size)
      2. DistilBERT encoder: 6 transformer layers, 12 heads  [pre-trained]
      3. Mean-pool across sequence positions
      4. Classification head (trained from scratch)

    Two-phase fine-tuning
    ---------------------
    Phase 1 (frozen backbone): only the projection + head are trained.
              Fast, avoids overwriting pre-trained weights before the head
              is stable.
    Phase 2 (full fine-tune):  all layers trained with a low LR (1e-5).
              Allows the attention patterns to adapt to landmark motion.
    """

    BERT_HIDDEN = 768

    def __init__(
        self,
        input_dim:   int   = 231,
        num_classes: int   = 300,
        dropout:     float = 0.3,
        freeze_bert: bool  = True,
    ):
        super().__init__()
        from transformers import DistilBertModel, DistilBertConfig

        # Project landmark vectors into BERT's embedding space
        self.proj = nn.Sequential(
            nn.Linear(input_dim, self.BERT_HIDDEN),
            nn.LayerNorm(self.BERT_HIDDEN),
        )

        # Pre-trained DistilBERT encoder (downloads ~66 MB once, cached)
        self.bert = DistilBertModel.from_pretrained('distilbert-base-uncased')

        if freeze_bert:
            for p in self.bert.parameters():
                p.requires_grad = False

        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(self.BERT_HIDDEN, self.BERT_HIDDEN // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(self.BERT_HIDDEN // 2, num_classes),
        )

    def unfreeze_bert(self):
        """Call after warm-up epochs to fine-tune the BERT backbone too."""
        for p in self.bert.parameters():
            p.requires_grad = True

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq, input_dim)
        x = self.proj(x)                          # (batch, seq, 768)
        out = self.bert(inputs_embeds=x)          # DistilBERT forward
        hidden = out.last_hidden_state            # (batch, seq, 768)
        pooled = hidden.mean(dim=1)               # (batch, 768) — mean pool
        return self.head(pooled)


# ── Convenience factory ────────────────────────────────────────────────────────

def make_mlp_trainer(
    input_dim:   int,
    num_classes: int,
    device:      str   = 'cpu',
    lr:          float = 1e-3,
    checkpoint_path: Optional[Path] = None,
) -> tuple[SignMLP, Trainer]:
    model   = SignMLP(input_dim=input_dim, num_classes=num_classes,
                      hidden_dims=(256, 256, 128, 64),
                      dropouts=(0.5, 0.4, 0.3, 0.2))
    trainer = Trainer(model, device=device,
                      lr=lr, weight_decay=1e-3, checkpoint_path=checkpoint_path)
    return model, trainer


def make_transformer_trainer(
    input_dim:   int,
    num_classes: int,
    device:      str   = 'cpu',
    lr:          float = 5e-4,
    checkpoint_path: Optional[Path] = None,
) -> tuple[SignTransformer, Trainer]:
    model   = SignTransformer(input_dim=input_dim, num_classes=num_classes)
    trainer = Trainer(model, device=device,
                      lr=lr, checkpoint_path=checkpoint_path)
    return model, trainer


def make_lstm_trainer(
    input_dim:   int,
    num_classes: int,
    device:      str   = 'cpu',
    lr:          float = 5e-4,
    checkpoint_path: Optional[Path] = None,
) -> tuple[SignBiLSTM, Trainer]:
    model   = SignBiLSTM(input_dim=input_dim, num_classes=num_classes)
    trainer = Trainer(model, device=device, lr=lr,
                      weight_decay=1e-3, checkpoint_path=checkpoint_path)
    return model, trainer


def make_bert_trainer(
    input_dim:   int,
    num_classes: int,
    device:      str   = 'cpu',
    lr:          float = 2e-4,
    checkpoint_path: Optional[Path] = None,
) -> tuple[SignBERT, Trainer]:
    # Phase 1: freeze BERT, train only projection + head
    model   = SignBERT(input_dim=input_dim, num_classes=num_classes, freeze_bert=True)
    trainer = Trainer(model, device=device, lr=lr,
                      weight_decay=1e-4, patience=15, checkpoint_path=checkpoint_path)
    return model, trainer
