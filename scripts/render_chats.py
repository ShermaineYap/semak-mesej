"""Render messages as phone-chat screenshots for the screenshot evaluation.

These images are renderings made for testing (message text from data/messages.jsonl
inside a generic chat layout), not screenshots anyone received.

    python3 scripts/render_chats.py            # writes data/screenshots/*.png and manifest.json
"""

import html
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "screenshots"
rows = {json.loads(l)["id"]: json.loads(l) for l in (ROOT / "data/messages.jsonl").read_text().splitlines() if l.strip()}
split = json.loads((ROOT / "data/split.json").read_text())

# One image per real test-set message, plus one harder multi-bubble chat.
JOBS = [{"id": i, "bubbles": [i]} for i in split["test"]]
JOBS.append({"id": "CHAT-S012-S028", "bubbles": ["S012", "S028"], "hard": True})

CSS = """
body{margin:0;background:#efeae2;font-family:Roboto,'Noto Sans','Noto Sans CJK SC',Arial,sans-serif;width:390px}
.top{background:#075e54;color:#fff;padding:14px 16px;font-size:17px;display:flex;gap:10px;align-items:center}
.av{width:34px;height:34px;border-radius:50%;background:#cfd8dc}
.wrap{padding:14px 12px 20px}
.b{background:#fff;border-radius:0 10px 10px 10px;padding:9px 11px 6px;font-size:15px;line-height:1.4;white-space:pre-wrap;
   max-width:310px;box-shadow:0 1px 1px rgba(0,0,0,.15);margin-bottom:8px;word-break:break-word}
.t{text-align:right;color:#8a8a8a;font-size:11px;margin-top:3px}
.status{background:#054d44;color:#cfe;font-size:12px;padding:4px 16px;display:flex;justify-content:space-between}
"""


def page(texts):
    bubbles = "".join(
        f'<div class="b">{html.escape(t)}<div class="t">10:{42 + i:02d}</div></div>' for i, t in enumerate(texts)
    )
    return (
        f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>"
        f"<div class='status'><span>10:45</span><span>4G 72%</span></div>"
        f"<div class='top'><div class='av'></div><div>Unknown number</div></div>"
        f"<div class='wrap'>{bubbles}</div></body></html>"
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 390, "height": 400}, device_scale_factor=2)
        for job in JOBS:
            texts = [rows[i]["text"] for i in job["bubbles"]]
            pg.set_content(page(texts))
            path = OUT / f"{job['id']}.png"
            pg.screenshot(path=str(path), full_page=True)
            first = rows[job["bubbles"][0]]
            manifest.append(
                {
                    "id": job["id"],
                    "image": f"data/screenshots/{path.name}",
                    "class": first["class"],
                    "language": first["language"],
                    "text": "\n".join(texts),
                    "tactics": sorted({t for i in job["bubbles"] for t in rows[i]["tactics"]}),
                    "hard": job.get("hard", False),
                }
            )
        b.close()
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(manifest)} screenshots")


if __name__ == "__main__":
    main()
