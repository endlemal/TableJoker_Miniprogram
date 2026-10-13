# 桌游聚 · 三个页面（uni-app Vue 3 + Vite）

基于官方模板 `dcloudio/uni-preset-vue#vite`（uni-app 3.0.0-5020620260917001，编译器 5.26），实现对话里确认过的四个页面：

| 页面 | 文件 | 进入方式 |
| --- | --- | --- |
| 首页 | `src/pages/home/index.vue` | 启动页 |
| 个人主页 | `src/pages/profile/index.vue` | 首页点底部用户栏 |
| 创建比赛 | `src/pages/create/index.vue` | 首页点「创建比赛」 |
| 德州扑克房间 | `src/pages/room/index.vue` | 创建页发布后点「进入房间」，或首页扫码、邀请链接 |

共用的文件：

```
src/components/z-icon/z-icon.vue   线框图标（Tabler Icons，MIT），SVG data URI 背景图
src/components/z-flap/z-flap.vue   翻牌单元（房间页的翻牌钟、级别、盲注）
src/common/icons.js                图标路径，由 tools/gen-icons.mjs 生成
src/common/svg.js                  封面插图（血月森林、骰面纹理、创建页五幅环境封面）
src/common/store.js                方案的本地存储（uni.setStorageSync）
src/common/nav.js                  自定义导航栏尺寸（状态栏、胶囊）和返回逻辑
src/mock/data.js                   演示数据，接后端时按同样字段替换
src/styles/fonts.css               字体子集（base64），由 tools/build_fonts.py 生成
src/App.vue                        主题色板（page 上的 CSS 变量）和字体引入
src/pages.json                     路由，四个页面都用自定义导航栏
```

## 创建比赛页的交互

- **盲注结构**：点击后先弹出「盲注方案」，选一个就用它。
  - 没有合适的，点「新建方案」，会打开悬浮在当页的盲注表格。
  - 长按某个方案可以编辑或删除，正在使用的方案不能删。
  - 盲注方案最多存 5 个。
- **盲注表格**：每行可以直接改小盲、大盲、前注和分钟，右侧删除整行，底部添加级别、休息、截止买入。
  - 新加的级别：小盲按上一级的 1.5 倍取整，大盲是小盲的 2 倍。
  - 截止买入一个方案只能有一个。
  - 级别编号只给级别排，休息和截止不占号，和房间页「第 X 级」一致。
  - 单元格用比面板亮一档的灰色，休息和截止用低饱和的暖黄和酒红，只有正在输入的格子显示红框。
- **日期、人数上限**：底部滚轮选择器（picker-view）。人数下方提示大约几桌。
- **底部「方案」**：中央悬浮窗，存的是整场比赛的设置（封面、名称、盲注方案、时间、人数、介绍、两个开关、共同主持），不含日期。
  - 点一个就把整张表填好，「存为方案」保存当前设置，长按删除。
  - 比赛方案最多存 5 个。
- **发布去分享**：按钮用 `open-type="share"`，发布后直接拉起微信转发；发布后按钮变成「进入房间」。名称为空或没选盲注方案时只提示，不会发布。
- 两类方案目前都存在本地（`zz_blind_schemes`、`zz_match_templates`），接后端时把 `src/common/store.js` 换成接口即可。

## 运行

```bash
npm install
npm run dev:mp-weixin
```

用微信开发者工具导入 `dist/dev/mp-weixin`。没有 appid 时可以选测试号，或在 `src/manifest.json` 的 `mp-weixin.appid` 里填写。

## 验证记录

- `npm run dev:mp-weixin`：`DONE Build complete. Watching for changes...`，没有警告和报错。
- `npm run build:mp-weixin`：发布包 332 KB，其中 `app.wxss` 84 KB（约 83 KB 是字体子集），远低于 2 MB 主包上限。
- WXSS 检查：生成的样式里没有通配符、属性选择器、相邻兄弟选择器（`[data-c-h]` 是 uni-app 自带的 `v-show` 辅助样式）。
- 同一份源码编译成 H5，在 Chromium 375×812 下截图和跑交互，见 `docs/screenshots/`，全程没有控制台报错：
  - 首页 → 创建比赛 → 盲注结构 → 新建方案 → 表格里加级别、休息、截止买入 → 保存方案，入口显示新方案
  - 日期和人数滚轮，套用比赛方案，切换开关，发布后按钮变成「进入房间」
  - 用户栏 → 个人主页，创建比赛 → 房间
  - 消息栏 + 号展开玩法组件，公共牌和走字灯互相替换，点牌背翻开新牌
  - 盲注表时刻表，发消息后同时出现在聊天和走字灯上
  - 最后一分钟变黄，到点自动换级：级别、盲注一起翻牌
- 没有覆盖到：微信开发者工具和真机渲染（运行环境里没有微信开发者工具）。导入后建议重点看三处：翻牌的 3D 动画、走字灯的 LED 点阵、勋章的六边形裁切。

## 接入到已有项目

1. 复制 `src/components`、`src/common`、`src/mock`、`src/styles` 和三个页面目录。
2. 把 `src/pages.json` 里的三个页面配置合并进你的 `pages.json`。
3. 把 `src/App.vue` 里的 `@import './styles/fonts.css'` 和 `page { ... }` 变量合并进你的 `App.vue`。

## 与效果图的差异和适配说明

- **胶囊区域**：三个页面都是自定义导航栏，内容会避开右上角胶囊。首页在胶囊那一行显示当前服务器名，房间页把站名牌放在胶囊行。
- **字体**：
  - BoardNum：Big Shoulders Display，参考文件里内嵌的就是这款。
  - BoardHei：Noto Sans SC Black，参考文件里用的是 Noto Sans CJK SC Black。
  - ZZDisplay：站酷庆科黄油体。
  - 三款都是 SIL OFL 授权，子集只包含页面里出现的字。改了文案后运行 `python3 tools/build_fonts.py` 重新生成。
  - 用户输入的昵称、聊天内容里不在子集中的字，会回退到系统字体。如果要完整覆盖，改用 CDN 托管完整字体，再用 `uni.loadFontFace` 加载。
- **效果补回**：效果图里因为渲染限制省掉的效果，这里按主题和参考文件加回来了，包括主按钮的红色光晕、翻牌底部的叠片阴影、LED 文字发光。
- **段位图标**：首页用户栏和个人主页统一用菱形。
- **计时**：演示版用本地时钟推算。正式版应按参考文件的锚点模型，以服务端快照加单调时钟为准，多块屏幕才能对齐。
  - 长按牌桌面板可以跳到本级最后 15 秒，方便查看换级效果。这是开发用的，上线前删掉 `jumpToEnd`。
- **座位**：只显示头像、昵称和座位号。不显示每位玩家的计时、记分牌数量和庄位，因为比赛在线下进行。
  - 「抽座位」会随机重排九个座位号。
  - 「邀请」用的是 `open-type="share"`，转发标题写在 `onShareAppMessage` 里。
- **比赛介绍**：小程序的 textarea 是原生组件，层级高于普通视图。弹层打开时，这里会换成静态文字，防止输入框盖住弹层。
- **占位功能**：广场、排行、成为主办方、战绩和我的配置两个标签页、边池计算、钱包都还没接入，目前点击只弹提示。

## 新增图标

在 `tools/gen-icons.mjs` 的列表里加上 Tabler 图标名，然后执行：

```bash
npm i -D @tabler/icons
node tools/gen-icons.mjs
```
