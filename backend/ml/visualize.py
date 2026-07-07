"""
SignBridge ML — Training Visualizer
=====================================
Reads training_report.json and produces:
  1. Loss curve (train vs val) per neural net
  2. Accuracy curve (train / val / val-top3) per neural net
  3. Confusion matrix heatmap (top-N most confused pairs)
  4. Per-class accuracy bar chart (worst 30 classes)
  5. Model comparison bar chart (all models)

Usage
-----
    python -m backend.ml.visualize                         # uses default report path
    python -m backend.ml.visualize --report path/to/report.json
    python -m backend.ml.visualize --out plots/            # custom output directory
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")           # no display required
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec


# ── Helpers ────────────────────────────────────────────────────────────────────

def _savefig(fig, path: Path, title: str):
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {path}")


# ── 1 & 2. Training curves ─────────────────────────────────────────────────────

def plot_training_curves(nn_name: str, nn_data: dict, out_dir: Path):
    h = nn_data.get("history", {})
    if not h or not h.get("train_loss"):
        print(f"  [{nn_name}] No training history — skipping curves.")
        return

    epochs    = range(1, len(h["train_loss"]) + 1)
    train_loss = h["train_loss"]
    val_loss   = h["val_loss"]
    train_acc  = h["train_acc"]
    val_acc    = h["val_acc"]
    val_top3   = h.get("val_top3", [])

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    fig.suptitle(f"{nn_name} — Training Curves", fontsize=14, fontweight="bold")

    # Loss
    ax1.plot(epochs, train_loss, label="Train loss", color="#2196F3")
    ax1.plot(epochs, val_loss,   label="Val loss",   color="#F44336")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Cross-entropy loss")
    ax1.set_title("Loss")
    ax1.legend()
    ax1.grid(alpha=0.3)

    # Accuracy
    ax2.plot(epochs, [v * 100 for v in train_acc], label="Train acc",  color="#2196F3")
    ax2.plot(epochs, [v * 100 for v in val_acc],   label="Val acc",    color="#F44336")
    if val_top3:
        ax2.plot(epochs, [v * 100 for v in val_top3], label="Val Top-3", color="#4CAF50", linestyle="--")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy (%)")
    ax2.set_title("Accuracy")
    ax2.legend()
    ax2.grid(alpha=0.3)

    # Annotate final values
    final_val = val_acc[-1] * 100
    final_top3 = val_top3[-1] * 100 if val_top3 else None
    note = f"Final val: {final_val:.1f}%"
    if final_top3:
        note += f"  |  Top-3: {final_top3:.1f}%"
    fig.text(0.5, -0.02, note, ha="center", fontsize=11, color="#555")

    out = out_dir / f"{nn_name.lower()}_training_curves.png"
    _savefig(fig, out, nn_name)


# ── 3. Confusion matrix ────────────────────────────────────────────────────────

def plot_confusion_matrix(nn_name: str, nn_data: dict, out_dir: Path, top_n: int = 25):
    per_class = nn_data.get("per_class", {})
    if not per_class:
        print(f"  [{nn_name}] No per-class data — skipping confusion matrix.")
        return

    # Build class list and recall/precision arrays from per_class report
    classes = [k for k in per_class if k not in ("accuracy", "macro avg", "weighted avg")]
    if not classes:
        return

    # Extract worst-confused pairs from the test evaluation section
    # (stored in training_report.json under 'worst_confusions' for sklearn,
    #  but for NN we only have per_class report — reconstruct a proxy from low recall)
    recalls = np.array([per_class[c].get("recall", 0.0) for c in classes])

    # Show bottom-N classes by recall
    n_show = min(top_n, len(classes))
    worst_idx = np.argsort(recalls)[:n_show]
    worst_classes = [classes[i] for i in worst_idx]
    worst_recalls = recalls[worst_idx]
    worst_precisions = np.array([per_class[c].get("precision", 0.0) for c in worst_classes])
    worst_f1 = np.array([per_class[c].get("f1-score", 0.0) for c in worst_classes])

    fig, ax = plt.subplots(figsize=(14, max(6, n_show * 0.4)))
    y = np.arange(n_show)
    bar_h = 0.28

    ax.barh(y + bar_h, worst_precisions * 100, bar_h, label="Precision", color="#2196F3", alpha=0.85)
    ax.barh(y,         worst_recalls    * 100, bar_h, label="Recall",    color="#F44336", alpha=0.85)
    ax.barh(y - bar_h, worst_f1         * 100, bar_h, label="F1",        color="#4CAF50", alpha=0.85)

    ax.set_yticks(y)
    ax.set_yticklabels(worst_classes, fontsize=8)
    ax.set_xlabel("Score (%)")
    ax.set_title(f"{nn_name} — {n_show} Worst Classes by Recall", fontweight="bold")
    ax.axvline(50, color="grey", linestyle="--", linewidth=0.8, alpha=0.5)
    ax.legend()
    ax.grid(axis="x", alpha=0.3)
    fig.tight_layout()

    out = out_dir / f"{nn_name.lower()}_worst_classes.png"
    _savefig(fig, out, nn_name)


# ── 4. Per-class accuracy distribution ────────────────────────────────────────

def plot_accuracy_distribution(nn_name: str, nn_data: dict, out_dir: Path):
    per_class = nn_data.get("per_class", {})
    if not per_class:
        return

    classes = [k for k in per_class if k not in ("accuracy", "macro avg", "weighted avg")]
    if not classes:
        return

    recalls = [per_class[c].get("recall", 0.0) * 100 for c in classes]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.hist(recalls, bins=20, color="#2196F3", edgecolor="white", alpha=0.85)
    ax.axvline(np.mean(recalls), color="#F44336", linestyle="--", linewidth=1.5,
               label=f"Mean: {np.mean(recalls):.1f}%")
    ax.set_xlabel("Per-class Recall (%)")
    ax.set_ylabel("Number of classes")
    ax.set_title(f"{nn_name} — Per-class Accuracy Distribution", fontweight="bold")
    ax.legend()
    ax.grid(alpha=0.3)

    pct_above_50 = 100 * sum(r >= 50 for r in recalls) / len(recalls)
    fig.text(0.5, -0.02, f"{pct_above_50:.0f}% of classes score ≥ 50%",
             ha="center", fontsize=10, color="#555")

    out = out_dir / f"{nn_name.lower()}_accuracy_distribution.png"
    _savefig(fig, out, nn_name)


# ── 5. Model comparison ────────────────────────────────────────────────────────

def plot_model_comparison(report: dict, out_dir: Path):
    names, accs = [], []

    for name, data in report.get("sklearn", {}).items():
        ev = data.get("test_evaluation", {})
        if ev.get("accuracy") is not None:
            names.append(name)
            accs.append(ev["accuracy"] * 100)

    for name, data in report.get("neural_nets", {}).items():
        if data.get("test_accuracy") is not None:
            names.append(name)
            accs.append(data["test_accuracy"] * 100)

    if not names:
        return

    order = np.argsort(accs)[::-1]
    names = [names[i] for i in order]
    accs  = [accs[i]  for i in order]

    colors = ["#4CAF50" if a == max(accs) else "#2196F3" for a in accs]
    fig, ax = plt.subplots(figsize=(max(6, len(names) * 1.2), 5))
    bars = ax.bar(names, accs, color=colors, edgecolor="white", width=0.6)

    for bar, acc in zip(bars, accs):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                f"{acc:.1f}%", ha="center", va="bottom", fontsize=10, fontweight="bold")

    ds   = report.get("data_source", "?")
    n_cl = report.get("dataset", {}).get("n_classes", "?")
    ax.set_ylabel("Test Accuracy (%)")
    ax.set_title(f"Model Comparison — {ds.upper()} ({n_cl} classes)", fontweight="bold")
    ax.axhline(100 / float(n_cl) if isinstance(n_cl, int) else 1,
               color="red", linestyle="--", linewidth=1, alpha=0.5, label="Random baseline")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    ax.set_ylim(0, max(accs) * 1.2)
    fig.tight_layout()

    out = out_dir / "model_comparison.png"
    _savefig(fig, out, "comparison")


# ── 6. Overfit gap chart ────────────────────────────────────────────────────────

def plot_overfit_gap(report: dict, out_dir: Path):
    nn_data = report.get("neural_nets", {})
    if not nn_data:
        return

    for nn_name, data in nn_data.items():
        h = data.get("history", {})
        if not h:
            continue
        train_acc = [v * 100 for v in h.get("train_acc", [])]
        val_acc   = [v * 100 for v in h.get("val_acc",   [])]
        if not train_acc:
            continue

        gap = [t - v for t, v in zip(train_acc, val_acc)]
        epochs = range(1, len(gap) + 1)

        fig, ax = plt.subplots(figsize=(10, 4))
        ax.fill_between(epochs, gap, alpha=0.3, color="#FF5722")
        ax.plot(epochs, gap, color="#FF5722", linewidth=1.5)
        ax.axhline(0, color="grey", linestyle="--", linewidth=0.8)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("Train acc − Val acc (pp)")
        ax.set_title(f"{nn_name} — Overfit Gap Over Training", fontweight="bold")
        ax.grid(alpha=0.3)

        final_gap = gap[-1]
        ax.text(0.98, 0.95, f"Final gap: {final_gap:.1f}pp",
                transform=ax.transAxes, ha="right", va="top",
                fontsize=11, color="#FF5722")

        out = out_dir / f"{nn_name.lower()}_overfit_gap.png"
        _savefig(fig, out, nn_name)


# ── Main ───────────────────────────────────────────────────────────────────────

def visualize(report_path: Path, out_dir: Path):
    print(f"\nReading: {report_path}")
    with open(report_path) as f:
        report = json.load(f)

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output:  {out_dir}\n")

    # Per-neural-net plots
    for nn_name, nn_data in report.get("neural_nets", {}).items():
        print(f"[{nn_name}]")
        plot_training_curves(nn_name, nn_data, out_dir)
        plot_confusion_matrix(nn_name, nn_data, out_dir)
        plot_accuracy_distribution(nn_name, nn_data, out_dir)
        plot_overfit_gap(report, out_dir)

    # Cross-model comparison
    print("[All models]")
    plot_model_comparison(report, out_dir)

    print(f"\nDone. {len(list(out_dir.glob('*.png')))} plots saved to {out_dir}")


if __name__ == "__main__":
    HERE = Path(__file__).parent

    ap = argparse.ArgumentParser(description="Visualize SignBridge training report")
    ap.add_argument("--report", default=str(HERE / "training_report.json"))
    ap.add_argument("--out",    default=str(HERE / "plots"))
    args = ap.parse_args()

    visualize(Path(args.report), Path(args.out))
