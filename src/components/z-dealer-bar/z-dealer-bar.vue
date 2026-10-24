<template>
  <!-- 驻场荷官栏：中间一张展开；其余折叠成倾斜的窄条，紧贴两侧，只露出模糊的照片和竖排名字。点窄条展开，也可以左右滑动 -->
  <view class="zdb" @touchstart="onStart" @touchend="onEnd" @touchcancel="onEnd">
    <view class="zdb-row" :style="rowStyle">
      <view v-for="(d, i) in dealers" :key="d.id" class="zdb-card" :class="{ 'zdb-cur': i === idx }" :style="'width:' + (i === idx ? W.wa : W.wc) + 'px'" @tap="idx = i">
        <view class="zdb-skew" :style="'background:' + (d.tone || d.bg)">
          <view class="zdb-unskew">
            <image v-if="d.photo" class="zdb-img" :src="d.photo" mode="aspectFill" />
            <view v-else class="zdb-ph" :style="'background:linear-gradient(160deg, ' + (d.tone || '#2A2D36') + ' 0%, #0E0F13 100%)'"><text class="zdb-ph-c">{{ d.char }}</text></view>
            <view class="zdb-shade"></view>
            <text class="zdb-title">{{ d.title }}</text>
            <text class="zdb-vname">{{ d.name }}</text>
            <view class="zdb-info">
              <text class="zdb-name">{{ d.name }}</text>
              <view class="zdb-stats">
                <view v-if="d.years" class="zdb-st"><text class="zdb-st-v">{{ d.years }}</text><text class="zdb-st-k">年经验</text></view>
                <view class="zdb-st"><text class="zdb-st-v">{{ i + 1 }}</text><text class="zdb-st-k">号名牌</text></view>
                <text class="zdb-tags">{{ (d.tags || []).join(' · ') }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 驻场荷官栏（比赛邀请页）：只作展示和引流。展开的一张宽 430rpx，折叠的 84rpx；整行平移，让展开的那张始终在正中。
// 只绑普通的 touchstart，不拦截，以免小程序里的点击失效
import { ref, computed } from 'vue'

const props = defineProps({ dealers: { type: Array, default: () => [] } })
const W = { wa: uni.upx2px(430), wc: uni.upx2px(84), gap: uni.upx2px(10), cx: uni.getSystemInfoSync().windowWidth / 2 }
const idx = ref(0)
const rowStyle = computed(() => `transform:translateX(${(W.cx - (idx.value * (W.wc + W.gap) + W.wa / 2)).toFixed(1)}px)`)
let x0 = null
function onStart(e) { x0 = e.touches[0].clientX }
function onEnd(e) {
  if (x0 === null) return
  const t = (e.changedTouches && e.changedTouches[0]) || null
  const dx = t ? t.clientX - x0 : 0
  x0 = null
  if (Math.abs(dx) < 40) return
  idx.value = Math.max(0, Math.min(props.dealers.length - 1, idx.value + (dx < 0 ? 1 : -1)))
}
</script>

<style>
.zdb { height: 400rpx; margin: 16rpx -32rpx 0; padding: 20rpx 0; overflow: hidden; background: linear-gradient(180deg, #0E0F13, #15161C); }
.zdb-row { display: flex; height: 100%; transition: transform .45s cubic-bezier(.2, .8, .2, 1); }
.zdb-card { flex: none; height: 100%; margin-right: 10rpx; transition: width .45s cubic-bezier(.2, .8, .2, 1); }
.zdb-skew { position: relative; height: 100%; overflow: hidden; border-radius: 10rpx; transform: skewX(-10deg); background: #1F222A; box-shadow: 0 16rpx 30rpx rgba(0, 0, 0, .45); }
/* 折叠的窄条：照片模糊、压暗，只露出竖排名字 */
.zdb-card .zdb-img { filter: blur(5px) brightness(.62) saturate(1.2); transform: scale(1.25); transition: filter .45s ease, transform .45s ease; }
.zdb-cur .zdb-img { filter: none; transform: none; }
.zdb-cur .zdb-skew { box-shadow: 0 0 0 3rpx rgba(255, 255, 255, .85), 0 24rpx 50rpx rgba(0, 0, 0, .55); }
.zdb-unskew { position: absolute; left: -16%; right: -16%; top: 0; bottom: 0; transform: skewX(10deg); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.zdb-img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.zdb-ph { position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; }
.zdb-ph-c { position: absolute; right: 14%; top: 4%; font-size: 260rpx; font-weight: 900; line-height: 1; color: rgba(255, 255, 255, .14); }
.zdb-shade { position: absolute; left: 0; right: 0; bottom: 0; height: 62%; background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, .78)); }
.zdb-title { position: absolute; right: 18%; top: 22rpx; font-size: 28rpx; font-weight: 600; letter-spacing: 2rpx; color: #FFFFFF; text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, .55); }
.zdb-info { position: absolute; left: 18%; right: 18%; bottom: 22rpx; }
.zdb-name { display: block; font-size: 40rpx; font-weight: 800; color: #FFFFFF; text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, .6); }
.zdb-stats { margin-top: 8rpx; display: flex; align-items: flex-end; }
.zdb-st { margin-right: 24rpx; display: flex; flex-direction: column; align-items: center; }
.zdb-st-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 34rpx; line-height: 1; color: #FFFFFF; }
.zdb-st-k { margin-top: 2rpx; font-size: 16rpx; color: rgba(255, 255, 255, .7); }
.zdb-tags { flex: 1; min-width: 0; padding-bottom: 2rpx; font-size: 20rpx; color: rgba(255, 255, 255, .8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zdb-vname { position: absolute; left: 50%; top: 50%; font-size: 34rpx; font-weight: 300; letter-spacing: 6rpx; color: rgba(255, 255, 255, .85); transform: translate(-50%, -50%) rotate(-78deg); white-space: nowrap; opacity: 0; transition: opacity .3s ease; }
.zdb-card .zdb-vname { opacity: 1; }
.zdb-cur .zdb-vname { opacity: 0; }
.zdb-card .zdb-info, .zdb-card .zdb-title { opacity: 0; transition: opacity .3s ease; }
.zdb-cur .zdb-info, .zdb-cur .zdb-title { opacity: 1; }
</style>
