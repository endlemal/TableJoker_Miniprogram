"""把一组按比例构图的 SVG 渲染成一张对比图：每行一个场景，每列一个尺寸。
文件名格式 <前缀>-<场景>-<尺寸>.svg，例如 scene-blood-wide.svg。
用法：python3 render_sheet.py <svg 目录> <输出.png> [--prefix scene] [--sizes banner,wide,share,square,portrait,story] [--height 140] [--only blood,wild]
依赖 playwright（chromium）。"""
import argparse
import glob
import os
import re

from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('dir')
ap.add_argument('out')
ap.add_argument('--prefix', default='scene')
ap.add_argument('--sizes', default='banner,wide,share,square,portrait,story')
ap.add_argument('--height', type=int, default=140)
ap.add_argument('--only', default='')
a = ap.parse_args()
sizes = a.sizes.split(',')
only = set(filter(None, a.only.split(',')))

rows = {}
pattern = re.compile(rf'^{re.escape(a.prefix)}-(.+)-({"|".join(map(re.escape, sizes))})\.svg$')
for f in sorted(glob.glob(os.path.join(a.dir, f'{a.prefix}-*.svg'))):
    m = pattern.match(os.path.basename(f))
    if m and (not only or m.group(1) in only):
        rows.setdefault(m.group(1), {})[m.group(2)] = os.path.abspath(f)


def dims(path):
    head = open(path, encoding='utf-8').read(400)
    return float(re.search(r'width="([\d.]+)"', head).group(1)), float(re.search(r'height="([\d.]+)"', head).group(1))


html, width = '', 0
for key, files in rows.items():
    cells, row_w = '', 110
    for s in sizes:
        if s in files:
            w, h = dims(files[s])
            cw = round(a.height * w / h)
            row_w += cw + 8
            cells += f'<img src="file://{files[s]}" style="height:{a.height}px;width:{cw}px;border-radius:6px;margin-right:8px">'
    width = max(width, row_w)
    html += f'<div style="display:flex;align-items:center;margin-bottom:10px"><div style="width:100px;margin-right:10px;color:#ccc;font:13px sans-serif">{key}</div>{cells}</div>'
page_html = os.path.join(os.path.dirname(os.path.abspath(a.out)), '_sheet.html')
open(page_html, 'w', encoding='utf-8').write(f'<html><body style="margin:0;padding:10px;background:#2a2a2a">{html}</body></html>')
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': width + 20, 'height': 200}, device_scale_factor=1.4)
    pg.goto('file://' + page_html)
    pg.wait_for_timeout(500)
    pg.screenshot(path=a.out, full_page=True)
    b.close()
os.remove(page_html)
print(f'{len(rows)} 行 × {len(sizes)} 列 → {a.out}')
