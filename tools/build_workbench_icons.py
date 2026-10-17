"""把 design/icons/workbench/ 里的工作台功能图标原图，生成小程序里用的版本：src/static/workbench/<key>.png。
原图保持不动；生成时裁掉四周的透明边，按最长边缩到 160px（显示约 84rpx，3 倍屏够用），再压缩颜色。
用法：python3 tools/build_workbench_icons.py"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design/icons/workbench'
OUT = ROOT / 'src/static/workbench'
# 原图文件名 → 页面里用的 key。key 和平台认证页「功能特权」的条目一致（src/mock/host.js 的 privileges），工作台直接按 key 取图
# 11、12 是按素材包风格补画的；04 盲注结构、07 方案管理不在功能特权里，暂不生成，原图保留在 design/icons/workbench
MAP = {
    '05-台桌管理.png': 'tables', '06-荷官列表.png': 'dealers', '11-结算管理.png': 'settle',
    '01-遥控切屏.png': 'remote', '03-设备绑定.png': 'bind', '02-海报广告.png': 'poster',
    '12-周边勋章.png': 'medal', '08-大屏主题.png': 'theme', '10-颁奖动画.png': 'award', '09-筹码图例.png': 'legend',
}
MAX_SIDE = 160
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob('*.png'):  # 每次重建，避免留下改名或不再使用的图
    old.unlink()
total = 0
for name, key in MAP.items():
    im = Image.open(SRC / name).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    scale = MAX_SIDE / max(im.size)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    im = im.quantize(colors=96, method=Image.Quantize.FASTOCTREE)
    path = OUT / f'{key}.png'
    im.save(path, optimize=True)
    total += path.stat().st_size
    print(f'{name} → {path.relative_to(ROOT)}  {im.size[0]}×{im.size[1]}  {path.stat().st_size} B')
print(f'合计 {total / 1024:.1f} KB')
