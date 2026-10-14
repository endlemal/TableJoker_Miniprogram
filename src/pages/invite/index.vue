<template>
  <page-meta :page-style="joinOpen ? 'overflow:hidden' : ''"></page-meta>
  <view class="page">
    <!-- 封面：比赛封面 + 暗喻 -->
    <view class="hero">
      <image v-if="m.coverImage" class="hero-fill" :src="m.coverImage" mode="aspectFill" />
      <view v-else class="hero-fill hero-art" :style="heroBg"></view>
      <view v-if="!m.coverImage" class="tag">
        <text class="tag-n">{{ scene.name }}</text>
        <text class="tag-l">{{ scene.line }}</text>
      </view>
    </view>

    <!-- 滚动后出现的标题栏；从分享进入时没有上一页，左上角是「回到首页」 -->
    <view class="topbar" :class="{ 'topbar-on': scrolled }" :style="topbarStyle"><text class="topbar-t" :class="{ 'font-sys': !displayOk }">{{ m.name }}</text></view>
    <view class="nav-btn" :style="navBtnStyle" hover-class="press" @tap="leave">
      <z-icon :name="canBack ? 'arrow-left' : 'home'" :size="19" color="#FFFFFF" />
    </view>

    <view class="sheet">
      <view class="inviter">
        <view class="av av-28" :style="'background:' + m.inviter.bg + ';color:' + m.inviter.fg"><text>{{ m.inviter.c }}</text></view>
        <text class="inviter-t"><text class="inviter-n">{{ m.inviter.name }}</text> 邀请你参加</text>
        <view class="srv"><z-icon name="dice" :size="13" color="#F2A7A7" /><text class="srv-t">{{ m.server }}</text></view>
      </view>
      <text class="title" :class="{ 'font-sys': !displayOk }">{{ m.name }}</text>
      <view class="chips">
        <view class="chip"><text>德州扑克</text></view>
        <view class="chip"><text>锦标赛</text></view>
        <view class="chip">
          <z-icon :name="m.isPublic ? 'world' : 'lock'" :size="13" color="#E5E7EB" />
          <text class="chip-t">{{ m.isPublic ? '公开赛' : '仅受邀' }}</text>
        </view>
        <view class="chip">
          <z-icon :name="m.autoApprove ? 'bolt' : 'user-check'" :size="13" :color="m.autoApprove ? '#3FCF84' : '#FFC53A'" />
          <text class="chip-t" :style="{ color: m.autoApprove ? '#3FCF84' : '#FFC53A' }">{{ m.autoApprove ? '自动通过' : '需审核' }}</text>
        </view>
      </view>

      <!-- 关键信息板：站牌风格，和房间页的翻牌钟一致 -->
      <view class="board">
        <view class="bd-top">
          <view>
            <text class="bk">开赛</text>
            <view class="bd-flaps">
              <z-flap :value="clock[0]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
              <view class="gap"></view>
              <z-flap :value="clock[1]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
              <view class="colon"><view class="cdot"></view><view class="cdot"></view></view>
              <z-flap :value="clock[2]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
              <view class="gap"></view>
              <z-flap :value="clock[3]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
            </view>
          </view>
          <view class="bd-when">
            <text class="bd-state" :style="{ color: stateColor }">{{ stateWord }}</text>
            <text class="bd-date">{{ dateLabel }}</text>
            <text class="bd-cd">{{ countdown }}</text>
          </view>
        </view>
        <view class="bd-rule"></view>
        <view class="bd-bottom">
          <view class="bd-cell">
            <text class="bk">报名</text>
            <view class="bd-v-row"><text class="bd-v">{{ signedCount }}</text><text class="bd-v-sub">/{{ m.cap }}</text></view>
            <view class="bd-bar"><view class="bd-bar-fill" :style="{ width: fillPct + '%' }"></view></view>
          </view>
          <view class="bd-vr"></view>
          <view class="bd-cell bd-cell-r">
            <text class="bk">起始盲注</text>
            <text class="bd-v">{{ startBlinds }}</text>
            <text class="bd-s">{{ levelCount }} 级，约 {{ durationText }}</text>
          </view>
        </view>
      </view>

      <!-- 地点：在开赛时间下方，点「导航」用微信内置地图打开 -->
      <view v-if="m.location" class="loc" hover-class="press-soft" @tap="openMap">
        <view class="loc-ic"><z-icon name="map-pin" :size="18" color="#FF4D4D" /></view>
        <view class="loc-main">
          <text class="loc-name">{{ m.location.name }}</text>
          <text v-if="m.location.address" class="loc-addr">{{ m.location.address }}</text>
        </view>
        <view class="loc-nav"><z-icon name="navigation" :size="14" color="#FFFFFF" /><text class="loc-nav-t">导航</text></view>
      </view>

      <!-- 比赛介绍 -->
      <view class="sec"><text class="st">比赛介绍</text></view>
      <text class="intro">{{ m.intro || '主持人还没有写介绍' }}</text>

      <!-- 盲注结构 -->
      <view class="sec"><text class="st">盲注结构</text><text class="sm">{{ m.blindName }}，共 {{ levelCount }} 级</text></view>
      <view class="tt">
        <view class="tr thd"><text class="tc">级别</text><text class="tc">盲注</text><text class="tc">前注</text><text class="tc">时长</text></view>
        <view v-for="r in shownRows" :key="r.key" class="tr" :class="{ 'tr-last': r.last }">
          <block v-if="r.t === 'L'">
            <text class="tc">{{ r.no }}</text>
            <text class="tc">{{ r.blinds }}</text>
            <text class="tc">{{ r.ante }}</text>
            <view class="tc tc-dur"><text>{{ r.min }}</text><text class="tc-u">分</text></view>
          </block>
          <block v-else-if="r.t === 'B'">
            <view class="tx tx-b"><z-icon name="coffee" :size="14" color="#FFC53A" /><text class="tx-t">休息</text></view>
            <view class="tc tc-dur"><text>{{ r.min }}</text><text class="tc-u">分</text></view>
          </block>
          <view v-else class="tx tx-c"><z-icon name="scissors" :size="14" color="#FF5646" /><text class="tx-t">截止买入，之后不再接受报名和复活</text></view>
        </view>
      </view>
      <view v-if="hiddenRows > 0" class="tt-more" hover-class="press-soft" @tap="expanded = !expanded">
        <text class="tt-more-t">{{ expanded ? '收起' : '展开全部 ' + levelCount + ' 级' }}</text>
        <z-icon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="14" color="#9CA3AF" />
      </view>

      <!-- 主持人：只显示已接受邀请的共同主持 -->
      <view class="sec"><text class="st">主持人</text></view>
      <view class="hosts">
        <view v-for="(h, i) in m.hosts" :key="i" class="host">
          <view class="av av-44" :class="{ 'av-owner': h.role === 'owner' }" :style="'background:' + h.bg + ';color:' + h.fg"><text>{{ h.c }}</text></view>
          <text class="host-n">{{ h.name }}</text>
          <text class="host-r" :class="{ 'host-r-owner': h.role === 'owner' }">{{ h.role === 'owner' ? '发起人' : '共同主持' }}</text>
        </view>
      </view>

      <!-- 已报名 -->
      <view class="sec"><text class="st">已报名</text><text class="sm">{{ signedCount }}/{{ m.cap }}</text></view>
      <view class="people">
        <view class="stack">
          <view v-for="(p, i) in shownPeople" :key="i" class="av av-30" :class="{ 'av-on': i > 0 }" :style="'background:' + p.bg + ';color:' + p.fg"><text>{{ p.c }}</text></view>
          <view v-if="morePeople > 0" class="av av-30 av-on av-more"><text>+{{ morePeople }}</text></view>
        </view>
        <text class="people-t">{{ isFull ? '名额已满' : '还剩 ' + (m.cap - signedCount) + ' 个位置' }}</text>
      </view>
    </view>

    <!-- 底部：公开且自动通过 → 立即进入；否则 → 报名加入 -->
    <view class="bar">
      <view class="bar-note">
        <block v-if="joinStatus === 'pending'">
          <text>已提交报名，</text><text class="lnk" @tap="withdraw">撤回报名</text>
        </block>
        <text v-else>{{ noteText }}</text>
      </view>
      <view class="bar-row">
        <button v-if="m.isPublic" class="bar-share" open-type="share" hover-class="press"><z-icon name="share" :size="20" color="#FFFFFF" /></button>
        <view class="bar-main" :class="{ 'bar-wait': joinStatus === 'pending' || blocked }" hover-class="press" @tap="onMain">
          <z-icon :name="mainIcon" :size="19" :color="joinStatus === 'pending' || blocked ? '#9CA3AF' : '#FFFFFF'" />
          <text class="bar-main-t" :class="{ 'bar-main-t-wait': joinStatus === 'pending' || blocked }">{{ mainText }}</text>
        </view>
      </view>
    </view>

    <!-- 报名 -->
    <view v-if="joinOpen" class="ov">
      <view class="mask" @tap="joinOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="sheet-j">
        <view class="grab"></view>
        <text class="sj-title">报名加入</text>
        <view class="sj-sum">
          <image v-if="m.coverImage" class="sj-cover" :src="m.coverImage" mode="aspectFill" />
          <view v-else class="sj-cover" :style="heroBg"></view>
          <view class="sj-sum-t">
            <text class="sj-name">{{ m.name }}</text>
            <text class="sj-meta">{{ dateLabel }} {{ clockText }}{{ m.location ? '，' + m.location.name : '' }}</text>
          </view>
        </view>
        <view class="sj-lb"><text>给主持人留言（选填）</text><text class="sj-count">{{ message.length }}/60</text></view>
        <textarea v-model="message" class="sj-msg" maxlength="60" placeholder="比如：第一次参加，想和朋友坐一桌" placeholder-class="ph" :adjust-position="true" />
        <text class="sj-note">主持人通过后会通知你，通过前可以随时撤回</text>
        <view class="sj-ok" hover-class="press" @tap="submitJoin">
          <z-icon name="send" :size="18" color="#FFFFFF" />
          <text class="sj-ok-t">提交报名</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onPageScroll, onShareAppMessage } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZFlap from '@/components/z-flap/z-flap.vue'
