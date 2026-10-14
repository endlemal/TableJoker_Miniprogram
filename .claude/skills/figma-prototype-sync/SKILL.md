---
name: figma-prototype-sync
description: 把小程序页面（src/pages/*）搭成或更新为 Figma 里的可编辑原型，并维护「组件」页的设计变量、文字样式和组件。在用户要求「把页面同步到 Figma」「更新某页原型」「在 Figma 里加组件」时使用。
---

# 小程序页面原型同步到 Figma

Figma 文件：`fX9i6tSO92BSCQHcOx9hXH`。相关页面：
- 「UI 原型（小程序页面）」：每个小程序页面一个 section（名称 `<页面名> · pages/<x>/index`），里面一个 375 宽主画框；弹层等额外状态放在主画框**下方**，间距 80，画框名 `<页面名> / <状态>`。
- 「组件」：section「基础组件（src/components + 通用样式）」放通用组件；每个页面一个 section「页面组件 · <页面名>」放页面专用组件。所有 section 背景绑定 color/bg。
- 「美术资产（代码导出）」：封面、图标组件，原型里只 clone 或建实例（维护见 figma-asset-sync skill）。

节点 id 会变，**每次都先用 use_figma 按名称查找**页面、section、组件、变量和文字样式。

## 开始前

1. 加载 `figma:figma-use` 和 `figma:figma-generate-design`（调用 use_figma 时 skillNames 填 `figma-use,figma-generate-design`）。
2. 只读检查目标页面现状：要更新的页面是整页重搭，还是只改某几个区块（只改区块时按图层名定位，做针对性修改）。
3. 截参考图：先 `npm run dev:h5`（后台运行），再 `node tools/figma/shot.mjs /tmp/proto-ref [页面名...]`。每页得到首屏和整页两张 2 倍图。用完后关掉开发服务器。
   - 不要用 `chrome --headless --window-size=375,...`，375 宽不生效，截出来右边会被裁掉。
   - 多个子任务并行时，由调度者统一截图，子任务不要自己开浏览器。

## 设计约定

- 尺寸：源码 rpx ÷ 2 = Figma px（设计宽 375）。H5 参考图没有微信状态栏和胶囊，原型按参考图来，不额外加状态栏。
- 字体对应（不要用 Inter）：

  | 源码 | Figma |
  |---|---|
  | ZZDisplay | ZCOOL QingKe HuangYou / Regular |
  | BoardHei | Noto Sans SC / Black |
  | BoardNum | Big Shoulders Display / ExtraBold |
  | PingFang SC（正文） | Noto Sans SC / Regular、Medium、Bold |

- 颜色：变量集合 `TableJoker`，`color/<名称>` 和 `src/App.vue` 里的 `--<名称>` 一一对应；圆角 `radius/sm|md|lg|xl|pill`。源码里改了色值或加了变量，先同步变量再搭页面。
- 文字样式：display/*、heading/*、body/*、caption、num/*，套用后可以覆盖字号。
- 基础组件：Avatar、Button、IconButton、Badge、RankTag、SegmentedItem、Tabbar（z-tabbar）、FlapDigit（z-flap）。`src/components` 里的组件改了，先更新这里。
- 页面里会重复出现、或对应源码组件/样式块的元素，先建成「页面组件 · <页面名>」里的本地组件，再在原型里放实例。
- 图层命名用中文，对应源码区块（顶栏、比赛卡片、底部操作栏……）。分区用 auto-layout。固定在底部的导航栏和操作栏放在主画框底部。

## 多页面时：每页一个子任务

一次要搭 3 页以上时，调度者先完成：截参考图、变量/文字样式/基础组件、每页的空 section 和主画框（主画框 375 宽、高度取整页截图高度、背景绑定 color/bg、clipsContent）。然后用 Agent 并行派发，每个子任务一页。给子任务的共享说明照 [brief-template.md](brief-template.md) 填写；为每个子任务指定：页面源码、section 和主画框 id、参考图路径、「页面组件」section 的 x 位置（各页错开，宽度 ≤ 1300）、需要做的额外状态。子任务只能改分配给自己的节点。

全部完成后，调度者：统一「组件」页 section 背景；逐个截主画框，并用本地 HTML + headless Chrome 拼一张总览图给用户确认。

## Plugin API 坑（这个文件里实际遇到过）

- 绑定了变量的 paint 再加 `opacity` 会失效。半透明色用不绑定变量的 `{type:'SOLID', color, opacity}`。
- 自动布局 frame 默认按内容收缩：圆形（如导航选中球）要设 `primaryAxisSizingMode/counterAxisSizingMode = 'FIXED'` 再 `resize`，否则会变成椭圆。
- `appendChild()` 没有返回值，不能写 `parent.appendChild(x).name = ...`。
- 组件集里各变体共用同一个 TEXT 属性默认值，组件页预览会显示同一段文字；在实例上覆盖文案。
- 图标实例缩小后，描边宽度按 `2 × size / 24` 调细，否则小图标会糊成实心。
- 图标实例换色：把实例里矢量的 strokes（实心花色图标改 fills）换成绑定变量的 paint；INSTANCE_SWAP 换图标后颜色会丢，要重新设置。
- 脚本出错时 use_figma 会整体回滚；先只读检查一次画布再重试。
- 每次 use_figma 只切换一次页面；「组件」页和「UI 原型」页的修改分开调用。
