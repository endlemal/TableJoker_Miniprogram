<template>
  <view class="zh" :class="'zh-l' + heat.level" :style="'color:' + heat.tone + ';background:' + bg">
    <z-icon :name="heat.icon" :size="12" :stroke="2.4" :color="heat.tone" />
    <text class="zh-t">{{ heat.label }}</text>
    <text class="zh-n">{{ fmtCount(views) }} 浏览</text>
  </view>
</template>

<script setup>
// 动态热度胶囊：按实时报名人数和浏览量显示（新开放 / 热度上升 / 火爆报名中 / 即将满员）
import { computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { heatOf, fmtCount } from '@/common/heat.js'

const props = defineProps({
  signed: { type: Number, default: 0 },
  cap: { type: Number, default: 1 },
  views: { type: Number, default: 0 }
})
const heat = computed(() => heatOf(props))
const bg = computed(() => heat.value.tone + '1F')
</script>

<style>
.zh { height: 44rpx; padding: 0 16rpx 0 12rpx; border-radius: 999rpx; display: flex; align-items: center; box-sizing: border-box; }
.zh-t { margin-left: 6rpx; font-size: 22rpx; font-weight: 600; }
.zh-n { margin-left: 10rpx; font-size: 20rpx; opacity: .75; }
.zh-l3, .zh-l4 { animation: zh-glow 2.4s ease-in-out infinite; }
@keyframes zh-glow { 50% { box-shadow: 0 0 18rpx currentColor; } }
@media (prefers-reduced-motion: reduce) { .zh-l3, .zh-l4 { animation: none; } }
</style>
