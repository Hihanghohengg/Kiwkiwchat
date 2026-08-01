import asyncio
import argparse
import json
import os
import time
import subprocess
import statistics
import platform
from datetime import datetime
from playwright.async_api import async_playwright

def calc_stats(arr):
    if not arr: return {}
    arr = sorted(arr)
    n = len(arr)
    return {
        "mean": statistics.mean(arr),
        "median": statistics.median(arr),
        "min": min(arr),
        "max": max(arr),
        "stddev": statistics.stdev(arr) if n > 1 else 0,
        "p95": arr[int(0.95 * n)] if n > 1 else arr[0],
        "p99": arr[int(0.99 * n)] if n > 1 else arr[0],
        "samples": n
    }

async def run_benchmark(args):
    print(f"[*] Starting Vite dev server for Phase A/B Benchmarking...")
    frontend = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd="frontend",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    await asyncio.sleep(5)
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("http://localhost:5173")
            
            await page.add_script_tag(url="/benchmark_v2.js")
            
            print(f"[*] Running Benchmark (Warmup: {args.warmup}, Iterations: {args.iterations}, Runs: {args.runs})...")
            
            all_runs = []
            for run_idx in range(args.runs):
                print(f"    -> Run {run_idx+1}/{args.runs}")
                res = await page.evaluate(f"window.runBenchmarkV2({{ warmup: {args.warmup}, iterations: {args.iterations} }})")
                if res.get("errors"):
                    print("[-] Errors:", res["errors"])
                all_runs.append(res)
            
            await browser.close()
            
            # Aggregate Results
            agg = {
                "mlkem": {"keygen": [], "encap": [], "decap": []},
                "aes": {"keygen": [], "import": [], "enc1k": [], "dec1k": [], "enc10k": [], "dec10k": [], "enc100k": [], "dec100k": [], "enc1m": [], "dec1m": []},
                "hkdf": {"raw": [], "deriveHybrid": []},
                "hmac": {"import": [], "sign": [], "validVerify": [], "invalidVerify": []},
                "protocol": {"cold": [], "warm": [], "initiatorTime": [], "responderTime": [], "totalWallClock": [], "successRates": []}
            }
            
            negative_results = all_runs[-1].get("negative", {})
            
            for res in all_runs:
                for k in ["keygen", "encap", "decap"]:
                    agg["mlkem"][k].extend(res["mlkem"][k])
                for k in ["keygen", "import", "enc1k", "dec1k", "enc10k", "dec10k", "enc100k", "dec100k", "enc1m", "dec1m"]:
                    agg["aes"][k].extend(res["aes"][k])
                for k in ["deriveHybrid"]:
                    if res.get("hkdf") and k in res["hkdf"]:
                        agg["hkdf"][k].extend(res["hkdf"][k])
                for k in ["import", "sign", "validVerify", "invalidVerify"]:
                    agg["hmac"][k].extend(res["hmac"][k])
                
                if res["protocol"]["cold"]: agg["protocol"]["cold"].append(res["protocol"]["cold"])
                agg["protocol"]["warm"].extend(res["protocol"]["warm"])
                agg["protocol"]["initiatorTime"].extend(res["protocol"]["initiatorTime"])
                agg["protocol"]["responderTime"].extend(res["protocol"]["responderTime"])
                agg["protocol"]["totalWallClock"].extend(res["protocol"]["totalWallClock"])
                agg["protocol"]["successRates"].append(res["protocol"]["successRate"])
            
            stats = {
                "mlkem": {k: calc_stats(v) for k, v in agg["mlkem"].items()},
                "aes": {k: calc_stats(v) for k, v in agg["aes"].items()},
                "hkdf": {k: calc_stats(v) for k, v in agg["hkdf"].items()},
                "hmac": {k: calc_stats(v) for k, v in agg["hmac"].items()},
                "protocol": {
                    "cold": calc_stats(agg["protocol"]["cold"]),
                    "warm": calc_stats(agg["protocol"]["warm"]),
                    "initiatorTime": calc_stats(agg["protocol"]["initiatorTime"]),
                    "responderTime": calc_stats(agg["protocol"]["responderTime"]),
                    "totalWallClock": calc_stats(agg["protocol"]["totalWallClock"]),
                    "avgSuccessRate": statistics.mean(agg["protocol"]["successRates"]) if agg["protocol"]["successRates"] else 0
                }
            }
            
            # Manifest
            manifest = {
                "timestamp": datetime.utcnow().isoformat(),
                "os": platform.system() + " " + platform.release(),
                "cpu": platform.processor(),
                "python": platform.python_version(),
                "browser": "Chromium",
                "warmup": args.warmup,
                "iterations": args.iterations,
                "runs": args.runs,
                "headless": True
            }
            
            # Write JSON
            with open(os.path.join(args.output_dir, "crypto_benchmark_v2.json"), "w") as f:
                json.dump({"manifest": manifest, "stats": stats, "negative": negative_results, "raw": all_runs}, f, indent=2)
                
            with open(os.path.join(args.output_dir, "test_run_manifest.json"), "w") as f:
                json.dump(manifest, f, indent=2)
                
            # Write MD
            with open(os.path.join(args.output_dir, "crypto_benchmark_v2.md"), "w") as f:
                f.write("# Crypto Benchmark V2 Report\n\n")
                f.write("## Protocol (performPQUpgrade)\n")
                f.write(f"- Cold Start (mean): {stats['protocol']['cold'].get('mean', 0):.2f} ms\n")
                f.write(f"- Warm (median): {stats['protocol']['warm'].get('median', 0):.2f} ms\n")
                f.write(f"- Warm (p95): {stats['protocol']['warm'].get('p95', 0):.2f} ms\n")
                f.write(f"- Success Rate: {stats['protocol']['avgSuccessRate']:.2f}%\n")
                
                f.write("\n## ML-KEM-768\n")
                f.write(f"- Encap (median): {stats['mlkem']['encap'].get('median', 0):.2f} ms\n")
                f.write(f"- Decap (median): {stats['mlkem']['decap'].get('median', 0):.2f} ms\n")
                
                f.write("\n## Negative Security Tests\n")
                for k, v in negative_results.items():
                    f.write(f"- {k}: {'PASS' if v else 'FAIL'}\n")
                    
            print(f"[+] Artifacts saved to {args.output_dir}")
            
    finally:
        print("[*] Tearing down Vite server...")
        frontend.terminate()
        frontend.wait()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", default="chromium")
    parser.add_argument("--warmup", type=int, default=20)
    parser.add_argument("--iterations", type=int, default=200)
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    
    asyncio.run(run_benchmark(args))
