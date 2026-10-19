<template>
  <view class="page">
    <view class="cbar" :class="{ 'cbar-on': compact }" :style="cbarStyle">
      <view v-if="canBack" class="cbar-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
      <text class="cbar-t">主办方工作台</text>
    </view>

    <!-- 大标题：和广场、平台认证同一套标题字体 -->
    <view class="head" :style="headStyle">
      <view class="head-row" :style="headRowStyle">
        <view v-if="canBack" class="h-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="h-title">主办方工作台</text>
      </view>
    </view>

    <!-- 身份和本周概览：头像右下角是认证 V 标识，点开看认证详情 -->
    <view class="idc">
      <view class="idc-top" hover-class="press-soft" @tap="toCert">
        <view class="ava">
          <image v-if="who.avatarUrl" class="ava-img" :src="who.avatarUrl" mode="aspectFill" />
          <text v-else class="ava-c">{{ who.char }}</text>
          <view class="vb"><z-icon name="letter-v" :size="10" :stroke="3.4" color="#FFFFFF" /></view>
        </view>
        <view class="idc-main">
          <view class="idc-row"><text class="idc-name" :class="{ 'font-sys': !fitsDisplay(who.nickname) }">{{ who.nickname }}</text><text class="idc-tag">认证主办方</text></view>
          <text class="idc-sub">{{ hostProfile.server }}，有效期至 {{ hostProfile.expires }}</text>
        </view>
        <z-icon name="chevron-right" :size="16" color="#6B7280" />
      </view>
      <view class="idc-mt">
        <view v-for="(x, i) in deskMetrics" :key="x.key" class="mt-i" :class="{ 'mt-sep': i > 0 }" hover-class="press-soft" @tap="toast(x.label + '明细即将上线')">
          <view class="mt-v"><text class="mt-num">{{ shownMetric[i] }}</text><text class="mt-u">{{ x.unit }}</text></view>
          <text class="mt-l">{{ x.label }}</text>
        </view>
      </view>
    </view>

    <!-- 常用操作 -->
    <view class="qa">
      <view class="qa-main" hover-class="press" @tap="go('/pages/create/index')">
        <z-icon name="plus" :size="18" :stroke="2.5" color="#FFFFFF" /><text class="qa-t">创建比赛</text>
      </view>
      <view class="qa-sub" hover-class="press" @tap="go('/pages/room/index')">
        <z-icon name="player-play" :size="16" color="#FFFFFF" /><text class="qa-t">进入房间</text>
      </view>
    </view>

    <!-- 待办 -->
    <view class="sec">
      <view class="sec-h"><text class="sec-t">待办</text><text class="sec-n">{{ todos.length }} 项</text></view>
      <view class="td">
        <view v-for="(t, i) in todos" :key="t.key" class="td-i" :class="{ 'td-first': i === 0 }" hover-class="press-soft" @tap="doTodo(t)">
          <view class="td-ic" :class="'td-' + t.tone"><z-icon :name="t.icon" :size="16" :color="TONE[t.tone]" /></view>
          <view class="td-main"><text class="td-t">{{ t.title }}</text><text class="td-s">{{ t.sub }}</text></view>
          <z-icon name="chevron-right" :size="14" color="#6B7280" />
        </view>
      </view>
    </view>

    <!-- 我的比赛：横滑卡片，点开是分享落地页 -->
    <view class="sec">
      <view class="sec-h">
        <text class="sec-t">我的比赛</text>
        <view class="sec-more" hover-class="press-soft" @tap="toast('比赛列表即将上线')"><text class="sec-more-t">全部</text><z-icon name="chevron-right" :size="14" color="#9CA3AF" /></view>
      </view>
    </view>
    <view class="mm">
      <view v-for="m in myMatches" :key="m.id" class="mm-i" hover-class="press-soft" @tap="go('/pages/invite/index?id=' + m.id)">
        <view class="mm-cv" :style="m.cover"><text class="mm-tag" :class="{ 'mm-tag-review': !m.autoApprove }">{{ m.autoApprove ? '报名中' : '需审核' }}</text></view>
        <view class="mm-body">
          <text class="mm-name" :class="{ 'font-sys': !fitsDisplay(m.name) }">{{ m.name }}</text>
          <view class="mm-when"><text class="mm-time">{{ m.time }}</text><text class="mm-date">{{ m.date }}</text></view>
          <view class="mm-bar"><view class="mm-fill" :style="'width:' + m.pct + '%'"></view></view>
          <text class="mm-sign">{{ m.signed }}/{{ m.cap }} 已报名</text>
        </view>
      </view>
    </view>

    <!-- 功能入口：图标来自设计素材包，放在象牙白的牌面上（原图的黑色描边在深色底上看不清） -->
    <view v-for="g in featureGroups" :key="g.key" class="sec">
      <view class="sec-h"><text class="sec-t">{{ g.title }}</text><text class="sec-n">{{ g.items.length }} 项</text></view>
      <view class="fg">
        <view v-for="it in g.items" :key="it.key" class="fg-i" hover-class="fg-press" :hover-stay-time="80" @tap="openFeature(it)">
          <view class="fg-tile">
            <image class="fg-img" :src="it.img" mode="aspectFit" />
            <view v-if="FEATURE_LINKS[it.key]" class="fg-live"></view>
          </view>
          <text class="fg-n">{{ it.name }}</text>
        </view>
      </view>
    </view>

    <!-- 服务 -->
    <view class="sec">
      <view class="sec-h"><text class="sec-t">服务</text></view>
      <view class="sv">
        <view v-for="(s, i) in services" :key="s.key" class="sv-i" :class="{ 'sv-first': i === 0 }" hover-class="press-soft" @tap="doService(s)">
          <view class="sv-ic"><z-icon :name="s.icon" :size="18" color="#FF6B6B" /></view>
          <view class="sv-main"><text class="sv-t">{{ s.name }}</text><text class="sv-s">{{ s.desc }}</text></view>
          <z-icon name="chevron-right" :size="14" color="#6B7280" />
        </view>
      </view>
    </view>

    <z-tabbar :items="navItems" :active="navActive" @change="onNav" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onReady, onPageScroll } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTabbar from '@/components/z-tabbar/z-tabbar.vue'
