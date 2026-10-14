<template>
  <view class="tb" :style="rootStyle">
    <!-- 底座：带凹槽的横条。整条 SVG 比导航栏宽一倍，平移它就能让凹槽对准选中项，凹槽是真正透明的 -->
    <view class="tb-clip" :style="clipStyle">
      <view class="tb-track" :class="{ 'tb-anim': ready }" :style="trackStyle"></view>
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
// 跨页面记住上一次选中的位置：切到另一个用同一导航的页面时，球会从上一个位置滑过来
let lastIndex = null
</script>

<script setup>
// 悬浮凹槽导航栏
// 用法：<z-tabbar :items="[{ key, label, icon }]" :active="0" @change="onChange" />
// 动画：凹槽和球一起弹性平移；球移动时下沉再弹起；球里的图标落地时弹出；外圈涟漪；轻触反馈震动
import { ref, computed, watch, onMounted } from 'vue'
import ZIcon from '../z-icon/z-icon.vue'
import { svgUri } from '../../common/svg.js'

defineOptions({ options: { virtualHost: true } })

const props = defineProps({
  items: { type: Array, required: true },
  active: { type: Number, default: 0 },
  barColor: { type: String, default: '#262A34' },
  edgeColor: { type: String, default: '#353845' },
  ballColor: { type: String, default: '#DC0000' }
})
const emit = defineEmits(['change'])

/* ---------- 尺寸（px）：按屏幕宽度一次算好，SVG 用精确像素绘制，凹槽不会变形 ---------- */
const px = (rpx) => uni.upx2px(rpx)
let winW = 375
try { winW = (uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()).windowWidth || 375 } catch (e) {}
const margin = px(32)
const W = winW - margin * 2
const H = px(128)
const RB = px(52)          // 球半径
const GAP = px(12)         // 球与凹槽的间隙：露出背后的页面，形成一圈暗环
const CY = px(8)           // 球心相对横条顶边的位置：球有一半多浮在横条上方
const DEPTH = CY + RB + GAP
const HW = RB + GAP + px(44) // 凹槽半宽，含两侧圆滑的肩部
const RADIUS = px(44)

const n = computed(() => props.items.length || 1)
const centerOf = (i) => (W / n.value) * (i + 0.5)

// 凹槽路径：两段三次贝塞尔，顶边处水平切入（肩部圆滑），底部水平（贴合球的弧度）
const trackSvg = (() => {
  const TW = W * 2
  const cx = W
  const c = HW * 0.55
  const k = HW * 0.45
  const edge = (y) => `M0 ${y} H${cx - HW} C${cx - HW + k} ${y} ${cx - c} ${DEPTH + y} ${cx} ${DEPTH + y} C${cx + c} ${DEPTH + y} ${cx + HW - k} ${y} ${cx + HW} ${y} H${TW}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${H}" viewBox="0 0 ${TW} ${H}">` +
    `<path d="${edge(0)} V${H} H0 Z" fill="${props.barColor}"/>` +
    `<path d="${edge(0.5)}" fill="none" stroke="${props.edgeColor}" stroke-width="1"/>` +
    '</svg>'
})()

/* ---------- 状态 ---------- */
const start = lastIndex !== null && lastIndex < props.items.length ? lastIndex : props.active
const shown = ref(start)
const ready = ref(false)
const moved = ref(false)
const flip = ref(0)

watch(() => props.active, (i) => {
  lastIndex = i
  if (i !== shown.value) moveTo(i)
})

onMounted(() => {
  // 首帧不播放过渡；之后若需要（跨页面进入），从上一个位置滑到当前项
  const target = props.active
  setTimeout(() => {
    ready.value = true
    if (shown.value !== target) setTimeout(() => moveTo(target), 30)
    lastIndex = target
  }, 60)
})

function moveTo(i) {
  if (i === shown.value) return
  flip.value = flip.value ? 0 : 1
  moved.value = true
  shown.value = i
}

function select(i) {
  if (i === shown.value) return
  moveTo(i)
  emit('change', i)
}

/* ---------- 样式 ---------- */
const rootStyle = `left:${margin}px;width:${W}px;height:${H}px`
const clipStyle = `width:${W}px;height:${H}px;border-radius:${RADIUS}px`
const trackStyle = computed(() =>
  `width:${W * 2}px;height:${H}px;background-image:url("${svgUri(trackSvg)}");transform:translateX(${centerOf(shown.value) - W}px)`)
