"""检查 tools/gen-icons.mjs 的图标列表：有没有重复的名字、有没有 Tabler 里不存在的图标。
用法：python3 check_icons.py tools/gen-icons.mjs <node_modules>/@tabler/icons/icons [要新增的名字 ...]
传入要新增的名字时，会额外告诉你哪些已经在列表里、哪些可以加。有问题时退出码为 1。"""
import os
import re
import sys

src, icons_dir, wanted = sys.argv[1], sys.argv[2], sys.argv[3:]
text = open(src, encoding='utf-8').read()
outline = re.findall(r"'([a-z0-9-]+)'", re.search(r'const OUTLINE = \[(.*?)\]', text, re.S).group(1))
filled = re.findall(r":\s*'([a-z0-9-]+)'", re.search(r'const FILLED = \{(.*?)\}', text, re.S).group(1))
dups = sorted({n for n in outline if outline.count(n) > 1})
missing = [n for n in outline if not os.path.exists(os.path.join(icons_dir, 'outline', n + '.svg'))]
missing += [n for n in filled if not os.path.exists(os.path.join(icons_dir, 'filled', n + '.svg'))]
print(f'线框 {len(outline)} 个（去重后 {len(set(outline))} 个），实心 {len(filled)} 个')
print('重复：', '、'.join(dups) or '无')
print('Tabler 里不存在：', '、'.join(missing) or '无')
if wanted:
    have = [w for w in wanted if w in outline]
    absent = [w for w in wanted if not os.path.exists(os.path.join(icons_dir, 'outline', w + '.svg'))]
    new = [w for w in wanted if w not in outline and w not in absent]
    print('已在列表里：', '、'.join(have) or '无', '| Tabler 里没有：', '、'.join(absent) or '无', '| 可以新增：', '、'.join(new) or '无')
sys.exit(1 if dups or missing else 0)