import { getNavMetrics } from '@/common/nav.js'
import { coverStyle } from '@/common/svg.js'
import { fitsDisplay } from '@/common/font-coverage.js'
import { requireHost, useCertState } from '@/common/cert.js'
import { useProfile } from '@/common/auth.js'
import { tabItems, tapTab } from '@/common/tabs.js'
import { CERTIFY_WEB, WEBVIEW_ENABLED } from '@/common/config.js'
import { me } from '@/mock/data.js'
import { publicMatches } from '@/mock/plaza.js'
import { hostProfile, deskMetrics, todos, featureGroups, services } from '@/mock/workbench.js'

const nav = getNavMetrics()
const cbarStyle = `height:${nav.statusBar + nav.navH}px;padding-top:${nav.statusBar}px`
const headStyle = `padding-top:${nav.statusBar}px`
const headRowStyle = `height:${nav.navH}px;padding-right:${nav.capsuleW}px`
const toast = (title) => uni.showToast({ title, icon: 'none' })
const who = useProfile()
const go = (url) => uni.navigateTo({ url })
const TONE = { red: '#FF6B6B', amber: '#FFC53A', blue: '#7896DA', gray: '#9CA3AF' }

/* ---------- 我的比赛 ---------- */
const p2 = (n) => (n < 10 ? '0' : '') + n
const WEEK = '日一二三四五六'
const myMatches = publicMatches.slice(0, 4).map((m) => {
  const d = new Date(m.startAt)
  const signed = (m.participants || []).length
  return {
    id: m.id,
    name: m.name,
    autoApprove: m.autoApprove,
    cover: coverStyle(m.cover, 'wide'),
    time: `${p2(d.getHours())}:${p2(d.getMinutes())}`,
    date: `${p2(d.getMonth() + 1)}/${p2(d.getDate())} 周${WEEK[d.getDay()]}`,
    signed,
    cap: m.cap,
    pct: Math.min(100, Math.round((signed / m.cap) * 100))
  }
})

/* ---------- 本周概览：打开页面时数字递增 ---------- */
const shownMetric = ref(deskMetrics.map(() => '0'))
function countUp() {
  const start = Date.now()
  const dur = 800
  const tick = () => {
    const t = Math.min(1, (Date.now() - start) / dur)
    const e = 1 - Math.pow(1 - t, 3)
    shownMetric.value = deskMetrics.map((x) => String(Math.round(x.value * e)))
    if (t < 1) setTimeout(tick, 32)
  }
  tick()
}

/* ---------- 点击 ---------- */
const toCert = () => go('/pages/host/index')
function openWeb(url, title) {
  if (!WEBVIEW_ENABLED) return uni.setClipboardData({ data: url, success: () => toast('链接已复制，请在浏览器打开') })
  go(`/pages/webview/index?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`)
}
// 已经做好的功能直接打开（右上角有绿点），其余提示即将上线
const FEATURE_LINKS = { blinds: '/pages/create/index?open=blinds', schemes: '/pages/create/index?open=schemes' }
function openFeature(it) {
  if (FEATURE_LINKS[it.key]) return go(FEATURE_LINKS[it.key])
  toast(it.name + '即将上线')
}
const TODO_TIPS = { review: '报名审核即将上线', dealers: '荷官列表即将上线', devices: '设备绑定即将上线' }
function doTodo(t) {
  if (t.action === 'room') return go('/pages/room/index')
  toast(TODO_TIPS[t.action] || '即将上线')
}
function doService(s) {
  if (s.key === 'cert') return openWeb(CERTIFY_WEB.manage, '认证管理')
  toast(s.name + '即将上线')
}

