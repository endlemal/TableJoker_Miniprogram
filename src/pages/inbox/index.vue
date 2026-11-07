<template>
  <view class="ib">
    <view class="nav" :style="navStyle">
      <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="20" color="#F3EEE6" /></view>
      <text class="nav-t">消息</text>
    </view>
    <view :style="'height:' + (nav.statusBar + nav.navH) + 'px'"></view>

    <view v-if="!requests.length && !invites.length" class="empty">
      <view class="empty-ic"><z-icon name="inbox" :size="34" color="#8E929B" /></view>
      <text class="empty-t">没有要处理的消息</text>
      <text class="empty-s">玩家申请加入你主持的比赛、有人邀请你一起主持时，会出现在这里</text>
    </view>

    <!-- 主持人邀请 -->
    <block v-if="invites.length">
      <text class="sec">主持人邀请</text>
      <view v-for="x in invites" :key="x.id" class="card" hover-class="press" @tap="openInvite(x)">
        <view class="av" :style="'background:' + x.from.bg + ';color:' + x.from.fg"><text>{{ x.from.c }}</text></view>
        <view class="main">
          <text class="t"><text class="who">{{ x.from.name }}</text> 邀请你一起主持「{{ x.match.name }}」</text>
          <text class="s">{{ leftText(x) }}后失效</text>
        </view>
        <view class="go"><text class="go-t">查看</text><z-icon name="chevron-right" :size="16" color="#C9CDD4" /></view>
      </view>
    </block>

    <!-- 加入申请：任意一位主持人处理即可 -->
    <block v-if="requests.length">
      <text class="sec">加入申请 · {{ requests.length }}</text>
      <view v-for="x in requests" :key="x.match.id + x.r.key" class="card card-req" :class="{ 'card-out': gone[x.match.id + x.r.key] }">
        <view class="av" :style="'background:' + x.r.bg + ';color:' + x.r.fg"><text>{{ x.r.c }}</text></view>
        <view class="main">
          <text class="t"><text class="who">{{ x.r.name }}</text> 申请加入「{{ x.match.name }}」</text>
          <text v-if="x.r.message" class="msg">「{{ x.r.message }}」</text>
          <text class="s">来自邀请页 · {{ ago(x.r.at) }}</text>
          <view class="acts">
            <view class="btn btn-no" hover-class="press" @tap="reject(x)"><text class="btn-t">拒绝</text></view>
            <view class="btn btn-ok" hover-class="press" @tap="approve(x)"><text class="btn-t">通过</text></view>
          </view>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
// 首页消息箱：加入申请（我主持的比赛）和主持人邀请。通过 / 拒绝会记进那场比赛的主持人操作日志
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { requireLogin } from '@/common/auth.js'
import { toast } from '@/common/format.js'
import { inboxItems } from '@/common/inbox.js'
import { approve as approveRoster, reject as rejectRoster } from '@/common/roster.js'
import { logHost } from '@/common/host-log.js'
import { leftText } from '@/common/host-invite.js'
import { addSystem } from '@/common/room-chat.js'
import { room, me } from '@/mock/data.js'

const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW + 8}px`
const requests = ref([])
const invites = ref([])
const gone = reactive({})
const load = () => { const x = inboxItems(); requests.value = x.requests; invites.value = x.invites }
onShow(() => { if (requireLogin()) load() })
const meHost = { name: me.nickname, c: me.char || me.nickname.slice(0, 1), bg: '#F1E4D3', fg: '#8A1C1C' }
const ago = (t) => { const m = Math.floor((Date.now() - (t || 0)) / 60000); return !t || m >= 1440 ? '之前' : m < 1 ? '刚刚' : m < 60 ? m + ' 分钟前' : Math.floor(m / 60) + ' 小时前' }
// 处理完先淡出，再从列表里去掉
function done(x, text) {
  gone[x.match.id + x.r.key] = true
  logHost(x.match.id, meHost, 'request', text)
  setTimeout(load, 320)
}
function approve(x) {
  approveRoster(x.match.id, [x.r.key], me.nickname)
  if (x.match.id === (room.matchId || 'demo')) addSystem(`${x.r.name} 加入了房间`)
  done(x, `通过了「${x.r.name}」的加入申请`)
  toast(`已通过「${x.r.name}」`)
}
function reject(x) {
  uni.showModal({
    title: `拒绝「${x.r.name}」的申请？`,
    content: '对方会收到通知。',
    confirmText: '拒绝',
    confirmColor: '#8E929B',
    success: ({ confirm }) => {
      if (!confirm) return
      rejectRoster(x.match.id, [x.r.key], me.nickname)
      done(x, `拒绝了「${x.r.name}」的加入申请`)
    }
  })
}
const openInvite = (x) => uni.navigateTo({ url: '/pages/host-invite/index?id=' + x.id })
</script>

<style>
.ib { min-height: 100vh; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: #181A20; }
.press { opacity: .8; }
.nav { position: fixed; z-index: 20; left: 0; right: 0; top: 0; padding-left: 24rpx; box-sizing: border-box; background: #181A20; display: flex; align-items: center; }
.nav-back { width: 72rpx; height: 72rpx; flex: none; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.nav-t { margin-left: 20rpx; font-size: 32rpx; font-weight: 700; color: #F3EEE6; }
.sec { display: block; margin: 32rpx 32rpx 8rpx; font-size: 24rpx; font-weight: 700; color: #8E929B; }
.card { margin: 16rpx 32rpx 0; padding: 24rpx; border-radius: 28rpx; background: #1F222A; display: flex; align-items: flex-start; transition: opacity .3s ease, transform .3s ease; }
.card-out { opacity: 0; transform: translateX(40rpx); }
.av { width: 80rpx; height: 80rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 600; }
.main { flex: 1; min-width: 0; margin-left: 20rpx; }
.t { font-size: 28rpx; line-height: 1.5; color: #E5E2DB; }
.who { font-weight: 700; color: #F3EEE6; }
.msg { display: block; margin-top: 6rpx; font-size: 26rpx; color: #C9CDD4; }
.s { display: block; margin-top: 6rpx; font-size: 22rpx; color: #8E929B; }
.go { flex: none; align-self: center; margin-left: 12rpx; display: flex; align-items: center; }
.go-t { font-size: 26rpx; color: #C9CDD4; }
.acts { margin-top: 20rpx; display: flex; }
.btn { flex: 1; height: 68rpx; border-radius: 34rpx; display: flex; align-items: center; justify-content: center; }
.btn-no { background: #2C2F36; }
.btn-ok { margin-left: 16rpx; background: #DC0000; }
.btn-t { font-size: 26rpx; font-weight: 700; color: #FFFFFF; }
.btn-no .btn-t { color: #C9CDD4; font-weight: 600; }
.empty { margin-top: 200rpx; padding: 0 80rpx; display: flex; flex-direction: column; align-items: center; }
.empty-ic { width: 128rpx; height: 128rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.empty-t { margin-top: 28rpx; font-size: 32rpx; font-weight: 700; color: #F3EEE6; }
.empty-s { margin-top: 12rpx; font-size: 26rpx; line-height: 1.6; color: #8E929B; text-align: center; }
</style>
