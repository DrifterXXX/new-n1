#!/usr/bin/env python3
"""Fix problematic entries in kanji-examples-v1.json."""
import json, os

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'data', 'kanji-examples-v1.json')

with open(BASE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fixes: (id, new_sentenceJa, new_translationZh)
# Fix conjugation-form entries to include exact term
FIXES = {
    "kanji-0067": ("彼は面倒な仕事に巻き込むことが多い。", "他经常被卷入麻烦的工作中。"),
    "kanji-0108": ("彼の突然の訪問に驚くのは無理もない。", "对他的突然来访感到吃惊也是理所当然的。"),
    "kanji-0117": ("庭に穴を掘るのは大変な作業だ。", "在院子里挖洞是件辛苦的工作。"),
    "kanji-0175": ("財布を忘れて困る場面がよくある。", "经常有忘记钱包而困扰的时候。"),
    "kanji-0264": ("展示物に手で触れることは禁止されている。", "用手触摸展品是被禁止的。"),
    "kanji-0287": ("部屋を整えることで気分も良くなる。", "整理房间心情也会变好。"),
    "kanji-0304": ("その習慣は今では絶えることがない。", "那个习惯至今没有断绝。"),
    "kanji-0411": ("別れが悲しい気持ちを理解してほしい。", "希望你能理解离别悲伤的心情。"),
    "kanji-0452": ("入り口に長く並ぶ列ができている。", "入口处排着长长的队伍。"),
    "kanji-0459": ("この地域は自然が豊かな場所だ。", "这个地区是自然丰富的地方。"),
    "kanji-0498": ("友達に手伝いを頼むのが上手だ。", "很擅长请朋友帮忙。"),
    # Sensitive-topic fixes
    "kanji-0107": ("彼の優しい言葉に胸一杯になった。", "他温柔的话语让我内心充满了感动。"),
    "kanji-0179": ("差別的という言葉の意味を辞書で調べた。", "在字典里查了差别的这个词的意思。"),
    "kanji-0410": ("その小説の犯人は意外な人物だった。", "那本小说里的犯人是个意想不到的人物。"),
}

for entry in data['entries']:
    if entry['id'] in FIXES:
        entry['sentenceJa'], entry['translationZh'] = FIXES[entry['id']]

with open(BASE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print("Fixed entries:", len(FIXES))
# Verify no term-not-in-sentence remains
bad = [e['id'] for e in data['entries'] if e['term'] not in e['sentenceJa']]
print("Remaining term-not-in-sentence:", bad)