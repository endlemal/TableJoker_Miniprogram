# 技能目录

本仓库沉淀的 Claude 技能。每个技能一个目录，入口是 `SKILL.md`：`scripts/` 里是可以直接运行的辅助脚本，`references/` 里是按需阅读的补充材料，`evals/evals.json` 里是用来检验技能效果的示例任务。

| 技能 | 用途 |
|---|---|
| `figma-asset-sync` | 把代码生成的插画和图标同步到 Figma 的美术资产页 |
| `figma-prototype-sync` | 把小程序页面搭成或更新为 Figma 原型 |
| `mp-patch-delivery` | 小程序补丁交付与校验 |
| `uniapp-h5-regression` | uni-app 无头浏览器回归测试与动效录屏 |
| `mp-style-perf-check` | 小程序样式兼容与性能检查 |
| `svg-ratio-art` | 按比例重新构图的 SVG 插画生成 |
| `font-icon-pipeline` | 字体子集与图标生成管线 |
| `design-asset-export` | 设计资产导出与 Figma 排版 |
| `dark-theme-page-design` | 暗色主题页面设计规范 |
| `mp-motion-patterns` | 小程序交互动效模式库 |

## 常见的协作顺序

1. 设计：`dark-theme-page-design`，加动效时用 `mp-motion-patterns`。
2. 资产：`svg-ratio-art`、`font-icon-pipeline`。
3. 检查：`mp-style-perf-check`、`uniapp-h5-regression`。
4. 交付：`mp-patch-delivery`；资产交给设计时用 `design-asset-export`，再交给 `figma-asset-sync`。