import { getNavMetrics } from '@/common/nav.js'
import { svgUri, coverScene } from '@/common/svg.js'
import { getMatch, getJoin, setJoin } from '@/common/store.js'
import { SUBSCRIBE_TMPL_ID } from '@/common/config.js'
import { coverScenes, makeDemoMatch } from '@/mock/data.js'
import { findPublicMatch } from '@/mock/plaza.js'
import { fitsDisplay } from '@/common/font-coverage.js'

const nav = getNavMetrics()
const topbarStyle = `height:${nav.statusBar + nav.navH}px;padding:${nav.statusBar}px ${nav.capsuleW}px 0`
const navBtnStyle = `top:${nav.statusBar + Math.max(0, (nav.navH - 36) / 2)}px`

const p2 = (n) => (n < 10 ? '0' : '') + n
const toast = (title) => uni.showToast({ title, icon: 'none' })
const noop = () => {}
const WEEK = '日一二三四五六'

const m = ref(makeDemoMatch())
const canBack = ref(false)
const scrolled = ref(false)
const expanded = ref(false)
const joinOpen = ref(false)
const joinStatus = ref('')
const message = ref('')
const now = ref(Date.now())
const clock = ref(['0', '0', '0', '0'])

onLoad((q) => {
  const query = q || {}
  const found = query.id ? getMatch(query.id) || findPublicMatch(query.id) : null
  if (found) m.value = { participants: [], hosts: [], ...found }
  // 开发者工具里可以用编译参数 pub=0 / auto=0 预览另外两种状态
  if (query.pub === '0') m.value.isPublic = false
  if (query.auto === '0') m.value.autoApprove = false
  canBack.value = getCurrentPages().length > 1
  const j = getJoin(m.value.id)
  joinStatus.value = j ? j.status : ''
  // 进页面时开赛时间从 00:00 翻到实际时间
  setTimeout(() => { clock.value = clockText.value.replace(':', '').split('') }, 400)
})
onPageScroll(({ scrollTop }) => {
  const on = scrollTop > 150
  if (on !== scrolled.value) scrolled.value = on
})
onShareAppMessage(() => ({ title: `${m.value.name}，等你入座`, path: '/pages/invite/index?id=' + m.value.id }))

