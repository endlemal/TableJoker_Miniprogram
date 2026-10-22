"""检查 uni-app 编译出的微信小程序产物。
用法：python3 mp_check.py <dist/dev/mp-weixin> [--forbid 文本 ...] [--pages pages/a/index ...]
  --forbid：页面 JS 里不应该出现的文本（比如已经换成相交监听的 onPageScroll）。
  --pages：只对这些页面检查 --forbid（有的页面合理地保留了 onPageScroll）。
另外会检查组件和页面里同名、但样式不同的类（页面样式会作用到组件上，容易把组件样式盖掉），
以及拦住 touchstart、里面又有点击的元素（小程序里这些点击会失效）。
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

# 5) 组件和页面同名的样式类：uni-app 编译的小程序组件默认 apply-shared（H5 更是全局样式），页面里的同名类会盖掉组件的样式。
#    两边单独写成 .name { ... } 且内容完全一样的（比如共用的 .press）不算问题
def class_map(path):
    css = open(path, encoding='utf-8').read()
    css = re.sub(r'url\("data:[^"]+"\)', 'url(DATA)', css)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css)
    css = re.sub(r'@media[^{]+\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}', lambda m: m.group(1), css)
    used, simple = set(), {}
    for sel, decl in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        for part in sel.split(','):
            part = part.strip()
            used.update(re.findall(r'\.([A-Za-z_][\w-]*)', part))
            m = re.fullmatch(r'\.([A-Za-z_][\w-]*)', part)
            if m:
                simple.setdefault(m.group(1), set()).add(re.sub(r'\s+', '', decl))
    return used, simple
comp_files = sorted(glob.glob(os.path.join(root, 'components/**/*.wxss'), recursive=True))
page_files = [os.path.join(root, pg + '.wxss') for pg in pages if os.path.exists(os.path.join(root, pg + '.wxss'))]
page_maps = {os.path.relpath(f, root): class_map(f) for f in page_files}
clashes = []
for cf in comp_files:
    cu, cs = class_map(cf)
    for pname, (pu, ps) in page_maps.items():
        names = sorted(n for n in cu & pu if not (cs.get(n) and cs.get(n) == ps.get(n)))
        if names:
            clashes.append((os.path.relpath(cf, root), pname, names[:8]))
print('组件和页面同名的样式类：', clashes or '无')
problems += len(clashes)

# 6) catchtouchstart 会让里面的点击失效：小程序的 tap 由触摸事件合成，某个元素拦住了 touchstart（模板里写 @touchstart.stop），
#    它和它里面所有元素的 bindtap / catchtap 都收不到。H5 的点击合成方式不同，在浏览器里测不出来
from html.parser import HTMLParser
class TapInCatch(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack, self.hits = [], []
    def handle_starttag(self, tag, attrs):
        names = {k for k, _ in attrs}
        has_tap = bool(names & {'bindtap', 'catchtap', 'bind:tap', 'catch:tap'})
        if has_tap:
            for el in self.stack:
                if el['catch'] and not el['reported']:
                    el['reported'] = True
                    self.hits.append(el['desc'])
        cls = dict(attrs).get('class', '') or ''
        catch = bool(names & {'catchtouchstart', 'catch:touchstart'})
        el = {'tag': tag, 'catch': catch, 'reported': False, 'desc': f'<{tag} class="{cls[:40]}">'}
        if catch and has_tap:  # 同一个元素既拦住 touchstart 又要响应点击
            el['reported'] = True
            self.hits.append(el['desc'])
        self.stack.append(el)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.stack.pop()
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]['tag'] == tag:
                del self.stack[i:]
                break
tap_traps = []
for f in sorted(glob.glob(os.path.join(root, '**/*.wxml'), recursive=True)):
    parser = TapInCatch()
    parser.feed(open(f, encoding='utf-8').read())
    for desc in parser.hits:
        tap_traps.append((os.path.relpath(f, root), desc))
print('拦住 touchstart、里面又有点击的元素（点击会失效）：', tap_traps or '无')
problems += len(tap_traps)
sys.exit(1 if problems else 0)
