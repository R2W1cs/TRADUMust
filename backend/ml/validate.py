"""
SignBridge ML — Validation
============================
Validation strategy:
  1. Train / test split  (80 / 20, stratified)
  2. Stratified K-Fold cross-validation (5 folds)
  3. Per-class metrics: precision, recall, F1
  4. Confusion matrix (top-N misclassified pairs)
  5. Learning curve  (how accuracy grows with training size)
  6. Unsupervised: cluster purity vs ground-truth categories
"""

from __future__ import annotations
import numpy as np
from sklearn.model_selection  import (
    train_test_split,
    StratifiedKFold,
    cross_validate,
    learning_curve,
)
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    top_k_accuracy_score,
)
from sklearn.cluster  import KMeans
from sklearn.metrics  import adjusted_rand_score, normalized_mutual_info_score


# ── Train / test split ────────────────────────────────────────────────────────

def split(
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.20,
    random_state: int = 42,
) -> tuple:
    """Stratified 80/20 split — every class appears in both train and test."""
    return train_test_split(
        X, y,
        test_size=test_size,
        stratify=y,            # keep class proportions identical in both sets
        random_state=random_state,
    )


# ── Cross-validation ──────────────────────────────────────────────────────────

def cross_val(
    model,
    X: np.ndarray,
    y: np.ndarray,
    n_folds: int = 5,
    random_state: int = 42,
) -> dict:
    """
    Stratified K-Fold cross-validation.

    Returns mean ± std for accuracy, precision, recall, F1
    across all folds — a reliable estimate of generalisation.
    """
    cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=random_state)

    results = cross_validate(
        model, X, y,
        cv=cv,
        scoring={
            'accuracy':  'accuracy',
            'precision': 'precision_weighted',
            'recall':    'recall_weighted',
            'f1':        'f1_weighted',
        },
        return_train_score=True,
        n_jobs=-1,
    )

    summary = {}
    for metric in ['accuracy', 'precision', 'recall', 'f1']:
        test_scores  = results[f'test_{metric}']
        train_scores = results[f'train_{metric}']
        summary[metric] = {
            'test_mean':  float(np.mean(test_scores)),
            'test_std':   float(np.std(test_scores)),
            'train_mean': float(np.mean(train_scores)),
            'train_std':  float(np.std(train_scores)),
            'overfit_gap': float(np.mean(train_scores) - np.mean(test_scores)),
        }
    return summary


# ── Evaluation on held-out test set ──────────────────────────────────────────

def evaluate(
    model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    classes: list[str],
    top_k: int = 3,
) -> dict:
    """
    Full evaluation on the held-out test set.

    Returns accuracy, top-k accuracy, per-class report, and
    the worst-confused class pairs.
    """
    y_pred = model.predict(X_test)

    # Top-k accuracy (correct if true label is in top-k predictions)
    try:
        y_proba = model.predict_proba(X_test)
        topk    = float(top_k_accuracy_score(y_test, y_proba, k=top_k))
    except Exception:
        topk = None

    report = classification_report(
        y_test, y_pred,
        target_names=classes,
        output_dict=True,
        zero_division=0,
    )

    # Confusion matrix — find worst misclassified pairs
    cm        = confusion_matrix(y_test, y_pred)
    np.fill_diagonal(cm, 0)   # zero out correct predictions
    worst_idx = np.dstack(np.unravel_index(
        np.argsort(cm.ravel())[-10:], cm.shape
    ))[0][::-1]

    worst_pairs = [
        {
            'true':       classes[r],
            'predicted':  classes[c],
            'count':      int(cm[r, c]),
        }
        for r, c in worst_idx if cm[r, c] > 0
    ]

    return {
        'accuracy':        float(accuracy_score(y_test, y_pred)),
        'top_k_accuracy':  topk,
        'k':               top_k,
        'per_class':       report,
        'worst_confusions': worst_pairs,
    }


# ── Learning curve ────────────────────────────────────────────────────────────

def learning_curve_data(
    model,
    X: np.ndarray,
    y: np.ndarray,
    n_folds: int = 5,
    random_state: int = 42,
) -> dict:
    """
    Compute training scores at increasing dataset sizes.
    Shows whether the model is overfitting (high train, low val)
    or underfitting (both low).
    """
    cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=random_state)
    train_sizes = np.linspace(0.10, 1.0, 10)

    sizes, train_scores, val_scores = learning_curve(
        model, X, y,
        train_sizes=train_sizes,
        cv=cv,
        scoring='accuracy',
        n_jobs=-1,
    )

    return {
        'train_sizes':       sizes.tolist(),
        'train_mean':        np.mean(train_scores, axis=1).tolist(),
        'train_std':         np.std(train_scores,  axis=1).tolist(),
        'validation_mean':   np.mean(val_scores,   axis=1).tolist(),
        'validation_std':    np.std(val_scores,    axis=1).tolist(),
    }


# ── Unsupervised cluster validation ──────────────────────────────────────────

def evaluate_clusters(
    kmeans: KMeans,
    X: np.ndarray,
    y: np.ndarray,
    classes: list[str],
    signs_data: dict,
) -> dict:
    """
    Measure how well K-Means clusters align with ground-truth labels
    and hand-crafted sign categories.

    Metrics:
    - ARI  (Adjusted Rand Index)   : 1.0 = perfect, 0 = random
    - NMI  (Normalised Mutual Info): 1.0 = perfect, 0 = no shared info
    - Cluster purity               : fraction of dominant class per cluster
    """
    cluster_labels = kmeans.labels_

    ari   = float(adjusted_rand_score(y, cluster_labels))
    nmi   = float(normalized_mutual_info_score(y, cluster_labels))

    # Purity: for each cluster, find dominant true label
    n_clusters = kmeans.n_clusters
    purity_sum = 0
    cluster_summary = []

    for cluster_id in range(n_clusters):
        mask     = cluster_labels == cluster_id
        if mask.sum() == 0:
            continue
        true_labels_in = y[mask]
        dominant        = int(np.bincount(true_labels_in).argmax())
        dominant_count  = int(np.bincount(true_labels_in).max())
        purity_sum     += dominant_count

        cluster_summary.append({
            'cluster':         cluster_id,
            'size':            int(mask.sum()),
            'dominant_sign':   classes[dominant],
            'purity':          round(dominant_count / mask.sum(), 3),
        })

    overall_purity = purity_sum / len(y)

    # Category alignment: check if clusters match hand-crafted categories
    categories = [signs_data[classes[i]]['category'] for i in range(len(classes))]
    cat_array  = np.array(categories)
    unique_cats = sorted(set(categories))
    cat_enc     = {c: i for i, c in enumerate(unique_cats)}
    y_cat       = np.array([cat_enc[c] for c in cat_array])
    # Map sample labels to category labels
    y_cat_samples = y_cat[y]
    cat_ari = float(adjusted_rand_score(y_cat_samples, cluster_labels))
    cat_nmi = float(normalized_mutual_info_score(y_cat_samples, cluster_labels))

    return {
        'ari':              ari,
        'nmi':              nmi,
        'purity':           round(overall_purity, 4),
        'category_ari':     cat_ari,
        'category_nmi':     cat_nmi,
        'n_clusters':       n_clusters,
        'cluster_summary':  sorted(cluster_summary, key=lambda x: -x['purity'])[:10],
    }
