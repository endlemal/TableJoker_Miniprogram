<template>
  <view v-if="show && club" class="zcs">
    <view class="zcs-mask" @tap="emit('close')" @touchmove.stop.prevent="noop"></view>
    <view class="zcs-sheet">
      <!-- 店铺照片：左右滑动 -->
      <view class="zcs-photos">
        <swiper class="zcs-sw" :current="pi" @change="pi = $event.detail.current">
          <swiper-item v-for="(ph, k) in photos" :key="k"><view class="zcs-ph" :style="ph"></view></swiper-item>
        </swiper>
        <view class="zcs-ph-n"><text>{{ PHOTO_NAME[club.photos[pi]] || '店铺' }} · {{ pi + 1 }}/{{ photos.length }}</text></view>
        <view class="zcs-x" hover-class="zcs-press" @tap="emit('close')"><z-icon name="x" :size="16" color="#FFFFFF" /></view>
      </view>
      <scroll-view scroll-y class="zcs-body">
        <!-- 主办方：头像、名称、评分 -->
        <view class="zcs-head">
          <view class="zcs-av" :style="'background:' + club.bg + ';color:' + club.fg"><text>{{ club.char }}</text><view class="zcs-v"><z-icon name="letter-v" :size="8" :stroke="3.4" color="#FFFFFF" /></view></view>
          <view class="zcs-head-t">
            <view class="zcs-name-row"><text class="zcs-name">{{ club.name }}</text><text class="zcs-cert">认证主办方</text></view>
            <view class="zcs-rate"><text class="zcs-stars">{{ stars(club.rating) }}</text><text class="zcs-rate-v">{{ club.rating ? club.rating.toFixed(1) : '暂无评分' }}</text><text v-if="club.reviewCount" class="zcs-rate-n">{{ club.reviewCount }} 条点评</text></view>
          </view>
        </view>
        <!-- 地址和距离、入驻日期、营业时间 -->
        <view class="zcs-info">
          <view class="zcs-row">
            <z-icon name="map-pin" :size="16" color="#9CA3AF" />
            <view class="zcs-row-t"><text class="zcs-addr">{{ club.venue.address }}</text><text class="zcs-dist">{{ distText }}</text></view>
          </view>
          <view class="zcs-row"><z-icon name="calendar" :size="16" color="#9CA3AF" /><text class="zcs-row-v">{{ joinedText }}入驻桌趣</text></view>
          <view class="zcs-row"><z-icon name="clock" :size="16" color="#9CA3AF" /><text class="zcs-row-v">营业 {{ club.hours }} · {{ club.tables }} 张牌桌</text></view>
        </view>
        <text class="zcs-intro">{{ club.intro }}</text>
        <!-- 点评 -->
        <view class="zcs-sec"><text class="zcs-sec-t">点评</text><text v-if="club.reviewCount" class="zcs-sec-s">{{ club.reviewCount }} 条</text></view>
        <view v-if="club.reviews.length" class="zcs-sum">
          <view class="zcs-sum-l"><text class="zcs-sum-v">{{ club.rating.toFixed(1) }}</text><text class="zcs-stars zcs-stars-s">{{ stars(club.rating) }}</text></view>
          <view class="zcs-bars">
            <view v-for="b in dist" :key="b.star" class="zcs-bar"><text class="zcs-bar-k">{{ b.star }}</text><view class="zcs-bar-t"><view class="zcs-bar-f" :style="'width:' + b.pct + '%'"></view></view></view>
          </view>
        </view>
        <view v-for="r in club.reviews" :key="r.id" class="zcs-rv">
          <view class="zcs-rv-av" :style="'background:' + r.author.bg + ';color:' + r.author.fg"><text>{{ r.author.c }}</text></view>
          <view class="zcs-rv-main">
            <view class="zcs-rv-top"><text class="zcs-rv-n">{{ r.author.name }}</text><text class="zcs-stars zcs-stars-xs">{{ stars(r.stars) }}</text><text class="zcs-rv-time">{{ ago(r.at) }}</text></view>
            <text class="zcs-rv-text">{{ r.text }}</text>
          </view>
        </view>
        <view v-if="!club.reviews.length" class="zcs-none"><text>还没有点评，去过这家店的玩家可以来写第一条</text></view>
        <view class="zcs-pad"></view>
      </scroll-view>
      <view class="zcs-foot">
        <view class="zcs-enter" hover-class="zcs-press" @tap="emit('enter', club)"><z-icon name="message-circle" :size="18" color="#FFFFFF" /><text class="zcs-enter-t">进入频道</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 主办方（店铺）详情抽屉：店铺照片、头像和名称、地址、距离、入驻日期、点评，以及进入主办方频道的按钮
