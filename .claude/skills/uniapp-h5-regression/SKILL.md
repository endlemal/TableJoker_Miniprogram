---
name: uniapp-h5-regression
description: 用 Playwright 在无头浏览器里跑 uni-app 的 H5 构建：逐步点按页面交互、读取真实状态做断言、截图拼成对比图，并把动画放慢录成 GIF。改完小程序页面、手边没有微信开发者工具却需要验证交互和动效时使用；用户说「看看效果」「录个动图」「回归一下」「验证一下交互」时也一定要用。
---

# H5 回归测试与动效录屏

uni-app 的 H5 构建和小程序共用同一份页面代码，大部分布局、交互和 CSS 动画都可以在无头浏览器里验证。原生能力验证不了，比如地图选点、授权弹窗、web-view 的业务域名、真机性能。这些要在汇报里明确交给用户，在开发者工具或真机上确认。

## 步骤

1. **构建**：`npm run build:h5`，产物在 `dist/build/h5`。
2. **起服务、开页面**：用 `scripts/h5_harness.py` 里的 `serve()` 和 `mobile_page()`。视口 375×812、2 倍像素、可触摸，并自动收集页面报错和 console 错误。
3. **路由**：`<根地址>/#/pages/<页面>/index?参数`。只改了 hash 里的参数时，要再 `page.reload()`，否则页面不会重新加载。
4. **逐步操作，每步打印一行断言**：格式是「做了什么 → 看到什么」，断言要读页面上的真实状态：
   - 折叠是否展开：读元素高度（`getBoundingClientRect().height`）。
   - 位置关系：比较两个元素的 bounding box，比如「图标在标题右侧且同一行」。
   - 样式：`getComputedStyle(el).backgroundColor`、`borderRadius`、`fontFamily`。
   - 本地存储：`localStorage.getItem(key)`。uni 存的值外面包了一层 `{type, data}`。
5. **截图与拼图**：每个关键状态截一张，用 `sheet()` 拼成一张，再用看图工具逐张检查排版、裁切和颜色。
6. **录动效**：
   - 用 `record()` 按时间连续截图。
   - 需要看清过程时，先用 `slow_motion(page, 0.25)` 把动画放慢 4 倍，再把 `rate` 传给 `record()`，帧时长会换算回真实速度。
   - 用 `save_gif()` 量化颜色后保存，再抽几帧拼图检查。
7. **汇报**：分三类说明：已通过的；只在 H5 验证过的；需要用户在开发者工具或真机上确认的。

## 坑

- **uni 的 H5 相交监听不可靠**：它以页面容器为参照，所有元素都算「可见」，滚动标记线永远不会离开视口。小程序里用相交监听实现的逻辑，在 H5 要用 `onPageScroll` 兜底（条件编译）；看测试结果时也要按平台分开解读。
- **不要轻易把报错归为「H5 特有」**：`ERR_INVALID_URL` 一度看起来来自 uni 自带的 loading 样式，实际是自己的 SVG data URI 被样式解析拆断了。先用 console 消息的 `location.url` 和逐步复现定位到具体步骤，再下结论。
- **一直在动的元素点不了**：Playwright 会等元素「稳定」，有循环动画的元素用 `click(force=True)`。
- **长按不好模拟**：给页面留一个开发用的 URL 参数（如 `?state=pending`）来切状态。
- **web-view 在 H5 里是 iframe**：占位地址返回 404 是目标站的问题；先确认 iframe 的 `src` 解码正确，再判断是不是自己的问题。
- **测试代码不要用全局字符串替换去改 SVG 属性**：会连带改坏内部元素，比如把内部矩形的宽高也一起改了，看起来像插画有问题。

## 脚本

- `scripts/h5_harness.py`：`serve()`、`mobile_page()`、`scroll_to()`、`grab()`、`slow_motion()`、`record()`、`save_gif()`、`sheet()`。
- `scripts/example_test.py`：完整示例，包括切页、点按、断言、截图和录 GIF。复制后改页面和选择器即可。依赖 `playwright`（chromium）和 `Pillow`。
