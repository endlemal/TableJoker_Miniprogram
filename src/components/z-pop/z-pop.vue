<template>
  <view class="pop" :class="[{ 'pop-on': show }, 'pop-' + tone]" :style="topStyle">
    <view class="pop-ic"><z-icon :name="icon" :size="14" :stroke="2.6" color="#FFFFFF" /></view>
    <text class="pop-t">{{ text }}</text>
  </view>
</template>

<script setup>
// 从导航栏下方弹出的提示条。showToast 的文字有长度限制，较长的提示用它。
// 由页面控制 show（一般 2 秒左右后收起）；tone：red 表示进入、完成，gray 表示提示、退出
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics } from '@/common/nav.js'

defineProps({
  show: { type: Boolean, default: false },
  text: { type: String, default: '' },
  icon: { type: String, default: 'check' },
  tone: { type: String, default: 'red' }
})
const nav = getNavMetrics()
const topStyle = `top:${nav.statusBar + nav.navH + 8}px`
</script>

<style>
.pop {
  position: fixed; z-index: 300; left: 50%; max-width: 640rpx; display: flex; align-items: center;
  padding: 16rpx 30rpx 16rpx 16rpx; box-sizing: border-box; border-radius: 999rpx;
  background: rgba(38, 42, 52, .97); border: 1rpx solid rgba(255, 255, 255, .1); box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, .45);
  opacity: 0; transform: translate(-50%, -24rpx) scale(.96); pointer-events: none;
  transition: opacity .28s ease, transform .4s cubic-bezier(.34, 1.56, .64, 1);
}
.pop-on { opacity: 1; transform: translate(-50%, 0) scale(1); }
.pop-ic { width: 44rpx; height: 44rpx; flex: none; border-radius: 50%; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.pop-gray .pop-ic { background: #4B5060; }
.pop-t { margin-left: 16rpx; font-size: 26rpx; font-weight: 500; color: #FFFFFF; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .pop { transition: none; } }
</style>
