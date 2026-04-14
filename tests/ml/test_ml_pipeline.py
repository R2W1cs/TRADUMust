"""
SignBridge ML Pipeline Tests
==============================
Tests for: dataset generation, model training, validation,
unsupervised clustering, and API endpoints.

Run with:
    .venv/Scripts/python -m pytest tests/ml/ -v
"""

from __future__ import annotations
import json
import sys
import os
import numpy as np
import pytest

# Make sure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.ml.dataset import (
    generate_dataset, load_signs, encode_landmarks,
    HAND_SHAPES, EXPRESSIONS, MOTIONS, FEATURE_NAMES,
)
from backend.ml.models import (
    make_knn, make_random_forest, make_svm,
    make_kmeans, make_pca, SUPERVISED_MODELS,
)
from backend.ml.validate import split, cross_val, evaluate, evaluate_clusters, learning_curve_data
from backend.ml.train import load_trained_model, REPORT_PATH, MODEL_PATH


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def signs_data():
    return load_signs()


@pytest.fixture(scope="module")
def small_dataset():
    """Small dataset (20 samples/sign) for fast test runs."""
    return generate_dataset(samples_per_sign=20, random_state=0)


@pytest.fixture(scope="module")
def train_test(small_dataset):
    X, y, classes = small_dataset
    return split(X, y) + (classes,)


# ── Dataset tests ─────────────────────────────────────────────────────────────

class TestDataset:
    def test_signs_json_loaded(self, signs_data):
        assert len(signs_data) >= 200, "Expected at least 200 signs in signs_data.json"

    def test_signs_have_required_fields(self, signs_data):
        required = {
            "right_elbow_x", "right_elbow_y", "right_wrist_x", "right_wrist_y",
            "left_elbow_x",  "left_elbow_y",  "left_wrist_x",  "left_wrist_y",
            "rHand", "lHand", "expression", "rMotion", "category",
        }
        for sign_name, sign in signs_data.items():
            missing = required - set(sign.keys())
            assert not missing, f"Sign '{sign_name}' missing fields: {missing}"

    def test_coordinates_in_viewbox(self, signs_data):
        for sign_name, sign in signs_data.items():
            for coord in ["right_elbow_x", "right_wrist_x", "left_elbow_x", "left_wrist_x"]:
                assert 0 <= sign[coord] <= 360, f"{sign_name}.{coord}={sign[coord]} out of ViewBox"
            for coord in ["right_elbow_y", "right_wrist_y", "left_elbow_y", "left_wrist_y"]:
                assert 0 <= sign[coord] <= 240, f"{sign_name}.{coord}={sign[coord]} out of ViewBox"

    def test_generate_dataset_shape(self, small_dataset):
        X, y, classes = small_dataset
        n = len(classes) * 20
        assert X.shape == (n, 12), f"Expected ({n}, 12), got {X.shape}"
        assert y.shape == (n,)
        assert len(classes) >= 200

    def test_dataset_dtypes(self, small_dataset):
        X, y, classes = small_dataset
        assert X.dtype == np.float32
        assert y.dtype == np.int32

    def test_features_normalised(self, small_dataset):
        X, y, classes = small_dataset
        assert X.min() >= 0.0
        assert X.max() <= 1.0

    def test_feature_names_count(self):
        assert len(FEATURE_NAMES) == 12

    def test_classes_sorted(self, small_dataset):
        _, _, classes = small_dataset
        assert classes == sorted(classes)

    def test_label_coverage(self, small_dataset):
        X, y, classes = small_dataset
        unique_labels = set(y)
        assert unique_labels == set(range(len(classes)))

    def test_encode_landmarks_shape(self):
        # 21 MediaPipe landmarks
        landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0}] * 21
        feat = encode_landmarks(landmarks)
        assert feat.shape == (12,)
        assert feat.dtype == np.float32

    def test_encode_landmarks_clipped(self):
        landmarks = [{"x": 2.0, "y": -1.0, "z": 0.0, "visibility": 1.0}] * 21
        feat = encode_landmarks(landmarks)
        assert feat.min() >= 0.0
        assert feat.max() <= 1.0

    def test_encode_landmarks_sparse_fallback(self):
        # Fewer than 9 landmarks -> zeros
        feat = encode_landmarks([{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0}] * 5)
        assert (feat == 0).all()

    def test_hand_shapes_coverage(self, signs_data):
        used = {s["rHand"] for s in signs_data.values()} | {s["lHand"] for s in signs_data.values()}
        valid = set(HAND_SHAPES)
        invalid = used - valid
        assert not invalid, f"Unknown hand shapes used: {invalid}"

    def test_expression_coverage(self, signs_data):
        used = {s["expression"] for s in signs_data.values()}
        valid = set(EXPRESSIONS)
        invalid = used - valid
        assert not invalid, f"Unknown expressions used: {invalid}"