// 比赛名称是用户输入的，子集里缺字时整行改用系统粗体
const displayOk = computed(() => fitsDisplay(m.value.name))

/* ---------- 封面 ---------- */
const scene = computed(() => coverScenes.find((c) => c.key === m.value.cover) || coverScenes[0])
const heroBg = computed(() => `background-image:url("${svgUri(coverScene(scene.value.key))}")`)

/* ---------- 时间 ---------- */
const start = computed(() => new Date(m.value.startAt))
const clockText = computed(() => `${p2(start.value.getHours())}:${p2(start.value.getMinutes())}`)
const dateLabel = computed(() => `${p2(start.value.getMonth() + 1)}/${p2(start.value.getDate())} 周${WEEK[start.value.getDay()]}`)
const started = computed(() => m.value.startAt <= now.value)
const countdown = computed(() => {
  const diff = m.value.startAt - now.value
  if (diff <= 0) return '已开赛'
  const d = Math.floor(diff / 86400000)
  if (d >= 1) return `还有 ${d} 天`
  const h = Math.floor(diff / 3600000)
  if (h >= 1) return `还有 ${h} 小时`
  return `还有 ${Math.max(1, Math.floor(diff / 60000))} 分钟`
})

/* ---------- 人数 ---------- */
const signedCount = computed(() => (m.value.participants || []).length)
const isFull = computed(() => signedCount.value >= m.value.cap)
const fillPct = computed(() => Math.min(100, Math.round((signedCount.value / m.value.cap) * 1000) / 10))
const shownPeople = computed(() => (m.value.participants || []).slice(0, 6))
const morePeople = computed(() => Math.max(0, signedCount.value - 6))
const stateWord = computed(() => (isFull.value ? '已满员' : started.value ? '进行中' : '报名中'))
const stateColor = computed(() => (isFull.value || started.value ? '#FFC53A' : '#3FCF84'))

