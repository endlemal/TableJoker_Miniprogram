<template>
  <view class="zcl">
    <view class="zcl-h" hover-class="zcl-press" @tap="open = !open">
      <text class="zcl-t">记分牌面额</text>
      <view v-if="!open" class="zcl-dots"><view v-for="c in chips" :key="c.v" class="zcl-dot" :style="'background:' + c.color"></view></view>
      <text class="zcl-s">{{ chips.length }} 种</text>
      <z-icon :name="open ? 'chevron-up' : 'chevron-down'" :size="14" color="#9CA3AF" />
    </view>
    <view v-if="open" class="zcl-row">
      <view v-for="c in chips" :key="c.v" class="zcl-i">
        <view class="zcl-chip" :style="'background:' + c.color"><view class="zcl-chip-in" :style="'border-color:' + c.color"></view></view>
        <text class="zcl-v">{{ fmt(c.v) }}</text>
        <text class="zcl-n">{{ c.name }}色</text>
      </view>
    </view>
  </view>
</template>

<script setup>
// 记分牌面额图例：默认紧凑显示本场用到的记分牌颜色和面额，点标题折叠 / 展开
import { ref } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'

defineProps({ chips: { type: Array, default: () => [] } })
const open = ref(true)
const fmt = (v) => (v >= 1000 ? (v / 1000) + 'K' : String(v))
</script>

<style>
.zcl { margin-top: 24rpx; border-radius: 24rpx; background: #1F222A; }
.zcl-h { height: 84rpx; padding: 0 24rpx; display: flex; align-items: center; }
.zcl-t { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }
.zcl-dots { margin-left: 16rpx; display: flex; }
.zcl-dot { width: 18rpx; height: 18rpx; margin-right: 6rpx; border-radius: 50%; box-shadow: 0 0 0 2rpx rgba(255, 255, 255, .2); }
.zcl-s { margin-left: auto; margin-right: 8rpx; font-size: 22rpx; color: #6B7280; }
.zcl-row { padding: 0 12rpx 22rpx; display: flex; justify-content: space-around; }
.zcl-i { display: flex; flex-direction: column; align-items: center; }
.zcl-chip { position: relative; width: 64rpx; height: 64rpx; border-radius: 50%; box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, .4), inset 0 0 0 5rpx rgba(255, 255, 255, .85); display: flex; align-items: center; justify-content: center; }
.zcl-chip-in { width: 34rpx; height: 34rpx; box-sizing: border-box; border-radius: 50%; border: 3rpx dashed; background: rgba(255, 255, 255, .55); }
.zcl-v { margin-top: 10rpx; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 26rpx; color: #FFFFFF; }
.zcl-n { margin-top: 2rpx; font-size: 18rpx; color: #6B7280; }
.zcl-press { opacity: .85; }
</style>
