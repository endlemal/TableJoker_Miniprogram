<template>
  <view class="zf" :style="boxStyle">
    <view class="zf-win" :style="winStyle">
      <view class="zf-half zf-top">
        <text class="zf-g" :style="glyphStyle">{{ cur }}</text>
        <view v-if="flipping" class="zf-sh zf-sh-out"></view>
      </view>
      <view class="zf-half zf-bot">
        <text class="zf-g zf-gb" :style="glyphStyle">{{ low }}</text>
        <view v-if="sweeping" class="zf-sh zf-sh-sweep"></view>
      </view>
      <view v-if="flipping" class="zf-leaf zf-lt">
        <text class="zf-g" :style="glyphStyle">{{ prev }}</text>
        <view class="zf-sh zf-sh-dim"></view>
      </view>
      <view v-if="flipping" class="zf-leaf zf-lb">
        <text class="zf-g zf-gb" :style="glyphStyle">{{ cur }}</text>
      </view>
    </view>
    <view class="zf-hinge" :style="hingeStyle"></view>
    <view class="zf-pin" :style="pinStyle + ';left:-' + half(pin)"></view>
    <view class="zf-pin" :style="pinStyle + ';right:-' + half(pin)"></view>
  </view>
</template>

<script setup>
// 翻牌（split-flap）单元，翻页节奏取自《翻牌钟 A 时刻表版》：
// 上叶从静止开始加速下落 190ms，下叶继续下落 160ms 撞到止挡，再回弹两次（190ms）。
// 尺寸参数都按 375 宽的设计稿填写（单位 px）。
import { ref, computed, watch, onBeforeUnmount } from 'vue'

defineOptions({ options: { virtualHost: true } })

const props = defineProps({
  value: { type: [String, Number], default: '' },
  w: { type: Number, default: 40 },
  h: { type: Number, default: 64 },
  fs: { type: Number, default: 72 },
  weight: { type: Number, default: 800 },
  color: { type: String, default: '#F2F2EE' },
  animate: { type: Boolean, default: true },
  radius: { type: Number, default: 3 },
  hinge: { type: Number, default: 2 },
  pin: { type: Number, default: 5 },
  stack: { type: Number, default: 5 }
})

const rpx = (n) => n * 2 + 'rpx'
const half = (n) => rpx(n / 2)

const first = String(props.value)
const cur = ref(first)
const prev = ref(first)
const low = ref(first)
const flipping = ref(false)
const sweeping = ref(false)
let timers = []
const clearTimers = () => { timers.forEach(clearTimeout); timers = [] }

watch(() => String(props.value), (next) => {
  if (next === cur.value) return
  if (!props.animate) {
    clearTimers()
    cur.value = next; prev.value = next; low.value = next
    flipping.value = false; sweeping.value = false
    return
  }
  clearTimers()
  const old = cur.value
  // 先收起上一次的叶片，下一帧再挂上新叶片，保证 CSS 动画每次都从头播放
  flipping.value = false
  sweeping.value = false
  timers.push(setTimeout(() => {
    prev.value = old
    cur.value = next
    low.value = old
    flipping.value = true
    sweeping.value = true
    timers.push(setTimeout(() => { low.value = next; sweeping.value = false }, 350))
    timers.push(setTimeout(() => { flipping.value = false; prev.value = next }, 580))
  }, 16))
})

onBeforeUnmount(clearTimers)

const boxStyle = computed(() => {
  const s = props.stack
  return `width:${rpx(props.w)};height:${rpx(props.h)};border-radius:${rpx(props.radius)};` +
    `box-shadow:0 ${rpx(s * 0.4)} 0 #202020,0 ${rpx(s * 0.8)} 0 #0A0A0A,0 ${rpx(s)} 0 #1C1C1C`
})
const winStyle = computed(() => `border-radius:${rpx(props.radius)};perspective:${rpx(props.h * 6)}`)
const glyphStyle = computed(() =>
  `font-size:${rpx(props.fs)};line-height:${rpx(props.h)};font-weight:${props.weight};color:${props.color}`)
const hingeStyle = computed(() => `height:${rpx(props.hinge)};margin-top:-${half(props.hinge)}`)
const pinStyle = computed(() => `width:${rpx(props.pin)};height:${rpx(props.pin)};margin-top:-${half(props.pin)}`)
</script>

<style>
.zf { position: relative; flex: none; }
.zf-win { position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; }
.zf-half,
.zf-leaf {
  position: absolute; left: 0; right: 0; height: 50%; overflow: hidden;
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
}
.zf-top, .zf-lt { top: 0; background: #1B1B1B; }
.zf-bot, .zf-lb { bottom: 0; background: #161616; }
.zf-g {
  display: block; height: 200%; text-align: center; white-space: nowrap;
  font-family: "BoardNum", "DIN Alternate", "Helvetica Neue", Arial, sans-serif;
  font-variant-numeric: tabular-nums;
}
.zf-gb { transform: translateY(-50%); }
.zf-leaf { z-index: 3; }
.zf-lt { transform-origin: 50% 100%; animation: zf-fall 190ms cubic-bezier(.55, .05, .95, .45) forwards; }
.zf-lb { transform-origin: 50% 0; transform: rotateX(90deg); animation: zf-drop 350ms linear 190ms both; }
.zf-sh { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: #000; opacity: 0; pointer-events: none; }
.zf-sh-dim { animation: zf-dim 190ms ease-in forwards; }
.zf-sh-out { animation: zf-out 310ms ease-out forwards; }
.zf-sh-sweep { background: linear-gradient(#000, rgba(0, 0, 0, 0) 85%); animation: zf-sweep 190ms ease-in forwards; }
.zf-hinge { position: absolute; left: 0; right: 0; top: 50%; background: #000; z-index: 5; }
.zf-pin { position: absolute; top: 50%; border-radius: 50%; background: #5A5A58; z-index: 6; }
@keyframes zf-fall { from { transform: rotateX(0deg); } to { transform: rotateX(-90deg); } }
@keyframes zf-drop {
  0% { transform: rotateX(90deg); animation-timing-function: cubic-bezier(.4, .3, .9, .75); }
  45.71% { transform: rotateX(0deg); animation-timing-function: cubic-bezier(.15, .6, .45, 1); }
  65.26% { transform: rotateX(8deg); animation-timing-function: cubic-bezier(.55, 0, .85, .45); }
  82.63% { transform: rotateX(0deg); animation-timing-function: cubic-bezier(.15, .6, .45, 1); }
  91.31% { transform: rotateX(2.5deg); animation-timing-function: cubic-bezier(.55, 0, .85, .45); }
  100% { transform: rotateX(0deg); }
}
@keyframes zf-dim { from { opacity: 0; } to { opacity: .55; } }
@keyframes zf-out { from { opacity: .4; } to { opacity: 0; } }
@keyframes zf-sweep { from { opacity: 0; } to { opacity: .45; } }
</style>
