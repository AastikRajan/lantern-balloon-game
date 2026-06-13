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

    # seed some currency so the shop is interactive
    page.add_init_script("""window.localStorage.setItem('lantern.save.v1',
        JSON.stringify({version:1,embers:300,bestScore:120,wispsTotal:5,upgrades:{flameCap:1},
        ownedSkins:['ember'],lanternSkin:'ember',shieldSkin:'ember',goals:[],daily:{date:'',best:0,streak:0}}));""")
    page.goto(f"http://localhost:{PORT}", wait_until="networkidle")
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{OUT}/meta_home.png")

    page.click("text=Workshop")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}/meta_shop.png")

    # buy a skin if affordable, then equip
    try:
        page.click(".shop-row >> text=Equip", timeout=1500)
    except Exception:
        pass
    page.wait_for_timeout(300)
    print(json.dumps({"errors": errors}, indent=2))
    browser.close()
