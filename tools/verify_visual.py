import json, sys
from playwright.sync_api import sync_playwright

OUT = "D:/Code/rise up protect the balloon/tools/shots"
PORT = sys.argv[1] if len(sys.argv) > 1 else "5174"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
        "--enable-unsafe-swiftshader",
    ])
    page = browser.new_page(viewport={"width": 412, "height": 915})
    errors = []
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    page.goto(f"http://localhost:{PORT}", wait_until="networkidle")
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{OUT}/01_home.png")

    page.click("text=Rise")
    page.wait_for_timeout(300)

    # Park the shield mid-screen so it's clearly visible under the "finger".
    page.mouse.move(206, 540)
    page.wait_for_timeout(1800)
    page.screenshot(path=f"{OUT}/02_shield.png")

    # Actively sweep the shield to intercept falling debris for a few seconds.
    import math
    for i in range(40):
        x = 206 + math.sin(i * 0.5) * 150
        y = 520 + math.cos(i * 0.3) * 60
        page.mouse.move(x, y)
        page.wait_for_timeout(80)
    page.screenshot(path=f"{OUT}/03_action.png")

    fps = page.evaluate("""() => new Promise(resolve => {
        let frames = 0; const start = performance.now();
        function tick(now){ frames++; if (now - start < 2500) requestAnimationFrame(tick);
            else resolve(Math.round(frames / ((now - start)/1000))); }
        requestAnimationFrame(tick);
    })""")

    print(json.dumps({"fps": fps, "errors": errors}, indent=2))
    browser.close()
