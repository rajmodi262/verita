"""Capture README screenshots of the running Verita app with Playwright."""

import os
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5175"
CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample_transactions.csv"))
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots"))
os.makedirs(OUT, exist_ok=True)


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name))
    print("  saved", name)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=[
            "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist",
        ])
        page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)

        print("landing…")
        page.goto(BASE, wait_until="networkidle")
        time.sleep(4.0)  # hero animation + 3D
        shot(page, "01-landing.png")

        print("studio upload…")
        page.goto(f"{BASE}/studio", wait_until="networkidle")
        page.set_input_files("input[type=file]", CSV)
        # wait for the scan sequence to finish and the dashboard to mount
        page.wait_for_selector(".react-grid-item", timeout=30000)
        time.sleep(2.5)
        shot(page, "02-studio-dashboard.png")

        def click_tab(label):
            page.click(f"button:has-text('{label}')")
            time.sleep(2.2)

        print("investigator…")
        click_tab("Investigator")
        try:
            page.click("button:has-text('Run investigation')")
            page.wait_for_selector("text=Chain verified", timeout=30000)
            time.sleep(2.0)
            shot(page, "09-investigator.png")
        except Exception as e:
            print("  investigator skipped:", e)

        print("insights…");      click_tab("Key Findings");  shot(page, "03-key-findings.png")
        print("relationships…"); click_tab("Relationships"); time.sleep(1.5); shot(page, "04-relationships.png")
        try:
            print("map…");        click_tab("Map");           time.sleep(2.5); shot(page, "05-map.png")
        except Exception as e:
            print("  map tab skipped:", e)
        print("sql…")
        click_tab("SQL")
        try:
            page.click("button:has-text('Run')")
            time.sleep(1.8)
        except Exception:
            pass
        shot(page, "06-sql.png")

        print("risk engine…")
        page.goto(f"{BASE}/risk", wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=30000)
        time.sleep(3.0)
        shot(page, "07-risk-engine.png")

        print("nlp…")
        page.goto(f"{BASE}/nlp", wait_until="networkidle")
        time.sleep(1.0)
        try:
            page.click("button:has-text('Analyze')")
            time.sleep(2.0)
        except Exception:
            pass
        shot(page, "08-nlp.png")

        print("overview...")
        page.goto(f"{BASE}/overview", wait_until="networkidle")
        time.sleep(1.5)
        shot(page, "10-overview.png")

        print("settings...")
        page.goto(f"{BASE}/settings", wait_until="networkidle")
        time.sleep(1.2)
        shot(page, "11-settings.png")

        browser.close()
        print("done", OUT)


if __name__ == "__main__":
    main()
