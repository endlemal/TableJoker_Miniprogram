<template>
  <view v-if="show" class="zs">
    <view class="zs-mask" @tap="emit('close')" @touchmove.stop.prevent="noop"></view>
    <view class="zs-card">
      <view class="zs-ic"><z-icon name="bell-ringing" :size="26" color="#FFC53A" /></view>
      <text class="zs-t">{{ title }}</text>
      <text class="zs-s">打开提醒后，比赛的重要变化会通过微信服务通知告诉你</text>
      <view v-for="it in ITEMS" :key="it.key" class="zs-i">
        <view class="zs-i-ic"><z-icon :name="it.icon" :size="16" color="#FFFFFF" /></view>
        <view class="zs-i-main"><text class="zs-i-t">{{ it.title }}</text><text class="zs-i-d">{{ it.desc }}</text></view>
      </view>
      <view class="zs-ok" hover-class="zs-press" @tap="allow"><text class="zs-ok-t">允许通知</text></view>
      <view class="zs-no" hover-class="zs-press" @tap="emit('close')"><text class="zs-no-t">暂不需要</text></view>
    </view>
  </view>
</template>

<script setup>
// 报名成功后的订阅消息授权：开赛前 15 分钟提醒、报名审核通过通知、桌号座位分配通知。
// 微信要求 requestSubscribeMessage 由用户点击触发，所以先弹这个说明，点「允许通知」时再申请（一次性订阅，每条只发一次）
import ZIcon from '@/components/z-icon/z-icon.vue'
import { SUBSCRIBE_TMPLS } from '@/common/config.js'

defineProps({ show: { type: Boolean, default: false }, title: { type: String, default: '报名成功，开启比赛提醒？' } })
const emit = defineEmits(['close', 'done'])
const noop = () => {}
const ITEMS = [
  { key: 'start', icon: 'alarm', title: '开赛前 15 分钟提醒', desc: '提醒你出发、签到入座' },
  { key: 'approved', icon: 'circle-check', title: '报名审核通过通知', desc: '主持人通过后第一时间告诉你' },
  { key: 'seat', icon: 'armchair', title: '桌号座位分配通知', desc: '现场签到后告诉你坐哪一桌' }
]
function allow() {
  const ids = ITEMS.map((it) => SUBSCRIBE_TMPLS[it.key]).filter(Boolean)
  if (!ids.length || typeof uni.requestSubscribeMessage !== 'function') return emit('done', { demo: true, accepted: ITEMS.map((it) => it.key) })
  uni.requestSubscribeMessage({
    tmplIds: ids,
    success: (res) => emit('done', { accepted: ITEMS.filter((it) => res[SUBSCRIBE_TMPLS[it.key]] === 'accept').map((it) => it.key) }),
    fail: () => emit('done', { accepted: [] })
  })
}
</script>

<style>
.zs { position: fixed; z-index: 400; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; }
.zs-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); }
.zs-card { position: relative; width: 600rpx; padding: 44rpx 36rpx 28rpx; box-sizing: border-box; border-radius: 40rpx; background: #262A34; display: flex; flex-direction: column; align-items: center; animation: zs-in .26s cubic-bezier(.34, 1.4, .64, 1); }
@keyframes zs-in { from { transform: scale(.9); opacity: 0; } to { transform: none; opacity: 1; } }
.zs-ic { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255, 197, 58, .14); display: flex; align-items: center; justify-content: center; }
.zs-t { margin-top: 20rpx; font-size: 32rpx; font-weight: 700; color: #FFFFFF; }
.zs-s { margin-top: 10rpx; font-size: 23rpx; line-height: 1.6; color: #9CA3AF; text-align: center; }
.zs-i { width: 100%; margin-top: 20rpx; display: flex; align-items: center; }
.zs-i-ic { width: 64rpx; height: 64rpx; flex: none; border-radius: 18rpx; background: #35383F; display: flex; align-items: center; justify-content: center; }
.zs-i-main { margin-left: 20rpx; display: flex; flex-direction: column; }
.zs-i-t { font-size: 27rpx; font-weight: 600; color: #FFFFFF; }
.zs-i-d { margin-top: 4rpx; font-size: 22rpx; color: #9CA3AF; }
.zs-ok { width: 100%; margin-top: 36rpx; height: 92rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.zs-ok-t { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.zs-no { margin-top: 12rpx; height: 72rpx; display: flex; align-items: center; }
.zs-no-t { font-size: 26rpx; color: #9CA3AF; }
.zs-press { opacity: .8; }
</style>
