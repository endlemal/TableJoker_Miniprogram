"""检查 uni-app 编译出的微信小程序产物。
用法：python3 mp_check.py <dist/dev/mp-weixin> [--forbid 文本 ...] [--pages pages/a/index ...]
  --forbid：页面 JS 里不应该出现的文本（比如已经换成相交监听的 onPageScroll）。
  --pages：只对这些页面检查 --forbid（有的页面合理地保留了 onPageScroll）。
发现问题时退出码为 1。"""
import argparse
import glob
import json
import os
import re
import sys

ap = argparse.ArgumentParser()
ap.add_argument('root')
ap.add_argument('--forbid', nargs='*', default=[])
ap.add_argument('--pages', nargs='*', default=None)
args = ap.parse_args()
root = args.root
problems = 0

# 1) WXSS 选择器
bad = []
for f in glob.glob(os.path.join(root, '**/*.wxss'), recursive=True):
    css = open(f, encoding='utf-8').read()
    css = re.sub(r'url\("data:[^"]+"\)', 'url(DATA)', css)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    body = re.sub(r'@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css)
    body = re.sub(r'@media[^{]+\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}', lambda m: m.group(1), body)
    for sel in re.findall(r'([^{}]+)\{', body):
        sel = sel.strip()
        if sel.startswith('@') or sel == '[data-c-h="true"]':
            continue
        if re.search(r'(^|[\s,>])\*|\[|\s\+\s|\s~\s|:root', sel):
            bad.append((os.path.relpath(f, root), sel[:80]))
print('WXSS 选择器问题：', bad or '无')
problems += len(bad)

# 2) app.json
app = json.load(open(os.path.join(root, 'app.json'), encoding='utf-8'))
print('页面：', len(app.get('pages', [])), '个 | 分包：', [p.get('root') for p in app.get('subPackages', app.get('subpackages', []))] or '无')
print('requiredPrivateInfos：', app.get('requiredPrivateInfos', '无'), '| permission：', list(app.get('permission', {}).keys()) or '无')

# 3) 体积
sizes = []
for f in glob.glob(os.path.join(root, '**/*'), recursive=True):
    if os.path.isfile(f):
        sizes.append((os.path.getsize(f), os.path.relpath(f, root)))
total = sum(s for s, _ in sizes)
print(f'产物总大小：{total / 1024:.0f} KB（开发构建未压缩，发布构建会更小）')
for s, name in sorted(sizes, reverse=True)[:6]:
    print(f'  {s / 1024:7.0f} KB  {name}')

# 4) 页面 JS 里的 H5 专用代码和禁用文本
pages = app.get('pages', []) + [f"{sp.get('root')}/{p}" for sp in app.get('subPackages', []) for p in sp.get('pages', [])]
leaks = []
for page in pages:
    js = os.path.join(root, page + '.js')
    if not os.path.exists(js):
        continue
    text = open(js, encoding='utf-8').read()
    forbid = args.forbid if (args.pages is None or page in args.pages) else []
    for needle in ['document.', 'window.'] + forbid:
        if needle in text:
            leaks.append((page, needle))
print('页面 JS 里的 H5 专用代码 / 禁用文本：', leaks or '无')
problems += len(leaks)
sys.exit(1 if problems else 0)