import { ref, computed, watch } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { venueArt } from '@/common/venue-art.js'
import { svgUri } from '@/common/svg.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  club: { type: Object, default: null },
  distText: { type: String, default: '' }
})
const emit = defineEmits(['close', 'enter'])
const noop = () => {}
const PHOTO_NAME = { hall: '大厅', bar: '吧台', lounge: '休息区', vip: '包间' }
const pi = ref(0)
watch(() => [props.show, props.club && props.club.id], () => { pi.value = 0 })
const photos = computed(() => (props.club ? props.club.photos.map((k) => `background-image:url("${svgUri(venueArt(k, props.club.tone))}")`) : []))
const joinedText = computed(() => {
  if (!props.club || !props.club.joinedAt) return ''
  const [y, m] = props.club.joinedAt.split('-')
  return `${y} 年 ${Number(m)} 月`
})
// 星级：四舍五入到整颗（★ 是文字，不是表情）
const stars = (v) => { const n = Math.round(v || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n) }
// 星级分布：按点评里各星级的占比
const dist = computed(() => {
  const rs = (props.club && props.club.reviews) || []
  return [5, 4, 3, 2, 1].map((star) => ({ star, pct: rs.length ? Math.round((rs.filter((r) => r.stars === star).length / rs.length) * 100) : 0 }))
})
function ago(t) {
  const d = Math.max(1, Math.round((Date.now() - t) / 86400000))
  return d < 30 ? `${d} 天前` : `${Math.round(d / 30)} 个月前`
}
</script>

