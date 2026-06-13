import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
    ])
    page = browser.new_page(viewport={"width": 412, "height": 915})
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))

    page.goto("http://localhost:5173", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.click("text=Rise")
    page.wait_for_timeout(4000)  # let obstacles spawn; do NOT swipe

    # Pull diagnostic state off window (exposed by main.ts when present)
    state = page.evaluate("""() => {
        const w = window;
        return w.__lanternDebug ? w.__lanternDebug() : 'no-debug-hook';
    }""")
    page.screenshot(path="D:/Code/rise up protect the balloon/tools/shots/diag.png")
    print(json.dumps({"state": state, "logs": logs[-10:]}, indent=2, default=str))
    browser.close()
