"""
SignBridge ML — Training Pipeline
====================================
Trains sign classifiers and saves the best model.

Data sources (auto-detected, or force with --data):
  synthetic  : generated from signs_data.json prototypes — no real data needed
  wlasl      : pre-extracted WLASL features (run extract_features_from_videos.py first)

Model types (--model):
  sklearn    : KNN, RandomForest, SVM  (fast, good baseline)
  mlp        : 4-layer MLP with gradient descent, Adam, cosine LR, early stopping
  transformer: Transformer encoder on raw frame sequences (needs --data wlasl --sequences)
  all        : run sklearn + mlp, pick best

Usage
-----
    # Fastest — synthetic + sklearn (no dataset required)
    python -m backend.ml.train --data synthetic --model sklearn

    # Full MLP on real WLASL data (recommended)
    python -m backend.ml.train --data wlasl --model mlp

    # Transformer on raw sequences
    python -m backend.ml.train --data wlasl --model transformer --sequences

    # Run everything, keep best
    python -m backend.ml.train --data wlasl --model all

Output
------
    backend/ml/trained_model.pkl    — best sklearn model (joblib)
    backend/ml/trained_mlp.pt       — best MLP checkpoint (PyTorch)
    backend/ml/trained_transformer.pt
    backend/ml/training_report.json — full metrics for all models
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import joblib
import numpy as np
from sklearn.model_selection import train_test_split

from .dataset import (
    generate_dataset,
    load_signs,
    load_wlasl_dataset,
    load_tsl_dataset,
    wlasl_features_available,
    tsl_features_available,
)
from .models import SUPERVISED_MODELS, PRODUCTION_MODELS, make_kmeans, make_pca
from .nn_model import (
    make_mlp_trainer, make_transformer_trainer,
    make_lstm_trainer, make_bert_trainer,
)
from .validate import split, cross_val, evaluate, learning_curve_data, evaluate_clusters

MODEL_PATH       = Path(__file__).parent / 'trained_model.pkl'
TSL_MODEL_PATH   = Path(__file__).parent / 'trained_tsl_model.pkl'
TSL_REPORT_PATH  = Path(__file__).parent / 'training_report_tsl.json'
MLP_PATH         = Path(__file__).parent / 'trained_mlp.pt'
TRANSFORMER_PATH = Path(__file__).parent / 'trained_transformer.pt'
LSTM_PATH        = Path(__file__).parent / 'trained_lstm.pt'
BERT_PATH        = Path(__file__).parent / 'trained_bert.pt'
REPORT_PATH      = Path(__file__).parent / 'training_report.json'


# ── Helpers ────────────────────────────────────────────────────────────────────

def _choose_data_source(data_source: str | None) -> str:
    if data_source in ('wlasl', 'synthetic', 'tsl'):
        return data_source
    if tsl_features_available():
        return 'tsl'
    return 'wlasl' if wlasl_features_available() else 'synthetic'


def _pick_device() -> str:
    import torch
    if torch.cuda.is_available():
        return 'cuda'
    if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return 'mps'
    return 'cpu'


# ── Sklearn training block ─────────────────────────────────────────────────────

def _train_sklearn(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test:  np.ndarray,
    y_test:  np.ndarray,
    classes: list[str],
    model_pool: dict,
    n_folds: int,
    log,
) -> tuple[object, str, float, dict]:
    """Train all sklearn models, return (best_model, name, accuracy, report_section)."""
    report: dict = {}
    best_acc   = 0.0
    best_name  = None
    best_model = None

    for name, factory in model_pool.items():
        log(f"\n  > {name}")
        model = factory()

        t0 = time.perf_counter()
        cv = cross_val(model, X_train, y_train, n_folds=n_folds)
        cv_time = time.perf_counter() - t0

        cv_acc = cv['accuracy']['test_mean']
        log(f"    CV accuracy : {cv_acc:.4f} ± {cv['accuracy']['test_std']:.4f}  ({cv_time:.1f}s)")
        log(f"    CV F1       : {cv['f1']['test_mean']:.4f}")
        log(f"    Overfit gap : {cv['accuracy']['overfit_gap']:.4f}")

        model.fit(X_train, y_train)
        eval_res = evaluate(model, X_test, y_test, classes)

        log(f"    Test acc    : {eval_res['accuracy']:.4f}")
        if eval_res['top_k_accuracy']:
            log(f"    Top-3 acc   : {eval_res['top_k_accuracy']:.4f}")

        report[name] = {
            'cross_validation': cv,
            'test_evaluation':  eval_res,
            'training_time_s':  round(cv_time, 2),
        }

        if eval_res['accuracy'] > best_acc:
            best_acc   = eval_res['accuracy']
            best_name  = name
            best_model = model

    return best_model, best_name, best_acc, report


# ── Neural net training block ──────────────────────────────────────────────────

def _train_nn(
    X_train:     np.ndarray,
    y_train:     np.ndarray,
    X_val:       np.ndarray,
    y_val:       np.ndarray,
    X_test:      np.ndarray,
    y_test:      np.ndarray,
    classes:     list[str],
    model_type:  str,        # 'mlp' or 'transformer'
    epochs:      int,
    device:      str,
    verbose:     bool,
    log,
) -> tuple[float, dict]:
    """Train one neural network. Returns (test_accuracy, report_section)."""
    n_classes   = len(classes)
    input_dim   = X_train.shape[-1]
    log(f"\n  > {model_type.upper()}")
    log(f"    Input: {X_train.shape}   Classes: {n_classes}   Device: {device}")

    t0 = time.perf_counter()

    if model_type == 'mlp':
        _, trainer = make_mlp_trainer(
            input_dim=input_dim, num_classes=n_classes,
            device=device, lr=1e-3, checkpoint_path=MLP_PATH,
        )
    elif model_type == 'lstm':
        _, trainer = make_lstm_trainer(
            input_dim=input_dim, num_classes=n_classes,
            device=device, lr=5e-4, checkpoint_path=LSTM_PATH,
        )
    elif model_type == 'bert':
        _, trainer = make_bert_trainer(
            input_dim=input_dim, num_classes=n_classes,
            device=device, lr=2e-4, checkpoint_path=BERT_PATH,
        )
    else:  # transformer
        _, trainer = make_transformer_trainer(
            input_dim=input_dim, num_classes=n_classes,
            device=device, lr=5e-4, checkpoint_path=TRANSFORMER_PATH,
        )

    history = trainer.fit(
        X_train, y_train,
        X_val,   y_val,
        epochs=epochs,
        verbose=verbose,
    )

    # Restore best weights before evaluation
    trainer.load_best()

    # Evaluate on held-out test set
    y_pred  = trainer.predict(X_test)
    y_proba = trainer.predict_proba(X_test)

    from sklearn.metrics import accuracy_score, classification_report, top_k_accuracy_score
    acc = float(accuracy_score(y_test, y_pred))
    try:
        top3 = float(top_k_accuracy_score(y_test, y_proba, k=min(3, n_classes),
                                          labels=list(range(n_classes))))
    except Exception:
        top3 = 0.0
    clf_report = classification_report(
        y_test, y_pred,
        labels=list(range(n_classes)),
        target_names=classes,
        output_dict=True, zero_division=0,
    )

    train_time = time.perf_counter() - t0
    log(f"\n    Test accuracy : {acc:.4f}")
    log(f"    Top-3 accuracy: {top3:.4f}")
    log(f"    Total time    : {train_time:.1f}s")

    final_epoch = len(history['train_loss'])
    report = {
        'test_accuracy':    round(acc,  4),
        'top3_accuracy':    round(top3, 4),
        'training_epochs':  final_epoch,
        'training_time_s':  round(train_time, 2),
        'per_class':        clf_report,
        'history': {
            'train_loss': [round(v, 4) for v in history['train_loss']],
            'val_loss':   [round(v, 4) for v in history['val_loss']],
            'train_acc':  [round(v, 4) for v in history['train_acc']],
            'val_acc':    [round(v, 4) for v in history['val_acc']],
            'val_top3':   [round(v, 4) for v in history['val_top3']],
            'lr':         [round(v, 8) for v in history['lr']],
        },
    }
    return acc, report


# ── Main pipeline ──────────────────────────────────────────────────────────────

def run_training(
    data_source:      str | None = None,
    wlasl_dir:        Path | None = None,
    model_type:       str  = 'all',    # 'sklearn', 'mlp', 'transformer', 'all'
    samples_per_sign: int  = 150,
    n_folds:          int  = 5,
    epochs:           int  = 100,
    kmeans_clusters:  int  = 20,
    use_sequences:    bool = False,
    verbose:          bool = True,
) -> dict:
    """Full training + evaluation pipeline. Returns report dict."""

    def log(msg):
        if verbose:
            print(msg)

    source = _choose_data_source(data_source)
    device = _pick_device()
    log(f"\n{'='*60}")
    log(f"  SignBridge ML Training")
    log(f"  Data source : {source}")
    log(f"  Model type  : {model_type}")
    log(f"  Device      : {device}")
    log(f"{'='*60}")

    # ── 1. Load dataset ────────────────────────────────────────────────────────
    log("\n[1/5] Loading dataset...")
    if source == 'wlasl':
        X, y, classes = load_wlasl_dataset(wlasl_dir, use_sequences=use_sequences)
        signs_data    = None
    elif source == 'tsl':
        X, y, classes = load_tsl_dataset()
        signs_data    = None
    else:
        X, y, classes = generate_dataset(samples_per_sign=samples_per_sign)
        signs_data    = load_signs()

    log(f"      Shape    : {X.shape}")
    log(f"      Classes  : {len(classes)}")
    log(f"      Samples  : {X.shape[0]:,}")

    # Drop classes with fewer than 2 samples — can't appear in both train and test
    from collections import Counter
    counts = Counter(y.tolist())
    keep_mask = np.array([counts[yi] >= 2 for yi in y])
    if keep_mask.sum() < len(y):
        dropped = len(y) - keep_mask.sum()
        X, y = X[keep_mask], y[keep_mask]
        # Remap class indices to be contiguous
        old_ids = sorted(set(y.tolist()))
        id_map  = {old: new for new, old in enumerate(old_ids)}
        y       = np.array([id_map[yi] for yi in y])
        classes = [classes[i] for i in old_ids]
        log(f"      Dropped  : {dropped} samples from singleton classes")

    # ── 2. Split ───────────────────────────────────────────────────────────────
    n_classes = len(classes)
    n_samples = len(y)
    avg_per_class = n_samples / n_classes

    # Minimum test fraction so every class can appear at least once
    min_test_frac = max(0.20, (n_classes + 5) / n_samples)
    # Val fraction: same logic on remaining data
    remaining_after_test = n_samples * (1 - min_test_frac)
    min_val_frac_of_remaining = max(0.10, (n_classes + 5) / remaining_after_test)

    log(f"\n[2/5] Splitting dataset (avg {avg_per_class:.1f} samples/class)...")
    log(f"      test={min_test_frac:.0%}  val={min_val_frac_of_remaining:.0%} of train")

    X_train_full, X_test, y_train_full, y_test = split(X, y, test_size=min_test_frac)

    # Use stratify for val only when every class has ≥ 2 samples in train_full
    train_counts = Counter(y_train_full.tolist())
    can_stratify_val = all(c >= 2 for c in train_counts.values())
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y_train_full,
        test_size=min_val_frac_of_remaining,
        stratify=y_train_full if can_stratify_val else None,
        random_state=42,
    )
    log(f"      Train: {len(X_train):,}   Val: {len(X_val):,}   Test: {len(X_test):,}")

    report: dict = {
        'data_source': source,
        'model_type':  model_type,
        'device':      device,
        'dataset': {
            'total_samples': int(X.shape[0]),
            'n_classes':     len(classes),
            'n_features':    int(np.prod(X.shape[1:])),
            'train_size':    len(X_train),
            'val_size':      len(X_val),
            'test_size':     len(X_test),
        },
        'sklearn':     {},
        'neural_nets': {},
        'unsupervised': {},
        'best_model':  None,
    }

    all_accuracies: dict[str, float] = {}

    # ── 3. Train models ────────────────────────────────────────────────────────
    run_sklearn     = model_type in ('sklearn', 'all')
    run_mlp         = model_type in ('mlp', 'all')
    run_lstm        = model_type in ('lstm', 'all')
    run_bert        = model_type in ('bert', 'all')
    run_transformer = model_type == 'transformer'

    best_sklearn_model = None

    if run_sklearn and not use_sequences and n_classes > 300:
        log(f"\n[3a/5] Skipping sklearn (n_classes={n_classes} > 300 — CV takes hours, use --model sklearn to force)")
    if run_sklearn and not use_sequences and n_classes <= 300:
        log(f"\n[3a/5] Training sklearn models (CV={n_folds})...")
        X_sk = np.vstack([X_train, X_val])
        y_sk = np.concatenate([y_train, y_val])
        model_pool = {**SUPERVISED_MODELS}
        # XGBoost/LightGBM fail in CV when rare classes are missing from some folds
        if source == 'wlasl' and n_classes <= 500:
            model_pool = {**model_pool, **PRODUCTION_MODELS}
        elif source == 'wlasl':
            log(f"      (Skipping XGBoost/LightGBM: {n_classes} classes > 500, CV folds too sparse)")

        best_sklearn_model, sk_name, sk_acc, sk_report = _train_sklearn(
            X_sk, y_sk, X_test, y_test, classes,
            model_pool, n_folds, log,
        )
        report['sklearn'] = sk_report
        all_accuracies[sk_name] = sk_acc
        log(f"\n  Best sklearn: {sk_name} ({sk_acc:.4f})")

    if run_mlp and not use_sequences:
        log(f"\n[3b/5] Training MLP (epochs={epochs}, device={device})...")
        mlp_acc, mlp_report = _train_nn(
            X_train, y_train, X_val, y_val, X_test, y_test,
            classes, 'mlp', epochs, device, verbose, log,
        )
        report['neural_nets']['MLP'] = mlp_report
        all_accuracies['MLP'] = mlp_acc

    if run_transformer:
        log(f"\n[3c/5] Training Transformer (epochs={epochs}, device={device})...")
        tr_acc, tr_report = _train_nn(
            X_train, y_train, X_val, y_val, X_test, y_test,
            classes, 'transformer', epochs, device, verbose, log,
        )
        report['neural_nets']['Transformer'] = tr_report
        all_accuracies['Transformer'] = tr_acc

    if run_lstm and use_sequences:
        log(f"\n[3d/5] Training BiLSTM (epochs={epochs}, device={device})...")
        lstm_acc, lstm_report = _train_nn(
            X_train, y_train, X_val, y_val, X_test, y_test,
            classes, 'lstm', epochs, device, verbose, log,
        )
        report['neural_nets']['BiLSTM'] = lstm_report
        all_accuracies['BiLSTM'] = lstm_acc
    elif run_lstm:
        log("\n  [BiLSTM] Skipped — requires --sequences flag (re-run extraction with --save_sequences)")

    if run_bert:
        log(f"\n[3e/5] Training SignBERT (epochs={epochs}, device={device})...")
        if use_sequences:
            # Real frame sequences: (N, 32, 231) — pass directly
            bert_X_train, bert_X_val, bert_X_test = X_train, X_val, X_test
        else:
            # Pooled features: (N, 462) — split mean/std into 2-token sequence (N, 2, 231)
            half = X_train.shape[-1] // 2
            bert_X_train = np.stack([X_train[..., :half], X_train[..., half:]], axis=1)
            bert_X_val   = np.stack([X_val[...,   :half], X_val[...,   half:]], axis=1)
            bert_X_test  = np.stack([X_test[...,  :half], X_test[...,  half:]], axis=1)
        bert_acc, bert_report = _train_nn(
            bert_X_train, y_train, bert_X_val, y_val, bert_X_test, y_test,
            classes, 'bert', epochs, device, verbose, log,
        )
        report['neural_nets']['SignBERT'] = bert_report
        all_accuracies['SignBERT'] = bert_acc

    # ── 4. Unsupervised (sklearn models only — needs flat features) ────────────
    if not use_sequences:
        log(f"\n[4/5] Unsupervised — K-Means (k={kmeans_clusters})...")
        X_sk_flat = np.vstack([X_train, X_val])
        y_sk_flat = np.concatenate([y_train, y_val])
        kmeans = make_kmeans(n_clusters=kmeans_clusters)
        kmeans.fit(X_sk_flat)

        cluster_eval = evaluate_clusters(
            kmeans, X_sk_flat, y_sk_flat, classes,
            signs_data if signs_data else {}
        )
        log(f"    ARI    : {cluster_eval['ari']:.4f}")
        log(f"    NMI    : {cluster_eval['nmi']:.4f}")
        log(f"    Purity : {cluster_eval['purity']:.4f}")

        n_pca = min(X_sk_flat.shape[1], 20)
        pca_pipe = make_pca(n_components=n_pca)
        pca_pipe.fit(X_sk_flat)
        explained  = pca_pipe.named_steps['pca'].explained_variance_ratio_
        cumulative = float(np.cumsum(explained)[1])

        report['unsupervised'] = {
            'kmeans': cluster_eval,
            'pca': {
                'explained_variance_ratio': [round(float(v), 4) for v in explained],
                'top2_cumulative_variance': round(cumulative, 4),
                'n_components_for_95pct': int(np.argmax(np.cumsum(explained) >= 0.95) + 1),
            },
        }
    else:
        log("\n[4/5] Skipping unsupervised (sequence data not supported for K-Means).")

    # ── 5. Learning curve (best sklearn model) ─────────────────────────────────
    if run_sklearn and best_sklearn_model is not None and not use_sequences:
        X_sk_full = np.vstack([X_train, X_val])
        y_sk_full = np.concatenate([y_train, y_val])
        from .models import SUPERVISED_MODELS as SM, PRODUCTION_MODELS as PM
        all_pool = {**SM, **(PM if source == 'wlasl' else {})}
        best_sk_name = max(
            [k for k in all_pool if k in all_accuracies],
            key=lambda k: all_accuracies.get(k, 0),
            default=None,
        )
        if best_sk_name:
            log(f"\n[5/5] Learning curve for {best_sk_name}...")
            lc_model = all_pool[best_sk_name]()
            lc = learning_curve_data(lc_model, X_sk_full, y_sk_full, n_folds=n_folds)
            report['learning_curve'] = lc
            log(f"    Val acc at full training size: {lc['validation_mean'][-1]:.4f}")
    else:
        log("\n[5/5] Skipping learning curve (no sklearn models).")

    # ── Pick best model overall ───────────────────────────────────────────────
    if all_accuracies:
        best_name_overall = max(all_accuracies, key=all_accuracies.get)
        report['best_model'] = {
            'name':     best_name_overall,
            'accuracy': round(all_accuracies[best_name_overall], 4),
        }
        log(f"\n{'='*60}")
        log(f"  Best model overall : {best_name_overall}")
        log(f"  Test accuracy      : {all_accuracies[best_name_overall]:.4f}")
        log(f"{'='*60}")
    else:
        report['best_model'] = {'name': None, 'accuracy': 0.0}

    # ── Save sklearn best model ───────────────────────────────────────────────
    if best_sklearn_model is not None:
        target_path = TSL_MODEL_PATH if source == 'tsl' else MODEL_PATH
        target_report = TSL_REPORT_PATH if source == 'tsl' else REPORT_PATH
        joblib.dump({'model': best_sklearn_model, 'classes': classes}, target_path)
        log(f"\n  Sklearn model  -> {target_path}")
    else:
        target_report = TSL_REPORT_PATH if source == 'tsl' else REPORT_PATH

    # ── Save report ───────────────────────────────────────────────────────────
    with open(target_report, 'w') as f:
        json.dump(report, f, indent=2)
    log(f"  Training report -> {target_report}")

    return report


class _TorchModelWrapper:
    """Sklearn-compatible wrapper around a PyTorch SignNetV3 model.
    Implements predict() and predict_proba() so main.py needs no changes.
    """
    def __init__(self, model, classes: list[str], device: str = 'cpu'):
        self._model   = model
        self._classes = classes
        self._device  = device

    def predict(self, X: 'np.ndarray') -> 'np.ndarray':
        import torch, numpy as np
        X_t = torch.tensor(np.atleast_2d(X), dtype=torch.float32).to(self._device)
        self._model.eval()
        with torch.no_grad():
            return self._model(X_t).argmax(dim=1).cpu().numpy()

    def predict_proba(self, X: 'np.ndarray') -> 'np.ndarray':
        import torch, numpy as np
        import torch.nn.functional as F
        X_t = torch.tensor(np.atleast_2d(X), dtype=torch.float32).to(self._device)
        self._model.eval()
        with torch.no_grad():
            logits = self._model(X_t)
            return F.softmax(logits, dim=1).cpu().numpy()

    @property
    def classes_(self):
        return self._classes


def load_trained_model(language: str = "ASL"):
    """Load the best available model for inference. Returns (model, classes)."""
    if language.upper() == "TSL":
        return load_tsl_trained_model()

    import torch

    # Try SignNetV3 PyTorch model first
    if MLP_PATH.exists():
        try:
            ckpt = torch.load(MLP_PATH, map_location='cpu', weights_only=False)
            if ckpt.get('architecture', '').startswith('SignNetV3'):
                from .train_v3 import SignNetV3
                classes    = ckpt['classes']
                input_dim  = ckpt.get('input_dim', 231)
                num_classes = len(classes)
                model = SignNetV3(num_classes, input_dim)
                model.load_state_dict(ckpt['model_state'])
                model.eval()
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                model = model.to(device)
                return _TorchModelWrapper(model, classes, device), classes
        except Exception as exc:
            print(f"[SignBridge] SignNetV3 load failed ({exc}), falling back to sklearn model")

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"No trained model found at {MODEL_PATH}. "
            "Run: python -m backend.ml.train  or  python -m backend.ml.train_v3"
        )
    data = joblib.load(MODEL_PATH)
    return data['model'], data['classes']


def load_tsl_trained_model():
    """Load the Tunisian Sign Language sklearn classifier."""
    if not TSL_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"No TSL model at {TSL_MODEL_PATH}. "
            "Run: python -m backend.ml.extract_features_from_images && "
            "python -m backend.ml.train --data tsl --model sklearn"
        )
    data = joblib.load(TSL_MODEL_PATH)
    return data['model'], data['classes']


def load_trained_mlp(num_classes: int, input_dim: int, device: str = 'cpu'):
    """Load the best MLP for inference. Returns (model, classes)."""
    from .nn_model import SignMLP
    import torch
    if not MLP_PATH.exists():
        raise FileNotFoundError(f"No MLP found at {MLP_PATH}.")
    classes_path = Path(__file__).parent / 'wlasl_features' / 'classes.json'
    with open(classes_path) as f:
        classes = json.load(f)
    model = SignMLP(input_dim=input_dim, num_classes=num_classes)
    model.load_state_dict(torch.load(MLP_PATH, map_location=device))
    model.eval()
    return model, classes


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train SignBridge sign classifier')
    parser.add_argument('--data',    choices=['wlasl', 'synthetic', 'tsl', 'auto'], default='auto')
    parser.add_argument('--model',   choices=['sklearn', 'mlp', 'transformer', 'lstm', 'bert', 'all'], default='all')
    parser.add_argument('--wlasl_dir', default=None)
    parser.add_argument('--folds',   type=int, default=5)
    parser.add_argument('--samples', type=int, default=150, help='Samples/sign (synthetic only)')
    parser.add_argument('--epochs',  type=int, default=100, help='Training epochs (NN only)')
    parser.add_argument('--sequences', action='store_true', help='Use raw frame sequences (Transformer)')
    args = parser.parse_args()

    run_training(
        data_source      = None if args.data == 'auto' else args.data,
        wlasl_dir        = Path(args.wlasl_dir) if args.wlasl_dir else None,
        model_type       = args.model,
        samples_per_sign = args.samples,
        n_folds          = args.folds,
        epochs           = args.epochs,
        use_sequences    = args.sequences,
        verbose          = True,
    )
