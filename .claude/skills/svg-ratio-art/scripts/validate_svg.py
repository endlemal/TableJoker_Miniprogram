"""校验 SVG：能按严格 XML 解析，数值里没有 NaN / undefined / Infinity。
用法：python3 validate_svg.py <目录或文件> [...]   有问题时退出码为 1。"""
import glob
import os
import re
import sys
import xml.dom.minidom

files = []
for arg in sys.argv[1:]:
    files += sorted(glob.glob(os.path.join(arg, '**/*.svg'), recursive=True)) if os.path.isdir(arg) else [arg]
bad = 0
for f in files:
    text = open(f, encoding='utf-8').read()
    try:
        xml.dom.minidom.parseString(text)
    except Exception as e:  # noqa: BLE001
        bad += 1
        print('XML 错误：', f, e)
        continue
    if re.search(r'NaN|undefined|Infinity', text):
        bad += 1
        print('数值异常：', f)
print(f'检查 {len(files)} 个文件，有问题的 {bad} 个')
sys.exit(1 if bad else 0)
