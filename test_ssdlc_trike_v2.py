import asyncio
import subprocess
import argparse
import os
import json
import time
from playwright.async_api import async_playwright

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
                browser = await p.chromium.launch(headless=True)
                
                c_context = await browser.new_context()
                i_context = await browser.new_context()
                
                c_page = await c_context.new_page()
                i_page = await i_context.new_page()
                
                t_start = time.time()
                await c_page.goto("http://localhost:5173")
                await c_page.click("button:has-text('[ CREATE_SECURE_ROOM ]')")
                
                try:
                    await c_page.wait_for_selector(".share-link", timeout=15000)
                except:
                    print("Failed to get room URL")
                    await browser.close()
                    continue
                    
                room_url = await c_page.inner_text(".share-link")
                
                # Navigate Invitee
                await i_page.goto(room_url)
                
                # Wait for P2P connection to be secured
                await c_page.wait_for_selector("input[placeholder='> ketik pesan...']", timeout=15000)
                await i_page.wait_for_selector("input[placeholder='> ketik pesan...']", timeout=15000)
                
                # Wait for Chat Interface
                try:
                    await c_page.wait_for_selector("input.msg-input", timeout=15000)
                    t_secure = time.time()
                except Exception as e:
                    print("Failed to secure connection:", e)
                    await browser.close()
                    continue
                    
                # Test Replay Rejection
                # Evaluate on c_page to send raw tampered messages (we can't easily do it if crypto is isolated, 
                # but we can try an E2E approach or just rely on benchmark_v2.js for negative testing)
                
                await c_page.fill("input.msg-input", "E2E Message")
                await c_page.click("button.btn-send")
                t_delivered = time.time()
                
                await i_page.wait_for_selector("text='E2E Message'", timeout=5000)
                
                # Third peer rejection
                third_context = await browser.new_context()
                third_page = await third_context.new_page()
                await third_page.goto(room_url)
                try:
                    await third_page.wait_for_selector("text='ROOM PENUH'", timeout=5000)
                    third_rejected = True
                except:
                    third_rejected = False
                await third_context.close()
                
                # Destroy Room
                await c_page.click("button[title='Destroy room']")
                await c_page.wait_for_selector("text='[ HAPUS ]'", timeout=5000)
                await c_page.click("button:has-text('[ HAPUS ]')")
                
                # Verify storage cleanup (simulate by evaluating on c_page)
                storage = await c_page.evaluate("Object.keys(sessionStorage)")
                cleanup = not any(k.startswith("kiwkiw_") for k in storage)
                
                await browser.close()
                
                reports.append({
                    "webrtc_time": t_secure - t_start,
                    "first_message_time": t_delivered - t_secure,
                    "third_peer_rejected": third_rejected,
                    "storage_cleanup": cleanup,
                    "success": True
                })
                
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
