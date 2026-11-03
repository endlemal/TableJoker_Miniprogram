<template>
  <text>{{ text }}</text>
</template>

<script setup>
// 会滚动的数字：值变化时从旧值数到新值（桌面分倒数、收分时记分增加、排行里的盈亏）。
// sign：正数带「+」、负数带「−」；字体和颜色由外面包着它的元素决定
import { ref, computed, watch, onUnmounted } from 'vue'

// 性能：所有 z-count 共用一个计时器，每 80ms 一帧（原来每个数字各自 30ms 一帧）。
// 小程序里每次改数字都要把数据从逻辑层传到渲染层；帧数降到约三分之一，看起来仍然是连续滚动
const FRAME = 80
const active = new Set()
let shared = null
function run(step) {
  active.add(step)
  if (shared) return
  shared = setInterval(() => {
    const now = Date.now()
    active.forEach((f) => f(now))
    if (!active.size) { clearInterval(shared); shared = null }
  }, FRAME)
}

const props = defineProps({ value: { type: Number, default: 0 }, duration: { type: Number, default: 700 }, sign: { type: Boolean, default: false } })
const shown = ref(props.value)
let step = null
watch(() => props.value, (to) => {
  if (step) active.delete(step)
  const from = shown.value
  if (from === to) return
  const t0 = Date.now()
  step = (now) => {
    const k = Math.min(1, (now - t0) / props.duration)
    const e = 1 - Math.pow(1 - k, 3) // 先快后慢
    shown.value = k >= 1 ? to : Math.round(from + (to - from) * e)
    if (k >= 1) active.delete(step)
  }
  run(step)
})
onUnmounted(() => { if (step) active.delete(step) })
const fmt = (n) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const text = computed(() => {
  const v = shown.value
  if (!props.sign) return (v < 0 ? '−' : '') + fmt(v)
  return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(v)
})
</script>
