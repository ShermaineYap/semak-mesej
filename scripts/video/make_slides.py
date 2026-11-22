"""Render 1920x1080 slides and per-segment backgrounds for the demo video.

Full slides: intro, tools, how, results, limits, end.
Segment backgrounds: a phone-sized gap on the left (the screen recording is
overlaid there) and an explanation panel on the right.
"""

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = HERE / "slides"
NUM = json.loads((HERE / "numbers.json").read_text())

BASE_CSS = f"""
@font-face{{font-family:AH;src:url('{(OUT / 'atkinson-hyperlegible-latin-400-normal.woff2').as_uri()}');font-weight:400}}
@font-face{{font-family:AH;src:url('{(OUT / 'atkinson-hyperlegible-latin-700-normal.woff2').as_uri()}');font-weight:700}}
*{{box-sizing:border-box}}
body{{margin:0;width:1920px;height:1080px;background:#eef1f4;color:#14213d;font-family:AH,sans-serif;overflow:hidden}}
.pad{{padding:110px 140px}}
h1{{font-size:92px;line-height:1.05;margin:0;letter-spacing:-1.5px}}
h2{{font-size:64px;line-height:1.1;margin:0 0 36px;letter-spacing:-1px}}
p,li{{font-size:34px;line-height:1.45}}
.soft{{color:#4a5672}}
.brand{{font-size:34px;font-weight:700;position:absolute;left:140px;top:60px}}
.pen{{background:linear-gradient(transparent 12%,var(--c) 12%,var(--c) 88%,transparent 88%);padding:0 6px;border-radius:6px}}
table{{border-collapse:collapse;font-size:32px;width:100%}}
td,th{{padding:16px 20px;text-align:left;border-bottom:2px solid #cfd6df;vertical-align:top}}
th{{font-weight:700}}
.big{{font-size:120px;font-weight:700;line-height:1}}
.chip{{display:inline-block;font-size:24px;font-weight:700;padding:6px 16px;border-radius:999px;background:#14213d;color:#fff;margin-right:10px}}
.src{{position:absolute;left:140px;bottom:150px;font-size:22px;color:#4a5672}}
"""


def page(body: str) -> str:
    return f"<html><head><meta charset='utf-8'><style>{BASE_CSS}</style></head><body>{body}</body></html>"


