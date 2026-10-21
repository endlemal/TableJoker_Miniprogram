<template>
  <view class="zfi" :style="mode === 'center' || isData ? 'background:' + bg : ''">
    <view v-if="isData" class="zfi-bg" :style="bgStyle"></view>
    <view v-else-if="mode === 'center'" class="zfi-c"><image class="zfi-img" :src="src" mode="scaleToFill" :style="centerSize" /></view>
    <image v-else class="zfi-full" :src="src" :mode="mode" />
  </view>
</template>

<script setup>
// 按四种铺盖方式显示一张图（对应 image 组件的 center / aspectFill / aspectFit / scaleToFill）。
// center（居中裁剪不缩放）要按「图片原始像素 × scale」显示，scale = 预览宽度 / 电视宽度，才能在小预览里还原电视上的效果。
// data: 开头的示意图用背景图实现；真实图片（本地或网络）用 image 组件
import { computed } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  mode: { type: String, default: 'aspectFill' },
  w: { type: Number, default: 0 },
  h: { type: Number, default: 0 },
  scale: { type: Number, default: 1 },
  bg: { type: String, default: '#000000' }
})
const isData = computed(() => /^data:/.test(props.src))
const SIZE = { aspectFill: 'cover', aspectFit: 'contain', scaleToFill: '100% 100%' }
const centerSize = computed(() => `width:${(props.w * props.scale).toFixed(1)}px;height:${(props.h * props.scale).toFixed(1)}px`)
const bgStyle = computed(() => {
  const size = props.mode === 'center' ? `${(props.w * props.scale).toFixed(1)}px ${(props.h * props.scale).toFixed(1)}px` : SIZE[props.mode] || 'cover'
  return `background-image:url("${props.src}");background-size:${size}`
})
</script>

<style>
.zfi { position: relative; width: 100%; height: 100%; overflow: hidden; }
.zfi-bg { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background-position: center; background-repeat: no-repeat; }
.zfi-c { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; }
.zfi-img { flex: none; display: block; }
.zfi-full { width: 100%; height: 100%; display: block; }
</style>
