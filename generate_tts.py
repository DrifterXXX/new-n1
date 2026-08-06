"""Generate higher quality local MP3 files for the N1 study center.

Default mode regenerates the 200 example sentences. Use
`--kind listening` to generate audio for listening scripts, which is what the
training UI uses instead of the browser's robotic SpeechSynthesis voice.
Use `--kind kanji` to generate kanji reading audio from src/data/kanji-v1.json.
"""
import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts

DEFAULT_VOICE = "ja-JP-NanamiNeural"
ALT_VOICE = "ja-JP-KeitaNeural"


def load_json_array_from_data_js(name):
    text = Path("data.js").read_text(encoding="utf-8")
    marker = f"const {name} = "
    start = text.index(marker) + len(marker)
    depth = 0
    in_str = False
    esc = False
    end = None
    for i, ch in enumerate(text[start:], start):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
    if end is None:
        raise ValueError(f"Could not parse {name} from data.js")
    return json.loads(text[start:end])


def listening_ssml(script, rate):
    escaped = (
        script.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .strip()
    )
    lines = [line.strip() for line in escaped.splitlines() if line.strip()]
    parts = []
    for line in lines:
        voice = DEFAULT_VOICE
        content = line
        if line.startswith("男：") or line.startswith("A:"):
            voice = ALT_VOICE
        elif line.startswith("女："):
            voice = DEFAULT_VOICE
        content = re.sub(r"^(男|女)：", "", content)
        content = re.sub(r"^A:\s*", "", content)
        parts.append(
            f'<voice name="{voice}"><prosody rate="{rate}">{content}</prosody></voice>'
            '<break time="420ms"/>'
        )
    return (
        '<speak version="1.0" xml:lang="ja-JP" '
        'xmlns="http://www.w3.org/2001/10/synthesis">'
        + "".join(parts)
        + "</speak>"
    )


async def synthesize_edge(out, text, voice=DEFAULT_VOICE, rate="-4%"):
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate)
    await communicate.save(str(out))


def normalize_audio(path):
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(path),
                "-af",
                "loudnorm=I=-18:TP=-2:LRA=11",
                "-codec:a",
                "libmp3lame",
                "-q:a",
                "3",
                tmp_path,
            ],
            check=True,
        )
        os.replace(tmp_path, path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def generate_item(sem, idx, text, out, kind, force):
    async with sem:
        if out.exists() and not force:
            print(f"[{idx:03d}] SKIP {out}")
            return
        out.parent.mkdir(parents=True, exist_ok=True)
        if kind == "listening":
            await synthesize_dialogue(out, text)
        else:
            await synthesize_edge(out, text=text, rate="-5%")
        if Path("/opt/homebrew/bin/ffmpeg").exists() or shutil_which("ffmpeg"):
            normalize_audio(out)
        print(f"[{idx:03d}] DONE {out}")


def shutil_which(name):
    for folder in os.environ.get("PATH", "").split(os.pathsep):
        p = Path(folder) / name
        if p.exists() and os.access(p, os.X_OK):
            return str(p)
    return None


async def synthesize_dialogue(out, script):
    lines = [line.strip() for line in script.splitlines() if line.strip()]
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        segment_paths = []
        for i, line in enumerate(lines, 1):
            voice = DEFAULT_VOICE
            if line.startswith("男：") or line.startswith("A:"):
                voice = ALT_VOICE
            cleaned = re.sub(r"^(男|女)：", "", line)
            cleaned = re.sub(r"^A:\s*", "", cleaned)
            seg = Path(td) / f"seg_{i:03d}.mp3"
            await synthesize_edge(seg, cleaned, voice=voice, rate="-3%")
            segment_paths.append(seg)
        concat = Path(td) / "concat.txt"
        concat.write_text("".join(f"file '{p}'\n" for p in segment_paths), encoding="utf-8")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat),
                "-af",
                "apad=pad_dur=0.25,loudnorm=I=-18:TP=-2:LRA=11",
                "-codec:a",
                "libmp3lame",
                "-q:a",
                "3",
                str(out),
            ],
            check=True,
        )


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", choices=["examples", "listening", "options", "kanji"], default="examples")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--concurrency", type=int, default=4)
    args = parser.parse_args()

    if args.kind == "examples":
        data = json.loads(Path("n1_examples.json").read_text(encoding="utf-8"))
        items = [(item["id"], item["jp"].strip(), Path("audio") / f'{item["id"]:04d}.mp3') for item in data]
    elif args.kind == "listening":
        data = load_json_array_from_data_js("LISTENING")
        items = [(item["id"], item["script"].strip(), Path("listening_audio") / f'{item["id"]:04d}.mp3') for item in data]
    elif args.kind == "kanji":
        data = json.loads(Path("src/data/kanji-v1.json").read_text(encoding="utf-8"))
        items = []
        for entry in data:
            # 从 id "kanji-0001" 提取数字序号
            num = int(entry["id"].replace("kanji-", ""))
            items.append((num, entry["reading"].strip(), Path("kanji_audio") / f'{num:04d}.mp3'))
    else:
        items = []
        listening = load_json_array_from_data_js("LISTENING")
        for item in listening:
            for option_idx, option in enumerate(item.get("options", []), 1):
                items.append(
                    (
                        len(items) + 1,
                        option.strip(),
                        Path("option_audio") / "listening" / f'{item["id"]:04d}_{option_idx}.mp3',
                    )
                )
        readings = load_json_array_from_data_js("READINGS")
        for article_idx, article in enumerate(readings, 1):
            for question_idx, question in enumerate(article.get("questions", []), 1):
                for option_idx, option in enumerate(question.get("options", []), 1):
                    items.append(
                        (
                            len(items) + 1,
                            option.strip(),
                            Path("option_audio") / "reading" / f"{article_idx:04d}_{question_idx}_{option_idx}.mp3",
                        )
                    )

    if args.limit:
        items = items[: args.limit]

    sem = asyncio.Semaphore(args.concurrency)
    print(f"Generating {len(items)} {args.kind} files")
    await asyncio.gather(
        *(generate_item(sem, idx, text, out, args.kind, args.force) for idx, text, out in items)
    )


if __name__ == "__main__":
    asyncio.run(main())
