<template>
  <view class="hi">
    <view class="hi-glow"></view>
    <!-- 顶栏：返回（从分享卡片直接打开时回首页）+ 标题 -->
    <view class="nav" :style="navStyle">
      <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="20" color="#F3EEE6" /></view>
      <text class="nav-t">主持人邀请</text>
    </view>
    <view :style="'height:' + (nav.statusBar + nav.navH) + 'px'"></view>

    <!-- 邀请无效：找不到、过期、撤回、名额已满 -->
    <view v-if="bad" class="bad" :class="{ 'bad-on': shown }">
      <view class="bad-ic"><z-icon :name="BAD[bad].icon" :size="34" color="#A9AEB8" /></view>
      <text class="bad-t">{{ BAD[bad].title }}</text>
      <text class="bad-s">{{ badText }}</text>
      <view class="btn btn-ghost bad-btn" hover-class="press" @tap="toHome"><text class="btn-t">回到首页</text></view>
    </view>

    <view v-else-if="inv" class="body">
      <!-- 邀请卡片 -->
      <view class="card" :class="{ 'card-on': shown }">
        <view class="cover">
          <image class="cover-img" :src="coverSrc" mode="aspectFill" />
          <view class="cover-shade"></view>
          <text class="kicker">主持人邀请函 · HOST INVITATION</text>
        </view>
        <view class="from">
          <view class="from-av" :style="'background:' + inv.from.bg + ';color:' + inv.from.fg">
            <text>{{ inv.from.c }}</text>
            <view v-if="inv.from.certified" class="from-v"><z-icon name="letter-v" :size="9" :stroke="3.4" color="#FFFFFF" /></view>
          </view>
          <view class="from-main">
            <text class="from-n">{{ inv.from.name }}</text>
            <text class="from-s">邀请你一起主持</text>
          </view>
        </view>
        <text class="title" :class="{ 'font-sys': !fitsDisplay(inv.match.name) }">{{ inv.match.name }}</text>
        <view class="rows">
          <view class="row"><z-icon name="calendar" :size="16" color="#A9AEB8" /><text class="row-t">{{ whenText }}</text></view>
          <view class="row"><z-icon name="map-pin" :size="16" color="#A9AEB8" /><text class="row-t">{{ venueText }}</text></view>
          <view class="row">
            <view class="stack"><view v-for="(h, i) in inv.match.hosts.slice(0, 4)" :key="h.name" class="sk" :style="'background:' + h.bg + ';color:' + h.fg + ';z-index:' + (5 - i)"><text>{{ h.c }}</text></view></view>
            <text class="row-t row-t-stack">{{ hostCountText(inv) }}</text>
          </view>
        </view>
        <!-- 共同主持能做什么 -->
        <view class="perm">
          <text class="perm-h">共同主持可以</text>
          <view v-for="p in COHOST_PERMS" :key="p.title" class="perm-i">
            <view class="perm-ic"><z-icon :name="p.icon" :size="16" color="#F3EEE6" /></view>
            <view class="perm-main"><text class="perm-t">{{ p.title }}</text><text class="perm-s">{{ p.text }}</text></view>
          </view>
          <text class="perm-note">{{ OWNER_ONLY }}</text>
        </view>
        <!-- 撕线和存根：有效期、邀请编号 -->
        <view class="perf"><view class="notch notch-l"></view><view class="perf-line"></view><view class="notch notch-r"></view></view>
        <view class="stub">
          <text class="stub-t">{{ stubText }}</text>
          <text class="stub-code">{{ inviteCode(inv) }}</text>
        </view>
        <!-- 结果印章 -->
        <view v-if="stamp" class="stamp" :class="'stamp-' + stamp"><text class="stamp-t">{{ stamp === 'ok' ? '已接受' : '已婉拒' }}</text><text class="stamp-s">{{ stampDate }}</text></view>
      </view>

      <!-- 自己发出的邀请：转发给对方 -->
      <view v-if="self" class="res res-on">
        <text class="res-t">这是你发出的邀请</text>
        <text class="res-s">把它转发给想邀请的人；对方接受后，你的共同主持列表里会显示「已加入」。</text>
        <button class="btn btn-main res-share" open-type="share" hover-class="press"><z-icon name="share" :size="18" color="#FFFFFF" /><text class="btn-t">转发给对方</text></button>
      </view>

      <!-- 结果反馈 -->
      <view v-else-if="inv.status === 'accepted'" class="res" :class="{ 'res-on': resultOn }">
        <view class="res-ic res-ic-ok"><z-icon name="circle-check" :size="30" color="#3FCF84" /></view>
        <text class="res-t">你已成为共同主持</text>
        <text class="res-s">{{ inv.from.name }} 会收到你接受邀请的通知。比赛开始后，在房间里打开「更多 → 主持人」就能控制计时、管理现场和记分。</text>
        <view class="res-acts">
          <view v-if="matchExists" class="btn btn-main" hover-class="press" @tap="toMatch"><text class="btn-t">查看比赛</text></view>
          <view class="btn btn-ghost" hover-class="press" @tap="toHome"><text class="btn-t">回到首页</text></view>
        </view>
      </view>
      <view v-else-if="inv.status === 'declined'" class="res" :class="{ 'res-on': resultOn }">
        <view class="res-ic"><z-icon name="hand-stop" :size="28" color="#A9AEB8" /></view>
        <text class="res-t">已婉拒这次邀请</text>
        <text class="res-s">已经告诉 {{ inv.from.name }} 你这次不能主持。</text>
        <view class="res-acts">
          <view v-if="!expiredNow" class="btn btn-ghost" hover-class="press" @tap="changeMind"><text class="btn-t">改变主意</text></view>
          <view class="btn btn-ghost" hover-class="press" @tap="toHome"><text class="btn-t">回到首页</text></view>
        </view>
        <text v-if="!expiredNow" class="res-hint">邀请有效期内（还剩 {{ leftText(inv) }}）可以改为接受</text>
      </view>

      <!-- 待确认：婉拒 / 接受 -->
      <view v-else class="bar" :class="{ 'bar-on': shown }">
        <view class="btn btn-ghost bar-no" hover-class="press" @tap="decline"><text class="btn-t">婉拒</text></view>
        <view class="btn btn-main bar-yes" :class="{ 'btn-busy': busy }" hover-class="press" @tap="accept"><text class="btn-t">{{ busy ? '正在确认…' : '接受邀请' }}</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 主持人邀请（B 看到的页面）：A 在创建比赛页点「邀请」转发给 B，B 打开这里。
