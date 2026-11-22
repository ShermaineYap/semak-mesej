"""Assemble the demo video: slides + phone recordings + Piper narration + burned captions.

    python3 compose.py            # writes out/semak-mesej-demo.mp4
"""

import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
SL = HERE / "slides"
REC = HERE / "rec"
AUD = HERE / "audio"
OUT = HERE / "out"
VOICE = HERE / "voice" / "en_US-lessac-high.onnx"
NARR = json.loads((HERE / "narration.json").read_text())

# Phone recording placement inside the frame drawn on segment backgrounds
PHONE_X, PHONE_Y, PHONE_H = 160, 53, 974  # 390x844 crop scaled to 450x974, inside the 470x1000 frame
PAD = 0.7  # seconds of silence after each segment's narration


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def tts(name: str, text: str) -> Path:
    wav = AUD / f"{name}.wav"
    subprocess.run(
        ["python3", "-m", "piper", "-m", str(VOICE), "-f", str(wav), "--sentence-silence", "0.25"],
        input=text, text=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return wav


def ass_time(t: float) -> str:
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def main():
    AUD.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    parts = []
    captions = []
    t = 0.0
    for seg in NARR:
        name, text = seg["name"], seg["text"]
        wav = tts(name, text)
        a = duration(wav)
        total = a + PAD
        clip = OUT / f"{name}.mp4"
        if seg["kind"] == "slide":
            run([
                "ffmpeg", "-y", "-loop", "1", "-t", f"{total:.2f}", "-i", str(SL / f"{seg['slide']}.png"),
                "-i", str(wav), "-filter_complex", "[1:a]apad[a]", "-map", "0:v", "-map", "[a]",
                "-t", f"{total:.2f}", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-ar", "48000", str(clip),
            ])
        else:
            rec = REC / f"{seg['rec']}.webm"
            ss = float(seg.get("ss", 0))
            v = duration(rec) - ss
            total = max(total, v)
            # Hold the last frame if narration runs longer than the recording
            hold = max(0.0, total - v)
            run([
                "ffmpeg", "-y", "-loop", "1", "-t", f"{total:.2f}", "-i", str(SL / f"{seg['slide']}.png"),
                "-ss", f"{ss:.2f}", "-i", str(rec), "-i", str(wav),
                "-filter_complex",
                f"[1:v]crop=390:844:0:0,scale=-2:{PHONE_H},tpad=stop_mode=clone:stop_duration={hold:.2f},format=yuv420p[ph];"
                f"[0:v][ph]overlay={PHONE_X}:{PHONE_Y}:shortest=0[v];[2:a]apad[a]",
                "-map", "[v]", "-map", "[a]", "-t", f"{total:.2f}", "-r", "30",
                "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", str(clip),
            ])
        # Captions: split narration into sentences, timed by length
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        chars = sum(len(s) for s in sentences)
        ct = t
        for s in sentences:
            d = a * len(s) / chars
            captions.append((ct, ct + d, s))
            ct += d
        parts.append(clip)
        t += total
        print(f"{name:10s} {total:5.1f}s  (total {t:5.1f}s)")

    lst = OUT / "list.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    raw = OUT / "raw.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(raw)])

    ass = OUT / "captions.ass"
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,DejaVu Sans,38,&H00FFFFFF,&H00FFFFFF,&H003D2114,&HB03D2114,0,0,0,0,100,100,0,0,3,14,0,2,700,120,46,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{txt}" for s, e, txt in captions]
    ass.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    final = OUT / "semak-mesej-demo.mp4"
    run([
        "ffmpeg", "-y", "-i", str(raw), "-vf", f"ass={ass}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(final),
    ])
    print(f"done: {final} {duration(final):.1f}s")


if __name__ == "__main__":
    main()