/* ---------- 紧凑标题栏 ---------- */
// 和广场一致用 onPageScroll：相交监听在部分模拟器上不回调（见广场页的修复）。只在越过阈值时更新，避免频繁 setData
const compact = ref(false)
onPageScroll(({ scrollTop }) => {
  const on = scrollTop > 72
  if (on !== compact.value) compact.value = on
})

/* ---------- 页面 ---------- */
const canBack = ref(false)
const goBack = () => uni.navigateBack()
onLoad(() => {
  // 主办方专属页面：未认证回到平台认证页
  if (!requireHost()) return
  canBack.value = getCurrentPages().length > 1
})
onReady(countUp)

/* ---------- 底部导航 ---------- */
const certState = useCertState()
const navItems = computed(() => tabItems(certState.value))
const navActive = ref(3)
function onNav(i) {
  tapTab(navItems.value, i, 'desk', (k) => { navActive.value = k })
}
</script>

<style>
.page { position: relative; min-height: 100vh; background: #181A20; padding-bottom: calc(300rpx + env(safe-area-inset-bottom)); }
.press { opacity: .8; transform: scale(.96); }
.press-soft { opacity: .85; }
.font-sys { font-family: "PingFang SC", "Microsoft YaHei", sans-serif !important; font-weight: 600 !important; letter-spacing: 0 !important; }

/* 紧凑标题栏（同广场） */
.cbar {
  position: fixed; z-index: 30; left: 0; right: 0; top: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  background: #181A20; opacity: 0; transform: translateY(-12rpx); transition: opacity .25s ease, transform .3s ease; pointer-events: none;
}
.cbar-on { opacity: 1; transform: translateY(0); pointer-events: auto; }
.cbar-back { position: absolute; left: 24rpx; bottom: 12rpx; width: 64rpx; height: 64rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.cbar-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; color: #FFFFFF; }

/* 大标题 */
.head { padding: 0 40rpx; }
.head-row { display: flex; align-items: center; box-sizing: border-box; }
.h-back { width: 64rpx; height: 64rpx; flex: none; margin-right: 20rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.h-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 60rpx; line-height: 1; letter-spacing: 4rpx; color: #FFFFFF; white-space: nowrap; }

/* 身份和本周概览 */
.idc { margin: 32rpx 40rpx 0; border-radius: 32rpx; background: linear-gradient(135deg, #2B1C22 0%, #1F222A 58%); border: 1rpx solid #2F2A33; }
.idc-top { display: flex; align-items: center; padding: 32rpx 28rpx 28rpx; }
.ava {
  position: relative; width: 96rpx; height: 96rpx; flex: none; border-radius: 50%; background: #F3EEE6; box-shadow: 0 0 0 4rpx #F4B740;
  display: flex; align-items: center; justify-content: center;
}
.ava-img { width: 100%; height: 100%; border-radius: 50%; display: block; }
.ava-c { font-size: 42rpx; font-weight: 600; color: #181A20; }
.vb {
  position: absolute; right: -8rpx; bottom: -8rpx; width: 38rpx; height: 38rpx; box-sizing: border-box; border-radius: 50%;
  background: #DC0000; border: 4rpx solid #281D23; display: flex; align-items: center; justify-content: center;
}
.idc-main { flex: 1; min-width: 0; margin: 0 16rpx 0 28rpx; }
.idc-row { display: flex; align-items: center; }
.idc-name { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.idc-tag { margin-left: 14rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(220, 0, 0, .16); font-size: 20rpx; font-weight: 500; color: #FF6B6B; }
.idc-sub { display: block; margin-top: 10rpx; font-size: 22rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.idc-mt { display: flex; margin: 0 28rpx; padding: 28rpx 0 32rpx; border-top: 1rpx solid #30343E; }
.mt-i { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
.mt-sep { border-left: 1rpx solid #30343E; }
.mt-v { display: flex; align-items: baseline; }
.mt-num { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 200; font-size: 72rpx; line-height: 1; color: #F2F2EE; }
.mt-u { margin-left: 4rpx; font-size: 20rpx; color: #FF6B6B; }
.mt-l { margin-top: 10rpx; font-size: 22rpx; color: #9CA3AF; }

/* 常用操作 */
.qa { display: flex; margin: 28rpx 40rpx 0; }
.qa-main, .qa-sub { height: 88rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.qa-main { flex: 1.3; background: #DC0000; box-shadow: 0 12rpx 28rpx rgba(220, 0, 0, .3); }
.qa-sub { flex: 1; margin-left: 20rpx; background: #2A2D36; }
.qa-t { margin-left: 10rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }

/* 区块 */
.sec { margin-top: 72rpx; padding: 0 40rpx; }
.sec-h { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 28rpx; }
.sec-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.sec-n { font-size: 22rpx; color: #6B7280; }
.sec-more { display: flex; align-items: center; }
.sec-more-t { margin-right: 2rpx; font-size: 24rpx; color: #9CA3AF; }

/* 待办 */
.td { border-radius: 32rpx; background: #1F222A; }
.td-i { display: flex; align-items: center; margin: 0 28rpx; padding: 26rpx 0; border-top: 1rpx solid #2A2D36; }
.td-first { border-top: none; }
.td-ic { width: 64rpx; height: 64rpx; flex: none; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.td-red { background: rgba(220, 0, 0, .14); }
.td-amber { background: rgba(255, 197, 58, .14); }
.td-blue { background: rgba(120, 150, 218, .14); }
.td-gray { background: rgba(156, 163, 175, .12); }
.td-main { flex: 1; min-width: 0; margin: 0 16rpx 0 22rpx; }
.td-t { display: block; font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.td-s { display: block; margin-top: 6rpx; font-size: 22rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 我的比赛：横滑 */
.mm { display: flex; overflow-x: auto; padding: 0 40rpx 8rpx; margin-top: -4rpx; }
.mm::-webkit-scrollbar { display: none; }
.mm-i { flex: none; width: 440rpx; margin-right: 20rpx; border-radius: 28rpx; overflow: hidden; background: #1F222A; }
.mm-cv { position: relative; height: 200rpx; }
.mm-tag { position: absolute; left: 16rpx; top: 16rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .6); font-size: 20rpx; color: #4CB582; }
.mm-tag-review { color: #FFC53A; }
.mm-body { padding: 20rpx 24rpx 24rpx; }
.mm-name { display: block; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; line-height: 1.25; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mm-when { margin-top: 10rpx; display: flex; align-items: baseline; }
.mm-time { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 40rpx; line-height: 1; color: #F2F2EE; }
.mm-date { margin-left: 10rpx; font-size: 22rpx; color: #9CA3AF; }
.mm-bar { margin-top: 16rpx; height: 6rpx; border-radius: 3rpx; background: #30343E; overflow: hidden; }
.mm-fill { height: 6rpx; background: #F2F2EE; }
.mm-sign { display: block; margin-top: 10rpx; font-size: 22rpx; color: #9CA3AF; }

/* 功能入口：象牙白牌面 + 素材包图标 */
.fg { display: flex; flex-wrap: wrap; }
.fg-i { width: 25%; display: flex; flex-direction: column; align-items: center; margin-bottom: 8rpx; }
.fg-tile {
  width: 132rpx; height: 132rpx; border-radius: 30rpx; background: #EFE9DF; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, .28); transition: transform .3s cubic-bezier(.34, 1.56, .64, 1);
}
.fg-press .fg-tile { transform: scale(.92); transition-duration: .12s; }
.fg-img { width: 84rpx; height: 84rpx; }
.fg-tile { position: relative; }
.fg-live { position: absolute; right: 12rpx; top: 12rpx; width: 16rpx; height: 16rpx; border-radius: 50%; background: #3FCF84; box-shadow: 0 0 0 4rpx #EFE9DF; }
.fg-n { margin-top: 16rpx; font-size: 24rpx; color: #E5E7EB; }

/* 服务 */
.sv { border-radius: 32rpx; background: #1F222A; }
.sv-i { display: flex; align-items: center; margin: 0 28rpx; padding: 26rpx 0; border-top: 1rpx solid #2A2D36; }
.sv-first { border-top: none; }
.sv-ic { width: 64rpx; height: 64rpx; flex: none; border-radius: 20rpx; background: rgba(220, 0, 0, .12); display: flex; align-items: center; justify-content: center; }
.sv-main { flex: 1; min-width: 0; margin: 0 16rpx 0 22rpx; }
.sv-t { display: block; font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.sv-s { display: block; margin-top: 6rpx; font-size: 22rpx; color: #9CA3AF; }

@media (prefers-reduced-motion: reduce) {
  .cbar, .fg-tile { transition: none; }
}
</style>
