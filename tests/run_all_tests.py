#!/usr/bin/env python3
"""
TRADUMUST — Master Test Runner
================================
Runs every test suite in the project and produces a unified HTML + JSON report.

Usage:
    python tests/run_all_tests.py              # All suites
    python tests/run_all_tests.py --fast       # Skip soak/stress k6
    python tests/run_all_tests.py --suite k6   # Only k6 tests
    python tests/run_all_tests.py --suite py   # Only Python tests
    python tests/run_all_tests.py --suite js   # Only JS tests
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
RESULTS_DIR = ROOT / "tests" / "results"
RESULTS_DIR.mkdir(exist_ok=True)

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def run(label: str, cmd: list[str], cwd=ROOT, timeout=600) -> dict:
    """Run a command, capture output, return result dict."""
    print(f"\n{CYAN}{BOLD}[>] {label}{RESET}")
    print(f"  {' '.join(str(c) for c in cmd)}")
    t0 = time.perf_counter()
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        elapsed = time.perf_counter() - t0
        passed  = result.returncode == 0

        status_str = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
        print(f"  Status: {status_str} ({elapsed:.1f}s)")

        if not passed and result.stdout:
            # Print last 40 lines of stdout on failure, sanitized for Windows console
            lines = result.stdout.splitlines()[-40:]
            for line in lines:
                sanitized = line.encode('ascii', 'replace').decode('ascii')
                print(f"  {sanitized}")
        if result.stderr:
            lines = result.stderr.splitlines()[-20:]
            for line in lines:
                sanitized = line.encode('ascii', 'replace').decode('ascii')
                print(f"  {YELLOW}stderr:{RESET} {sanitized}")

        return {
            "label":   label,
            "cmd":     " ".join(str(c) for c in cmd),
            "passed":  passed,
            "elapsed": round(elapsed, 2),
            "stdout":  result.stdout[-4000:],
            "stderr":  result.stderr[-2000:],
            "returncode": result.returncode,
        }

    except subprocess.TimeoutExpired:
        elapsed = time.perf_counter() - t0
        print(f"  {RED}TIMEOUT after {elapsed:.0f}s{RESET}")
        return {
            "label":   label,
            "cmd":     " ".join(str(c) for c in cmd),
            "passed":  False,
            "elapsed": round(elapsed, 2),
            "stdout":  "",
            "stderr":  f"TIMEOUT after {elapsed:.0f}s",
            "returncode": -1,
        }
    except FileNotFoundError as e:
        print(f"  {RED}SKIPPED (command not found): {e}{RESET}")
        return {
            "label":   label,
            "cmd":     " ".join(str(c) for c in cmd),
            "passed":  None,  # None = skipped
            "elapsed": 0,
            "stdout":  "",
            "stderr":  str(e),
            "returncode": -2,
        }


def python_exe():
    venv = ROOT / ".venv" / "Scripts" / "python.exe"
    if venv.exists():
        return str(venv)
    return sys.executable


def pytest(*args):
    return [python_exe(), "-m", "pytest", *args, "-v", "--tb=short", "-q"]


def node(*args):
    return ["node", *args]


def k6(*args):
    return ["C:\\PROGRA~1\\k6\\k6.exe", "run", *args]


def make_report(results: list[dict]) -> dict:
    passed  = [r for r in results if r["passed"] is True]
    failed  = [r for r in results if r["passed"] is False]
    skipped = [r for r in results if r["passed"] is None]
    total   = len(results)
    return {
        "timestamp":   datetime.utcnow().isoformat() + "Z",
        "total":       total,
        "passed":      len(passed),
        "failed":      len(failed),
        "skipped":     len(skipped),
        "pass_rate":   f"{len(passed)/max(total-len(skipped),1)*100:.1f}%",
        "total_time_s":round(sum(r["elapsed"] for r in results), 1),
        "results":     results,
    }


def _extract_k6_metrics() -> list[dict]:
    """Read all k6 summary JSON files and extract key performance metrics."""
    k6_dir = RESULTS_DIR.parent / "k6" / "results"
    metrics = []
    if not k6_dir.exists():
        return metrics
    for f in sorted(k6_dir.glob("*-summary.json")):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            # The standardised handleSummary stores the full k6 data object
            m = data.get("metrics", data)  # handle both raw and wrapped
            http_reqs   = m.get("http_reqs",       {}).get("values", {})
            http_dur    = m.get("http_req_duration",{}).get("values", {})
            http_failed = m.get("http_req_failed",  {}).get("values", {})
            metrics.append({
                "name":        f.stem.replace("_summary", "").replace("-summary", "").replace("_", " ").title(),
                "total_reqs":  http_reqs.get("count", "N/A"),
                "rps":         round(http_reqs.get("rate", 0), 1),
                "avg_ms":      round(http_dur.get("avg",    0), 1),
                "p50_ms":      round(http_dur.get("med",    0), 1),
                "p90_ms":      round(http_dur.get("p(90)",  0), 1),
                "p95_ms":      round(http_dur.get("p(95)",  0), 1),
                "p99_ms":      round(http_dur.get("p(99)",  0), 1),
                "max_ms":      round(http_dur.get("max",    0), 1),
                "error_rate":  round(http_failed.get("rate", 0) * 100, 2),
            })
        except Exception:
            continue
    return metrics


def save_report(report: dict):
    ts   = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    json_path = RESULTS_DIR / f"report_{ts}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\n  JSON report: {json_path}")

    # ── Extract k6 performance metrics ────────────────────────────────────────
    k6_metrics = _extract_k6_metrics()

    # ── HTML report ───────────────────────────────────────────────────────────
    rows = ""
    for r in report["results"]:
        if r["passed"] is True:
            status = "PASS"
            cls    = "pass"
            icon   = "&#x2705;"
        elif r["passed"] is False:
            status = "FAIL"
            cls    = "fail"
            icon   = "&#x274C;"
        else:
            status = "SKIP"
            cls    = "skip"
            icon   = "&#x23ED;"
        # Escape HTML in output
        safe_out = (r['stdout'][-2000:]
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;"))
        rows += f"""
        <tr class="{cls}">
          <td>{r['label']}</td>
          <td class="status">{icon} {status}</td>
          <td>{r['elapsed']}s</td>
          <td><details><summary>output</summary><pre>{safe_out}</pre></details></td>
        </tr>"""

    # Performance section
    perf_rows = ""
    if k6_metrics:
        for m in k6_metrics:
            perf_rows += f"""
            <tr>
              <td class="perf-name">{m['name']}</td>
              <td>{m['total_reqs']}</td>
              <td>{m['rps']}</td>
              <td>{m['avg_ms']}</td>
              <td>{m['p50_ms']}</td>
              <td>{m['p90_ms']}</td>
              <td class="highlight">{m['p95_ms']}</td>
              <td class="highlight">{m['p99_ms']}</td>
              <td>{m['max_ms']}</td>
              <td class="{'err-ok' if m['error_rate'] < 1 else 'err-bad'}">{m['error_rate']}%</td>
            </tr>"""

    perf_section = ""
    if k6_metrics:
        perf_section = f"""
        <h2>Performance &amp; Load Metrics</h2>
        <p class="meta">Extracted from k6 summary JSON files. All latencies in milliseconds.</p>
        <table class="perf-table">
          <thead>
            <tr>
              <th>Test</th><th>Total Reqs</th><th>RPS</th>
              <th>Avg</th><th>P50</th><th>P90</th><th>P95</th><th>P99</th><th>Max</th>
              <th>Error %</th>
            </tr>
          </thead>
          <tbody>{perf_rows}</tbody>
        </table>
        """

    # Coverage section
    endpoint_suites = [r for r in report["results"] if "Backend" in r["label"] or "Contract" in r["label"] or "Security" in r["label"] or "ML" in r["label"]]
    covered = sum(1 for s in endpoint_suites if s["passed"])
    total_suites = len(endpoint_suites)
    coverage_pct = f"{covered/max(total_suites,1)*100:.0f}%"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TraduMust Test Report &mdash; {ts}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * {{ box-sizing:border-box; margin:0; padding:0 }}
  body {{ font-family:'Inter',system-ui,sans-serif; background:#0a0c14; color:#e2e8f0; padding:2.5rem 3rem }}
  h1 {{ font-size:2.2rem; margin-bottom:0.3rem; background:linear-gradient(135deg,#a78bfa,#60a5fa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight:800 }}
  h2 {{ font-size:1.4rem; margin-top:2.5rem; margin-bottom:0.8rem; color:#c4b5fd; font-weight:700 }}
  .meta {{ color:#64748b; margin-bottom:1.5rem; font-size:0.85rem }}
  .summary {{ display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap }}
  .card {{ background:linear-gradient(145deg,#1a1d2e,#151829); border:1px solid #2d3452; border-radius:16px; padding:1.4rem 2rem; min-width:130px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.3) }}
  .card .num {{ font-size:2.8rem; font-weight:800; line-height:1 }}
  .card .label {{ font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; margin-top:0.4rem; font-weight:600 }}
  .card.pass .num {{ color:#4ade80 }}
  .card.fail .num {{ color:#f87171 }}
  .card.skip .num {{ color:#fbbf24 }}
  .card.total .num {{ color:#a78bfa }}
  .card.rate .num {{ color:#38bdf8 }}
  .card.time .num {{ font-size:1.8rem; color:#f0abfc }}
  table {{ width:100%; border-collapse:collapse; margin-bottom:1.5rem }}
  th {{ background:#1a1d2e; padding:0.85rem 1rem; text-align:left; color:#94a3b8; font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid #2d3452 }}
  td {{ padding:0.75rem 1rem; border-bottom:1px solid #1e2237; font-size:0.85rem; vertical-align:top }}
  tr.pass {{ background:rgba(74,222,128,0.06) }}
  tr.fail {{ background:rgba(248,113,113,0.08) }}
  tr.skip {{ background:rgba(251,191,36,0.06) }}
  tr:hover {{ background:rgba(255,255,255,0.03) }}
  .status {{ font-weight:700; white-space:nowrap }}
  pre {{ background:#0a0c14; padding:0.75rem; border-radius:8px; overflow:auto; font-size:0.72rem; max-height:300px; margin-top:0.5rem; border:1px solid #1e2237 }}
  details summary {{ cursor:pointer; color:#60a5fa; font-weight:600; font-size:0.8rem }}
  details summary:hover {{ color:#93c5fd }}
  .perf-table th {{ background:#1a1533 }}
  .perf-table td {{ text-align:center; font-variant-numeric:tabular-nums }}
  .perf-name {{ text-align:left!important; font-weight:600; color:#c4b5fd }}
  .highlight {{ color:#fbbf24; font-weight:700 }}
  .err-ok {{ color:#4ade80; font-weight:600 }}
  .err-bad {{ color:#f87171; font-weight:700 }}
  .coverage-bar {{ height:8px; background:#1e2237; border-radius:4px; overflow:hidden; margin:0.5rem 0 }}
  .coverage-bar-fill {{ height:100%; background:linear-gradient(90deg,#4ade80,#22d3ee); border-radius:4px; transition:width 0.5s }}
  footer {{ margin-top:3rem; text-align:center; color:#475569; font-size:0.75rem }}
</style>
</head>
<body>
<h1>TraduMust Test Report</h1>
<p class="meta">Generated: {report['timestamp']} &nbsp;|&nbsp; Total time: {report['total_time_s']}s &nbsp;|&nbsp; Pass rate: {report['pass_rate']}</p>

<div class="summary">
  <div class="card total"><div class="num">{report['total']}</div><div class="label">Total Suites</div></div>
  <div class="card pass"><div class="num">{report['passed']}</div><div class="label">Passed</div></div>
  <div class="card fail"><div class="num">{report['failed']}</div><div class="label">Failed</div></div>
  <div class="card skip"><div class="num">{report['skipped']}</div><div class="label">Skipped</div></div>
  <div class="card rate"><div class="num">{report['pass_rate']}</div><div class="label">Pass Rate</div></div>
  <div class="card time"><div class="num">{report['total_time_s']}s</div><div class="label">Total Time</div></div>
</div>

<h2>Backend Function Coverage</h2>
<p class="meta">{covered}/{total_suites} validation suites passing &mdash; {coverage_pct} coverage</p>
<div class="coverage-bar"><div class="coverage-bar-fill" style="width:{coverage_pct}"></div></div>

{perf_section}

<h2>Suite Results</h2>
<table>
<thead><tr><th>Suite</th><th>Status</th><th>Time</th><th>Output</th></tr></thead>
<tbody>{rows}</tbody>
</table>

<footer>TraduMust &mdash; Comprehensive Test Report &mdash; Generated by run_all_tests.py</footer>
</body>
</html>"""

    html_path = RESULTS_DIR / f"report_{ts}.html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  HTML report: {html_path}")
    return json_path, html_path