const ballXStyle = computed(() =>
  `top:${CY - RB}px;width:${RB * 2}px;height:${RB * 2}px;transform:translateX(${centerOf(shown.value) - RB}px)`)
const ballStyle = `background:${props.ballColor};box-shadow:0 ${px(10)}px ${px(24)}px rgba(220,0,0,.32)`
const itemsStyle = `width:${W}px;height:${H}px`
</script>

<style>
.tb { position: fixed; z-index: 40; bottom: calc(44rpx + env(safe-area-inset-bottom)); }
.tb-clip { position: absolute; left: 0; top: 0; overflow: hidden; filter: drop-shadow(0 16rpx 24rpx rgba(0, 0, 0, .4)); }
.tb-track { position: absolute; left: 0; top: 0; background-size: 100% 100%; background-repeat: no-repeat; will-change: transform; }
.tb-anim { transition: transform 520ms cubic-bezier(.34, 1.36, .64, 1); }

.tb-ball-x { position: absolute; left: 0; z-index: 3; pointer-events: none; will-change: transform; }
.tb-ball { position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.tb-ball-ic { display: flex; }
.tb-ring { position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; border: 4rpx solid rgba(255, 77, 77, .7); opacity: 0; box-sizing: border-box; }

/* 球在移动中下沉、落地时轻微回弹；图标在球落地时弹出；外圈一次涟漪。两套同样的关键帧轮流使用，保证每次都从头播放 */
.tb-hop-0 { animation: tb-hop-0 520ms cubic-bezier(.3, .7, .4, 1); }
.tb-hop-1 { animation: tb-hop-1 520ms cubic-bezier(.3, .7, .4, 1); }
.tb-pop-0 { animation: tb-pop-0 560ms ease-out both; }
.tb-pop-1 { animation: tb-pop-1 560ms ease-out both; }
.tb-ring-0 { animation: tb-ring-0 640ms ease-out 360ms; }
.tb-ring-1 { animation: tb-ring-1 640ms ease-out 360ms; }
@keyframes tb-hop-0 { 0% { transform: translateY(0) scale(1); } 35% { transform: translateY(24rpx) scale(.8); } 72% { transform: translateY(-8rpx) scale(1.06); } 100% { transform: translateY(0) scale(1); } }
@keyframes tb-hop-1 { 0% { transform: translateY(0) scale(1); } 35% { transform: translateY(24rpx) scale(.8); } 72% { transform: translateY(-8rpx) scale(1.06); } 100% { transform: translateY(0) scale(1); } }
@keyframes tb-pop-0 { 0%, 45% { opacity: 0; transform: scale(.3) rotate(-30deg); } 78% { opacity: 1; transform: scale(1.18) rotate(6deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes tb-pop-1 { 0%, 45% { opacity: 0; transform: scale(.3) rotate(-30deg); } 78% { opacity: 1; transform: scale(1.18) rotate(6deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes tb-ring-0 { 0% { opacity: .8; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }
@keyframes tb-ring-1 { 0% { opacity: .8; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }

.tb-items { position: absolute; left: 0; top: 0; z-index: 2; display: flex; }
.tb-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20rpx; }
.tb-press { opacity: .7; }
/* 选中项的横条图标「飞」进球里，离开的图标落回横条 */
.tb-ic { display: flex; margin-bottom: 10rpx; transition: transform 420ms cubic-bezier(.34, 1.56, .64, 1), opacity 240ms ease; }
.tb-ic-on { opacity: 0; transform: translateY(-40rpx) scale(.6); }
.tb-t { font-size: 22rpx; line-height: 28rpx; color: #9CA3AF; white-space: nowrap; transition: color 240ms ease, transform 320ms cubic-bezier(.34, 1.56, .64, 1); }
.tb-t-on { color: #FFFFFF; font-weight: 500; transform: translateY(-4rpx); }

@media (prefers-reduced-motion: reduce) {
  .tb-anim, .tb-ic, .tb-t { transition: none; }
  .tb-hop-0, .tb-hop-1, .tb-pop-0, .tb-pop-1, .tb-ring-0, .tb-ring-1 { animation: none; }
}
</style>
