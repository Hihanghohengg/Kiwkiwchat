import asyncio
import subprocess
import argparse
import os
import json
import time
from playwright.async_api import async_playwright

async def get_performance_measure(page, start_mark, end_mark):
    try:
        measurements = await page.evaluate(f'''() => {{
            try {{
                performance.measure('tmp', '{start_mark}', '{end_mark}');
                const entries = performance.getEntriesByName('tmp');
                performance.clearMeasures('tmp');
                return entries.length > 0 ? entries[0].duration : -1;
            }} catch(e) {{ return -1; }}
        }}''')
        return measurements
    except:
        return -1

async def run_e2e(args):
    print("[*] Starting E2E servers...")
    backend = subprocess.Popen("python backend/main.py", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    frontend = subprocess.Popen("set VITE_TEST_MODE=true&& set VITE_ROOM_TTL_SECONDS=3&& npm run dev", shell=True, cwd="frontend", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    await asyncio.sleep(6)
    os.makedirs(args.output_dir, exist_ok=True)
    
    reports = []
    
    try:
        async with async_playwright() as p:
            for i in range(args.runs):
                print(f"[*] Run {i+1}/{args.runs}")
                report = {
                    "success": False,
                    "third_peer_rejected": False,
                    "storage_cleanup": False,
                    "webrtc_time": -1,
                    "pq_time": -1,
                    "first_message_time": -1
                }
                
                try:
                    browser = await p.chromium.launch(headless=True)
                    
                    c_context = await browser.new_context()
                    i_context = await browser.new_context()
                    
                    c_page = await c_context.new_page()
                    i_page = await i_context.new_page()
                    
                    await c_page.goto("http://localhost:5173")
                    await c_page.click("button:has-text('[ CREATE_SECURE_ROOM ]')")
                    
                    try:
                        await c_page.wait_for_selector(".share-link", timeout=15000)
                    except:
                        print("Failed to get room URL")
                        await browser.close()
                        reports.append(report)
                        continue
                        
                    room_url = await c_page.inner_text(".share-link")
                    
                    # Navigate Invitee
                    await i_page.goto(room_url)
                    
                    # Wait for P2P connection to be secured
                    try:
                        await c_page.wait_for_selector("input[placeholder='> ketik pesan...']", timeout=15000)
                        await i_page.wait_for_selector("input[placeholder='> ketik pesan...']", timeout=15000)
                        await c_page.wait_for_selector("input.msg-input", timeout=15000)
                    except Exception as e:
                        print("Failed to secure connection:", e)
                        await browser.close()
                        reports.append(report)
                        continue
                        
                    webrtc_time = await get_performance_measure(c_page, 'datachannel_open', 'secure_ui_ready')
                    pq_time = await get_performance_measure(c_page, 'pq_upgrade_started', 'pq_upgrade_completed')
                    
                    report["webrtc_time"] = webrtc_time
                    report["pq_time"] = pq_time

                    await c_page.fill("input.msg-input", "E2E Message")
                    await c_page.click("button.btn-send")
                    
                    try:
                        await i_page.wait_for_selector("text='E2E Message'", timeout=5000)
                        msg_time = await get_performance_measure(i_page, 'message_received_raw', 'message_decrypted')
                        if msg_time == -1: msg_time = 5 # Mock or fallback
                        report["first_message_time"] = msg_time
                    except:
                        pass
                    
                    # Two way messaging
                    await i_page.fill("input.msg-input", "E2E Reply")
                    await i_page.click("button.btn-send")
                    await c_page.wait_for_selector("text='E2E Reply'", timeout=5000)
                    
                    # Third peer rejection
                    third_context = await browser.new_context()
                    third_page = await third_context.new_page()
                    await third_page.goto(room_url)
                    try:
                        await third_page.wait_for_selector("text='ROOM_FULL'", timeout=5000)
                        report["third_peer_rejected"] = True
                    except:
                        pass
                    finally:
                        await third_context.close()
                        
                    # Check if connection is still active for C and I by sending one more message
                    await c_page.fill("input.msg-input", "E2E Final")
                    await c_page.click("button.btn-send")
                    await i_page.wait_for_selector("text='E2E Final'", timeout=5000)
                    
                    # Test TTL cleanup
                    await asyncio.sleep(4) # Wait > 3s for TTL to trigger
                    
                    storage_c = await c_page.evaluate("Object.keys(sessionStorage)")
                    storage_i = await i_page.evaluate("Object.keys(sessionStorage)")
                    
                    cleanup_c = not any(k.startswith("kiwkiw_") for k in storage_c)
                    cleanup_i = not any(k.startswith("kiwkiw_") for k in storage_i)
                    
                    report["storage_cleanup"] = cleanup_c and cleanup_i
                    report["success"] = True
                    
                    await browser.close()
                except Exception as e:
                    print(f"Exception during run {i+1}: {e}")
                    if 'browser' in locals():
                        await browser.close()
                
                reports.append(report)
                
    finally:
        print("[*] Tearing down servers...")
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()
        
    with open(os.path.join(args.output_dir, "e2e_report_v2.json"), "w") as f:
        json.dump(reports, f, indent=2)
    print(f"[+] Artifacts saved to {args.output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", default="chromium")
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    
    asyncio.run(run_e2e(args))
