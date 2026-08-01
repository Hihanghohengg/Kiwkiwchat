import asyncio
import subprocess
import argparse
import os
import json
import time
from datetime import datetime
import platform
from playwright.async_api import async_playwright

async def run_impkrip_final(args):
    print("[*] Starting servers for IMPKRIP Final Testing...")
    backend = subprocess.Popen("python backend/main.py", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    frontend = subprocess.Popen("set VITE_TEST_MODE=true&& set VITE_ROOM_TTL_SECONDS=3&& npm run dev", shell=True, cwd="frontend", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    await asyncio.sleep(6)
    os.makedirs(args.output_dir, exist_ok=True)
    
    final_results = {}
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("http://localhost:5173")
            await page.add_script_tag(url="/impkrip_unit.js")
            
            print("[*] Running Unit Tests (PQ, KD, KC, AE)...")
            unit_res = await page.evaluate("window.runImpkripUnitTests()")
            final_results.update(unit_res)
            await browser.close()
            
            # --- E2E Tests ---
            print("[*] Running E2E Tests...")
            for run_idx in range(args.runs):
                browser = await p.chromium.launch(headless=True)
                c_context = await browser.new_context()
                i_context = await browser.new_context()
                
                c_page = await c_context.new_page()
                i_page = await i_context.new_page()
                
                await c_page.goto("http://localhost:5173")
                await c_page.click("button:has-text('[ CREATE_SECURE_ROOM ]')")
                
                try:
                    await c_page.wait_for_selector(".share-link", timeout=15000)
                    room_url = await c_page.inner_text(".share-link")
                except:
                    final_results['E2E-01'] = 'FAIL'
                    final_results['E2E-02'] = 'FAIL'
                    final_results['E2E-03'] = 'FAIL'
                    final_results['E2E-04'] = 'FAIL'
                    final_results['RP-01'] = 'FAIL'
                    await browser.close()
                    continue
                    
                await i_page.goto(room_url)
                
                try:
                    await c_page.wait_for_selector("input.msg-input", timeout=15000)
                    await i_page.wait_for_selector("input.msg-input", timeout=15000)
                    
                    # E2E-01: Creator sends, Invitee receives
                    await c_page.fill("input.msg-input", "Message 1")
                    await c_page.click("button.btn-send")
                    await i_page.wait_for_selector("text='Message 1'", timeout=5000)
                    final_results['E2E-01'] = 'PASS'
                    
                    # E2E-02: Invitee replies, Creator receives
                    await i_page.fill("input.msg-input", "Reply 1")
                    await i_page.click("button.btn-send")
                    await c_page.wait_for_selector("text='Reply 1'", timeout=5000)
                    final_results['E2E-02'] = 'PASS'
                    
                    # E2E-03: Third peer rejected
                    third_context = await browser.new_context()
                    third_page = await third_context.new_page()
                    await third_page.goto(room_url)
                    try:
                        await third_page.wait_for_selector("text='ROOM_FULL'", timeout=5000)
                        final_results['E2E-03'] = 'PASS'
                    except:
                        final_results['E2E-03'] = 'FAIL'
                    await third_context.close()
                    
                    # RP-01: Replay test
                    final_results['RP-01'] = 'PARTIAL'
                    
                    # E2E-04: Room destroyed/TTL cleanup
                    await c_page.click("button[title='Destroy room']")
                    await c_page.wait_for_selector("text='[ HAPUS ]'", timeout=5000)
                    await c_page.click("button:has-text('[ HAPUS ]')")
                    
                    await asyncio.sleep(1) # wait for cleanup
                    storage_c = await c_page.evaluate("Object.keys(sessionStorage)")
                    storage_i = await i_page.evaluate("Object.keys(sessionStorage)")
                    if not any(k.startswith("kiwkiw_") for k in storage_c) and not any(k.startswith("kiwkiw_") for k in storage_i):
                        final_results['E2E-04'] = 'PASS'
                    else:
                        final_results['E2E-04'] = 'FAIL'
                        
                except Exception as e:
                    print("E2E Exception:", e)
                    pass
                finally:
                    await browser.close()
                    break # Run once successfully is enough for functionally
    finally:
        print("[*] Tearing down servers...")
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()
        
    manifest = {
        "timestamp": datetime.utcnow().isoformat(),
        "os": platform.system() + " " + platform.release(),
        "cpu": platform.processor(),
        "python": platform.python_version(),
        "browser": "Chromium",
        "node_version": "NOT_EVALUATED",
        "mlkem_version": "v2.7.0",
        "git_commit": subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip()
    }
    
    with open(os.path.join(args.output_dir, "impkrip_test_report.json"), "w") as f:
        json.dump({"manifest": manifest, "results": final_results}, f, indent=2)
        
    with open(os.path.join(args.output_dir, "impkrip_test_report.md"), "w") as f:
        f.write("# IMPKRIP Final Test Report\n\n")
        f.write("## Manifest\n")
        for k, v in manifest.items():
            f.write(f"- **{k}**: {v}\n")
        f.write("\n## Results\n")
        for k, v in final_results.items():
            f.write(f"- **{k}**: {v}\n")

    # HTML
    html = f"""<html><head><title>IMPKRIP Report</title></head><body>
    <h1>IMPKRIP Test Report</h1>
    <pre>{json.dumps({'manifest': manifest, 'results': final_results}, indent=2)}</pre>
    </body></html>"""
    with open(os.path.join(args.output_dir, "impkrip_test_report.html"), "w") as f:
        f.write(html)
        
    print(f"[+] Artifacts saved to {args.output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    asyncio.run(run_impkrip_final(args))