// 卡片：邀请人、比赛（封面、名称、时间、地点、现有主持人）、共同主持的权限、有效期；
// 接受后盖「已接受」章并显示下一步，婉拒（先确认）后盖「已婉拒」章，有效期内可以改主意。
// 邀请无效时（找不到、过期、撤回、名额已满）只显示说明。自己打开自己发的邀请时，可以转发给对方
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { requireLogin, getProfile } from '@/common/auth.js'
import { fitsDisplay } from '@/common/font-coverage.js'
import { pad2, toast } from '@/common/format.js'
import { findPublicMatch } from '@/mock/plaza.js'
import { getMatch } from '@/common/store.js'
import { DEMO_MODE } from '@/common/config.js'
import { getInvite, respondInvite, reopenInvite, leftText, inviteCode, hostCountText, COHOST_PERMS, OWNER_ONLY } from '@/common/host-invite.js'

const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW + 8}px`
const BAD = {
  notfound: { icon: 'mail-off', title: '找不到这份邀请' },
  expired: { icon: 'hourglass', title: '邀请已过期' },
  revoked: { icon: 'arrow-back-up', title: '邀请已撤回' },
  full: { icon: 'users', title: '主持人名额已满' }
}
const WEEK = '日一二三四五六'
const inv = ref(null)
const bad = ref('')
const shown = ref(false)
const resultOn = ref(false)
const busy = ref(false)
let inviteId = ''

// 演示：A 在创建比赛页点「预览」时带 preview=1，以收到邀请的人（小明）的身份看这一页，接受后 A 的列表里显示「小明 已加入」
const preview = ref(false)
const PREVIEW_AS = { name: '小明', c: '明', bg: '#2F4A3A', fg: '#B8E6C8' }
const me = () => { if (preview.value) return PREVIEW_AS; const p = getProfile(); return { name: p.nickname || '我', c: (p.nickname || '我').slice(0, 1), bg: '#F1E4D3', fg: '#8A1C1C' } }
const self = computed(() => !!(inv.value && inv.value.from.name === me().name))
const expiredNow = computed(() => !!(inv.value && Date.now() > inv.value.expiresAt))
const matchExists = computed(() => !!(inv.value && (getMatch(inv.value.match.id) || findPublicMatch(inv.value.match.id))))
const coverSrc = computed(() => `/static/covers/${(inv.value && inv.value.match.cover) || 'fog'}.jpg`)
const whenText = computed(() => {
  const d = new Date(inv.value.match.startAt)
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 周${WEEK[d.getDay()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
})
const venueText = computed(() => { const v = inv.value.match.venue; return v ? `${v.name} · ${v.address}` : '地点待定' })
const badText = computed(() => {
  const from = inv.value ? inv.value.from.name : '对方'
  return { notfound: '链接可能不完整，或者邀请已经被删除。', expired: `邀请超过 24 小时没有确认，请让 ${from} 重新发一次。`, revoked: `${from} 已经撤回了这份邀请。`, full: '这场比赛的共同主持已经满了，可以联系发起人调整。' }[bad.value]
})
const stamp = computed(() => (inv.value && inv.value.status === 'accepted' ? 'ok' : inv.value && inv.value.status === 'declined' ? 'no' : ''))
const stampDate = computed(() => { if (!inv.value || !inv.value.respondedAt) return ''; const d = new Date(inv.value.respondedAt); return `${d.getMonth() + 1}.${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` })
const stubText = computed(() => {
  const s = inv.value.status
  if (s === 'accepted') return '已接受，发起人已收到通知'
  if (s === 'declined') return '已婉拒，发起人已收到通知'
  return `邀请 ${leftText(inv.value)}后失效`
})

function load() {
  const x = getInvite(inviteId)
  inv.value = x
  bad.value = !x ? 'notfound' : x.status === 'expired' || x.status === 'revoked' ? x.status : ''
  resultOn.value = !!(x && (x.status === 'accepted' || x.status === 'declined'))
}
onLoad((q) => {
  if (!requireLogin()) return // 必须登录；登录后回到这份邀请
  inviteId = (q && q.id) || 'demo'
  preview.value = DEMO_MODE && q && q.preview === '1'
  load()
  setTimeout(() => { shown.value = true }, 40)
})

function accept() {
  if (busy.value) return
  busy.value = true
  // 演示：模拟一次网络请求；正式环境 POST /host-invites/:id/accept
  setTimeout(() => {
    busy.value = false
    const r = respondInvite(inviteId, true, me())
    if (!r.ok) {
      if (/名额/.test(r.error)) { bad.value = 'full'; return }
      if (/过期/.test(r.error)) { load(); return }
      return toast(r.error)
    }
    inv.value = r.invite
    resultOn.value = false
    setTimeout(() => { resultOn.value = true }, 360) // 先盖章，再出结果
  }, 500)
}
function decline() {
  uni.showModal({
    title: '婉拒这次邀请？',
    content: `${inv.value.from.name} 会收到通知。有效期内你还可以改为接受。`,
    confirmText: '婉拒',
    confirmColor: '#8E929B',
    success: ({ confirm }) => {
      if (!confirm) return
      const r = respondInvite(inviteId, false, me())
      if (!r.ok) return toast(r.error)
      inv.value = r.invite
      resultOn.value = false
      setTimeout(() => { resultOn.value = true }, 360)
    }
  })
}
function changeMind() {
  const x = reopenInvite(inviteId)
  if (!x) { load(); return toast('邀请已经过期了') }
  resultOn.value = false
  inv.value = x
}
const toHome = () => uni.reLaunch({ url: '/pages/home/index' })
const toMatch = () => uni.navigateTo({ url: '/pages/invite/index?id=' + inv.value.match.id })

onShareAppMessage(() => {
  const x = inv.value
  if (!x) return { title: '桌趣', path: '/pages/home/index' }
  return { title: `${x.from.name} 邀请你一起主持「${x.match.name}」`, path: '/pages/host-invite/index?id=' + x.id, imageUrl: coverSrc.value }
})
</script>

<style>
.hi { position: relative; min-height: 100vh; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: #14151A; overflow: hidden; }
.hi-glow { position: absolute; left: -20%; right: -20%; top: -120rpx; height: 760rpx; background: radial-gradient(ellipse at 50% 30%, rgba(220, 0, 0, .28) 0%, rgba(220, 0, 0, 0) 62%); pointer-events: none; }
.press { opacity: .8; }
.font-sys { font-family: "PingFang SC", sans-serif !important; font-weight: 700; }
.nav { position: fixed; z-index: 20; left: 0; right: 0; top: 0; padding-left: 24rpx; box-sizing: border-box; display: flex; align-items: center; }
.nav-back { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(38, 42, 52, .9); display: flex; align-items: center; justify-content: center; }
.nav-t { margin-left: 20rpx; font-size: 32rpx; font-weight: 700; color: #F3EEE6; }
.body { position: relative; padding: 24rpx 50rpx 0; }
/* 邀请卡片 */
.card { position: relative; border-radius: 32rpx; background: #1F222A; box-shadow: 0 30rpx 80rpx rgba(0, 0, 0, .45), inset 0 0 0 2rpx rgba(243, 238, 230, .06);
  opacity: 0; transform: translateY(60rpx); transition: opacity .5s ease, transform .6s cubic-bezier(.2, .8, .2, 1); }
.card-on { opacity: 1; transform: none; }
.cover { position: relative; height: 240rpx; border-radius: 32rpx 32rpx 0 0; overflow: hidden; }
.cover-img { width: 100%; height: 100%; }
.cover-shade { position: absolute; left: 0; right: 0; top: 0; bottom: 0; background: linear-gradient(180deg, rgba(20, 21, 26, .1) 0%, rgba(31, 34, 42, .92) 100%); }
.kicker { position: absolute; left: 32rpx; top: 28rpx; padding: 6rpx 16rpx; border-radius: 8rpx; background: rgba(0, 0, 0, .45); font-size: 20rpx; font-weight: 700; letter-spacing: 2rpx; color: #FFD27A; }
.from { position: relative; margin-top: -64rpx; padding: 0 32rpx; display: flex; align-items: flex-end; }
.from-av { position: relative; width: 120rpx; height: 120rpx; flex: none; border-radius: 50%; box-shadow: 0 0 0 8rpx #1F222A; display: flex; align-items: center; justify-content: center; font-size: 46rpx; font-weight: 700; }
.from-v { position: absolute; right: -2rpx; bottom: -2rpx; width: 40rpx; height: 40rpx; box-sizing: border-box; border-radius: 50%; border: 5rpx solid #1F222A; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.from-main { margin: 0 0 8rpx 20rpx; display: flex; flex-direction: column; }
.from-n { font-size: 30rpx; font-weight: 700; color: #F3EEE6; }
.from-s { margin-top: 4rpx; font-size: 26rpx; color: #C9CDD4; }
.title { display: block; margin-top: 28rpx; padding: 0 32rpx; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 52rpx; line-height: 1.2; color: #F3EEE6; }
.rows { margin-top: 20rpx; padding: 0 32rpx; }
.row { min-height: 56rpx; display: flex; align-items: center; }
.row-t { margin-left: 14rpx; flex: 1; min-width: 0; font-size: 26rpx; color: #E5E2DB; }
.stack { display: flex; }
.sk { width: 44rpx; height: 44rpx; margin-right: -12rpx; border-radius: 50%; box-shadow: 0 0 0 4rpx #1F222A; display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 600; }
.row-t-stack { margin-left: 26rpx; }
.perm { margin: 24rpx 24rpx 0; padding: 24rpx; border-radius: 24rpx; background: #262A34; }
.perm-h { display: block; font-size: 24rpx; font-weight: 700; color: #C9CDD4; }
.perm-i { margin-top: 18rpx; display: flex; align-items: flex-start; }
.perm-ic { width: 56rpx; height: 56rpx; flex: none; border-radius: 16rpx; background: #35383F; display: flex; align-items: center; justify-content: center; }
.perm-main { margin-left: 18rpx; flex: 1; min-width: 0; display: flex; flex-direction: column; }
.perm-t { font-size: 28rpx; font-weight: 600; color: #F3EEE6; }
.perm-s { margin-top: 4rpx; font-size: 24rpx; line-height: 1.5; color: #A9AEB8; }
.perm-note { display: block; margin-top: 20rpx; font-size: 22rpx; line-height: 1.6; color: #8E929B; }
/* 撕线：两边的半圆缺口是页面底色 */
.perf { position: relative; margin-top: 32rpx; height: 36rpx; display: flex; align-items: center; }
.perf-line { flex: 1; margin: 0 26rpx; border-top: 3rpx dashed #3A3E48; }
.notch { position: absolute; top: 0; width: 36rpx; height: 36rpx; border-radius: 50%; background: #14151A; }
.notch-l { left: -18rpx; }
.notch-r { right: -18rpx; }
.stub { padding: 16rpx 32rpx 28rpx; display: flex; align-items: center; justify-content: space-between; }
.stub-t { font-size: 24rpx; color: #C9CDD4; }
.stub-code { font-family: "BoardNum", monospace; font-weight: 800; font-size: 24rpx; letter-spacing: 2rpx; color: #8E929B; }
/* 印章：从大到小按下去 */
.stamp { position: absolute; right: 40rpx; top: 300rpx; width: 220rpx; height: 220rpx; box-sizing: border-box; border-radius: 50%; border: 8rpx solid; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-14deg);
  animation: stamp-in .42s cubic-bezier(.3, 1.4, .5, 1) both; }
.stamp::after { content: ''; position: absolute; left: 10rpx; top: 10rpx; right: 10rpx; bottom: 10rpx; border-radius: 50%; border: 3rpx solid; border-color: inherit; }
@keyframes stamp-in { from { opacity: 0; transform: rotate(-14deg) scale(2.2); } to { opacity: .92; transform: rotate(-14deg) scale(1); } }
.stamp-ok { border-color: #E2332B; color: #E2332B; background: rgba(226, 51, 43, .08); }
.stamp-no { border-color: #8E929B; color: #8E929B; background: rgba(142, 146, 155, .08); }
.stamp-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 48rpx; letter-spacing: 4rpx; }
.stamp-s { margin-top: 6rpx; font-family: "BoardNum", monospace; font-weight: 800; font-size: 22rpx; }
/* 按钮 */
.btn { height: 96rpx; padding: 0 40rpx; border-radius: 48rpx; display: flex; align-items: center; justify-content: center; }
.btn::after { border: none; }
.btn-main { background: #DC0000; }
.btn-ghost { background: #2C2F36; }
.btn-busy { opacity: .7; }
.btn-t { margin-left: 8rpx; font-size: 30rpx; font-weight: 700; color: #FFFFFF; }
.bar { margin-top: 40rpx; display: flex; opacity: 0; transition: opacity .5s ease .2s; }
.bar-on { opacity: 1; }
.bar-no { width: 220rpx; flex: none; }
.bar-yes { flex: 1; margin-left: 20rpx; }
/* 结果反馈 */
.res { margin-top: 40rpx; padding: 36rpx 32rpx; border-radius: 32rpx; background: #1F222A; display: flex; flex-direction: column; align-items: center; opacity: 0; transform: translateY(24rpx); transition: opacity .4s ease, transform .4s ease; }
.res-on { opacity: 1; transform: none; }
.res-ic { width: 96rpx; height: 96rpx; border-radius: 50%; background: #2C2F36; display: flex; align-items: center; justify-content: center; }
.res-ic-ok { background: rgba(63, 207, 132, .14); }
.res-t { margin-top: 20rpx; font-size: 36rpx; font-weight: 700; color: #F3EEE6; }
.res-s { margin-top: 12rpx; font-size: 26rpx; line-height: 1.7; color: #C9CDD4; text-align: center; }
.res-acts { margin-top: 32rpx; width: 100%; display: flex; }
.res-acts .btn { flex: 1; margin-left: 20rpx; }
.res-acts .btn:first-child { margin-left: 0; }
.res-hint { margin-top: 20rpx; font-size: 22rpx; color: #8E929B; }
.res-share { margin-top: 28rpx; width: 100%; }
/* 邀请无效 */
.bad { margin: 120rpx 50rpx 0; padding: 60rpx 40rpx; border-radius: 32rpx; background: #1F222A; display: flex; flex-direction: column; align-items: center; opacity: 0; transition: opacity .4s ease; }
.bad-on { opacity: 1; }
.bad-ic { width: 120rpx; height: 120rpx; border-radius: 50%; background: #2C2F36; display: flex; align-items: center; justify-content: center; }
.bad-t { margin-top: 28rpx; font-size: 36rpx; font-weight: 700; color: #F3EEE6; }
.bad-s { margin-top: 12rpx; font-size: 26rpx; line-height: 1.7; color: #C9CDD4; text-align: center; }
.bad-btn { margin-top: 40rpx; width: 100%; }
</style>
