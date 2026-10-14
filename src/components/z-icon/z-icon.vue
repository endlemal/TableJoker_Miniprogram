<template>
  <view class="z-icon" :style="iconStyle"></view>
</template>

<script setup>
// 线框图标：把 Tabler 的 SVG 路径拼成 data URI，作为背景图显示。
// size 按 375 宽的设计稿填写（单位 px），内部换算成 rpx。
import { computed } from 'vue'
import { ICONS, FILLED } from '../../common/icons.js'
import { svgUri } from '../../common/svg.js'

defineOptions({ options: { virtualHost: true } })

// 同样的图标（名称、颜色、线宽、尺寸都相同）只拼一次
const cache = {}

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 20 },
  color: { type: String, default: '#FFFFFF' },
  stroke: { type: Number, default: 2 }
})

const iconStyle = computed(() => {
  const key = `${props.name}|${props.color}|${props.stroke}|${props.size}`
  return cache[key] || (cache[key] = buildStyle())
})

function buildStyle() {
  const filled = FILLED[props.name]
  const body = (filled || ICONS[props.name] || '').replace(/currentColor/g, props.color)
  const paint = filled
    ? `fill="${props.color}"`
    : `fill="none" stroke="${props.color}" stroke-width="${props.stroke}" stroke-linecap="round" stroke-linejoin="round"`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${paint}>${body}</svg>`
  const s = props.size * 2 + 'rpx'
  return `width:${s};height:${s};background-image:url("${svgUri(svg)}")`
}
</script>

<style>
.z-icon {
  display: block;
  flex: none;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
}
</style>
