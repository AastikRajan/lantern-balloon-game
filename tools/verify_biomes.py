import json, sys, math
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
    page.wait_for_timeout(1000)
    page.click("text=Rise")

    # keep the shield gently sweeping so the lantern survives the climb
    shots = {2: "biome1", 16: "biome2", 30: "biome3", 46: "biome4"}
    t = 0.0
    next_targets = sorted(shots.keys())
    step = 0.1
    while t <= 47:
        x = 206 + math.sin(t * 1.6) * 120
        y = 470 + math.cos(t * 1.1) * 50
        page.mouse.move(x, y)
        page.wait_for_timeout(int(step * 1000))
        t += step
        if next_targets and t >= next_targets[0]:
            sec = next_targets.pop(0)
            page.screenshot(path=f"{OUT}/biome_{sec:02d}s_{shots[sec]}.png")

    print(json.dumps({"errors": errors}, indent=2))
    browser.close()
