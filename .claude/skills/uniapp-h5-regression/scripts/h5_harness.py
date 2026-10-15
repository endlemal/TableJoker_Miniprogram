"""uni-app H5 构建的无头浏览器测试工具。依赖 playwright（chromium）和 Pillow，用法见 example_test.py。"""
import contextlib
import io
import socket
import subprocess
import sys
import time

from PIL import Image


@contextlib.contextmanager
def serve(dist_dir, port=None):
    """在后台用 http.server 托管 H5 产物，产出根地址，退出时关闭服务。"""
    if port is None:
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            port = s.getsockname()[1]
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--directory', dist_dir],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            with socket.socket() as s:
                if s.connect_ex(('127.0.0.1', port)) == 0:
                    break
            time.sleep(0.1)
        yield f'http://localhost:{port}'
    finally:
        proc.terminate()


def mobile_page(browser, width=375, height=812, scale=2, ignore=()):
    """手机视口的新页面。返回 (page, problems)：problems 收集页面报错和 console.error，
    ignore 里的文本用来过滤已经确认无关的报错（先定位清楚再加）。"""
    ctx = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=scale,
                              is_mobile=True, has_touch=True)
    page = ctx.new_page()
    problems = []

    def on_console(msg):
        if msg.type == 'error' and not any(k in msg.text for k in ignore):
            loc = (msg.location or {}).get('url', '')
            problems.append(f'console: {msg.text} {loc[:120]}'.strip())

    page.on('pageerror', lambda e: problems.append(f'pageerror: {e}'))
    page.on('console', on_console)
    return page, problems


def scroll_to(page, selector, offset=150, wait=800):
    """把元素滚到距视口顶部 offset 像素的位置。"""
    page.evaluate(f"window.scrollTo(0, document.querySelector({selector!r}).getBoundingClientRect().top + window.scrollY - {offset})")
    page.wait_for_timeout(wait)


def grab(page, clip=None, scale=0.5):
    """截图并缩放，返回 PIL Image。"""
    raw = page.screenshot(clip=clip) if clip else page.screenshot()
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)


def slow_motion(page, rate):
    """用 CDP 改变页面上 CSS 动画和过渡的播放速度：0.25 表示放慢 4 倍，1 表示恢复。"""
    cdp = page.context.new_cdp_session(page)
    cdp.send('Animation.enable')
    cdp.send('Animation.setPlaybackRate', {'playbackRate': rate})
    return cdp


def record(page, seconds, clip=None, scale=0.5, rate=1.0):
    """连续截图 seconds 秒，返回 (frames, durations_ms)。动画被放慢时把同一个 rate 传进来，帧时长会换算回真实速度。"""
    frames, durs = [], []
    t0 = last = time.time()
    while time.time() - t0 < seconds:
        frames.append(grab(page, clip, scale))
        now = time.time()
        durs.append(max(20, int((now - last) * 1000 * rate)))
        last = now
    return frames, durs


def save_gif(frames, durs, path, colors=110, hold_last_ms=None):
    """量化颜色后保存 GIF；hold_last_ms 让最后一帧多停一会儿。"""
    if hold_last_ms:
        durs = durs[:-1] + [hold_last_ms]
    q = [f.quantize(colors=colors, method=Image.Quantize.MEDIANCUT) for f in frames]
    q[0].save(path, save_all=True, append_images=q[1:], duration=durs, loop=0, optimize=True, disposal=2)
    return path


def sheet(images, out, scale=0.42, gap=10, bg=(60, 60, 60)):
    """把截图（文件路径或 Image）横向拼成一张对比图。"""
    ims = [Image.open(i) if isinstance(i, str) else i for i in images]
    ims = [im.resize((int(im.width * scale), int(im.height * scale))) for im in ims]
    width = sum(i.width for i in ims) + gap * (len(ims) - 1)
    height = max(i.height for i in ims)
    canvas = Image.new('RGB', (width, height), bg)
    x = 0
    for im in ims:
        canvas.paste(im, (x, 0))
        x += im.width + gap
    canvas.save(out)
    return out