# ── Model tests ───────────────────────────────────────────────────────────────

class TestModels:
    def test_supervised_models_keys(self):
        assert set(SUPERVISED_MODELS.keys()) == {"KNN", "RandomForest", "SVM"}

    def test_knn_pipeline_structure(self):
        model = make_knn()
        assert "scaler" in model.named_steps
        assert "clf" in model.named_steps

    def test_rf_pipeline_structure(self):
        model = make_random_forest()
        assert "scaler" in model.named_steps
        assert "clf" in model.named_steps

    def test_svm_pipeline_structure(self):
        model = make_svm()
        assert "scaler" in model.named_steps
        assert "clf" in model.named_steps

    def test_kmeans_n_clusters(self):
        km = make_kmeans(n_clusters=10)
        assert km.n_clusters == 10

    def test_pca_n_components(self):
        pipe = make_pca(n_components=3)
        assert pipe.named_steps["pca"].n_components == 3

    def test_knn_fit_predict(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        model = make_knn(n_neighbors=3)
        model.fit(X_tr, y_tr)
        preds = model.predict(X_te)
        assert preds.shape == y_te.shape
        acc = (preds == y_te).mean()
        assert acc > 0.5, f"KNN accuracy too low: {acc:.3f}"

    def test_svm_predict_proba(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        model = make_svm()
        model.fit(X_tr, y_tr)
        probas = model.predict_proba(X_te)
        assert probas.shape == (len(X_te), len(classes))
        # Each row sums to 1
        np.testing.assert_allclose(probas.sum(axis=1), 1.0, atol=1e-5)

    def test_rf_feature_importances(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        model = make_random_forest(n_estimators=50)
        model.fit(X_tr, y_tr)
        importances = model.named_steps["clf"].feature_importances_
        assert len(importances) == 12
        assert importances.sum() > 0.99  # roughly sums to 1


# ── Validation tests ──────────────────────────────────────────────────────────

class TestValidation:
    def test_split_sizes(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y, test_size=0.2)
        total = len(X)
        assert abs(len(X_te) / total - 0.2) < 0.05

    def test_split_stratified(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        # Every class in train AND test
        assert set(y_tr) == set(y_te) == set(y)

    def test_cross_val_keys(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        model = make_knn(n_neighbors=3)
        cv = cross_val(model, X_tr, y_tr, n_folds=3)
        assert set(cv.keys()) == {"accuracy", "precision", "recall", "f1"}
        for metric in cv.values():
            assert "test_mean" in metric
            assert "test_std" in metric
            assert "overfit_gap" in metric

    def test_cross_val_accuracy_reasonable(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        model = make_knn(n_neighbors=3)
        cv = cross_val(model, X_tr, y_tr, n_folds=3)
        acc = cv["accuracy"]["test_mean"]
        assert 0.5 < acc <= 1.0, f"CV accuracy unreasonable: {acc}"

    def test_evaluate_keys(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        model = make_knn(n_neighbors=3)
        model.fit(X_tr, y_tr)
        result = evaluate(model, X_te, y_te, classes)
        assert "accuracy" in result
        assert "top_k_accuracy" in result
        assert "per_class" in result
        assert "worst_confusions" in result

    def test_evaluate_accuracy_range(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, X_te, y_tr, y_te = split(X, y)
        model = make_svm()
        model.fit(X_tr, y_tr)
        result = evaluate(model, X_te, y_te, classes)
        assert 0.0 <= result["accuracy"] <= 1.0

    def test_learning_curve_keys(self, small_dataset):
        X, y, classes = small_dataset
        X_tr, _, y_tr, _ = split(X, y)
        model = make_knn(n_neighbors=3)
        lc = learning_curve_data(model, X_tr, y_tr, n_folds=3)
        assert "train_sizes" in lc
        assert "train_mean" in lc
        assert "validation_mean" in lc
        assert len(lc["train_sizes"]) == 10

    def test_evaluate_clusters_keys(self, small_dataset):
        X, y, classes = small_dataset
        signs = load_signs()
        km = make_kmeans(n_clusters=min(20, len(classes)))
        km.fit(X)
        result = evaluate_clusters(km, X, y, classes, signs)
        assert "ari" in result
        assert "nmi" in result
        assert "purity" in result
        assert "category_ari" in result
        assert "cluster_summary" in result

    def test_purity_range(self, small_dataset):
        X, y, classes = small_dataset
        signs = load_signs()
        km = make_kmeans(n_clusters=min(20, len(classes)))
        km.fit(X)
        result = evaluate_clusters(km, X, y, classes, signs)
        assert 0.0 <= result["purity"] <= 1.0

    def test_ari_range(self, small_dataset):
        X, y, classes = small_dataset
        signs = load_signs()
        km = make_kmeans(n_clusters=min(20, len(classes)))
        km.fit(X)
        result = evaluate_clusters(km, X, y, classes, signs)
        # ARI can be slightly negative (worse than random) but usually > -0.5
        assert -0.5 <= result["ari"] <= 1.0


# ── Trained model tests ───────────────────────────────────────────────────────

class TestTrainedModel:
    def test_model_file_exists(self):
        assert MODEL_PATH.exists(), "trained_model.pkl not found — run training first"

    def test_report_file_exists(self):
        assert REPORT_PATH.exists(), "training_report.json not found — run training first"

    def test_load_trained_model(self):
        model, classes = load_trained_model()
        assert model is not None
        assert len(classes) >= 200

    def test_trained_model_predict(self):
        model, classes = load_trained_model()
        features = np.random.rand(1, 12).astype(np.float32)
        pred = model.predict(features)
        assert len(pred) == 1
        assert pred[0] in range(len(classes))

    def test_trained_model_predict_proba(self):
        model, classes = load_trained_model()
        features = np.random.rand(5, 12).astype(np.float32)
        probas = model.predict_proba(features)
        assert probas.shape == (5, len(classes))
        np.testing.assert_allclose(probas.sum(axis=1), 1.0, atol=1e-5)

    def test_report_structure(self):
        with open(REPORT_PATH) as f:
            report = json.load(f)
        assert "dataset" in report
        assert "supervised" in report
        assert "unsupervised" in report
        assert "best_model" in report
        assert "learning_curve" in report

    def test_best_model_accuracy_good(self):
        with open(REPORT_PATH) as f:
            report = json.load(f)
        acc = report["best_model"]["accuracy"]
        assert acc >= 0.80, f"Best model accuracy too low: {acc:.3f} (expected >= 0.80)"

    def test_supervised_all_three_present(self):
        with open(REPORT_PATH) as f:
            report = json.load(f)
        assert set(report["supervised"].keys()) == {"KNN", "RandomForest", "SVM"}

    def test_kmeans_in_report(self):
        with open(REPORT_PATH) as f:
            report = json.load(f)
        km = report["unsupervised"]["kmeans"]
        assert "ari" in km
        assert "purity" in km
        assert km["purity"] >= 0.0

    def test_pca_in_report(self):
        with open(REPORT_PATH) as f:
            report = json.load(f)
        pca = report["unsupervised"]["pca"]
        assert "explained_variance_ratio" in pca
        assert "n_components_for_95pct" in pca


# ── API endpoint tests ────────────────────────────────────────────────────────

class TestMLAPI:
    @pytest.fixture(scope="class")
    def client(self):
        from fastapi.testclient import TestClient
        from backend.main import app
        return TestClient(app)

    def test_classify_with_landmarks(self, client):
        landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0}] * 21
        resp = client.post("/api/sign/classify", json={"landmarks": landmarks})
        assert resp.status_code == 200
        data = resp.json()
        assert "predicted_sign" in data
        assert "confidence" in data
        assert 0.0 <= data["confidence"] <= 1.0
        assert isinstance(data["alternatives"], list)

    def test_classify_empty_landmarks(self, client):
        resp = client.post("/api/sign/classify", json={"landmarks": []})
        assert resp.status_code == 422

    def test_classify_returns_valid_response(self, client):
        # Endpoint always returns 200 with a predicted_sign, regardless of
        # whether the stored model supports the new 126-feature format.
        # (Feature-count mismatch → graceful fallback to mock, not a 500 error.)
        landmarks = [{"x": 0.5, "y": 0.4, "z": 0.0, "visibility": 1.0}] * 21
        resp = client.post("/api/sign/classify", json={"landmarks": landmarks})
        assert resp.status_code == 200
        data = resp.json()
        assert "predicted_sign" in data
        assert isinstance(data["predicted_sign"], str)
        assert 0.0 <= data["confidence"] <= 1.0

    def test_get_ml_report(self, client):
        resp = client.get("/api/ml/report")
        assert resp.status_code == 200
        data = resp.json()
        assert "best_model" in data
        assert "supervised" in data
        assert "unsupervised" in data

    def test_get_ml_report_accuracy_field(self, client):
        resp = client.get("/api/ml/report")
        assert resp.status_code == 200
        acc = resp.json()["best_model"]["accuracy"]
        assert isinstance(acc, float)
        assert 0.0 < acc <= 1.0

    def test_train_endpoint_smoke(self, client):
        """Light smoke test — 10 samples/sign so it finishes fast."""
        resp = client.post("/api/ml/train", json={
            "samples_per_sign": 10,
            "n_folds": 3,
            "kmeans_clusters": 5,
        }, timeout=120)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "report" in data
        assert "best_model" in data["report"]
