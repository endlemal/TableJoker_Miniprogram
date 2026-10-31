<template>
  <text>{{ text }}</text>
</template>

<script setup>
// 会滚动的数字：值变化时从旧值数到新值（桌面分倒数、收分时记分增加、排行里的盈亏）。
// sign：正数带「+」、负数带「−」；字体和颜色由外面包着它的元素决定
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({ value: { type: Number, default: 0 }, duration: { type: Number, default: 700 }, sign: { type: Boolean, default: false } })
const shown = ref(props.value)
let timer = null
watch(() => props.value, (to) => {
  clearInterval(timer)
  const from = shown.value
  if (from === to) return
  const t0 = Date.now()
  timer = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / props.duration)
    const e = 1 - Math.pow(1 - k, 3) // 先快后慢
    shown.value = Math.round(from + (to - from) * e)
    if (k >= 1) { clearInterval(timer); shown.value = to }
  }, 30)
})
onUnmounted(() => clearInterval(timer))
const fmt = (n) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const text = computed(() => {
  const v = shown.value
  if (!props.sign) return (v < 0 ? '−' : '') + fmt(v)
  return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(v)
})
</script>
