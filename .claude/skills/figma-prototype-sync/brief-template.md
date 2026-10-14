# 子任务共享说明模板

调度者把 `{{…}}` 填好后写到 `/tmp/proto-tools/brief.md`，每个子任务的 prompt 开头写「先完整读一遍 /tmp/proto-tools/brief.md，严格照做」，再写该页面的具体任务。节点 id 由调度者当场查好填入。

---

# 共享说明：在 Figma 里搭微信小程序页面原型

你要在 Figma 文件 `fX9i6tSO92BSCQHcOx9hXH` 里，把小程序的一个页面搭成可编辑原型（文字、组件实例、图标都可编辑，**不能贴整屏截图**）。其他子任务在同一个文件里并行搭别的页面，你只能改分配给你的节点。

## 开始前必须做
1. 用 Skill 加载 `figma:figma-use` 和 `figma:figma-generate-design`；use_figma 的 skillNames 填 `figma-use,figma-generate-design`。
2. 用 ToolSearch 加载 `select:mcp__plugin_figma_figma__use_figma,mcp__plugin_figma_figma__get_screenshot`。
3. 读页面源码（项目根目录 `/Users/endlernal/Developer/zz-boardgame-uniapp`），mock 数据在 `src/mock/`。rpx ÷ 2 = px（设计宽 375）。
4. 看参考图（2 倍图，坐标 ÷ 2）：`/tmp/proto-ref/<页面>.png` 首屏、`<页面>-full.png` 整页。**不要自己开浏览器截图**；弹层等其他状态按源码搭。

## 文件结构
- 「UI 原型（小程序页面）」`{{原型页 id}}`：在分配给你的主画框里搭页面，高度可按整页调整。额外状态在同一 section 里主画框下方另建 375 宽画框（名称 `<页面名> / <状态>`），间距 80，并把 section 加高。不要改 section 的 x，不要把东西放到 section 外。
- 「组件」`{{组件页 id}}`：
  - 基础组件（只能用，不能改）：{{逐个列出 名称 + id + 变体/属性}}
  - 页面专用、会重复或对应源码组件的元素，先在「组件」页建本地组件再放实例。为你的页面新建 section「页面组件 · <页面名>」，放在指定的 x、y = 0，宽 ≤ 1300，背景绑定 color/bg。
- 「美术资产（代码导出）」`{{美术资产页 id}}`（只读）：
  - 图标组件 `icon/<名称>`（section {{图标 section id}}）：`createInstance()`，矢量 strokes（实心花色改 fills）换成绑定变量的颜色，resize 到源码 size，描边宽改为 `2 × size / 24`。
  - 封面 `cover/<场景>/<尺寸>`（section {{封面 section id}}），帖子封面 `post-*`、纹理 `profile-dice-pattern`（section {{帖子 section id}}）：`clone()` 后放进画框，缩放到界面尺寸，外面套圆角裁切 frame。尺寸用途见 `src/common/cover-art.js` 的 COVER_SIZES。
  - `src/common/svg.js` 里有对应函数的插图，可以在 /tmp 下用 node 生成 SVG 字符串后 `figma.createNodeFromSvg` 导入。

## 变量和样式（必须用，不要写死颜色）
- 颜色变量：{{名称 → VariableID 列表}}，用 `figma.variables.getVariableByIdAsync`。
- 圆角变量：{{radius 列表}}。
- 源码里没有对应变量的颜色（玩家头像底色等）可以写色值；带透明度的颜色用不绑定变量的 SOLID + opacity。
- 文字样式按名称用 `figma.getLocalTextStylesAsync()` 查找。字体对应：ZZDisplay → ZCOOL QingKe HuangYou；BoardHei → Noto Sans SC Black；BoardNum → Big Shoulders Display ExtraBold；正文 → Noto Sans SC。不要用 Inter。

## 搭建要求
- 分区用 auto-layout，图层用中文命名并对应源码区块。
- 文案和数字照 mock 数据和参考图。
- 脚本按 retry-safe 的批次写；每次只切换一次页面；返回创建的节点 id。
- 完成后 get_screenshot（下载 PNG 再用 Read 看）对比参考图，修正明显偏差，大体一致即可，控制调用次数。
- 不要删除或修改别人的节点、基础组件、美术资产页。

## 最后汇报（简短）
主画框 id、额外状态画框 id、本地组件（名称 + id）、和参考图仍有的差异。
