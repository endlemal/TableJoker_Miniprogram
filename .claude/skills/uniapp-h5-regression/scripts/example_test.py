"""示例：从个人主页切到平台认证页，验证首屏、常见问题折叠和底部切换，截图并录一段放慢的动效。
用法：python3 example_test.py <dist/build/h5 目录> <输出目录>"""
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h5_harness import mobile_page, record, save_gif, scroll_to, serve, sheet, slow_motion  # noqa: E402

dist, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
with serve(dist) as base, sync_playwright() as p:
    browser = p.chromium.launch()
    page, problems = mobile_page(browser)

    page.goto(base + '/#/pages/profile/index')
    page.wait_for_timeout(1500)
    page.locator('.tb-item').nth(3).click()
    page.wait_for_timeout(1500)
    print('点底部导航「成为主办方」→', page.url.split('#')[1], '| 标题：', page.inner_text('.h-title'))
    page.screenshot(path=f'{out}/01-first-screen.png')

    page.locator('.fqx-h').scroll_into_view_if_needed()
    page.click('.fqx-h')
    page.wait_for_timeout(600)
    h = page.evaluate("document.querySelector('.fqx .fold').getBoundingClientRect().height")
    print(f'点「常见问题」→ 列表展开到 {h:.0f}px')

    page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
    page.wait_for_timeout(900)
    print('滚到底 → 导航栏隐藏：', page.locator('.tb-hide').count() == 1, '| 底部按钮：', page.inner_text('.cta-t'))
    page.screenshot(path=f'{out}/02-bottom.png')

    # 放慢 4 倍录「认证后」头像的 V 标识弹出
    scroll_to(page, '.sec-first', 120)
    page.locator('.bf-i').nth(1).click()
    page.wait_for_timeout(500)
    slow_motion(page, 0.25)
    page.locator('.bf-i').nth(0).click()
    box = page.locator('.bf-panel').bounding_box()
    frames, durs = record(page, 3.2, clip={'x': box['x'], 'y': box['y'], 'width': box['width'], 'height': box['height']}, scale=0.8, rate=0.25)
    slow_motion(page, 1)
    save_gif(frames, durs, f'{out}/03-v-badge.gif', hold_last_ms=1200)

    sheet([f'{out}/01-first-screen.png', f'{out}/02-bottom.png'], f'{out}/sheet.png')
    print('报错：', problems or '无')
    browser.close()