/* ---------- 盲注 ---------- */
const fmtNum = (n) => (n >= 10000 ? n / 10000 + '万' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
const levels = computed(() => m.value.blindRows.filter((r) => r.t === 'L'))
const levelCount = computed(() => levels.value.length)
const startBlinds = computed(() => (levels.value[0] ? `${fmtNum(levels.value[0].sb)}/${fmtNum(levels.value[0].bb)}` : '—'))
const durationText = computed(() => {
  const min = m.value.blindRows.reduce((sum, r) => sum + (r.min || 0), 0)
  const h = Math.round((min / 60) * 2) / 2
  return h >= 1 ? `${h} 小时` : `${min} 分钟`
})
const allRows = computed(() => {
  let n = 0
  return m.value.blindRows.map((r, i) => (r.t === 'L'
    ? { key: i, t: 'L', no: p2(++n), blinds: `${fmtNum(r.sb)}/${fmtNum(r.bb)}`, ante: r.ante ? fmtNum(r.ante) : '—', min: r.min }
    : { key: i, t: r.t, min: r.min || 0 }))
})
// 收起时只显示到第 6 级
const cutIndex = computed(() => {
  let n = 0
  const idx = allRows.value.findIndex((r) => r.t === 'L' && ++n === 6)
  return idx < 0 ? allRows.value.length : idx + 1
})
const hiddenRows = computed(() => allRows.value.length - cutIndex.value)
const shownRows = computed(() => {
  const list = expanded.value ? allRows.value : allRows.value.slice(0, cutIndex.value)
  return list.map((r, i) => ({ ...r, last: i === list.length - 1 }))
})

/* ---------- 底部按钮 ---------- */
const direct = computed(() => m.value.isPublic && m.value.autoApprove)
const blocked = computed(() => isFull.value && joinStatus.value !== 'pending')
const mainText = computed(() => {
  if (joinStatus.value === 'pending') return '等待主持人通过'
  if (isFull.value) return '已满员'
  return direct.value ? '立即进入' : '报名加入'
})
const mainIcon = computed(() => (joinStatus.value === 'pending' ? 'hourglass' : direct.value ? 'door-enter' : 'user-plus'))
const noteText = computed(() => {
  if (isFull.value) return '名额已满，主持人放开名额后会重新开放'
  if (direct.value) return '直接进入房间，不需要审核'
  return m.value.isPublic ? '提交报名后，由主持人审核' : '这是一场非公开比赛，报名后需要主持人同意'
})

function onMain() {
  if (joinStatus.value === 'pending') return toast('主持人还没处理你的报名')
  if (isFull.value) return toast('名额已满')
  if (direct.value) return uni.navigateTo({ url: '/pages/room/index?id=' + m.value.id })
  message.value = ''
  joinOpen.value = true
}
function submitJoin() {
  const done = () => {
    setJoin(m.value.id, { status: 'pending', message: message.value.trim(), at: Date.now() })
    joinStatus.value = 'pending'
    joinOpen.value = false
    toast('已提交报名')
  }
  // 审核结果通过订阅消息通知；没配模板时直接提交
  if (SUBSCRIBE_TMPL_ID && typeof uni.requestSubscribeMessage === 'function') {
    uni.requestSubscribeMessage({ tmplIds: [SUBSCRIBE_TMPL_ID], complete: done })
  } else {
    done()
  }
}
function withdraw() {
  setJoin(m.value.id, null)
  joinStatus.value = ''
  toast('已撤回报名')
}
function openMap() {
  const l = m.value.location
  if (!l) return
  // #ifdef MP
  // openLocation 不需要位置授权，也不在 requiredPrivateInfos 的声明范围内
  uni.openLocation({ latitude: l.latitude, longitude: l.longitude, name: l.name, address: l.address, scale: 16, fail: () => toast('没能打开地图') })
  // #endif
  // #ifndef MP
  uni.setClipboardData({ data: `${l.name} ${l.address}`, success: () => toast('地址已复制') })
  // #endif
}
function leave() {
  if (canBack.value) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/home/index' })
}
</script>

<style>
.page { min-height: 100vh; background: #181A20; padding-bottom: calc(260rpx + env(safe-area-inset-bottom)); }
.press { opacity: .82; transform: scale(.97); }
.press-soft { opacity: .85; }
.ph { color: #6B7280; }
.font-sys { font-family: "PingFang SC", "Microsoft YaHei", sans-serif !important; font-weight: 600; letter-spacing: 0; }

/* 封面 */
.hero { position: relative; height: 464rpx; overflow: hidden; background: #1F222A; }
.hero-fill { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.hero-art { background-size: cover; background-position: 62% center; }
.tag {
  position: absolute; left: 32rpx; bottom: 84rpx; display: flex; align-items: center; padding: 12rpx 24rpx;
  border-radius: 999rpx; background: rgba(10, 10, 12, .55);
}
.tag-n { font-size: 24rpx; font-weight: 500; color: #FFFFFF; }
.tag-l { margin-left: 16rpx; font-size: 24rpx; color: #E5E7EB; }

/* 顶部 */
.topbar {
  position: fixed; z-index: 20; left: 0; top: 0; right: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  background: #181A20; border-bottom: 1px solid #24272F; opacity: 0; transition: opacity .2s ease; pointer-events: none;
}
.topbar-on { opacity: 1; }
.topbar-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-btn {
  position: fixed; z-index: 21; left: 32rpx; width: 72rpx; height: 72rpx; box-sizing: border-box; border-radius: 50%;
  background: rgba(14, 15, 19, .6); border: 1rpx solid rgba(255, 255, 255, .14); display: flex; align-items: center; justify-content: center;
}

/* 内容面板 */
.sheet { position: relative; z-index: 1; margin-top: -56rpx; padding: 36rpx 32rpx 0; background: #181A20; border-radius: 56rpx 56rpx 0 0; }
.inviter { display: flex; align-items: center; }
.av { display: flex; align-items: center; justify-content: center; flex: none; box-sizing: border-box; border-radius: 50%; font-weight: 500; }
.av-28 { width: 56rpx; height: 56rpx; font-size: 24rpx; }
.av-44 { width: 88rpx; height: 88rpx; font-size: 32rpx; }
.av-30 { width: 60rpx; height: 60rpx; font-size: 24rpx; border: 4rpx solid #181A20; }
.av-on { margin-left: -16rpx; }
.av-owner { box-shadow: 0 0 0 4rpx #181A20, 0 0 0 8rpx #F4B740; }
.av-more { background: #35383F; color: #E5E7EB; font-size: 22rpx; }
.inviter-t { margin-left: 16rpx; font-size: 26rpx; color: #9CA3AF; }
.inviter-n { font-weight: 500; color: #E5E7EB; }
.srv { margin-left: auto; height: 48rpx; padding: 0 18rpx; border-radius: 999rpx; background: #3A1C1F; display: flex; align-items: center; }
.srv-t { margin-left: 8rpx; font-size: 22rpx; color: #F2A7A7; }
.title { display: block; margin-top: 24rpx; font-family: "ZZDisplay", "BoardHei", "PingFang SC", sans-serif; font-size: 54rpx; line-height: 1.2; letter-spacing: 2rpx; color: #FFFFFF; }
.chips { margin-top: 20rpx; display: flex; flex-wrap: wrap; }
.chip { height: 52rpx; margin: 0 12rpx 12rpx 0; padding: 0 20rpx; border-radius: 999rpx; background: #262A34; display: flex; align-items: center; font-size: 24rpx; color: #E5E7EB; }
.chip-t { margin-left: 8rpx; font-size: 24rpx; color: #E5E7EB; }

/* 关键信息板 */
.board { margin-top: 20rpx; padding: 28rpx; border-radius: 28rpx; background: #050505; }
.bd-top { display: flex; align-items: flex-end; justify-content: space-between; }
.bk { display: block; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 24rpx; color: #8F8F8A; }
.bd-flaps { display: flex; align-items: center; margin-top: 16rpx; padding-bottom: 8rpx; }
.gap { width: 8rpx; }
.colon { display: flex; flex-direction: column; justify-content: space-between; height: 28rpx; margin: 0 10rpx; }
.cdot { width: 10rpx; height: 10rpx; background: #F2F2EE; }
.bd-when { display: flex; flex-direction: column; align-items: flex-end; }
.bd-state { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 32rpx; letter-spacing: 2rpx; }
.bd-date { margin-top: 16rpx; font-size: 28rpx; font-weight: 500; color: #F2F2EE; }
.bd-cd { margin-top: 8rpx; font-size: 24rpx; color: #8F8F8A; }
.bd-rule { height: 4rpx; margin: 28rpx -28rpx; background: #262626; }
.bd-bottom { display: flex; }
.bd-cell { flex: 1; padding-right: 28rpx; }
.bd-cell-r { padding: 0 0 0 28rpx; }
.bd-vr { width: 4rpx; margin: -28rpx 0; background: #262626; }
.bd-v-row { display: flex; align-items: baseline; margin-top: 16rpx; }
.bd-v { display: block; margin-top: 16rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 56rpx; line-height: 1; color: #F2F2EE; }
.bd-v-row .bd-v { margin-top: 0; }
.bd-v-sub { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 38rpx; color: #8F8F8A; }
.bd-bar { margin-top: 16rpx; height: 8rpx; border-radius: 4rpx; background: #1A1A1A; overflow: hidden; }
.bd-bar-fill { height: 8rpx; background: #F2F2EE; }
.bd-s { display: block; margin-top: 12rpx; font-size: 24rpx; color: #8F8F8A; }

/* 地点 */
.loc { margin-top: 16rpx; border-radius: 28rpx; background: #1F222A; padding: 22rpx 20rpx 22rpx 22rpx; display: flex; align-items: center; }
.loc-ic { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.loc-main { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; display: flex; flex-direction: column; }
.loc-name { font-size: 28rpx; font-weight: 500; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.loc-ph { font-weight: 400; color: #6B7280; }
.loc-addr { margin-top: 6rpx; font-size: 24rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.loc-nav { flex: none; height: 60rpx; padding: 0 20rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; }
.loc-nav-t { margin-left: 6rpx; font-size: 24rpx; font-weight: 500; color: #FFFFFF; }

/* 区块 */
.sec { margin-top: 48rpx; display: flex; align-items: baseline; justify-content: space-between; }
.st { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }
.sm { font-size: 24rpx; color: #9CA3AF; }
.intro { display: block; margin-top: 20rpx; font-size: 28rpx; line-height: 1.75; color: #D1D5DB; }

/* 盲注时刻表 */
.tt { margin-top: 20rpx; padding: 4rpx 24rpx; border-radius: 24rpx; background: #050505; }
.tr { display: grid; grid-template-columns: 96rpx 1fr 120rpx 104rpx; align-items: center; height: 64rpx; border-bottom: 4rpx solid #262626; }
.tr-last { border-bottom: 0; }
.thd { height: 56rpx; }
.thd .tc { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 24rpx; color: #8F8F8A; }
.tc { text-align: center; white-space: nowrap; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 700; font-size: 34rpx; color: #F2F2EE; }
.tc-dur { display: flex; align-items: baseline; justify-content: center; }
.tc-u { margin-left: 2rpx; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 22rpx; }
.tx { grid-column: 1 / 4; display: flex; align-items: center; padding-left: 24rpx; }
.tx-c { grid-column: 1 / 5; }
.tx-t { margin-left: 12rpx; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 26rpx; }
.tx-b .tx-t { color: #FFC53A; }
.tx-c .tx-t { color: #FF5646; }
.tt-more { margin: 16rpx auto 0; width: 300rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.tt-more-t { margin-right: 8rpx; font-size: 26rpx; color: #9CA3AF; }

/* 主持人、已报名 */
.hosts { margin-top: 24rpx; display: flex; }
.host { width: 128rpx; margin-right: 28rpx; display: flex; flex-direction: column; align-items: center; }
.host-n { margin-top: 20rpx; max-width: 128rpx; font-size: 24rpx; color: #E5E7EB; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.host-r { margin-top: 4rpx; font-size: 22rpx; color: #6B7280; }
.host-r-owner { color: #F4B740; }
.people { margin-top: 24rpx; display: flex; align-items: center; }
.stack { display: flex; }
.people-t { margin-left: 24rpx; font-size: 26rpx; color: #9CA3AF; }

/* 底部 */
.bar {
  position: fixed; z-index: 30; left: 0; right: 0; bottom: 0;
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); background: #181A20; border-top: 1px solid #24272F;
}
.bar-note { display: flex; justify-content: center; font-size: 24rpx; line-height: 36rpx; color: #9CA3AF; }
.lnk { color: #FF4D4D; font-weight: 500; }
.bar-row { display: flex; margin-top: 16rpx; }
.bar-share {
  width: 96rpx; height: 96rpx; flex: none; margin: 0 20rpx 0 0; padding: 0; line-height: normal; border-radius: 50%;
  background: #35383F; display: flex; align-items: center; justify-content: center;
}
.bar-share::after { border: none; }
.bar-main {
  flex: 1; height: 96rpx; border-radius: 999rpx; background: #DC0000; box-shadow: 0 12rpx 36rpx rgba(220, 0, 0, .35);
  display: flex; align-items: center; justify-content: center;
}
.bar-wait { background: #35383F; box-shadow: none; }
.bar-main-t { margin-left: 12rpx; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
.bar-main-t-wait { color: #9CA3AF; }

/* 报名弹层 */
.ov { position: fixed; z-index: 100; left: 0; top: 0; right: 0; bottom: 0; }
.mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); }
.sheet-j {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 16rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #262A34; border-radius: 48rpx 48rpx 0 0; animation: sj-up .22s ease-out;
}
@keyframes sj-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.grab { width: 72rpx; height: 8rpx; margin: 0 auto 24rpx; border-radius: 4rpx; background: #4A4D57; }
.sj-title { display: block; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
.sj-sum { margin-top: 24rpx; padding: 20rpx; border-radius: 28rpx; background: #1F222A; display: flex; align-items: center; }
.sj-cover { width: 128rpx; height: 88rpx; flex: none; border-radius: 16rpx; background-size: cover; background-position: 70% center; }
.sj-sum-t { margin-left: 20rpx; min-width: 0; display: flex; flex-direction: column; }
.sj-name { font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.sj-meta { margin-top: 8rpx; font-size: 24rpx; color: #9CA3AF; }
.sj-lb { margin-top: 32rpx; display: flex; justify-content: space-between; font-size: 26rpx; font-weight: 500; color: #9CA3AF; }
.sj-count { font-weight: 400; color: #6B7280; }
.sj-msg { margin-top: 16rpx; width: 100%; height: 152rpx; box-sizing: border-box; padding: 20rpx 24rpx; border-radius: 24rpx; background: #1F222A; font-size: 28rpx; line-height: 1.6; color: #FFFFFF; }
.sj-note { display: block; margin-top: 20rpx; font-size: 24rpx; color: #9CA3AF; }
.sj-ok { margin-top: 28rpx; height: 96rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.sj-ok-t { margin-left: 12rpx; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
</style>
