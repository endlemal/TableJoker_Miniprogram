---
name: figma-asset-sync
description: 把代码生成的插画和图标（比赛封面、帖子封面、纹理、z-icon 图标）导出成 SVG，同步到 Figma 文件的「美术资产（代码导出）」页面。在改了 src/common/cover-art.js、svg.js、icons.js 或 coverScenes 之后，或用户要求「更新 Figma 里的封面/图标」时使用。
---

# 美术资产同步到 Figma

Figma 文件：`fX9i6tSO92BSCQHcOx9hXH`，页面「美术资产（代码导出）」。
画布结构：
- section「比赛封面（src/common/cover-art.js）」：每个场景一行，frame 名 `cover/<场景>/<尺寸>`。
- section「帖子封面与纹理（src/common/svg.js）」：`post-*` 和 `profile-dice-pattern`。
- section「图标（src/common/icons.js）」：组件名 `icon/<名称>`，按名称字母顺序排网格。

节点 id 会变，**每次都先用 use_figma 按名称查找**，不要沿用旧 id。

## 步骤

1. **导出**：`node tools/export-svg.mjs`。输出到 `design/svg/`，`design/svg/covers/index.json` 列出场景、名称、寓意和各尺寸文件；排版规则见 `design/svg/README.md`。
2. **找出差异**：用一次只读 use_figma 列出页面上现有的 frame/组件名，和导出的文件对比，确定要新增、替换、删除的项。只上传变化的文件。
3. **上传**：
   - 调 `upload_assets`（`currentPageId` 填美术资产页的 id，`count` 等于文件数，**一次最多 60**）。
   - 把返回的 submitUrl 按顺序写进 `/tmp/<任务名>/urls.txt`，然后运行：
     `node tools/figma/upload.mjs /tmp/<任务名>/urls.txt <文件...> > /tmp/<任务名>/result.json`
   - result.json 里是「文件 → placedOnNodeId」。上传后的图层名就是文件名（不含扩展名），节点都放在页面顶层的右侧。
4. **排版**（一次 use_figma 完成，脚本里用 result.json 的 id）：
   - 删除被替换的旧节点（删除前确认名字对得上）。
   - 封面：每个场景一行，横向 auto-layout，顺序 banner、wide、share、square、portrait、story，`counterAxisAlignItems = 'MAX'`（底边对齐），间距 40；左侧 240 宽的文字列放场景名（Noto Sans SC Bold 40）、寓意（Regular 20）、key（Regular 16 灰）。行与行之间 120。section 按内容 `resizeWithoutConstraints`。
   - 新图标：`figma.createComponentFromNode(frame)`，名称 `icon/<名称>`，fills/clipsContent 照抄已有图标组件；然后把整个图标 section 的子节点按名称排序，12 列、步长 72、起点 (80, 80) 重新排，section 高度相应调整。
   - 各 section 纵向依次排列，间隔 120，x = 0。
5. **截图确认**：对改动的 section 调 `get_screenshot`，下载 PNG 后用 Read 查看，再把图片路径告诉用户。

## 坑

- `use_figma` 的代码上限是 50KB，SVG 不能直接写进脚本，一律走 `upload_assets`。
- 上传地址只能用一次、10 分钟后过期；拿到地址后立刻上传。
- 不要用 zsh 数组循环拼「地址 ↔ 文件」，zsh 数组下标从 1 开始，会整体错位一个。用 `tools/figma/upload.mjs`。
- 上传失败的那一项要重新申请地址补传，不要重复上传已成功的文件（会在画布上多出重复节点）。
