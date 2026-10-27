<template>
  <!-- 封面流：中间展开的一张就是选中的那一个；其余折叠成倾斜的窄条紧贴两侧，露出模糊的封面和竖排名字。点窄条或左右滑动切换 -->
  <view class="zcf" @touchstart="onStart" @touchend="onEnd" @touchcancel="onEnd">
    <view class="zcf-row" :style="rowStyle">
      <view v-for="(it, i) in items" :key="it.key || 'none'" class="zcf-card" :class="{ 'zcf-cur': i === idx }" :style="'width:' + (i === idx ? W.wa : W.wc) + 'px'" @tap="pick(i)">
        <view class="zcf-skew">
          <view class="zcf-unskew">
            <image class="zcf-img" :src="it.cover" mode="aspectFill" />
            <text class="zcf-vname">{{ it.name }}</text>
            <view class="zcf-on"><z-icon name="check" :size="11" :stroke="3.4" color="#FFFFFF" /><text class="zcf-on-t">使用中</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 封面流选择器（创建比赛页的房间 TV 主题）：由原来比赛邀请页的驻场荷官栏改来。
// 展开的一张宽 500rpx（16:9），折叠的 84rpx；整行平移，让展开的那张始终在正中。改选时 emit('change', key)。
// 只绑普通的 touchstart，不拦截，以免小程序里的点击失效
import { ref, computed, watch } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ key, name, cover }]
  value: { type: String, default: '' }
})
const emit = defineEmits(['change'])
const W = { wa: uni.upx2px(500), wc: uni.upx2px(84), gap: uni.upx2px(10), cx: uni.getSystemInfoSync().windowWidth / 2 }
const find = (k) => Math.max(0, props.items.findIndex((it) => (it.key || '') === (k || '')))
const idx = ref(find(props.value))
// 外面改了选中项（比如套用比赛方案）时，跟着转到那一张
watch(() => props.value, (k) => { idx.value = find(k) })
const rowStyle = computed(() => `transform:translateX(${(W.cx - (idx.value * (W.wc + W.gap) + W.wa / 2)).toFixed(1)}px)`)
function pick(i) {
  if (i === idx.value) return
  idx.value = i
  emit('change', props.items[i].key || '')
}
let x0 = null
function onStart(e) { x0 = e.touches[0].clientX }
function onEnd(e) {
  if (x0 === null) return
  const t = (e.changedTouches && e.changedTouches[0]) || null
  const dx = t ? t.clientX - x0 : 0
  x0 = null
  if (Math.abs(dx) < 40) return
  pick(Math.max(0, Math.min(props.items.length - 1, idx.value + (dx < 0 ? 1 : -1))))
}
</script>

<style>
.zcf { height: 282rpx; margin: 16rpx -32rpx 0; padding: 20rpx 0; overflow: hidden; background: linear-gradient(180deg, #0E0F13, #15161C); }
.zcf-row { display: flex; height: 100%; transition: transform .45s cubic-bezier(.2, .8, .2, 1); }
.zcf-card { flex: none; height: 100%; margin-right: 10rpx; transition: width .45s cubic-bezier(.2, .8, .2, 1); }
.zcf-skew { position: relative; height: 100%; overflow: hidden; border-radius: 10rpx; transform: skewX(-10deg); background: #1F222A; box-shadow: 0 16rpx 30rpx rgba(0, 0, 0, .45); }
.zcf-cur .zcf-skew { box-shadow: 0 0 0 3rpx #DC0000, 0 0 30rpx rgba(220, 0, 0, .35), 0 24rpx 50rpx rgba(0, 0, 0, .55); }
.zcf-unskew { position: absolute; left: -16%; right: -16%; top: 0; bottom: 0; transform: skewX(10deg); }
/* 图片铺满倾斜后的平行四边形：卡片高 282rpx、倾斜 10°，左右各多出约 25rpx（展开时卡片宽 500rpx，unskew 层宽 660rpx，
   图片取 550rpx，即 83.34%，左边留 8.33%）。16:9 的封面只在上下各裁掉一点 */
.zcf-img { position: absolute; left: 8.33%; width: 83.34%; top: 0; height: 100%; }
/* 折叠的窄条：封面轻微模糊、压暗，还能看出是哪个主题；竖排名字用标题字体 */
.zcf-card .zcf-img { filter: blur(1.5px) brightness(.68) saturate(1.1); transform: scale(1.06); transition: filter .45s ease, transform .45s ease; }
.zcf-cur .zcf-img { filter: none; transform: none; }
.zcf-vname { position: absolute; left: 50%; top: 50%; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; letter-spacing: 8rpx; color: #FFFFFF; text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, .75); transform: translate(-50%, -50%) rotate(-78deg); white-space: nowrap; opacity: 1; transition: opacity .3s ease; }
.zcf-cur .zcf-vname { opacity: 0; }
.zcf-on { position: absolute; right: 16%; bottom: 16rpx; height: 40rpx; padding: 0 14rpx 0 10rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; opacity: 0; transition: opacity .3s ease; }
.zcf-cur .zcf-on { opacity: 1; }
.zcf-on-t { margin-left: 4rpx; font-size: 20rpx; font-weight: 600; color: #FFFFFF; }
</style>