def main():
    parser = argparse.ArgumentParser(description="TraduMust master test runner")
    parser.add_argument("--suite", choices=["py","js","k6","all"], default="all")
    parser.add_argument("--fast",  action="store_true", help="Skip slow soak/stress tests")
    args = parser.parse_args()

    results = []

    # ── Python suites ─────────────────────────────────────────────────────────
    if args.suite in ("py","all"):
        results.append(run("Backend API Tests",
            pytest("tests/backend/test_api.py")))

        results.append(run("Contract Tests",
            pytest("tests/backend/test_contracts.py")))

        results.append(run("Security Tests",
            pytest("tests/backend/test_security.py")))

        results.append(run("ML Feature Extractor Tests",
            pytest("tests/ml/test_feature_extractor.py")))

        results.append(run("ML Pipeline Tests",
            pytest("tests/ml/test_ml_pipeline.py")))

        results.append(run("Load Tests (Python)",
            pytest("tests/load/backend_load_test.py"), timeout=300))

    # ── JavaScript / Node suites ──────────────────────────────────────────────
    if args.suite in ("js","all"):
        results.append(run("Unit: Sign Mapper",
            node("--test", "tests/unit/sign-mapper.test.js")))

        results.append(run("Unit: Vocab 10k",
            node("--test", "tests/unit/vocab-10k.test.js")))

        results.append(run("Unit: Signer2D",
            node("--test", "tests/unit/signer2d.test.js")))

        results.append(run("Dynamic / Fuzz Tests",
            node("--test", "tests/dynamic/dynamic.test.js")))

        results.append(run("Integration: Pipeline",
            node("--test", "tests/integration/pipeline.test.js")))

        results.append(run("Performance: Sign Mapper",
            node("--test", "tests/perf/sign-mapper.perf.js")))

        results.append(run("Stress: Sign Mapper",
            node("--test", "tests/stress/sign-mapper.stress.js")))

    # ── k6 suites ─────────────────────────────────────────────────────────────
    if args.suite in ("k6","all"):
        # Ensure results dir exists for k6 JSON output
        (ROOT / "tests" / "k6" / "results").mkdir(parents=True, exist_ok=True)

        results.append(run("k6 Smoke Test",
            k6("tests/k6/k6-smoke.js"), timeout=120))

        if not args.fast:
            results.append(run("k6 Load Test (4 min)",
                k6("tests/k6/k6-load.js"), timeout=360))

            results.append(run("k6 Spike Test",
                k6("tests/k6/k6-spike.js"), timeout=120))

            results.append(run("k6 Stress Test (3 min)",
                k6("tests/k6/k6-stress.js"), timeout=300))

            results.append(run("k6 Soak Test (10 min) [slow]",
                k6("tests/k6/k6-soak.js"), timeout=700))
        else:
            print(f"\n{YELLOW}>> Skipping k6 load/soak/stress (--fast){RESET}")

    # Summary
    report = make_report(results)
    save_report(report)

    passed  = report["passed"]
    failed  = report["failed"]
    skipped = report["skipped"]
    total   = report["total"]

    print(f"\n{'='*60}")
    print(f"{BOLD}RESULTS: {GREEN}{passed} passed{RESET}{BOLD}, {RED}{failed} failed{RESET}{BOLD}, {YELLOW}{skipped} skipped{RESET}{BOLD} / {total} suites{RESET}")
    print(f"Pass rate : {report['pass_rate']}")
    print(f"Total time: {report['total_time_s']}s")
    print("="*60)

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
