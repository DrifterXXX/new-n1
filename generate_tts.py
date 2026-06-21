"""生成 200 个 N1 例句的 MP3 音频文件，使用 Microsoft Edge TTS (ja-JP-NanamiNeural)"""
import json, asyncio, os, sys

VOICE = "ja-JP-NanamiNeural"
INPUT_FILE = "n1_examples.json"
OUTPUT_DIR = "audio"

async def generate_one(sem, i, text):
    async with sem:
        out = os.path.join(OUTPUT_DIR, f"{i:04d}.mp3")
        if os.path.exists(out):
            print(f"[{i:03d}/200] SKIP (exists): {text[:30]}...")
            return
        # edge-tts CLI 调用
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "edge_tts",
            "--voice", VOICE,
            "--text", text,
            "--write-media", out,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        print(f"[{i:03d}/200] DONE: {text[:30]}... -> {out}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    sem = asyncio.Semaphore(5)  # 5 并发
    tasks = []
    for item in data:
        # 清理文本，移除可能导致 TTS 问题的字符
        text = item["jp"].strip()
        tasks.append(generate_one(sem, item["id"], text))

    print(f"Starting TTS generation: {len(tasks)} files, 5 concurrent")
    await asyncio.gather(*tasks)
    print(f"\nAll done! Generated {len(tasks)} MP3 files in {OUTPUT_DIR}/")

if __name__ == "__main__":
    asyncio.run(main())
