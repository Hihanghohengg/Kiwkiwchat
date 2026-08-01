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
                "hkdf": {"deriveSessionKeys": []},
                "hmac": {"import": [], "sign": [], "validVerify": [], "invalidVerify": []},
                "protocol": {"cold": [], "warm": [], "initiatorTime": [], "responderTime": [], "totalWallClock": [], "successRates": []},
                "protocolLatent": {"warm": [], "initiatorTime": [], "responderTime": [], "totalWallClock": [], "successRates": []}
            }
            
            negative_results = all_runs[-1].get("negative", {})
            
            for res in all_runs:
                for k in ["keygen", "encap", "decap"]:
                    agg["mlkem"][k].extend(res["mlkem"][k])
                for k in ["keygen", "import", "enc1k", "dec1k", "enc10k", "dec10k", "enc100k", "dec100k", "enc1m", "dec1m"]:
                    agg["aes"][k].extend(res["aes"][k])
                for k in ["deriveSessionKeys"]:
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
                
                if res.get("protocolLatent"):
                    agg["protocolLatent"]["warm"].extend(res["protocolLatent"]["warm"])
                    agg["protocolLatent"]["initiatorTime"].extend(res["protocolLatent"]["initiatorTime"])
                    agg["protocolLatent"]["responderTime"].extend(res["protocolLatent"]["responderTime"])
                    agg["protocolLatent"]["totalWallClock"].extend(res["protocolLatent"]["totalWallClock"])
                    agg["protocolLatent"]["successRates"].append(res["protocolLatent"]["successRate"])
            
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
                },
                "protocolLatent": {
                    "warm": calc_stats(agg["protocolLatent"]["warm"]),
                    "initiatorTime": calc_stats(agg["protocolLatent"]["initiatorTime"]),
                    "responderTime": calc_stats(agg["protocolLatent"]["responderTime"]),
                    "totalWallClock": calc_stats(agg["protocolLatent"]["totalWallClock"]),
                    "avgSuccessRate": statistics.mean(agg["protocolLatent"]["successRates"]) if agg["protocolLatent"]["successRates"] else 0
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
            with open(os.path.join(args.output_dir, "impkrip_environment.json"), "w") as f:
                json.dump(manifest, f, indent=2)
                
            # Write MD is no longer needed here as testing_summary handles it, or we can just skip it since the user wants impkrip_benchmark.csv
            
            # Write CSV & HTML
            with open(os.path.join(args.output_dir, "impkrip_benchmark.csv"), "w") as f:
                f.write("Metric,Median,p95,Min,Max\n")
                f.write(f"Protocol_0ms,{stats['protocol']['warm'].get('median', 0):.2f},{stats['protocol']['warm'].get('p95', 0):.2f},{stats['protocol']['warm'].get('min', 0):.2f},{stats['protocol']['warm'].get('max', 0):.2f}\n")
                f.write(f"Protocol_5ms,{stats['protocolLatent']['warm'].get('median', 0):.2f},{stats['protocolLatent']['warm'].get('p95', 0):.2f},{stats['protocolLatent']['warm'].get('min', 0):.2f},{stats['protocolLatent']['warm'].get('max', 0):.2f}\n")
                f.write(f"MLKEM_Encap,{stats['mlkem']['encap'].get('median', 0):.2f},{stats['mlkem']['encap'].get('p95', 0):.2f},{stats['mlkem']['encap'].get('min', 0):.2f},{stats['mlkem']['encap'].get('max', 0):.2f}\n")
                f.write(f"AES_Enc_1k,{stats['aes']['enc1k'].get('median', 0):.2f},{stats['aes']['enc1k'].get('p95', 0):.2f},{stats['aes']['enc1k'].get('min', 0):.2f},{stats['aes']['enc1k'].get('max', 0):.2f}\n")
                f.write(f"AES_Enc_10k,{stats['aes']['enc10k'].get('median', 0):.2f},{stats['aes']['enc10k'].get('p95', 0):.2f},{stats['aes']['enc10k'].get('min', 0):.2f},{stats['aes']['enc10k'].get('max', 0):.2f}\n")
                f.write(f"AES_Enc_100k,{stats['aes']['enc100k'].get('median', 0):.2f},{stats['aes']['enc100k'].get('p95', 0):.2f},{stats['aes']['enc100k'].get('min', 0):.2f},{stats['aes']['enc100k'].get('max', 0):.2f}\n")

            # Remove HTML output here since we only need the CSV and Environment. We will manually write testing_summary.md.
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
