"""
SignBridge ML — Model Definitions
===================================
Supervised  → KNN, Random Forest, SVM, XGBoost, LightGBM
Unsupervised → K-Means, PCA

All supervised models wrap estimators in a consistent sklearn Pipeline interface.
XGBoost and LightGBM are the recommended production models for WLASL-scale data
(~30 samples/class) — they outperform deep learning at this sample size.
"""

from sklearn.neighbors         import KNeighborsClassifier
from sklearn.ensemble          import RandomForestClassifier
from sklearn.svm               import SVC
from sklearn.cluster           import KMeans
from sklearn.decomposition     import PCA
from sklearn.preprocessing     import StandardScaler
from sklearn.pipeline          import Pipeline

try:
    from xgboost  import XGBClassifier
    _XGB_AVAILABLE = True
except ImportError:
    _XGB_AVAILABLE = False

try:
    from lightgbm import LGBMClassifier
    _LGBM_AVAILABLE = True
except ImportError:
    _LGBM_AVAILABLE = False


# ── Supervised models ─────────────────────────────────────────────────────────

def make_knn(n_neighbors: int = 5) -> Pipeline:
    """
    K-Nearest Neighbours
    --------------------
    Intuition: find the k most similar signs in the training set by
    Euclidean distance in feature space — the majority label wins.

    Good for gesture recognition because similar arm positions really are
    similar signs.  Fast to train (lazy learner), slightly slower at inference.
    """
    return Pipeline([
        ('scaler', StandardScaler()),
        ('clf',    KNeighborsClassifier(
            n_neighbors=n_neighbors,
            metric='euclidean',
            weights='distance',   # closer neighbours vote stronger
            n_jobs=-1,
        )),
    ])


def make_random_forest(n_estimators: int = 200, max_depth: int = None) -> Pipeline:
    """
    Random Forest
    -------------
    Intuition: build many decision trees, each trained on a random subset
    of features and samples, then average their votes.

    Handles non-linear boundaries well — useful because the boundary
    between, say, HELLO and GOODBYE in arm-position space is not linear.
    Provides feature importance scores for free.
    """
    return Pipeline([
        ('scaler', StandardScaler()),
        ('clf',    RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_leaf=2,
            class_weight='balanced',   # handles any class imbalance
            random_state=42,
            n_jobs=-1,
        )),
    ])


def make_svm(C: float = 10.0, kernel: str = 'rbf') -> Pipeline:
    """
    Support Vector Machine (RBF kernel)
    ------------------------------------
    Intuition: find the hyperplane in feature space that maximally separates
    classes.  RBF kernel maps features to infinite-dimensional space, making
    it effective even when classes are not linearly separable.

    Often the highest-accuracy option for small-medium tabular datasets.
    """
    return Pipeline([
        ('scaler', StandardScaler()),
        ('clf',    SVC(
            C=C,
            kernel=kernel,
            probability=True,          # needed for predict_proba
            decision_function_shape='ovr',
            random_state=42,
            cache_size=500,
        )),
    ])


def make_xgboost(
    n_estimators: int = 500,
    learning_rate: float = 0.05,
    max_depth: int = 6,
) -> Pipeline:
    """
    XGBoost Gradient Boosted Trees
    --------------------------------
    Intuition: build trees sequentially, each one correcting the errors of
    the previous. The gradient-boosting objective minimises cross-entropy
    directly — better calibrated probabilities than Random Forest.

    Why XGBoost for WLASL-scale data (~30 samples/class):
    - Consistently outperforms deep learning at small-to-medium dataset sizes
    - Built-in L1/L2 regularisation prevents overfitting on sparse classes
    - eval_metric='mlogloss' gives well-calibrated confidence scores
    - Published WLASL300 baselines: RF ~65%, I3D ~65.89% — XGBoost matches
      or exceeds RF with proper tuning
    """
    if not _XGB_AVAILABLE:
        raise ImportError("xgboost is not installed. Run: pip install xgboost")
    return Pipeline([
        ('scaler', StandardScaler()),
        ('clf',    XGBClassifier(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric='mlogloss',
            random_state=42,
            n_jobs=-1,
            verbosity=0,
        )),
    ])


def make_lgbm(
    n_estimators: int = 500,
    learning_rate: float = 0.05,
    num_leaves: int = 63,
) -> Pipeline:
    """
    LightGBM Gradient Boosted Trees
    ---------------------------------
    Intuition: like XGBoost but uses histogram-based leaf-wise tree growth
    instead of depth-wise — often 2–10× faster to train on the same data
    with equal or better accuracy.

    Preferred over XGBoost when:
    - Training set > 5,000 samples (LightGBM's histogram method shines)
    - You need faster iteration (hyperparameter sweeps, repeated retraining)
    - Dataset has many categorical features (native categorical support)

    After WLASL feature extraction (~9,000 samples for WLASL300), LightGBM
    becomes the default production choice.
    """
    if not _LGBM_AVAILABLE:
        raise ImportError("lightgbm is not installed. Run: pip install lightgbm")
    return Pipeline([
        ('scaler', StandardScaler()),
        ('clf',    LGBMClassifier(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            num_leaves=num_leaves,
            subsample=0.8,
            colsample_bytree=0.8,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1,
            verbose=-1,
        )),
    ])


SUPERVISED_MODELS = {
    'KNN':           make_knn,
    'RandomForest':  make_random_forest,
    'SVM':           make_svm,
}

# Extended model set — used when real (WLASL) data is loaded
# XGBoost and LightGBM require the packages to be installed
PRODUCTION_MODELS: dict = {}
if _XGB_AVAILABLE:
    PRODUCTION_MODELS['XGBoost'] = make_xgboost
if _LGBM_AVAILABLE:
    PRODUCTION_MODELS['LightGBM'] = make_lgbm


# ── Unsupervised models ───────────────────────────────────────────────────────

def make_kmeans(n_clusters: int = 20, random_state: int = 42) -> KMeans:
    """
    K-Means Clustering
    ------------------
    Intuition: partition signs into k groups based purely on feature
    similarity — no labels used.

    Used here to discover natural clusters in the arm-position space:
    e.g. head-level signs cluster together, chest-level signs cluster
    separately, regardless of their semantic category.

    Validates our supervised approach: if KMeans clusters align with
    our hand-crafted categories, our feature engineering is sound.
    """
    return KMeans(
        n_clusters=n_clusters,
        init='k-means++',      # smarter initialisation than random
        n_init=10,
        max_iter=300,
        random_state=random_state,
    )


def make_pca(n_components: int = 2) -> Pipeline:
    """
    Principal Component Analysis (PCA)
    ------------------------------------
    Intuition: find the directions of maximum variance in the 12-dimensional
    feature space and project down to 2D for visualisation.

    Used to:
    1. Visualise sign clusters in 2D
    2. Understand which features drive the most variation
    3. Speed up training by reducing dimensions before passing to a classifier
    """
    return Pipeline([
        ('scaler', StandardScaler()),
        ('pca',    PCA(n_components=n_components, random_state=42)),
    ])
