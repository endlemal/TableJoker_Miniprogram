"""
生成 src/styles/fonts.css：把页面里用到的字做成字体子集，以 base64 内嵌。
小程序的 WXSS 不能引用本地字体文件，只能用网络地址或 base64，所以这里选择 base64。

  BoardNum  = Big Shoulders Display 700/800（参考文件《翻牌钟 A 时刻表版》用的数字字体，OFL）
  BoardHei  = Noto Sans SC 900（参考文件的中文粗黑体，OFL）
  ZZDisplay = ZCOOL QingKe HuangYou（首页“比赛”标题和昵称，OFL）

用法：python3 tools/build_fonts.py      （需要能访问 fonts.googleapis.com）
文案改动后重新运行一次即可。动态内容（用户输入的昵称、聊天）不在子集内的字会回退到系统字体。
"""
import base64, re, urllib.parse, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
CJK = re.compile(r'[\u3000-\u303f\u3400-\u9fff\uff00-\uffef【】]')
ASCII = ''.join(chr(c) for c in range(0x20, 0x7f)) + '—·…'

def chars_in(*files, start_marker=None, end_marker=None):
    out = set()
    for f in files:
        text = (ROOT / f).read_text(encoding='utf-8')
        if start_marker and start_marker in text:
            text = text[text.index(start_marker):]
        if end_marker and end_marker in text:
            text = text[:text.index(end_marker)]
        out |= set(CJK.findall(text))
    return ''.join(sorted(out))

def fetch(family, weight, text):
    q = urllib.parse.urlencode({'family': f'{family}:wght@{weight}' if weight else family, 'text': text})
    css = urllib.request.urlopen(urllib.request.Request('https://fonts.googleapis.com/css2?' + q, headers={'User-Agent': UA})).read().decode()
    url = re.search(r'src: url\((.+?)\) format', css).group(1)
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read()
    return data

faces = []
def face(name, family, weight, text, css_weight):
    data = fetch(family, weight, text)
    faces.append((name, css_weight, data))
    print(f'{name} {css_weight}: {len(text)} chars, {len(data)} bytes')

hei_text = chars_in('src/pages/room/index.vue', 'src/pages/invite/index.vue') + chars_in('src/mock/data.js', start_marker='export const room', end_marker='// 创建比赛页') + '骰子先生' + '休息中最后一分钟进行中暂停未开始超时' + ASCII
face('BoardNum', 'Big Shoulders Display', 200, '0123456789/:.%', 200)
face('BoardNum', 'Big Shoulders Display', 700, ASCII, 700)
face('BoardNum', 'Big Shoulders Display', 800, ASCII, 800)
face('BoardHei', 'Noto Sans SC', 900, ''.join(sorted(set(hei_text))), 900)
ZZ_TEXT = '比赛骰子先生创建周五德扑锦标赛' + '广场城市桌游节新手训练营周边小店' + '血月深夜赛体验局雾港深筹丛林猎手挑战' + '狼人杀点亮认证标识平台审核中已未通过' + '核心权益功能特权价值清晰可见流程常见问题赛事配置设备个性化' + '主办方工作台待我的服务' + '欢迎来到桌趣确认登录关于用户协议隐私保护指引' + '运营分析房间列表深筹码大师周末猎人日新手体验局' + '设备管理添加大屏我的连接成功给这台起个名字' + '扫一码加入比赛连接大屏' + '海报广告组提交审核投放到' + '0123456789'
face('ZZDisplay', 'ZCOOL QingKe HuangYou', None, ZZ_TEXT, 400)
# 记录子集覆盖的字，页面可以据此判断动态文字能不能用标题字体，避免一行里混用两种字体
(ROOT / 'src/common/font-coverage.js').write_text(
    '// 由 tools/build_fonts.py 生成：ZZDisplay 子集包含的字\n'
    f'export const ZZ_DISPLAY_CHARS = {ZZ_TEXT!r}\n'
    'export const fitsDisplay = (text) => !!text && [...String(text)].every((ch) => ch === " " || ZZ_DISPLAY_CHARS.includes(ch))\n',
    encoding='utf-8')

lines = ['/* 由 tools/build_fonts.py 生成。字体均为 SIL Open Font License；这里只包含页面用到的字。 */']
for name, w, data in faces:
    b64 = base64.b64encode(data).decode()
    lines.append(f'@font-face {{ font-family: "{name}"; font-style: normal; font-weight: {w}; '
                 f'src: url("data:font/woff2;base64,{b64}") format("woff2"); }}')
(ROOT / 'src/styles/fonts.css').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('fonts.css', (ROOT / 'src/styles/fonts.css').stat().st_size, 'bytes')
