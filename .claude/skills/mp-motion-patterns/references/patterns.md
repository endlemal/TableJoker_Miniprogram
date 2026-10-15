# 动效模式：代码

目录：可重复触发的关键帧 · 悬浮凹槽导航 · 卡片展开成详情 · grid 折叠面板 · 入场错落 · 数字递增 · 滚到底切换按钮 · 吸顶分类与滑块 · 徽章弹出 · 多元素同步循环 · 下拉关闭 · 减少动态效果

本仓库里的完整实现：`src/components/z-tabbar/z-tabbar.vue`、`src/pages/plaza/index.vue`、`src/pages/host/index.vue`。

## 可重复触发的关键帧

同一个类名再加一次，动画不会重播。准备两套一样的关键帧轮流用：

```css
.pop-0 { animation: pop-0 .42s cubic-bezier(.34, 1.56, .64, 1); }
.pop-1 { animation: pop-1 .42s cubic-bezier(.34, 1.56, .64, 1); }
@keyframes pop-0 { 40% { transform: scale(1.35); } }
@keyframes pop-1 { 40% { transform: scale(1.35); } }
```

```js
const flip = ref(0)
function play() { flip.value = flip.value ? 0 : 1 }   // 模板：:class="'pop-' + flip"
```

## 悬浮凹槽导航（跨页滑动）

```js
// 模块级变量：所有页面共享。记录的是「当前显示的页面对应哪一项」，不是用户点了哪一项
let lastIndex = null

const start = lastIndex !== null ? lastIndex : props.active
const shown = ref(start)            // 先停在上一页的位置
onMounted(() => {
  const target = props.active
  setTimeout(() => {
    ready.value = true              // 首帧不过渡
    if (shown.value !== target) setTimeout(() => moveTo(target), 30)
    lastIndex = target
  }, 60)
})
watch(() => props.active, (i) => { lastIndex = i; if (i !== shown.value) moveTo(i) })
```

页面里点了要跳转的那一项，直接 `uni.redirectTo`，**不要先改 active**；否则 `lastIndex` 会先变成目标项，新页面上的球就不会滑了。

凹槽：底座是一张两倍宽的 SVG，凹槽在正中，整体用 `transform: translateX(选中项中心 - 宽度)` 平移，凹槽是真正透明的。

## 卡片展开成详情

```js
const rectOf = (sel) => new Promise((r) => uni.createSelectorQuery().select(sel).boundingClientRect(r).exec())
const MOVE = 'transition:left .5s cubic-bezier(.2,.8,.2,1),top .5s cubic-bezier(.2,.8,.2,1),width .5s cubic-bezier(.2,.8,.2,1),height .5s cubic-bezier(.2,.8,.2,1),border-radius .5s;'
const at = (r, anim) => `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:12px;${anim ? MOVE : 'transition:none;'}`
const full = (anim) => `left:0;top:0;width:${winW}px;height:${heroH}px;border-radius:0;${anim ? MOVE : 'transition:none;'}`

async function open(item) {
  const r = await rectOf('#cover-' + item.id)
  detail.value = item
  ghost.value = at(r, false)                      // 先瞬间放到卡片的位置
  setTimeout(() => { ghost.value = full(true); opened.value = true }, 30)
}
async function close() {
  const r = await rectOf('#cover-' + detail.value.id)   // 重新量，防止期间布局变了
  ghost.value = r && r.width ? at(r, true) : full(true)
  opened.value = false
  setTimeout(() => { detail.value = null }, 500)
}
```

```html
<!-- 位置和封面分开：动画只改外层的位置，封面的 data URI 只在打开时传一次 -->
<view class="ghost" :style="ghost"><view class="ghost-cover" :style="detail.coverStyle"></view></view>
```

正文：`opacity: 0; transform: translateY(80rpx)` → 打开后 `opacity: 1; transform: none`，`transition-delay: .16s`。打开时用 `<page-meta :page-style="'overflow:hidden'">` 锁住背景滚动。

## grid 折叠面板

```css
.fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s ease; }
.fold-on { grid-template-rows: 1fr; }
.fold-in { min-height: 0; overflow: hidden; }
```

```html
<view class="fold" :class="{ 'fold-on': open }"><view class="fold-in">…内容…</view></view>
```

收起时如果内容由「当前选中项」计算，选中被清空后文字会立刻消失，动画还没结束就闪空。所以把最后一次的文字单独存起来：

