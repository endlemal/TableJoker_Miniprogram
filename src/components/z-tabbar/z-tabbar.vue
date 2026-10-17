<template>
  <view class="tb" :class="{ 'tb-hide': hidden }" :style="rootStyle">
    <!-- 底座：带凹槽的横条。整条 SVG 比导航栏宽一倍，平移它就能让凹槽对准选中项，凹槽是真正透明的 -->
    <view class="tb-clip" :style="clipStyle">
      <view class="tb-track" :class="{ 'tb-anim': ready }" :style="trackStyle"><view class="tb-track-bg" :style="trackBgStyle"></view></view>
    </view>

    <!-- 选中球：图标在球里，文字留在下方的横条上 -->
    <view class="tb-ball-x" :class="{ 'tb-anim': ready }" :style="ballXStyle">
      <view class="tb-ring" :class="ready && moved ? 'tb-ring-' + flip : ''"></view>
      <view class="tb-ball" :class="ready && moved ? 'tb-hop-' + flip : ''" :style="ballStyle">
        <view class="tb-ball-ic" :class="ready && moved ? 'tb-pop-' + flip : ''">
          <z-icon :name="items[shown].icon" :size="22" color="#FFFFFF" />
        </view>
      </view>
    </view>

    <view class="tb-items" :style="itemsStyle">
      <view v-for="(it, i) in items" :key="it.key" class="tb-item" hover-class="tb-press" :hover-stay-time="80" @tap="select(i)">
        <view class="tb-ic" :class="{ 'tb-ic-on': i === shown }"><z-icon :name="it.icon" :size="22" color="#9CA3AF" /></view>
        <text class="tb-t" :class="{ 'tb-t-on': i === shown }">{{ it.label }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getNavMetrics } from '../../common/nav.js'
import { svgUri } from '../../common/svg.js'

// 跨页面记住上一次选中的位置：切到另一个用同一导航的页面时，球会从上一个位置滑过来
let lastIndex = null

/* ---------- 尺寸（px）：按屏幕宽度一次算好，SVG 用精确像素绘制，凹槽不会变形 ---------- */
const px = (rpx) => uni.upx2px(rpx)
const winW = getNavMetrics().winW || 375
const margin = px(32)
const W = winW - margin * 2
const H = px(128)
const RB = px(52)          // 球半径
const GAP = px(12)         // 球与凹槽的间隙：露出背后的页面，形成一圈暗环
const CY = px(8)           // 球心相对横条顶边的位置：球有一半多浮在横条上方
const DEPTH = CY + RB + GAP
const HW = RB + GAP + px(44) // 凹槽半宽，含两侧圆滑的肩部
const RADIUS = px(44)
const SHADOW_Y = px(10)
const SHADOW_BLUR = px(24)

const ROOT_STYLE = `left:${margin}px;width:${W}px;height:${H}px`
const CLIP_STYLE = `width:${W}px;height:${H}px;border-radius:${RADIUS}px`
const ITEMS_STYLE = `width:${W}px;height:${H}px`

// 凹槽路径：两段三次贝塞尔，顶边处水平切入（肩部圆滑），底部水平（贴合球的弧度）
const TW = W * 2
const cx = W
const c = HW * 0.55
const k = HW * 0.45
const edge = (y) => `M0 ${y} H${cx - HW} C${cx - HW + k} ${y} ${cx - c} ${DEPTH + y} ${cx} ${DEPTH + y} C${cx + c} ${DEPTH + y} ${cx + HW - k} ${y} ${cx + HW} ${y} H${TW}`

const trackBgCache = {}
function getTrackBgStyle(barColor, edgeColor) {
  const key = `${barColor}|${edgeColor}`
  if (!trackBgCache[key]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${H}" viewBox="0 0 ${TW} ${H}">` +
      `<path d="${edge(0)} V${H} H0 Z" fill="${barColor}"/>` +
      `<path d="${edge(0.5)}" fill="none" stroke="${edgeColor}" stroke-width="1"/>` +
      '</svg>'
    trackBgCache[key] = `background-image:url("${svgUri(svg)}")`
  }
  return trackBgCache[key]
}
</script>

