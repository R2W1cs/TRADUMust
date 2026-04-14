"""
SignBridge ML — Training Pipeline
====================================
Trains supervised + unsupervised models on sign data and saves the best model.

Supports two data sources:
  - ``synthetic``  : generated from signs_data.json prototypes (no dataset needed)
  - ``wlasl``      : pre-extracted WLASL features from extract_features_from_videos.py

Auto-detection: if wlasl_features/ exists it is used; otherwise falls back to synthetic.

Usage:
    python -m backend.ml.train                   # auto-detect
    python -m backend.ml.train --data wlasl      # force WLASL
    python -m backend.ml.train --data synthetic  # force synthetic

Output:
    backend/ml/trained_model.pkl    — best supervised model (joblib)
    backend/ml/training_report.json — full metrics report
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import joblib
import numpy as np

from .dataset import (
    generate_dataset,
    load_signs,
    load_wlasl_dataset,
    wlasl_features_available,
)
from .models import SUPERVISED_MODELS, PRODUCTION_MODELS, make_kmeans, make_pca
from .validate import split, cross_val, evaluate, learning_curve_data, evaluate_clusters

MODEL_PATH  = Path(__file__).parent / 'trained_model.pkl'
REPORT_PATH = Path(__file__).parent / 'training_report.json'


def _choose_data_source(data_source: str | None) -> str:
    """Resolve 'auto' / None → 'wlasl' or 'synthetic'."""
    if data_source in ('wlasl', 'synthetic'):
        return data_source
    # Auto: prefer WLASL when features are on disk
    return 'wlasl' if wlasl_features_available() else 'synthetic'


def run_training(
    data_source:      str | None = None,   # 'wlasl', 'synthetic', or None (auto)
    wlasl_dir:        Path | None = None,  # override default wlasl_features/ dir
    samples_per_sign: int  = 150,          # only used for synthetic
    n_folds:          int  = 5,
    kmeans_clusters:  int  = 20,
    verbose:          bool = True,
) -> dict:
    """
    Full training + validation pipeline.
    Returns a report dict and saves the best model to disk.
    """

    def log(msg):
        if verbose:
            print(msg)

    source = _choose_data_source(data_source)

    # ── 1. Load dataset ───────────────────────────────────────────────────────
    if source == 'wlasl':
        log("\n[1/5] Loading WLASL features from disk...")
        X, y, classes = load_wlasl_dataset(wlasl_dir)
        signs_data     = None   # not used for WLASL cluster eval
        model_pool     = {**SUPERVISED_MODELS, **PRODUCTION_MODELS}
        log(f"      {X.shape[0]:,} samples  .  {len(classes)} classes  .  {X.shape[1]} features")
        log(f"      Models: {list(model_pool.keys())}")
    else:
        log("\n[1/5] Generating synthetic dataset...")
        X, y, classes = generate_dataset(samples_per_sign=samples_per_sign)
        signs_data     = load_signs()
        model_pool     = SUPERVISED_MODELS
        log(f"      {X.shape[0]:,} samples  .  {len(classes)} classes  .  {X.shape[1]} features")

    # ── 2. Train/test split ───────────────────────────────────────────────────
    log("\n[2/5] Splitting dataset (80% train / 20% test, stratified)...")
    X_train, X_test, y_train, y_test = split(X, y)
    log(f"      Train: {len(X_train):,}   Test: {len(X_test):,}")

    report: dict = {
        'data_source': source,
        'dataset': {
            'total_samples':    int(X.shape[0]),
            'n_classes':        len(classes),
            'n_features':       int(X.shape[1]),
            'train_size':       len(X_train),
            'test_size':        len(X_test),
        },
        'supervised':   {},
        'unsupervised': {},
        'best_model':   None,
    }
    if source == 'synthetic':
        report['dataset']['samples_per_sign'] = samples_per_sign

    # ── 3. Supervised models ──────────────────────────────────────────────────
    log(f"\n[3/5] Training & validating {len(model_pool)} supervised models...")
    best_acc   = 0.0
    best_name  = None
    best_model = None

    for name, factory in model_pool.items():
        log(f"\n  > {name}")
        model = factory()

        # Cross-validation
        t0      = time.perf_counter()
        cv      = cross_val(model, X_train, y_train, n_folds=n_folds)
        cv_time = time.perf_counter() - t0

        cv_acc = cv['accuracy']['test_mean']
        log(f"    CV accuracy:  {cv_acc:.4f} ± {cv['accuracy']['test_std']:.4f}  ({cv_time:.1f}s)")
        log(f"    CV F1:        {cv['f1']['test_mean']:.4f}")
        log(f"    Overfit gap:  {cv['accuracy']['overfit_gap']:.4f}")

        # Final fit on full training set
        model.fit(X_train, y_train)

        # Held-out test evaluation
        eval_res = evaluate(model, X_test, y_test, classes)
        log(f"    Test accuracy:{eval_res['accuracy']:.4f}")
        if eval_res['top_k_accuracy']:
            log(f"    Top-3 acc:    {eval_res['top_k_accuracy']:.4f}")

        report['supervised'][name] = {
            'cross_validation': cv,
            'test_evaluation':  eval_res,
            'training_time_s':  round(cv_time, 2),
        }

        if eval_res['accuracy'] > best_acc:
            best_acc   = eval_res['accuracy']
            best_name  = name
            best_model = model

    report['best_model'] = {
        'name':     best_name,
        'accuracy': round(best_acc, 4),
    }
    log(f"\n  Best supervised model: {best_name} ({best_acc:.4f} accuracy)")

    # ── 4. Unsupervised: K-Means ──────────────────────────────────────────────
    log(f"\n[4/5] Unsupervised — K-Means (k={kmeans_clusters})...")
    kmeans = make_kmeans(n_clusters=kmeans_clusters)
    kmeans.fit(X_train)

    cluster_eval = evaluate_clusters(
        kmeans, X_train, y_train, classes,
        signs_data if signs_data else {}  # synthetic metadata, optional
    )
    log(f"    ARI:     {cluster_eval['ari']:.4f}  (0=random, 1=perfect)")
    log(f"    NMI:     {cluster_eval['nmi']:.4f}")
    log(f"    Purity:  {cluster_eval['purity']:.4f}")

    # PCA for dimensionality analysis
    n_pca = min(X.shape[1], 20)
    pca_pipe = make_pca(n_components=n_pca)
    pca_pipe.fit(X_train)
    explained  = pca_pipe.named_steps['pca'].explained_variance_ratio_
    cumulative = float(np.cumsum(explained)[1])   # variance explained by top 2 PCs

    report['unsupervised'] = {
        'kmeans': cluster_eval,
        'pca': {
            'explained_variance_ratio': [round(float(v), 4) for v in explained],
            'top2_cumulative_variance': round(cumulative, 4),
            'n_components_for_95pct':  int(
                np.argmax(np.cumsum(explained) >= 0.95) + 1
            ),
        },
    }

    # ── 5. Learning curve for best model ─────────────────────────────────────
    log(f"\n[5/5] Learning curve for {best_name}...")
    lc_model = model_pool[best_name]()
    lc = learning_curve_data(lc_model, X_train, y_train, n_folds=n_folds)
    report['learning_curve'] = lc
    final_val = lc['validation_mean'][-1]
    log(f"    Validation accuracy at full training size: {final_val:.4f}")

    # ── Save model + report ───────────────────────────────────────────────────
    joblib.dump({'model': best_model, 'classes': classes}, MODEL_PATH)
    with open(REPORT_PATH, 'w') as f:
        json.dump(report, f, indent=2)

    log(f"\nOK Model saved -> {MODEL_PATH}")
    log(f"OK Report saved -> {REPORT_PATH}")
    return report


def load_trained_model():
    """Load the saved model for inference. Returns (model, classes)."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"No trained model found at {MODEL_PATH}. "
            "Run: python -m backend.ml.train"
        )
    data = joblib.load(MODEL_PATH)
    return data['model'], data['classes']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train SignBridge sign classifier')
    parser.add_argument(
        '--data', choices=['wlasl', 'synthetic', 'auto'], default='auto',
        help='Data source: wlasl (WLASL .npy features), synthetic (generated), auto (default)'
    )
    parser.add_argument(
        '--wlasl_dir', default=None,
        help='Path to wlasl_features/ directory (default: backend/ml/wlasl_features/)'
    )
    parser.add_argument('--folds',   type=int, default=5,  help='CV folds')
    parser.add_argument('--samples', type=int, default=150, help='Samples/sign (synthetic only)')
    args = parser.parse_args()

    run_training(
        data_source      = None if args.data == 'auto' else args.data,
        wlasl_dir        = Path(args.wlasl_dir) if args.wlasl_dir else None,
        samples_per_sign = args.samples,
        n_folds          = args.folds,
        verbose          = True,
    )
