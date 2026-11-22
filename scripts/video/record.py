"""Record phone-sized screen recordings of the LIVE site for the demo video.

Each segment is a fresh browser context recording to rec/<seg>.webm.
Results are whatever the live model returns at recording time.
"""

import json
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
REPO = Path("/home/claude/semak-mesej")
URL = "https://semak-mesej.vercel.app"
REC = HERE / "rec"
rows = {json.loads(l)["id"]: json.loads(l) for l in (REPO / "data/messages.jsonl").read_text().splitlines() if l.strip()}
VIEW = {"width": 390, "height": 844}
LOG = {}


def smooth_scroll(pg, y, ms=1600):
    pg.evaluate(
        """([y, ms]) => new Promise(res => {
            const s = window.scrollY, d = y - s, t0 = performance.now();
            function step(t){ const k = Math.min(1,(t-t0)/ms); const e = k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
              window.scrollTo(0, s + d*e); k<1 ? requestAnimationFrame(step) : res(); }
            requestAnimationFrame(step); })""",
        [y, ms],
    )


def type_slow(pg, text):
    pg.click("textarea")
    pg.fill("textarea", "")
    pg.keyboard.insert_text(text)  # instant insert reads as a paste


def check(pg, button, seg):
    with pg.expect_response("**/api/analyze", timeout=90000) as r:
        pg.get_by_role("button", name=button, exact=True).click()
    j = r.value.json()
    LOG.setdefault(seg, []).append(
        {"verdict": j.get("verdict"), "tactics": [f["tactic"] for f in j.get("findings", [])], "model": j.get("meta", {}).get("model")}
    )
    pg.wait_for_timeout(900)
    return j


def scroll_to_result(pg):
    y = pg.evaluate("document.querySelector('section[aria-live]')?.getBoundingClientRect().top + window.scrollY - 12")
    if y:
        smooth_scroll(pg, y)


def seg_a(pg):
    pg.wait_for_timeout(1200)
    type_slow(pg, rows["S004"]["text"])
    pg.wait_for_timeout(1200)
    smooth_scroll(pg, 260, 900)
    check(pg, "Check message", "segA")
    scroll_to_result(pg)
    pg.wait_for_timeout(1500)
    smooth_scroll(pg, pg.evaluate("window.scrollY") + 650, 2600)
    pg.wait_for_timeout(1200)
    smooth_scroll(pg, pg.evaluate("window.scrollY") + 900, 3500)
    pg.wait_for_timeout(1500)


def seg_b(pg, seg="segB"):
    pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Bahasa", exact=True).click()
    pg.wait_for_timeout(900)
    type_slow(pg, rows["S012"]["text"])
    pg.wait_for_timeout(1000)
    smooth_scroll(pg, 300, 900)
    check(pg, "Semak mesej", seg)
    scroll_to_result(pg)
    pg.wait_for_timeout(1500)
    smooth_scroll(pg, pg.evaluate("window.scrollY") + 700, 2800)
    pg.wait_for_timeout(1800)


def seg_c(pg):
    seg_b(pg, "segC")


def seg_d(pg):
    pg.wait_for_timeout(800)
    pg.get_by_role("tab", name="Upload screenshot").click()
    pg.set_input_files("input[type=file]", str(REPO / "data/screenshots/CHAT-S012-S028.png"))
    pg.wait_for_timeout(1000)
    smooth_scroll(pg, 300, 900)
    check(pg, "Check message", "segD")
    scroll_to_result(pg)
    pg.wait_for_timeout(1500)
    smooth_scroll(pg, pg.evaluate("window.scrollY") + 750, 3000)
    pg.wait_for_timeout(1800)


def seg_e(pg):
    pg.wait_for_timeout(800)
    pg.get_by_role("tab", name="Upload screenshot").click()
    pg.set_input_files("input[type=file]", str(REPO / "docs/evidence/chat_S004_blurred.png"))
    pg.wait_for_timeout(800)
    smooth_scroll(pg, 300, 800)
    check(pg, "Check message", "segE")
    scroll_to_result(pg)
    pg.wait_for_timeout(2600)
    smooth_scroll(pg, 0, 900)
    pg.get_by_role("tab", name="Paste text").click()
    type_slow(pg, "012-345 6789")
    pg.wait_for_timeout(700)
    smooth_scroll(pg, 300, 800)
    check(pg, "Check message", "segE")
    scroll_to_result(pg)
    pg.wait_for_timeout(3000)


SEGS = {"segA": seg_a, "segB": seg_b, "segC": seg_c, "segD": seg_d, "segE": seg_e}


def main():
    only = sys.argv[1:] or list(SEGS)
    REC.mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name in only:
            tmp = REC / f"_{name}"
            shutil.rmtree(tmp, ignore_errors=True)
            ctx = b.new_context(viewport=VIEW, device_scale_factor=2, record_video_dir=str(tmp), record_video_size={"width": 780, "height": 1688})
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_load_state("networkidle")
            SEGS[name](pg)
            ctx.close()
            vid = next(tmp.glob("*.webm"))
            vid.replace(REC / f"{name}.webm")
            shutil.rmtree(tmp, ignore_errors=True)
            print(name, LOG.get(name))
        b.close()
    log_path = HERE / "rec" / "results.json"
    prev = json.loads(log_path.read_text()) if log_path.exists() else {}
    prev.update(LOG)
    log_path.write_text(json.dumps(prev, indent=2))


if __name__ == "__main__":
    main()