SLIDES = {
    "intro": f"""
<div class='brand'>Semak Mesej</div>
<div class='pad' style='padding-top:220px'>
  <h1>See the scam tactics in a message,<br>on the exact words, before you reply.</h1>
  <div style='display:flex;gap:90px;margin-top:90px'>
    <div><div class='big'>RM6.95bn</div><p class='soft' style='margin-top:14px'>lost to online scams in Malaysia,<br>2023 to Aug 2026 (181,750 cases)</p></div>
    <div><div class='big'>73%</div><p class='soft' style='margin-top:14px'>of 1,000 Malaysians surveyed had been<br>deceived, though 75% felt confident</p></div>
  </div>
</div>
<div class='src'>Sources: Home Ministry via Malay Mail, 17 Nov 2026; GASA survey via The Star, 3 Sep 2025</div>
""",
    "tools": """
<div class='brand'>Semak Mesej</div>
<div class='pad' style='padding-top:200px'>
<h2>What people use today</h2>
<table>
<tr><th></th><th>Semak Mule (police)</th><th>Semak Mesej</th></tr>
<tr><td class='soft'>Checks</td><td>A phone, account or company<br>someone already reported</td><td>The wording of the message itself</td></tr>
<tr><td class='soft'>Brand-new scam</td><td>Nothing to look up yet</td><td>Tactics still marked</td></tr>
<tr><td class='soft'>Explains why</td><td>No</td><td>Yes, phrase by phrase</td></tr>
<tr><td class='soft'>Numbers found</td><td>(it is the lookup)</td><td>Sent to Semak Mule</td></tr>
</table>
</div>
<div class='src'>Semak Mule checks accounts, phone numbers and company names (Sinar Daily, 2025). The two work together.</div>
""",
    "how": """
<div class='brand'>Semak Mesej</div>
<div class='pad' style='padding-top:200px'>
<h2>The AI points. Code decides.</h2>
<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:28px;margin-top:40px'>
 <div style='background:#fff;border-radius:28px;padding:34px'><p style='margin:0;font-weight:700'>Input checks</p><p class='soft' style='font-size:28px'>Too short, just a number, untested script: no AI call</p></div>
 <div style='background:#fff;border-radius:28px;padding:34px'><p style='margin:0;font-weight:700'>Gemini 3.5 Flash&#8209;Lite</p><p class='soft' style='font-size:28px'>Quotes the exact phrase for each of 8 tactics. No verdict.</p></div>
 <div style='background:#fff;border-radius:28px;padding:34px'><p style='margin:0;font-weight:700'>Quote check</p><p class='soft' style='font-size:28px'>Code drops any phrase that isn't really in the message</p></div>
 <div style='background:#fff;border-radius:28px;padding:34px'><p style='margin:0;font-weight:700'>Rule table</p><p class='soft' style='font-size:28px'>Decides the verdict. Never says "safe".</p></div>
</div>
<p class='soft' style='margin-top:60px'>Overloaded? Retry once, then fall back to Gemini 3.5 Flash, then "try again". Your message stays.</p>
</div>
""",
    "results": f"""
<div class='brand'>Semak Mesej</div>
<div class='pad' style='padding-top:170px'>
<h2>Measured against hand-labelled messages</h2>
<table>
<tr><th></th><th>Real scams<br><span class='soft' style='font-size:24px'>{NUM['real_n']} from police, banks, news</span></th><th>Written test cases<br><span class='soft' style='font-size:24px'>{NUM['syn_scam_n']} scam, {NUM['syn_gen_n']} genuine</span></th><th>Plain "is this a scam?"<br><span class='soft' style='font-size:24px'>same written cases</span></th></tr>
<tr><td>Scams flagged</td><td>{NUM['real_flagged']}</td><td>{NUM['syn_flagged']}</td><td>{NUM['base_flagged']}</td></tr>
<tr><td>Scams "be careful" or worse</td><td>{NUM['real_caution']}</td><td>{NUM['syn_caution']}</td><td class='soft'>yes/no only</td></tr>
<tr><td>Genuine wrongly flagged</td><td class='soft'>n/a</td><td>{NUM['syn_gen_flagged']}</td><td>{NUM['base_gen_flagged']}</td></tr>
<tr><td>Explains why</td><td>Yes</td><td>Yes</td><td>No</td></tr>
</table>
<p class='soft' style='margin-top:34px;font-size:28px'>AI quotes not found in the message: {NUM['dropped']}. Same verdict on 3 repeat runs: {NUM['repeat']}. Median time {NUM['latency']}.</p>
</div>
""",
    "limits": f"""
<div class='brand'>Semak Mesej</div>
<div class='pad' style='padding-top:190px'>
<h2>When not to rely on it</h2>
<ul style='padding-left:40px;margin:0'>
<li>A scam whose text has only one tactic (often one chat bubble) gets "be careful", not "scam"</li>
<li>A first message that is only a lure has no tactic yet</li>
<li>{NUM['gen_caution']} genuine alerts got "be careful": they name a sender it can't verify</li>
<li>Tested on Malay, English and Chinese; clean screenshots only</li>
</ul>
<p class='soft' style='margin-top:46px'>Built with an AI coding assistant. A unit test caught an AI-written bug<br>that shifted highlights after an emoji. We changed the code.</p>
</div>
""",
    "end": """
<div class='pad' style='padding-top:330px;text-align:center'>
<h1 style='font-size:110px'>Semak Mesej</h1>
<p style='font-size:44px;margin-top:40px'>semak-mesej.vercel.app</p>
<p class='soft' style='font-size:34px'>github.com/ShermaineYap/semak-mesej</p>
<p class='soft' style='font-size:26px;margin-top:80px'>Narration is computer-generated (Piper TTS). Lost money? Call NSRC 997.</p>
</div>
""",
}

SEGMENTS = {
    "segA": ("A real parcel scam, pasted", "R2a", ["It claims to be Postal Malaysia", "The redelivery cost is yours", "A link and a 12-hour deadline", "Beside each: what a real sender does"]),
    "segB": ("A different case, in Malay", "R2b", ["Someone posing as a celebrity", "Asks to borrow RM200", "Promises a gift in return", "The page is switched to Bahasa"]),
    "segC": ("The same message again", "R2c", ["Checked a second time", "Same verdict, same tactics"]),
    "segD": ("Harder: a two-bubble screenshot", "R2d", ["Text read from the image", "Every highlight checked by code", "against that text"]),
    "segE": ("When it can't do the job", "R3a  R3b", ["Blurred screenshot: refused, not guessed", "Bare phone number: no AI call,", "sent to Semak Mule", "It never says \"safe\""]),
}


def segment_bg(title, ids, lines):
    items = "".join(f"<li>{l}</li>" for l in lines)
    chips = "".join(f"<span class='chip'>{i}</span>" for i in ids.split())
    return f"""
<div class='brand' style='left:auto;right:140px'>Semak Mesej</div>
<div style='position:absolute;left:150px;top:40px;width:470px;height:1000px;border-radius:56px;background:#14213d'></div>
<div style='position:absolute;left:760px;top:250px;width:1000px'>
  <div style='margin-bottom:30px'>{chips}</div>
  <h2>{title}</h2>
  <ul style='padding-left:36px;margin:0' class='soft'>{items}</ul>
</div>"""


def main():
    only = set(sys.argv[1:])
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        for name, body in {**SLIDES, **{k: segment_bg(*v) for k, v in SEGMENTS.items()}}.items():
            if only and name not in only:
                continue
            tmp = OUT / f"_{name}.html"
            tmp.write_text(page(body), encoding="utf-8")
            pg.goto(tmp.as_uri())
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(150)
            pg.screenshot(path=str(OUT / f"{name}.png"))
            print(name)
        b.close()


if __name__ == "__main__":
    main()
