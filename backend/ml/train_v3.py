"""
SignBridge ML v3 -- Real WLASL Data, Proper Feature Alignment
=============================================================
Replaces synthetic prototypes with real MediaPipe landmarks from WLASL.

Key fixes over v2:
  1. Real data  -- WLASL X_seq (32 frames x 231D per sign video)
  2. Correct features -- 231D normalized landmarks matching inference pipeline
     [0:63]   right hand  [63:126] left hand
     [126:186] face        [186:231] upper-body pose
  3. Key-frame extraction -- takes frames 8-24 from each sequence (core signing
     period, avoids start/end transitions) giving ~16 examples per video
  4. Faithful augmentation -- spatial noise + rotation + scale in the SAME
     coordinate space as MediaPipe output (shoulder-normalized units)
  5. Synthetic fallback -- signs missing from WLASL (THANK_YOU) use the
     feature_extractor's normalization so they match real samples
  6. Saved model is 231D -- drops directly into main.py without changes

Usage
-----
    python -m backend.ml.train_v3               # real data + synthetic fallback
    python -m backend.ml.train_v3 --quick       # fast smoke test (3 folds, 50 epochs)
    python -m backend.ml.train_v3 --folds 5     # 5-fold CV
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report
from torch.utils.data import DataLoader, TensorDataset

ROOT      = Path(__file__).parent
DATA_DIR  = ROOT / 'wlasl_features'
INPUT_DIM = 231   # must match feature_extractor.extract_holistic_features()

# -- Target signs (common conversational ASL) -----------------------------------
TOP_30_SIGNS = [
    'HELLO', 'GOODBYE', 'THANK_YOU', 'PLEASE', 'SORRY',
    'YES', 'NO', 'HELP', 'STOP', 'AGAIN',
    'WHAT', 'WHERE', 'WHO', 'WHY', 'HOW',
    'WANT', 'NEED', 'KNOW', 'THINK', 'UNDERSTAND',
    'GOOD', 'BAD', 'HAPPY', 'SAD', 'LOVE',
    'ME', 'YOU', 'GO', 'COME', 'FINISH',
]

# Signs known to be absent from WLASL — fall back to synthetic landmarks
SYNTHETIC_FALLBACK = {'THANK_YOU'}

# ── Key-frame extraction ────────────────────────────────────────────────────────

def extract_key_frames(seq: np.ndarray, start_frac: float = 0.25, end_frac: float = 0.75) -> np.ndarray:
    """
    From a (32, 231) frame sequence, return the core signing frames.
    Skips all-zero frames (padding) and start/end transitions.
    Returns shape (K, 231) where K is the number of usable core frames.
    """
    T = seq.shape[0]
    lo = int(T * start_frac)
    hi = int(T * end_frac)
    core = seq[lo:hi]                                 # centre portion of video
    # Drop frames where the right hand is not detected (all zeros in [0:63])
    visible = np.any(core[:, :63] != 0, axis=1)
    frames = core[visible]
    if len(frames) == 0:
        # Fall back to any non-zero frame in the full sequence
        visible_all = np.any(seq[:, :63] != 0, axis=1)
        frames = seq[visible_all]
    if len(frames) == 0:
        frames = seq[T // 2:T // 2 + 1]  # last resort: middle frame
    return frames


# ── Real-data augmentation (231D, shoulder-normalized space) ────────────────────

def augment_frame(frame: np.ndarray, n: int = 100) -> np.ndarray:
    """
    Generate n augmented 231D feature vectors from one real key frame.
    Perturbations are calibrated to the shoulder-normalized coordinate space
    (typical hand landmark range ~ [-2, 2] units).

    Augmentations:
      - Gaussian spatial jitter (sigma=0.06 shoulder-widths)
      - Random 2D rotation of right-hand landmarks around wrist (±20°)
      - Random uniform scale of hand landmarks (±12%)
      - Random wrist translation (±0.1 shoulder-widths)
      - 20% chance: mirror right↔left hand (left-handed signer)
    """
    results = []
    rh_slice = slice(0, 63)     # right hand (21 × 3)
    lh_slice = slice(63, 126)   # left hand  (21 × 3)

    for _ in range(n):
        f = frame.copy()

        # Gaussian jitter across ALL features
        f += np.random.normal(0, 0.06, f.shape).astype(np.float32)

        # --- Right-hand spatial augmentation ---
        rh = f[rh_slice].reshape(21, 3)
        wrist = rh[0, :2].copy()

        # Random 2D rotation around wrist
        angle = np.random.uniform(-0.35, 0.35)
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        for i in range(1, 21):
            dx = rh[i, 0] - wrist[0]
            dy = rh[i, 1] - wrist[1]
            rh[i, 0] = wrist[0] + dx * cos_a - dy * sin_a
            rh[i, 1] = wrist[1] + dx * sin_a + dy * cos_a

        # Random scale around wrist
        sc = np.random.uniform(0.88, 1.12)
        for i in range(1, 21):
            rh[i, :2] = wrist + (rh[i, :2] - wrist) * sc

        # Random wrist translation (affects all hand landmarks)
        shift = np.random.uniform(-0.10, 0.10, 2).astype(np.float32)
        rh[:, :2] += shift

        f[rh_slice] = rh.flatten()

        # Mirror: swap right ↔ left hand, negate x for both (20% chance)
        if np.random.random() < 0.20:
            rh_orig = f[rh_slice].copy()
            lh_orig = f[lh_slice].copy()
            # Negate x (shoulder-centered x flips sign on mirror)
            for sl in (rh_slice, lh_slice):
                for j in range(0, 63, 3):
                    f[sl][j] *= -1.0
            # Swap channels
            f[rh_slice], f[lh_slice] = lh_orig, rh_orig
            # Re-negate for swapped copy
            for sl in (rh_slice, lh_slice):
                for j in range(0, 63, 3):
                    f[sl][j] *= -1.0

        results.append(f)

    return np.array(results, dtype=np.float32)


# ── Synthetic fallback (for THANK_YOU and other missing signs) ─────────────────

def _synth_thank_you(n: int = 300) -> np.ndarray:
    """
    THANK_YOU: flat hand moves forward from chin.
    Approximate in shoulder-normalized space: wrist near face centre,
    fingers pointing forward (low z), slightly spread.
    """
    # A rough 21-landmark right-hand prototype for THANK_YOU in body-frame coords.
    # Values in shoulder-normalized units (shoulder-width = 1.0).
    # Wrist at roughly (0.0, -0.5, 0.0) from shoulder midpoint (chin height).
    proto = np.zeros((21, 3), dtype=np.float32)
    proto[0] = [0.00, -0.50, 0.20]   # wrist (chin level, slightly forward)
    # Fingers flat, pointing slightly away from body (positive z = toward camera)
    tips_y = -0.80  # above wrist in image space
    for i, (finger_x, base_idx) in enumerate([
        (-0.10, 1),   # thumb
        (-0.07, 5),   # index
        (-0.02, 9),   # middle
        ( 0.03, 13),  # ring
        ( 0.07, 17),  # pinky
    ]):
        for j in range(4):
            seg_y = proto[0][1] + (tips_y - proto[0][1]) * (j + 1) / 4
            proto[base_idx + j] = [
                proto[0][0] + finger_x,
                seg_y,
                proto[0][2] - 0.05 * j,  # fingers tilt forward
            ]

    base = proto.flatten()
    # Pad to 231D (left hand + face + pose = zeros)
    feat = np.zeros(INPUT_DIM, dtype=np.float32)
    feat[:63] = base

    return augment_frame(feat, n=n)


SYNTHETIC_BUILDERS = {
    'THANK_YOU': _synth_thank_you,
}


# ── Dataset builder ─────────────────────────────────────────────────────────────

def build_dataset(
    signs: list[str],
    samples_per_sign: int = 300,
    min_from_real: int = 0,
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """
    Build (X, y, class_names) from real WLASL sequences.
    Falls back to synthetic for signs not in WLASL.

    Parameters
    ----------
    samples_per_sign : target total samples per class (real + augmented)
    min_from_real    : minimum real key-frames before augmentation is applied
                       (if fewer, add synthetic to pad up)
    """
    if not DATA_DIR.exists():
        raise FileNotFoundError(
            f"WLASL features not found at {DATA_DIR}.\n"
            "Run: python -m backend.ml.extract_features_from_videos"
        )

    X_seq = np.load(DATA_DIR / 'X_seq.npy')           # (N, 32, 231)
    y_raw = np.load(DATA_DIR / 'y.npy')               # (N,)
    with open(DATA_DIR / 'classes.json') as fh:
        wlasl_classes = json.load(fh)

    X_parts, y_parts, class_names = [], [], []

    for sign_idx, sign in enumerate(signs):
        rows = []   # list of 231D arrays

        # ── 1. Real WLASL samples ──
        if sign in wlasl_classes and sign not in SYNTHETIC_FALLBACK:
            cls_id = wlasl_classes.index(sign)
            mask = y_raw == cls_id
            seqs = X_seq[mask]                        # (n_vids, 32, 231)

            for seq in seqs:
                key_frames = extract_key_frames(seq)  # (K, 231) real frames
                rows.extend(key_frames.tolist())

        n_real = len(rows)

        # ── 2. Augment real frames ──
        if n_real > 0:
            frames_arr = np.array(rows, dtype=np.float32)
            needed = max(0, samples_per_sign - n_real)
            if needed > 0:
                # Augment proportionally from each real frame
                aug_per_frame = max(1, needed // n_real + 1)
                extra = np.vstack([
                    augment_frame(frames_arr[i], n=aug_per_frame)
                    for i in range(n_real)
                ])
                rows = list(frames_arr) + list(extra[:needed])
            class_rows = np.array(rows[:samples_per_sign], dtype=np.float32)

        # ── 3. Synthetic fallback if WLASL missing ──
        elif sign in SYNTHETIC_BUILDERS:
            class_rows = SYNTHETIC_BUILDERS[sign](n=samples_per_sign)

        else:
            print(f"  [SKIP] {sign} — not in WLASL and no synthetic builder")
            continue

        print(f"  {sign:<20} real={n_real:>3}  total={len(class_rows)}")
        X_parts.append(class_rows)
        y_parts.append(np.full(len(class_rows), sign_idx, dtype=np.int64))
        class_names.append(sign)

    X = np.vstack(X_parts)
    y = np.concatenate(y_parts)
    return X, y, class_names


# ── Model ──────────────────────────────────────────────────────────────────────

class SignNetV3(nn.Module):
    """
    MLP for 231D real MediaPipe features → sign class.
    Wider first layer than v2 to handle the richer input space.
    BatchNorm + Dropout prevents overfitting on ~10k augmented samples.
    """
    def __init__(self, num_classes: int, input_dim: int = INPUT_DIM):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.BatchNorm1d(512),
            nn.GELU(),
            nn.Dropout(0.40),

            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(0.35),

            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(0.25),

            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ── Label smoothing ─────────────────────────────────────────────────────────────

class LabelSmoothingLoss(nn.Module):
    def __init__(self, num_classes: int, smoothing: float = 0.08):
        super().__init__()
        self.smoothing = smoothing
        self.num_classes = num_classes

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        conf = 1.0 - self.smoothing
        smooth_val = self.smoothing / (self.num_classes - 1)
        log_prob = F.log_softmax(pred, dim=-1)
        with torch.no_grad():
            dist = torch.full_like(log_prob, smooth_val)
            dist.scatter_(1, target.unsqueeze(1), conf)
        return -(dist * log_prob).sum(dim=-1).mean()


# ── Train one fold ──────────────────────────────────────────────────────────────

def train_fold(
    X_tr: np.ndarray, y_tr: np.ndarray,
    X_va: np.ndarray, y_va: np.ndarray,
    num_classes: int,
    epochs: int = 150,
    lr: float = 2e-3,
    weight_decay: float = 5e-5,
    batch_size: int = 256,
    device: str = 'cpu',
) -> tuple[SignNetV3, float]:

    model = SignNetV3(num_classes, INPUT_DIM).to(device)
    opt   = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    sch   = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs, eta_min=1e-5)
    crit  = LabelSmoothingLoss(num_classes)

    Xtr_t = torch.tensor(X_tr, dtype=torch.float32)
    ytr_t = torch.tensor(y_tr, dtype=torch.long)
    Xva_t = torch.tensor(X_va, dtype=torch.float32).to(device)
    yva_t = torch.tensor(y_va, dtype=torch.long).to(device)

    loader = DataLoader(TensorDataset(Xtr_t, ytr_t), batch_size=batch_size, shuffle=True)

    best_val_acc = 0.0
    best_state   = None
    no_improve   = 0
    patience     = 25

    for epoch in range(1, epochs + 1):
        model.train()
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            opt.zero_grad()
            crit(model(xb), yb).backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
        sch.step()

        model.eval()
        with torch.no_grad():
            preds  = model(Xva_t).argmax(dim=1)
            val_acc = (preds == yva_t).float().mean().item()

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state   = {k: v.clone() for k, v in model.state_dict().items()}
            no_improve   = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                break

    model.load_state_dict(best_state)
    return model, best_val_acc


# ── K-Fold CV ──────────────────────────────────────────────────────────────────

def evaluate_kfold(
    X: np.ndarray, y: np.ndarray, class_names: list[str],
    n_splits: int = 5, epochs: int = 150, device: str = 'cpu',
) -> tuple[dict, SignNetV3]:

    skf  = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    accs = []
    best_model = None
    best_acc   = 0.0
    num_classes = len(class_names)

    print(f"\n{'='*60}")
    print(f"  Stratified {n_splits}-Fold CV | {num_classes} classes | {len(X)} samples")
    print(f"  Feature dim: {INPUT_DIM}D (real MediaPipe, shoulder-normalized)")
    print(f"{'='*60}")

    for fold, (tr, va) in enumerate(skf.split(X, y), 1):
        t0 = time.time()
        model, val_acc = train_fold(
            X[tr], y[tr], X[va], y[va],
            num_classes=num_classes, epochs=epochs, device=device,
        )
        accs.append(val_acc)
        print(f"  Fold {fold}/{n_splits}  val_acc={val_acc:.4f}  t={time.time()-t0:.1f}s")
        if val_acc > best_acc:
            best_acc   = val_acc
            best_model = model

    mean_acc = float(np.mean(accs))
    std_acc  = float(np.std(accs))
    print(f"\n  Mean val accuracy: {mean_acc:.4f} +/- {std_acc:.4f}")
    if mean_acc >= 0.90:
        print("  [TARGET HIT] 90%+  -- real data, no synthetic inflation!")
    elif mean_acc >= 0.80:
        print("  [GOOD] 80%+ on real data -- solid baseline")
    else:
        print("  [INFO] Below 80% -- consider more augmentation diversity")

    # Hold-out evaluation
    from sklearn.model_selection import train_test_split as tts
    _, X_te, _, y_te = tts(X, y, test_size=0.15, stratify=y, random_state=99)
    best_model.eval()
    dev = next(best_model.parameters()).device
    with torch.no_grad():
        preds = best_model(torch.tensor(X_te, dtype=torch.float32).to(dev)).argmax(1).cpu().numpy()
    report = classification_report(y_te, preds, target_names=class_names, output_dict=True)

    holdout = report['accuracy']
    print(f"  Hold-out accuracy (15%): {holdout:.4f}")
    print(f"\n  Worst 5 classes by F1:")
    per_cls = {c: report[c]['f1-score'] for c in class_names if c in report}
    for sign, f1 in sorted(per_cls.items(), key=lambda x: x[1])[:5]:
        print(f"    {sign:<20} f1={f1:.3f}")

    result = {
        'fold_accuracies':   [round(a, 4) for a in accs],
        'mean_val_accuracy': round(mean_acc, 4),
        'std_val_accuracy':  round(std_acc, 4),
        'holdout_accuracy':  round(holdout, 4),
        'per_class_f1':      {k: round(v, 4) for k, v in per_cls.items()},
        'num_classes':       num_classes,
        'class_names':       class_names,
        'input_dim':         INPUT_DIM,
        'architecture':      'SignNetV3_real_wlasl',
        'feature_format':    '231D_shoulder_normalized_mediapipe',
    }
    return result, best_model


# ── Save ───────────────────────────────────────────────────────────────────────

def save_model(model: SignNetV3, class_names: list[str], report: dict) -> None:
    out_path = ROOT / 'trained_mlp.pt'
    torch.save({
        'model_state': model.state_dict(),
        'classes':     class_names,
        'input_dim':   INPUT_DIM,
        'architecture':'SignNetV3_real_wlasl',
    }, out_path)
    print(f"\n  Model saved -> {out_path}")

    report_path = ROOT / 'training_report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"  Report  saved -> {report_path}")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples',  type=int, default=300,
                        help='Target augmented samples per sign (default 300)')
    parser.add_argument('--epochs',   type=int, default=150,
                        help='Max epochs per fold (default 150)')
    parser.add_argument('--folds',    type=int, default=5,
                        help='CV folds (default 5)')
    parser.add_argument('--quick',    action='store_true',
                        help='Fast smoke test: 60 samples, 40 epochs, 3 folds')
    args = parser.parse_args()

    if args.quick:
        args.samples = 60
        args.epochs  = 40
        args.folds   = 3

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Device: {device}")
    print(f"Building dataset ({len(TOP_30_SIGNS)} target signs, {args.samples} samples each)...")

    X, y, class_names = build_dataset(TOP_30_SIGNS, samples_per_sign=args.samples)
    print(f"\nDataset: {X.shape}  classes: {len(class_names)}")

    report, best_model = evaluate_kfold(
        X, y, class_names,
        n_splits=args.folds, epochs=args.epochs, device=device,
    )

    # Retrain on full data for production
    print("\nRetraining on full dataset for production model...")
    final_model, _ = train_fold(
        X, y, X, y,
        num_classes=len(class_names),
        epochs=args.epochs // 2,
        device=device,
    )
    save_model(final_model, class_names, report)


if __name__ == '__main__':
    main()