<style>
.zcs { position: fixed; z-index: 270; left: 0; top: 0; right: 0; bottom: 0; }
.zcs-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); }
.zcs-sheet { position: absolute; left: 0; right: 0; bottom: 0; height: 86vh; background: #1F222A; border-radius: 40rpx 40rpx 0 0; overflow: hidden; display: flex; flex-direction: column; animation: zcs-up .26s cubic-bezier(.2, .8, .2, 1); }
@keyframes zcs-up { from { transform: translateY(100%); } to { transform: none; } }
.zcs-photos { position: relative; height: 420rpx; flex: none; }
.zcs-sw { width: 100%; height: 100%; }
.zcs-ph { width: 100%; height: 100%; background-size: cover; background-position: center; }
.zcs-ph-n { position: absolute; right: 24rpx; bottom: 24rpx; padding: 4rpx 16rpx; border-radius: 999rpx; background: rgba(0, 0, 0, .55); font-size: 22rpx; color: #FFFFFF; }
.zcs-x { position: absolute; right: 24rpx; top: 24rpx; width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(0, 0, 0, .5); display: flex; align-items: center; justify-content: center; }
.zcs-body { flex: 1; min-height: 0; }
.zcs-head { padding: 28rpx 32rpx 0; display: flex; align-items: center; }
.zcs-av { position: relative; width: 104rpx; height: 104rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 700; box-shadow: 0 0 0 4rpx #1F222A; }
.zcs-v { position: absolute; right: -2rpx; bottom: -2rpx; width: 36rpx; height: 36rpx; box-sizing: border-box; border-radius: 50%; border: 4rpx solid #1F222A; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.zcs-head-t { flex: 1; min-width: 0; margin-left: 24rpx; }
.zcs-name-row { display: flex; align-items: center; }
.zcs-name { font-size: 36rpx; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zcs-cert { margin-left: 12rpx; flex: none; padding: 2rpx 12rpx; border-radius: 8rpx; background: rgba(220, 0, 0, .18); font-size: 20rpx; color: #FF8A8A; }
.zcs-rate { margin-top: 10rpx; display: flex; align-items: center; }
.zcs-stars { font-size: 26rpx; letter-spacing: 2rpx; color: #F4B740; }
.zcs-stars-s { font-size: 22rpx; }
.zcs-stars-xs { margin-left: 12rpx; font-size: 18rpx; }
.zcs-rate-v { margin-left: 10rpx; font-size: 26rpx; font-weight: 700; color: #FFFFFF; }
.zcs-rate-n { margin-left: 10rpx; font-size: 22rpx; color: #9CA3AF; }
.zcs-info { margin: 28rpx 32rpx 0; padding: 8rpx 24rpx; border-radius: 24rpx; background: #262A34; }
.zcs-row { padding: 18rpx 0; display: flex; align-items: flex-start; border-bottom: 1rpx solid #35383F; }
.zcs-row:last-child { border-bottom: none; }
.zcs-row-t { margin-left: 14rpx; flex: 1; display: flex; flex-direction: column; }
.zcs-addr { font-size: 26rpx; line-height: 1.5; color: #FFFFFF; }
.zcs-dist { margin-top: 4rpx; font-size: 22rpx; color: #F4B740; }
.zcs-row-v { margin-left: 14rpx; font-size: 26rpx; color: #E5E7EB; }
.zcs-intro { display: block; margin: 24rpx 32rpx 0; font-size: 26rpx; line-height: 1.7; color: #C9CDD4; }
.zcs-sec { margin: 36rpx 32rpx 0; display: flex; align-items: baseline; justify-content: space-between; }
.zcs-sec-t { font-size: 30rpx; font-weight: 700; color: #FFFFFF; }
.zcs-sec-s { font-size: 22rpx; color: #9CA3AF; }
.zcs-sum { margin: 20rpx 32rpx 0; padding: 24rpx; border-radius: 24rpx; background: #262A34; display: flex; align-items: center; }
.zcs-sum-l { width: 160rpx; flex: none; display: flex; flex-direction: column; align-items: center; }
.zcs-sum-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 72rpx; line-height: 1; color: #FFFFFF; }
.zcs-bars { flex: 1; margin-left: 16rpx; }
.zcs-bar { display: flex; align-items: center; height: 30rpx; }
.zcs-bar-k { width: 24rpx; font-size: 18rpx; color: #9CA3AF; }
.zcs-bar-t { flex: 1; height: 10rpx; border-radius: 5rpx; background: #35383F; overflow: hidden; }
.zcs-bar-f { height: 100%; border-radius: 5rpx; background: #F4B740; }
.zcs-rv { margin: 0 32rpx; padding: 24rpx 0; display: flex; border-bottom: 1rpx solid #2E313A; }
.zcs-rv-av { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; }
.zcs-rv-main { flex: 1; min-width: 0; margin-left: 18rpx; }
.zcs-rv-top { display: flex; align-items: center; }
.zcs-rv-n { font-size: 24rpx; color: #C9CDD4; }
.zcs-rv-time { margin-left: auto; font-size: 20rpx; color: #6B7280; }
.zcs-rv-text { display: block; margin-top: 8rpx; font-size: 27rpx; line-height: 1.6; color: #FFFFFF; }
.zcs-none { margin: 20rpx 32rpx 0; padding: 32rpx; border-radius: 24rpx; background: #262A34; font-size: 24rpx; color: #9CA3AF; text-align: center; }
.zcs-pad { height: 40rpx; }
.zcs-foot { flex: none; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); border-top: 1rpx solid #2E313A; }
.zcs-enter { height: 92rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.zcs-enter-t { margin-left: 10rpx; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.zcs-press { opacity: .8; }
</style>
