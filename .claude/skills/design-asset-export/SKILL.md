---
name: design-asset-export
description: 把代码生成的插画和图标导出为独立的 SVG 文件，并生成资产清单和排版说明，交给 Figma 同步、设计师或其他 Agent 使用。改了封面场景、插画或图标之后，或者要把美术资产交给设计、需要在多个 Agent 之间传递资产时使用。上传到 Figma 的具体操作见 figma-asset-sync 技能，本技能负责它之前的导出和交接。
---

# 设计资产导出

代码是插画和图标的源头，Figma 和设计师拿到的是导出的文件。导出这一步要做到两点：文件名稳定，因为 Figma 同步靠名字找节点；每个文件的用途写清楚，让别的 Agent 不读代码也能排版。

## 步骤

1. **运行导出**：`node tools/export-svg.mjs [输出目录，默认 design/svg]`。脚本每次都会重建 `covers/` 和 `icons/`，避免留下改名或删掉的旧文件。导出内容：
   - `covers/scene-<场景>-<尺寸>.svg`：比赛封面，场景数 × 6 种尺寸。
   - `covers/post-<名称>.svg`：帖子封面。
   - `covers/profile-dice-pattern.svg`：平铺纹理。
   - `covers/index.json`：每种尺寸的像素和用途；每个场景的名称、寓意和各尺寸的文件路径。
   - `icons/<名称>.svg`：24×24、线宽 2、统一黑色的图标。
2. **看差异**：`git status --short design/svg`，列出新增、修改和删除的文件，只同步有变化的部分。
3. **更新说明**：新增了资产类型或尺寸时，同步更新 `design/svg/README.md` 里的尺寸表（每种尺寸的用途）、场景表（名称和寓意）和 Figma 排版约定。
4. **写交接指令**：把要做的事写成一段可以直接执行的指令，交给有 Figma 权限的 Agent。示例：

   > 读取 design/svg/README.md 和 design/svg/covers/index.json，更新 Figma 文件的「美术资产（代码导出）」页面：删除已经不存在的节点；按 index.json 每个场景放一行，从左到右是 banner、wide、share、square、portrait、story，底边对齐，间距 40，frame 命名为 cover/<场景>/<尺寸>；每行左侧放名称和寓意；新图标转成组件，命名为 icon/<名称>。完成后截图给我确认。

## Figma 排版约定

- 每个场景一行，六种尺寸从左到右依次是 banner、wide、share、square、portrait、story，底边对齐，间距 40。
- frame 命名为 `cover/<场景>/<尺寸>`，图标组件命名为 `icon/<名称>`。

## 坑

- **导不出 SVG 的东西**：用 CSS 拼出来的装饰、运行时按屏幕宽度计算的形状（比如导航栏凹槽）、照片（比如 `src/static/host/poster.jpg`）。在 README 里写明它们在哪、怎么处理。
- **想在 Figma 里改完再同步回代码**：前提是这部分插画以静态文件为准。现在由函数生成的插画，从 Figma 读回来的 SVG 没法塞回函数里，要先把这部分改成静态文件。
- **改了名字**：在交接指令里写明哪些旧名字已经删除，否则 Figma 里会同时留着新旧两份。