```js
function pick(g, i) {
  if (sel[g] === i) { delete sel[g]; return }   // 收起，desc[g] 保留
  sel[g] = i
  desc[g] = groups[g].items[i].desc
}
```

## 入场错落

```css
.card { opacity: 0; transform: translateY(56rpx) scale(.98); transition: opacity .5s ease, transform .65s cubic-bezier(.2, .8, .2, 1); }
.card-in { opacity: 1; transform: none; }
```

```js
// 小程序：相交监听，进入视口就加 card-in；延迟按列内序号递增，最多 360ms
const io = uni.createIntersectionObserver(instance.proxy, { observeAll: true })
io.relativeToViewport({ bottom: 40 }).observe('.card', (res) => {
  if (res.intersectionRatio > 0 && res.id) shown[res.id.slice(2)] = true
})
// 模板：:style="'transition-delay:' + Math.min(360, 列内序号 * 70 + 列号 * 40) + 'ms'"
```

H5 下 uni 的相交监听会把所有卡片都当成可见，效果退化为一次性错落入场，可以接受。

## 数字递增

```js
function countUp(list, setter, dur = 900) {
  const start = Date.now()
  const tick = () => {
    const t = Math.min(1, (Date.now() - start) / dur)
    const e = 1 - Math.pow(1 - t, 3)                 // 缓出
    setter(list.map((x) => (x.value * e).toFixed(x.decimals)))
    if (t < 1) setTimeout(tick, 32)                  // 逻辑层没有 requestAnimationFrame
  }
  tick()
}
```

## 滚到底切换按钮

```html
<view class="end-line"></view>   <!-- 放在内容最后 -->
<view class="cta" :class="{ 'cta-on': atBottom }">…主按钮…</view>
<z-tabbar … :hidden="atBottom" />
```

```css
.cta { opacity: 0; transform: translateY(100%); pointer-events: none; transition: transform .45s cubic-bezier(.2, .8, .2, 1), opacity .35s ease; }
.cta-on { opacity: 1; transform: translateY(0); pointer-events: auto; transition-delay: .12s; }
.tb-hide { opacity: 0; transform: translateY(calc(100% + 80rpx)); pointer-events: none; }
```

```js
// #ifndef H5
uni.createIntersectionObserver(instance.proxy).relativeToViewport({ bottom: 0 })
  .observe('.end-line', (res) => { atBottom.value = res.intersectionRatio > 0 })
// #endif
// #ifdef H5
onPageScroll(({ scrollTop }) => {
  atBottom.value = scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 140
})
// #endif
```

## 吸顶分类与滑块

```css
.chips { position: sticky; top: 导航栏高度; }
.chip-ind { position: absolute; width: 132rpx; transition: transform .42s cubic-bezier(.34, 1.36, .64, 1); }
```

```html
<view class="chip-ind" :style="'transform:translateX(' + cat * 136 + 'rpx)'"></view>
```

切换分类：先给列表加淡出类 160ms，再换数据、清掉入场标记、重新观察，卡片就会重新错落入场。

## 徽章弹出

```css
.vb { animation: v-add .5s cubic-bezier(.34, 1.56, .64, 1) .45s both; }
@keyframes v-add { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
```

想让它在切换回来时重播，就给外层容器加 `:key="当前项"`，让 Vue 重新创建这个元素。

## 多元素同步循环

所有元素用同一个时长（例如 4.4s），按各自的百分比动作：三张牌分别在 4–16%、16–28%、28–40% 飞到桌上，光束在 42–56% 落下，光环在 44–72% 亮起，徽章在 52% 闪金。它们同时被创建，所以天然同步，不需要 JS 协调。

## 下拉关闭

```js
const onStart = (e) => { y0 = e.touches[0].clientY; dragging.value = scrollTop <= 2 }
const onMove = (e) => { if (dragging.value) drag.value = Math.max(0, (e.touches[0].clientY - y0) * 0.55) }
const onEnd = () => { if (!dragging.value) return; dragging.value = false; drag.value > 110 ? close() : (drag.value = 0) }
// 样式：transform: translateY(drag px) scale(1 - drag / 2400)；拖动时 transition: none，松手后弹回
```

每次 touchmove 都要 setData，低端机可能跟不上手指，此时改用 WXS 在视图层直接改样式。

## 减少动态效果

```css
@media (prefers-reduced-motion: reduce) {
  .card, .fold, .cta, .chip-ind { transition: none; }
  .hc, .vb, .lead-arrow { animation: none; }
  .vb { opacity: 1; transform: none; }        /* 直接显示最终状态 */
}
```
