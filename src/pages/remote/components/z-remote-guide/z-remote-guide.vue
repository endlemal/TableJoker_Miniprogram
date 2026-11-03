<template>
  <view class="rgd" role="dialog" aria-modal="true" aria-label="遥控切屏操作说明" :style="'padding-top:' + topInset + 'px;padding-bottom:' + bottomInset + 'px'">
    <view class="rgd-mask"></view>
    <view class="rgd-body">
      <view class="rgd-heading"><z-icon name="compass" :size="23" :stroke="1.6" color="#FFFFFF" /><text class="rgd-title">遥控切屏操作说明</text></view>
      <scroll-view scroll-y class="rgd-scroll" :show-scrollbar="false">
        <view class="rgd-steps">
          <view v-for="item in items" :key="item.gesture" class="rgd-step">
            <view class="rgd-art" :style="gestureStyle(item.gesture)" aria-hidden="true"></view>
            <view class="rgd-copy"><text class="rgd-step-title">{{ item.title }}</text><text class="rgd-step-text">{{ item.text }}</text></view>
          </view>
        </view>
      </scroll-view>
      <view class="rgd-footer">
        <button class="rgd-done" hover-class="rgd-press" @tap.stop="$emit('done')">知道了</button>
        <text class="rgd-again">之后可点击右上角问号再次查看</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import ZIcon from '@/components/z-icon/z-icon.vue'
import { svgUri } from '@/common/svg.js'

defineProps({
  items: { type: Array, default: () => [] },
  topInset: { type: Number, default: 60 },
  bottomInset: { type: Number, default: 16 }
})
defineEmits(['done'])

// 用矢量手势示意保留清晰度，渐变掌面和深色腕部呼应全屏遮罩。
const hand = '<path d="M44 48V24c0-7 10-7 10 0v18c0-6 9-6 9 0v3c0-6 9-5 9 1v3c0-6 9-5 9 1v14c0 12-9 17-9 26H48c-2-10-9-14-14-21L23 55c-5-7 1-12 6-8l15 12Z" fill="url(#palm)" stroke="#C6CBCD" stroke-width=".7"/><path d="M48 87h25l2 15H47Z" fill="url(#wrist)"/>'
const decorations = {
  swipe: '<path d="M16 15h78m-68-7-10 7 10 7m58-14 10 7-10 7"/>',
  dial: '<path d="M17 35a40 40 0 0 1 77-3m-78-9 1 12 12-2m53-2 12 1 2-12"/>',
  tap: '<circle cx="48" cy="22" r="18" opacity=".4"/><circle cx="48" cy="22" r="8"/>',
  hold: '<circle cx="48" cy="22" r="19" opacity=".4"/><path d="M48 3a19 19 0 0 1 19 19M48 12v10l7 5" stroke="#FFFFFF"/>',
  pick: '<path d="M16 43V15a6 6 0 0 1 6-6h22l7 7h42a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H22a6 6 0 0 1-6-7Z"/><path d="M22 27h71" opacity=".45"/>'
}
const artStyles = {}
function gestureStyle(kind) {
  if (!artStyles[kind]) {
    const straight = kind === 'tap' || kind === 'hold'
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 116 112"><defs><linearGradient id="palm" x1=".25" y1="0" x2=".8" y2="1"><stop stop-color="#FFFFFF"/><stop offset=".48" stop-color="#F2F4F5"/><stop offset="1" stop-color="#687078"/></linearGradient><linearGradient id="wrist" x2="0" y2="1"><stop stop-color="#777F85"/><stop offset="1" stop-color="#171A1F" stop-opacity="0"/></linearGradient></defs><g fill="none" stroke="#969DA2" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' + (decorations[kind] || decorations.tap) + '</g><g transform="' + (straight ? 'translate(9 0)' : 'translate(7 9) rotate(-23 52 60)') + '">' + hand + '</g></svg>'
    artStyles[kind] = `background-image:url("${svgUri(svg)}")`
  }
  return artStyles[kind]
}
</script>

<style>
.rgd { position: fixed; z-index: 100; inset: 0; box-sizing: border-box; padding-left: 52rpx; padding-right: 52rpx; }
.rgd-mask { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.85), rgba(0,0,0,.91)); }
.rgd-body { position: relative; height: 100%; max-width: 750rpx; margin: 0 auto; display: flex; flex-direction: column; }
.rgd-heading { flex: none; min-height: 68rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.rgd-title { font-size: 34rpx; font-weight: 600; letter-spacing: 1rpx; color: #FFFFFF; }
.rgd-scroll { flex: 1; min-height: 0; height: 0; margin-top: 20rpx; }
.rgd-steps { min-height: 100%; box-sizing: border-box; padding: 10rpx 0; display: flex; flex-direction: column; justify-content: space-evenly; }
.rgd-step { display: flex; align-items: center; padding: 16rpx 0; min-height: 110rpx; flex: none; }
.rgd-art { width: 136rpx; height: 132rpx; margin-right: 26rpx; flex: none; background-size: contain; background-position: center; background-repeat: no-repeat; }
.rgd-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rgd-step-title { font-size: 34rpx; font-weight: 550; line-height: 1.4; color: #FFFFFF; }
.rgd-step-text { margin-top: 12rpx; font-size: 25rpx; line-height: 1.65; color: rgba(255,255,255,.58); }
.rgd-footer { flex: none; padding-top: 20rpx; display: flex; flex-direction: column; align-items: center; }
.rgd-done { width: 260rpx; height: 84rpx; margin: 0; padding: 0; border: 0; border-radius: 999rpx; background: rgba(255,255,255,.14); color: #FFFFFF; font-family: inherit; font-size: 34rpx; font-weight: 500; line-height: 84rpx; text-align: center; }
.rgd-done::after { border: 0; }
.rgd-press { opacity: .75; }
.rgd-again { margin-top: 20rpx; font-size: 22rpx; line-height: 34rpx; color: rgba(255,255,255,.36); }
</style>