<script setup>
// 悬浮凹槽导航栏
// 用法：<z-tabbar :items="[{ key, label, icon }]" :active="0" @change="onChange" />
// 动画：凹槽和球一起弹性平移；球移动时下沉再弹起；球里的图标落地时弹出；外圈涟漪；轻触反馈震动
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ZIcon from '../z-icon/z-icon.vue'

defineOptions({ options: { virtualHost: true } })

const props = defineProps({
  items: { type: Array, required: true },
  active: { type: Number, default: 0 },
  barColor: { type: String, default: '#262A34' },
  edgeColor: { type: String, default: '#353845' },
  ballColor: { type: String, default: '#DC0000' },
  // 为 true 时下沉淡出（比如页面滚到底、换成底部按钮时）
  hidden: { type: Boolean, default: false }
})
const emit = defineEmits(['change'])

const rootStyle = ROOT_STYLE
const clipStyle = CLIP_STYLE
const itemsStyle = ITEMS_STYLE

const n = computed(() => props.items.length || 1)
const centerOf = (i) => (W / n.value) * (i + 0.5)

/* ---------- 状态 ---------- */
const start = lastIndex !== null && lastIndex < props.items.length ? lastIndex : props.active
const shown = ref(start)
const ready = ref(false)
const moved = ref(false)
const flip = ref(0)
let mountTimer = null

watch(() => props.active, (i) => {
  lastIndex = i
  if (i !== shown.value) {
    ready.value = true
    moveTo(i)
  }
})

onMounted(() => {
  // 首帧不播放过渡；下一帧开启过渡并从上一个页面位置平滑滑到当前项
  const target = props.active
  lastIndex = target
  mountTimer = setTimeout(() => {
    ready.value = true
    if (shown.value !== target) moveTo(target)
  }, 20)
})

onUnmounted(() => {
  if (mountTimer) clearTimeout(mountTimer)
})

function moveTo(i) {
  if (i === shown.value) return
  flip.value = flip.value ? 0 : 1
  moved.value = true
  shown.value = i
}

function select(i) {
  if (i === shown.value) return
  // 由父组件决定是同页切换（修改 active 触发动画）还是跨页跳转（在新页面挂载后平滑滑入），避免旧页面动画刚开始就被销毁导致回弹卡顿
  emit('change', i)
}

/* ---------- 样式 ---------- */
// 底座图案单独绑定，切换时只更新 transform，不重复传 SVG
const trackBgStyle = computed(() => getTrackBgStyle(props.barColor, props.edgeColor))
const trackStyle = computed(() =>
  `width:${TW}px;height:${H}px;transform:translate3d(${centerOf(shown.value) - W}px,0,0)`)
const ballXStyle = computed(() =>
  `top:${CY - RB}px;width:${RB * 2}px;height:${RB * 2}px;transform:translate3d(${centerOf(shown.value) - RB}px,0,0)`)
const ballStyle = computed(() =>
  `background:${props.ballColor};box-shadow:0 ${SHADOW_Y}px ${SHADOW_BLUR}px rgba(220,0,0,.32)`)
</script>

<style>
.tb { position: fixed; z-index: 40; bottom: calc(44rpx + env(safe-area-inset-bottom)); will-change: transform, opacity; transition: transform .42s cubic-bezier(.2, .8, .2, 1), opacity .28s ease; }
.tb-hide { opacity: 0; transform: translate3d(0, calc(100% + 80rpx), 0); pointer-events: none; }
/* 用 box-shadow 替代 filter: drop-shadow，避免凹槽平移时逐帧重算整条导航栏的高斯模糊滤镜 */
.tb-clip { position: absolute; left: 0; top: 0; overflow: hidden; box-shadow: 0 16rpx 24rpx rgba(0, 0, 0, .4); transform: translateZ(0); }
.tb-track { position: absolute; left: 0; top: 0; will-change: transform; backface-visibility: hidden; }
.tb-track-bg { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background-size: 100% 100%; background-repeat: no-repeat; }
.tb-anim { transition: transform 460ms cubic-bezier(.32, 1.28, .64, 1); }

