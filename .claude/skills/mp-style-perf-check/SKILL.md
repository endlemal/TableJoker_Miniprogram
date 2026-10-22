---
name: mp-style-perf-check
description: 检查 uni-app 编译出的微信小程序产物里的样式兼容问题和性能隐患：WXSS 不支持的选择器、SVG data URI 写法、本地图片引用、条件编译是否生效、setData 传输量、滚动监听、包体积和隐私声明。交付任何小程序页面改动之前都要跑一遍；页面在开发者工具里样式错乱、图片不显示、滚动卡顿，或用户说「优化一下性能」时也一定要用。
---

# 小程序样式兼容与性能检查

H5 能跑通不代表小程序没问题：WXSS 的选择器能力有限；逻辑层和视图层之间每次 `setData` 都要序列化数据；本地资源的引用方式也和网页不同。交付前用编译产物做一遍检查，比用户在开发者工具里发现问题再回来改便宜得多。

## 步骤

1. **编译**：`npm run dev:mp-weixin`，确认输出 `DONE Build complete` 且没有 warning。
2. **跑检查脚本**：`python3 scripts/mp_check.py dist/dev/mp-weixin`。它会做这些检查：
   - WXSS 选择器：不能用 `*`、属性选择器 `[...]`、`+`、`~`、`:root`（uni 自己生成的 `[data-c-h="true"]` 除外）。
   - `app.json`：页面、分包、`requiredPrivateInfos`、`permission` 是否和预期一致。
   - 包体积：总大小和最大的几个文件。主包上限 2MB，字体子集和图片最容易超。
   - H5 专用代码：页面 JS 里不应该出现 `document.`、`window.`。加 `--forbid onPageScroll --pages pages/plaza/index` 可以确认某个优化在指定页面的小程序产物里确实生效。
3. **按下面的规则对照代码**，逐条确认。

## 规则

- **SVG 用 data URI 时**：不要带 `;charset=utf-8`，并把括号编码成 `%28`/`%29`（本仓库是 `src/common/svg.js` 的 `svgUri`）。内联 style 字符串会被样式解析按分号拆开，一旦 SVG 里有 `rotate(...)` 这类括号，URL 就会被截断成 `data:image/svg+xml`，图片直接不显示。
- **本地图片**：小程序的样式（包括内联 style）里不能用本地图片做 `background-image`，要用 `<image src="/static/...">`；大图放 CDN。
- **setData 传输量**：
  - 每次更新，模板里每个 `:style` 的完整字符串都会传给视图层。
  - 把很大的静态样式（data URI 背景）和会变化的样式（位置、变换）拆到两个元素上，动画只改小的那个。
  - 生成样式字符串的函数加模块级缓存，同样的输入只算一次。
- **滚动**：
  - 小程序里尽量不注册 `onPageScroll`，它会把每一次滚动都发给逻辑层。
  - 用相交监听（`uni.createIntersectionObserver`）观察放在关键位置的 1px 标记线。
  - H5 的相交监听不可靠，用 `// #ifdef H5` 加 `onPageScroll` 兜底，并确认小程序产物里没有它。
- **弹层**：用 `<page-meta :page-style="打开时 'overflow:hidden'">` 锁住背景滚动。不要在 scroll-view 的祖先上加 `catchtouchmove`，否则里面的滚动会失效。
- **胶囊按钮**：右上角永远被胶囊占着，用状态栏高度、导航栏高度和胶囊宽度来排版（本仓库是 `src/common/nav.js` 的 `getNavMetrics()`）。操作图标放在标题旁边，不要放右上角。
- **隐私接口**：用到 `chooseLocation` 这类接口时，要在 `manifest.json` 的 `mp-weixin` 里声明 `requiredPrivateInfos` 和 `permission`，编译后确认 `app.json` 里有；还要提醒用户在公众平台完成接口开通和用户隐私保护指引。

## 坑

- 某个优化在 H5 上测不出来（比如相交监听），一定要到小程序产物里搜一遍，确认代码路径确实在。
- `:last-child` 这类伪类不在检查脚本的禁用名单里，但能不用就不用，用 `index === 0` 加类名更稳。

## 组件样式类要加前缀

uni-app 编译的小程序组件默认是 apply-shared，H5 更是全局样式：页面里的同名类会作用到组件上。比如扫码弹窗的根节点叫 `.sc`，设备管理页里刚好也有一个 `.sc`（扫码框的角），弹窗就被压成了 28px 的小方块。
所以组件里的类名都加上组件自己的前缀（扫码弹窗用 `sfs-`），`mp_check.py` 也会列出「组件和页面同名的样式类」。

## 不要用 @touchstart.stop 包住可以点击的东西

小程序的 tap 是由触摸事件合成的：某个元素拦住了 touchstart（`@touchstart.stop`，编译成 `catchtouchstart`），它和它里面所有元素的点击都会失效。H5 的点击合成方式不同，在浏览器里测不出来。
遥控切屏页就踩过：说明卡片的「知道了」、大屏列表、封面流都点不动。
要区分「这次触摸归谁」时，用普通的 `@touchstart`：子元素先收到事件，记下「被谁接管了」，外层的处理函数看到已被接管就不处理。
`@touchmove.stop` 不影响点击，可以照常用来挡住页面滚动。`mp_check.py` 会列出「拦住 touchstart、里面又有点击的元素」。

