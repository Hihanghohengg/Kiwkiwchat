import asyncio
import os
import subprocess
import time
from playwright.async_api import async_playwright

async def run_e2e_test():
    print("[*] Starting Backend and Frontend servers for E2E Test...")
    
    # Start Backend
    backend = subprocess.Popen(
        "python backend/main.py",
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Start Frontend (Assuming Vite dev server on 5173 or 4173)
    frontend = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd="frontend",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Give servers time to start
    print("[*] Waiting for servers to start...")
    await asyncio.sleep(5)
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            # Peer 1 (Creator)
            context1 = await browser.new_context()
            page1 = await context1.new_page()
            
            # Peer 2 (Invitee)
            context2 = await browser.new_context()
            page2 = await context2.new_page()
            
            print("[*] Navigating Creator to Home...")
            await page1.goto("http://localhost:5173")
            
            print("[*] Creating Room...")
            await page1.click("button.btn-create")
            
            # Wait for URL to change to /rooms/...
            await page1.wait_for_url("**/rooms/*")
            room_url = page1.url
            print(f"[*] Room Created: {room_url}")
            
            # Wait for Secure P2P Active on Creator
            await page1.wait_for_selector("text=Waiting for peer...")
            
            print("[*] Navigating Invitee to Room URL...")
            await page2.goto(room_url)
            
            # Wait for P2P connection to establish on both ends
            print("[*] Waiting for WebRTC P2P Connection...")
            await page1.wait_for_selector("text=Secure P2P Channel Active", timeout=15000)
            await page2.wait_for_selector("text=Secure P2P Channel Active", timeout=15000)
            print("[+] P2P Connection Established Successfully!")
            
            # Send message from Creator to Invitee
            print("[*] Sending message from Creator -> Invitee...")
            await page1.fill("input.msg-input", "Hello from Creator!")
            await page1.click("button.btn-send")
            
            # Verify Invitee received it
            await page2.wait_for_selector("text=Hello from Creator!", timeout=10000)
            print("[+] Invitee received message!")
            
            # Send message from Invitee to Creator
            print("[*] Sending message from Invitee -> Creator...")
            await page2.fill("input.msg-input", "Hello from Invitee!")
            await page2.click("button.btn-send")
            
            # Verify Creator received it
            await page1.wait_for_selector("text=Hello from Invitee!", timeout=10000)
            print("[+] Creator received message!")
            
            print("[+] All E2E Security & Functional Tests Passed!")
            await browser.close()
            
    except Exception as e:
        print(f"[-] Test Failed: {e}")
    finally:
        print("[*] Tearing down servers...")
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
