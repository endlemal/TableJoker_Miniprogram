---
name: font-icon-pipeline
description: 维护小程序里以 base64 内嵌的字体子集（标题字体、数字字体、黑体）和由 Tabler 生成的图标表。新增或修改用到标题字体的文字（页面标题、比赛名、海报标题）、需要新的数字字形、或要加新图标时使用；内容改名后标题变成了系统字体、图标显示空白、图标表里有重复项时也一定要用。
---

# 字体子集与图标生成

小程序没法按需下载整套中文字体，所以项目把页面真正用到的字做成子集，以 base64 写进全局样式。图标同理，只把用到的 Tabler 图标路径写进一个 JS 表。好处是体积小、离线可用；代价是每次加字、加图标都要重新生成。漏了，标题就会回退成系统字体，或者图标显示空白。

## 字体

本仓库的生成脚本是 `tools/build_fonts.py`，产物是 `src/styles/fonts.css` 和 `src/common/font-coverage.js`。

| 字体名 | 来源（OFL 协议） | 用在哪 |
|---|---|---|
| ZZDisplay | 站酷庆科黄油体 | 页面大标题、区块标题、比赛名、海报标题 |
| BoardNum | Big Shoulders Display 200 / 700 / 800 | 数字：200 细体用于大号指标，700/800 用于翻牌和时刻表 |
| BoardHei | Noto Sans SC Black | 站牌风格的标签、走字灯 |

1. **加字**：把新标题里的字追加到 `ZZ_TEXT`，脚本会自动去重。细体数字需要的符号（如 `.`、`%`）加到 200 字重的字表里。
2. **运行**：`python3 tools/build_fonts.py`，记下 `fonts.css` 的大小。字体内嵌在主包里，要盯着主包 2MB 的上限。
3. **动态文字**：比赛名这类用户输入的内容，用 `fitsDisplay(text)` 判断。只要有一个字不在子集里，整行就改用系统粗体，避免一行里混用两种字体。
4. **内容改名之后**：搜一遍用到标题字体的地方，把新名字的字补进 `ZZ_TEXT`。比如演示比赛从「德扑」改成「狼人杀」后，比赛名就悄悄回退成了系统字体。
5. **长期方案**：标题字体子集越来越大时，改为用 CDN 托管完整字体，再用 `uni.loadFontFace` 加载，加载不到时回退系统字体。

## 图标

本仓库的生成脚本是 `tools/gen-icons.mjs`，产物是 `src/common/icons.js`，页面里用 `<z-icon name size color stroke>`。

1. **先检查**：运行 `python3 scripts/check_icons.py tools/gen-icons.mjs <node_modules>/@tabler/icons/icons`，确认要加的名字在 Tabler 里存在，并且列表里没有重复。列表里已有的图标不要再加，之前 `shield`、`arrow-right` 都重复加过。
2. **加名字**：线框图标追加到 `OUTLINE`；实心图标加到 `FILLED`，键是页面里用的名字，值是 Tabler 里的文件名。
3. **运行**：`node tools/gen-icons.mjs <node_modules 路径>`。脚本打印的是列表长度；回复和提交信息里的「新增 N 个」，以检查脚本给出的去重后数量为准。
4. **需要一个特殊符号时**：先在 Tabler 里找现成的。比如认证用的 V 标识用的是 `letter-v`，再放进红色圆点里。

## 做完之后

- 重新导出设计资产（见 `design-asset-export` 技能），让 Figma 里的图标也同步。
- 重新编译小程序，把生成的文件和源码一起提交。
