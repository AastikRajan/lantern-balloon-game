import json
from playwright.sync_api import sync_playwright

OUT = "D:/Code/rise up protect the balloon/tools/shots"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl",
        "--ignore-gpu-blocklist",
    ])
    page = browser.new_page(viewport={"width": 412, "height": 915})  # mid-range phone
    errors = []
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    page.goto("http://localhost:5173", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/01_home.png")

    # Start the run
    page.click("text=Rise")
    page.wait_for_timeout(2500)  # let obstacles populate before touching anything
    page.screenshot(path=f"{OUT}/02_gameplay.png")
    # Simulate alternating swipes to gust obstacles, then let the lantern settle
    for i in range(4):
        x0, x1 = (120, 300) if i % 2 == 0 else (300, 120)
        page.mouse.move(x0, 560)
        page.mouse.down()
        page.mouse.move(x1, 540, steps=6)
        page.mouse.up()
        page.wait_for_timeout(700)
    page.wait_for_timeout(1600)  # settle: lantern should re-center

    # FPS sample over ~3s using rAF
    fps = page.evaluate("""() => new Promise(resolve => {
        let frames = 0; const start = performance.now();
        function tick(now){ frames++; if (now - start < 3000) requestAnimationFrame(tick);
            else resolve(Math.round(frames / ((now - start)/1000))); }
        requestAnimationFrame(tick);
    })""")

    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/03_gameplay_later.png")

    print(json.dumps({"fps": fps, "errors": errors}, indent=2))
    browser.close()