.tb-ball-x { position: absolute; left: 0; z-index: 3; pointer-events: none; will-change: transform; backface-visibility: hidden; }
.tb-ball { position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; will-change: transform; }
.tb-ball-ic { display: flex; will-change: transform, opacity; }
.tb-ring { position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; border: 4rpx solid rgba(255, 77, 77, .7); opacity: 0; box-sizing: border-box; will-change: transform, opacity; }

/* 球在移动中下沉、落地时轻微回弹；图标在球落地时弹出；外圈一次涟漪。两套同样的关键帧轮流使用，保证每次都从头播放 */
.tb-hop-0 { animation: tb-hop-0 460ms cubic-bezier(.3, .7, .4, 1); }
.tb-hop-1 { animation: tb-hop-1 460ms cubic-bezier(.3, .7, .4, 1); }
.tb-pop-0 { animation: tb-pop-0 500ms ease-out both; }
.tb-pop-1 { animation: tb-pop-1 500ms ease-out both; }
.tb-ring-0 { animation: tb-ring-0 580ms ease-out 320ms; }
.tb-ring-1 { animation: tb-ring-1 580ms ease-out 320ms; }
@keyframes tb-hop-0 { 0% { transform: translate3d(0, 0, 0) scale(1); } 35% { transform: translate3d(0, 22rpx, 0) scale(.82); } 72% { transform: translate3d(0, -6rpx, 0) scale(1.05); } 100% { transform: translate3d(0, 0, 0) scale(1); } }
@keyframes tb-hop-1 { 0% { transform: translate3d(0, 0, 0) scale(1); } 35% { transform: translate3d(0, 22rpx, 0) scale(.82); } 72% { transform: translate3d(0, -6rpx, 0) scale(1.05); } 100% { transform: translate3d(0, 0, 0) scale(1); } }
@keyframes tb-pop-0 { 0%, 42% { opacity: 0; transform: scale(.3) rotate(-28deg); } 78% { opacity: 1; transform: scale(1.15) rotate(5deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes tb-pop-1 { 0%, 42% { opacity: 0; transform: scale(.3) rotate(-28deg); } 78% { opacity: 1; transform: scale(1.15) rotate(5deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes tb-ring-0 { 0% { opacity: .8; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }
@keyframes tb-ring-1 { 0% { opacity: .8; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }

.tb-items { position: absolute; left: 0; top: 0; z-index: 2; display: flex; }
.tb-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20rpx; }
.tb-press { opacity: .7; }
/* 选中项的横条图标「飞」进球里，离开的图标落回横条 */
.tb-ic { display: flex; margin-bottom: 10rpx; will-change: transform, opacity; transition: transform 380ms cubic-bezier(.34, 1.56, .64, 1), opacity 220ms ease; }
.tb-ic-on { opacity: 0; transform: translate3d(0, -40rpx, 0) scale(.6); }
.tb-t { font-size: 22rpx; line-height: 28rpx; color: #9CA3AF; white-space: nowrap; will-change: transform; transition: color 220ms ease, transform 300ms cubic-bezier(.34, 1.56, .64, 1); }
.tb-t-on { color: #FFFFFF; font-weight: 500; transform: translate3d(0, -4rpx, 0); }

@media (prefers-reduced-motion: reduce) {
  .tb-anim, .tb-ic, .tb-t { transition: none; }
  .tb-hop-0, .tb-hop-1, .tb-pop-0, .tb-pop-1, .tb-ring-0, .tb-ring-1 { animation: none; }
}
</style>
