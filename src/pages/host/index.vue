<template>
  <page-meta :page-style="rulesShown ? 'overflow:hidden' : ''"></page-meta>
  <view class="page" :class="'s-' + state">
    <!-- 滚动标记：越过 nav-line 导航栏加底色；看到 end-line 时底部按钮换下导航栏 -->
    <view class="nav-line"></view>

    <view class="nav" :class="{ 'nav-solid': navSolid }" :style="navStyle">
      <view class="nav-row" :style="navRowStyle">
        <view v-if="canBack" class="nav-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="nav-title">平台认证</text>
      </view>
    </view>

    <!-- 首屏：荷官把三张牌背面朝上发到公共牌区；牌落定后，你座位上的光环和徽章亮一下 -->
    <view class="hero" :style="heroStyle">
      <view class="stage">
        <view class="stage-art" :style="stageArt"></view>
        <view class="hc hc-0" :style="cardArt"></view>
        <view class="hc hc-1" :style="cardArt"></view>
        <view class="hc hc-2" :style="cardArt"></view>
        <view class="beam"></view>

        <view class="seat" @longpress="cycleState">
          <view class="seat-glow"></view>
          <view class="seat-orbit"></view>
          <view class="seat-ring"></view>
          <view class="seat-face"><text>{{ me.char }}</text></view>
          <view v-for="k in 6" :key="k" :class="'spark spark-' + k"></view>
        </view>
        <view class="hb">
          <z-icon :name="stInfo.icon" :size="14" :stroke="2.5" :color="stInfo.badgeIconColor" />
          <text class="hb-t">{{ stInfo.badge }}</text>
          <view class="hb-shine"></view>
        </view>
      </view>

      <view class="rules-btn" :style="rulesStyle" hover-class="press" @tap="openRules">
        <z-icon name="help-circle" :size="14" color="#E5E7EB" />
        <text class="rules-t">认证规则</text>
      </view>

      <view class="hero-text">
        <text class="h-title">{{ stInfo.title }}</text>
        <text class="h-sub">{{ stInfo.sub }}</text>
        <view class="h-go" hover-class="press" @tap="openCertify">
          <text class="h-go-t">{{ stInfo.cta }}</text>
          <z-icon name="chevron-right" :size="14" color="#FFFFFF" />
        </view>
      </view>
    </view>

    <!-- 核心权益：点图标看说明，以及认证前后的变化 -->
    <view class="sec">
      <text class="sec-t">核心权益</text>
      <view class="bf">
        <view v-for="(b, i) in benefits" :key="b.key" class="bf-i" :class="{ 'bf-on': bIdx === i }" @tap="bIdx = i">
          <view class="bf-ic"><z-icon :name="b.icon" :size="22" :color="bIdx === i ? '#FFFFFF' : '#FF4D4D'" /></view>
          <text class="bf-n">{{ b.name }}</text>
        </view>
      </view>
      <view :key="bIdx" class="bf-panel">
        <text class="bf-title">{{ cur.title }}</text>
        <text class="bf-desc">{{ cur.desc }}</text>
        <view class="ba">
          <view class="ba-side ba-before">
            <text class="ba-k">认证前</text>
            <view v-if="cur.visual === 'name'" class="ba-name"><text class="ba-nm">{{ me.nickname }}</text><text class="ba-tag">普通</text></view>
            <text v-else class="ba-v">{{ cur.before }}</text>
          </view>
          <view class="ba-arrow"><z-icon name="arrow-right" :size="16" color="#FF4D4D" /></view>
          <view class="ba-side ba-after">
            <text class="ba-k ba-k-on">认证后</text>
            <view v-if="cur.visual === 'name'" class="ba-name">
              <text class="ba-nm ba-nm-on">{{ me.nickname }}</text>
              <view class="ba-vb"><z-icon name="rosette-discount-check" :size="11" color="#FFFFFF" /></view>
            </view>
            <text v-else class="ba-v ba-v-on">{{ cur.after }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据价值：进入视口时数字递增 -->
    <view class="sec">
      <text class="sec-t">认证价值，清晰可见</text>
      <view class="mt">
        <view v-for="(x, i) in metrics" :key="i" class="mt-i" :class="{ 'mt-sep': i > 0 }">
          <view class="mt-v"><text class="mt-num">{{ shownMetric[i] }}</text><text class="mt-u">{{ x.unit }}</text></view>
          <text class="mt-l">{{ x.label }}</text>
        </view>
      </view>
      <text class="mt-note">{{ metricsNote }}</text>
    </view>

    <!-- 认证流程：横向四步，点哪一步看哪一步的说明 -->
    <view class="sec">
      <text class="sec-t">认证流程</text>
      <view class="ps">
        <view class="ps-track"><view class="ps-fill" :style="'width:' + progressPct + '%'"></view></view>
        <view v-for="(s, i) in steps" :key="i" class="ps-i" :class="['ps-' + stepState(i), { 'ps-sel': pIdx === i }]" @tap="pIdx = i">
          <view class="ps-dot">
            <z-icon v-if="stepState(i) === 'done'" name="check" :size="12" :stroke="3" color="#FFFFFF" />
            <z-icon v-else-if="stepState(i) === 'fail'" name="x" :size="12" :stroke="3" color="#FFFFFF" />
            <text v-else class="ps-n">{{ i + 1 }}</text>
          </view>
          <text class="ps-t">{{ s.title }}</text>
        </view>
      </view>
      <view :key="pIdx" class="ps-desc">
        <view class="ps-dh"><text class="ps-dt">{{ steps[pIdx].title }}</text><text v-if="stepTag(pIdx)" class="ps-tag" :class="{ 'ps-tag-fail': stepState(pIdx) === 'fail' }">{{ stepTag(pIdx) }}</text></view>
        <text class="ps-dd">{{ steps[pIdx].desc }}</text>
      </view>
    </view>

    <!-- 常见问题：整组折叠成一行，展开后每个问题再单独点开 -->
    <view class="sec">
      <view class="fqx" :class="{ 'fqx-on': faqListOpen }">
        <view class="fqx-h" hover-class="press-soft" @tap="faqListOpen = !faqListOpen">
          <text class="fqx-t">常见问题</text>
          <text class="fqx-n">{{ faqs.length }} 个问题</text>
          <view class="fqx-ic"><z-icon name="chevron-down" :size="16" color="#9CA3AF" /></view>
        </view>
        <view class="fold"><view class="fold-in">
          <view v-for="(f, i) in faqs" :key="i" class="fq" :class="{ 'fq-on': faqOpen[i] }">
            <view class="fq-h" hover-class="press-soft" @tap="toggleFaq(i)">
              <text class="fq-q">{{ f.q }}</text>
              <view class="fq-ic"><z-icon name="plus" :size="14" color="#9CA3AF" /></view>
            </view>
            <view class="fold"><view class="fold-in"><text class="fq-a">{{ f.a }}</text></view></view>
          </view>
        </view></view>
      </view>
    </view>
    <view class="end-line"></view>

    <!-- 滚到底：导航栏下沉淡出，底部按钮浮现；往回滑恢复 -->
    <view class="cta" :class="{ 'cta-on': atBottom }">
      <view class="cta-btn" :class="'cta-' + state" hover-class="press" @tap="openCertify">
        <z-icon :name="stInfo.ctaIcon" :size="18" color="#FFFFFF" />
        <text class="cta-t">{{ stInfo.cta }}</text>
      </view>
    </view>
    <z-tabbar :items="navItems" :active="navActive" :hidden="atBottom" @change="onNav" />

    <!-- 认证规则：底部弹层 -->
    <view v-if="rulesShown" class="rs" :class="{ 'rs-on': rulesOpen }">
      <view class="rs-mask" @tap="closeRules"></view>
      <view class="rs-sheet">
        <view class="rs-head">
          <text class="rs-title">认证规则</text>
          <view class="rs-x" hover-class="press" @tap="closeRules"><z-icon name="x" :size="18" color="#9CA3AF" /></view>
        </view>
        <scroll-view scroll-y class="rs-body">
          <view v-for="(sec, i) in rules" :key="i" class="rs-sec">
            <text class="rs-h">{{ sec.title }}</text>
            <text v-if="sec.text" class="rs-p">{{ sec.text }}</text>
            <view v-for="(it, k) in sec.items || []" :key="k" class="rs-li"><view class="rs-dot"></view><text class="rs-lt">{{ it }}</text></view>
          </view>
          <text class="rs-foot">以上为示例规则，以平台正式发布的版本为准。</text>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch, getCurrentInstance } from 'vue'
import { onLoad, onReady, onUnload, onPageScroll, onShareAppMessage } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTabbar from '@/components/z-tabbar/z-tabbar.vue'
import { getNavMetrics } from '@/common/nav.js'
import { svgUri } from '@/common/svg.js'
import { dealerStage, cardBack } from '@/common/host-art.js'
import { CERTIFY_WEB, WEBVIEW_ENABLED } from '@/common/config.js'
import { me } from '@/mock/data.js'
import { certStatus, STATE_INFO, benefits, metrics, metricsNote, steps, faqs, rules } from '@/mock/host.js'

const instance = getCurrentInstance()
const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px`
const navRowStyle = `height:${nav.navH}px`
const heroStyle = `padding-top:${nav.statusBar + nav.navH}px`
const rulesStyle = `top:${nav.statusBar + nav.navH + 10}px`
const stageArt = `background-image:url("${svgUri(dealerStage())}")`
const cardArt = `background-image:url("${svgUri(cardBack())}")`
const toast = (title) => uni.showToast({ title, icon: 'none' })

/* ---------- 认证状态 ---------- */
const STATES = ['none', 'pending', 'verified', 'rejected']
const state = ref(certStatus.state)
const stInfo = computed(() => STATE_INFO[state.value])
// 开发预览：长按头像依次切换四种状态（也可以用 ?state=pending 打开）。接后端后删除
function cycleState() {
  state.value = STATES[(STATES.indexOf(state.value) + 1) % STATES.length]
  toast('预览：' + stInfo.value.label)
}

// 认证流程：done 完成 / cur 当前 / fail 未通过 / todo 未开始
const STEP_MAP = {
  none: ['cur', 'todo', 'todo', 'todo'],
  pending: ['done', 'done', 'cur', 'todo'],
  verified: ['done', 'done', 'done', 'done'],
  rejected: ['done', 'done', 'fail', 'todo']
}
const stepState = (i) => STEP_MAP[state.value][i]
const stepTag = (i) => {
  const s = stepState(i)
  if (s === 'cur') return state.value === 'pending' ? '审核中' : '从这里开始'
  if (s === 'fail') return '未通过'
  if (s === 'done') return state.value === 'verified' && i === steps.length - 1 ? '已生效' : '已完成'
  return ''
}
// 进度条：填到当前（或未通过）那一步
const progressPct = computed(() => (stInfo.value.step / (steps.length - 1)) * 100)
const pIdx = ref(stInfo.value.step)
watch(state, () => { pIdx.value = stInfo.value.step })

// 跳到官网认证入口；个人主体的小程序不能用 web-view，改为复制链接
function openCertify() {
  const url = CERTIFY_WEB[stInfo.value.link]
  if (!WEBVIEW_ENABLED) {
    return uni.setClipboardData({ data: url, success: () => toast('链接已复制，请在浏览器打开') })
  }
  uni.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}&title=${encodeURIComponent('平台认证')}` })
}

/* ---------- 权益、指标、常见问题 ---------- */
const bIdx = ref(0)
const cur = computed(() => benefits[bIdx.value])
const shownMetric = ref(metrics.map((x) => (0).toFixed(x.decimals)))
let counted = false
function countUp() {
  if (counted) return
  counted = true
  const start = Date.now()
  const dur = 900
  const tick = () => {
    const t = Math.min(1, (Date.now() - start) / dur)
    const e = 1 - Math.pow(1 - t, 3)
    shownMetric.value = metrics.map((x) => (x.value * e).toFixed(x.decimals))
    if (t < 1) setTimeout(tick, 32)
  }
  tick()
}
const faqListOpen = ref(false)
const faqOpen = reactive({})
const toggleFaq = (i) => { faqOpen[i] = !faqOpen[i] }

/* ---------- 认证规则弹层 ---------- */
const rulesShown = ref(false)
const rulesOpen = ref(false)
function openRules() {
  rulesShown.value = true
  setTimeout(() => { rulesOpen.value = true }, 30)
}
function closeRules() {
  rulesOpen.value = false
  setTimeout(() => { rulesShown.value = false }, 320)
}

/* ---------- 滚动：导航栏底色、到底切换按钮、指标入场 ---------- */
const navSolid = ref(false)
const atBottom = ref(false)
const observers = []
function observe() {
  // 小程序：用相交监听，滚动时不往逻辑层发事件
  // #ifndef H5
  try {
    const make = (margins) => uni.createIntersectionObserver(instance && instance.proxy).relativeToViewport(margins)
    const ioNav = make({ top: 0 })
    ioNav.observe('.nav-line', (res) => { navSolid.value = res.intersectionRatio === 0 && res.boundingClientRect.top < 0 })
    const ioEnd = make({ bottom: 0 })
    ioEnd.observe('.end-line', (res) => { atBottom.value = res.intersectionRatio > 0 })
    const ioMt = make({ bottom: -60 })
    ioMt.observe('.mt', (res) => { if (res.intersectionRatio > 0) countUp() })
    observers.push(ioNav, ioEnd, ioMt)
  } catch (e) {
    countUp()
  }
  // #endif
}
// H5：uni 的相交监听以页面容器为参照，不可靠，改用滚动事件
// #ifdef H5
onPageScroll(({ scrollTop }) => {
  navSolid.value = scrollTop > 150
  atBottom.value = scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 140
  if (!counted) {
    const el = document.querySelector('.mt')
    if (el && el.getBoundingClientRect().top < window.innerHeight - 60) countUp()
  }
})
// #endif

/* ---------- 页面 ---------- */
const canBack = ref(false)
const goBack = () => uni.navigateBack()
onLoad((q) => {
  if (q && STATES.includes(q.state)) state.value = q.state
  canBack.value = getCurrentPages().length > 1
})
onReady(observe)
onUnload(() => observers.forEach((o) => o.disconnect()))
onShareAppMessage(() => ({ title: '平台认证：点亮认证标识', path: '/pages/host/index' }))

/* ---------- 底部导航 ---------- */
const navItems = [
  { key: 'me', label: '我的', icon: 'user' },
  { key: 'plaza', label: '广场', icon: 'compass' },
  { key: 'rank', label: '排行', icon: 'chart-bar' },
  { key: 'host', label: '成为主办方', icon: 'flag' }
]
const navActive = ref(3)
function onNav(i) {
  if (i === 0) return uni.redirectTo({ url: '/pages/profile/index' })
  if (i === 1) return uni.redirectTo({ url: '/pages/plaza/index' })
  navActive.value = i
  if (i === 2) setTimeout(() => toast('排行页面待接入'), 420)
}
</script>

<style>
.page { position: relative; min-height: 100vh; background: #181A20; padding-bottom: calc(300rpx + env(safe-area-inset-bottom)); }
.press { opacity: .8; transform: scale(.96); }
.press-soft { opacity: .85; }
.nav-line { position: absolute; left: 0; top: 360rpx; width: 1px; height: 1px; }
.end-line { width: 100%; height: 2rpx; }

/* 导航 */
.nav { position: fixed; z-index: 30; left: 0; right: 0; top: 0; background: rgba(24, 26, 32, 0); transition: background .25s ease, box-shadow .25s ease; }
.nav-solid { background: #181A20; box-shadow: 0 1px 0 #24272F; }
.nav-row { position: relative; display: flex; align-items: center; justify-content: center; }
.nav-back { position: absolute; left: 24rpx; width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(38, 42, 52, .85); display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }

/* 首屏 */
.hero { position: relative; background: #121419; }
.stage { position: relative; width: 750rpx; height: 800rpx; overflow: hidden; }
.stage-art { position: absolute; left: 0; top: 0; width: 750rpx; height: 800rpx; background-size: 100% 100%; }

/* 发牌：三张牌依次飞到居中的三个公共牌位，停留后一起淡出，4.4 秒一个循环 */
.hc {
  position: absolute; left: 285rpx; top: 345rpx; width: 64rpx; height: 90rpx; background-size: 100% 100%; opacity: 0;
  animation-duration: 4.4s; animation-iteration-count: infinite; animation-timing-function: cubic-bezier(.2, .8, .2, 1);
}
.hc-0 { animation-name: deal-0; }
.hc-1 { animation-name: deal-1; }
.hc-2 { animation-name: deal-2; }
@keyframes deal-0 {
  0%, 2% { opacity: 0; transform: translate(0, 0) rotate(-14deg) scale(.72); }
  4% { opacity: 1; transform: translate(0, 0) rotate(-14deg) scale(.72); }
  16%, 84% { opacity: 1; transform: translate(-18rpx, 85rpx) rotate(0deg) scale(1); }
  94%, 100% { opacity: 0; transform: translate(-18rpx, 85rpx) rotate(0deg) scale(1); }
}
@keyframes deal-1 {
  0%, 14% { opacity: 0; transform: translate(0, 0) rotate(-14deg) scale(.72); }
  16% { opacity: 1; transform: translate(0, 0) rotate(-14deg) scale(.72); }
  28%, 84% { opacity: 1; transform: translate(58rpx, 85rpx) rotate(0deg) scale(1); }
  94%, 100% { opacity: 0; transform: translate(58rpx, 85rpx) rotate(0deg) scale(1); }
}
@keyframes deal-2 {
  0%, 26% { opacity: 0; transform: translate(0, 0) rotate(-14deg) scale(.72); }
  28% { opacity: 1; transform: translate(0, 0) rotate(-14deg) scale(.72); }
  40%, 84% { opacity: 1; transform: translate(134rpx, 85rpx) rotate(0deg) scale(1); }
  94%, 100% { opacity: 0; transform: translate(134rpx, 85rpx) rotate(0deg) scale(1); }
}
/* 牌落定后，一道光从中间那张牌落到你的座位 */
.beam {
  position: absolute; left: 372rpx; top: 524rpx; width: 6rpx; height: 54rpx; border-radius: 3rpx; opacity: 0;
  background: linear-gradient(180deg, rgba(244, 183, 64, 0), #F4B740); transform-origin: top; transform: scaleY(0);
  animation: beam 4.4s ease-out infinite;
}
@keyframes beam {
  0%, 42% { opacity: 0; transform: scaleY(0); }
  47% { opacity: 1; transform: scaleY(1); }
  56%, 100% { opacity: 0; transform: scaleY(1); }
}

/* 你的座位：头像在牌桌前沿 */
.seat { position: absolute; left: 270rpx; top: 535rpx; width: 210rpx; height: 210rpx; }
.seat-glow { position: absolute; left: 30rpx; top: 30rpx; width: 150rpx; height: 150rpx; border-radius: 50%; animation: glow 4.4s ease-out infinite; }
@keyframes glow {
  0%, 44%, 72%, 100% { box-shadow: 0 0 0 0 rgba(244, 183, 64, 0); }
  52% { box-shadow: 0 0 60rpx 24rpx rgba(244, 183, 64, .35); }
}
.seat-orbit {
  position: absolute; left: 0; top: 0; width: 210rpx; height: 210rpx; box-sizing: border-box; border-radius: 50%;
  border: 3rpx dashed #4B5060; animation: spin 16s linear infinite;
}
.seat-ring {
  position: absolute; left: 15rpx; top: 15rpx; width: 180rpx; height: 180rpx; box-sizing: border-box; border-radius: 50%;
  border: 5rpx solid #35383F; background: #121419;
}
.seat-face {
  position: absolute; left: 29rpx; top: 29rpx; width: 152rpx; height: 152rpx; border-radius: 50%; background: #F3EEE6;
  display: flex; align-items: center; justify-content: center; font-size: 64rpx; font-weight: 600; color: #181A20;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spark { position: absolute; width: 10rpx; height: 10rpx; border-radius: 50%; background: #F4B740; opacity: 0; animation: twinkle 3.2s ease-in-out infinite; }
.spark-1 { left: -18rpx; top: 70rpx; animation-delay: 0s; }
.spark-2 { left: 214rpx; top: 40rpx; width: 8rpx; height: 8rpx; background: #FF4D4D; animation-delay: .6s; }
.spark-3 { left: 6rpx; top: 176rpx; width: 7rpx; height: 7rpx; background: #F3EEE6; animation-delay: 1.3s; }
.spark-4 { left: 222rpx; top: 150rpx; animation-delay: 1.9s; }
.spark-5 { left: 64rpx; top: -22rpx; width: 7rpx; height: 7rpx; background: #FF4D4D; animation-delay: 2.4s; }
.spark-6 { left: 150rpx; top: -14rpx; width: 8rpx; height: 8rpx; background: #F3EEE6; animation-delay: .9s; }
@keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(.4); } 50% { opacity: .9; transform: scale(1); } }

/* 头像下的徽章 */
.hb {
  position: absolute; left: 375rpx; top: 706rpx; height: 52rpx; padding: 0 22rpx 0 18rpx; box-sizing: border-box; border-radius: 999rpx;
  background: #262A34; border: 2rpx solid #35383F; display: flex; align-items: center; overflow: hidden; transform: translateX(-50%);
  animation: badge-teaser 4.4s ease-out infinite;
}
.hb-t { position: relative; margin-left: 8rpx; font-size: 24rpx; font-weight: 600; color: #9CA3AF; white-space: nowrap; }
.hb-shine {
  position: absolute; left: 0; top: 0; width: 60rpx; height: 100%; opacity: 0;
  background: linear-gradient(100deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, .45), rgba(255, 255, 255, 0));
  animation: shine 4.4s ease-out infinite;
}
@keyframes shine {
  0%, 46% { opacity: 0; transform: translateX(-80rpx); }
  48% { opacity: 1; }
  62%, 100% { opacity: 0; transform: translateX(260rpx); }
}
/* 未认证：牌落定时徽章短暂亮成金色，提示「可以点亮」 */
@keyframes badge-teaser {
  0%, 44%, 70%, 100% { border-color: #35383F; box-shadow: 0 0 0 0 rgba(244, 183, 64, 0); }
  52% { border-color: #F4B740; box-shadow: 0 0 24rpx rgba(244, 183, 64, .45); }
}

/* 各状态下的座位与徽章 */
.s-pending .seat-orbit { border-color: rgba(255, 197, 58, .5); }
.s-pending .seat-ring { border-color: rgba(255, 197, 58, .25); border-top-color: #FFC53A; animation: spin 1.4s linear infinite; }
.s-pending .hb { background: #FFC53A; border-color: #FFC53A; animation: none; }
.s-pending .hb-t { color: #181A20; }
.s-verified .seat-orbit { border-color: rgba(244, 183, 64, .6); }
.s-verified .seat-ring { border-color: #F4B740; box-shadow: 0 0 0 6rpx rgba(220, 0, 0, .35), 0 0 48rpx rgba(244, 183, 64, .35); }
.s-verified .hb { background: #DC0000; border-color: #F4B740; animation: none; box-shadow: 0 8rpx 24rpx rgba(220, 0, 0, .4); }
.s-verified .hb-t { color: #FFFFFF; }
.s-rejected .seat-orbit { border-color: rgba(255, 86, 70, .45); animation: none; }
.s-rejected .seat-ring { border-color: #FF5646; }
.s-rejected .hb { background: #FF5646; border-color: #FF5646; animation: none; }
.s-rejected .hb-t { color: #FFFFFF; }
.s-rejected .hb-shine, .s-pending .hb-shine { display: none; }
.s-rejected .seat-glow, .s-pending .seat-glow { animation: none; }

.rules-btn {
  position: absolute; z-index: 5; right: 32rpx; height: 56rpx; padding: 0 20rpx; border-radius: 999rpx;
  background: rgba(38, 42, 52, .85); border: 1rpx solid rgba(255, 255, 255, .12); display: flex; align-items: center;
}
.rules-t { margin-left: 8rpx; font-size: 24rpx; color: #E5E7EB; }
.hero-text { padding: 20rpx 56rpx 72rpx; display: flex; flex-direction: column; align-items: center; background: linear-gradient(180deg, #121419, #181A20); }
.h-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 64rpx; line-height: 1.2; letter-spacing: 4rpx; color: #FFFFFF; }
.h-sub { margin-top: 18rpx; font-size: 26rpx; line-height: 1.7; color: #9CA3AF; text-align: center; }
.h-go {
  margin-top: 36rpx; height: 72rpx; padding: 0 28rpx 0 36rpx; border-radius: 999rpx; background: #DC0000;
  display: flex; align-items: center; box-shadow: 0 12rpx 32rpx rgba(220, 0, 0, .3);
}
.s-pending .h-go, .s-verified .h-go { background: #2A2D36; box-shadow: none; }
.h-go-t { margin-right: 4rpx; font-size: 26rpx; font-weight: 600; color: #FFFFFF; }

/* 区块：留白放大，少用框 */
.sec { margin-top: 88rpx; padding: 0 40rpx; }
.sec-t { display: block; margin-bottom: 32rpx; font-size: 32rpx; font-weight: 600; color: #FFFFFF; }

/* 核心权益 */
.bf { display: flex; justify-content: space-between; }
.bf-i { width: 116rpx; display: flex; flex-direction: column; align-items: center; }
.bf-ic {
  width: 96rpx; height: 96rpx; border-radius: 30rpx; box-sizing: border-box; background: #22171B; border: 1rpx solid #33202A;
  display: flex; align-items: center; justify-content: center;
  transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), background .25s ease, box-shadow .25s ease;
}
.bf-on .bf-ic { background: #DC0000; border-color: #DC0000; transform: translateY(-6rpx) scale(1.06); box-shadow: 0 12rpx 28rpx rgba(220, 0, 0, .35); }
.bf-n { margin-top: 16rpx; font-size: 22rpx; color: #6B7280; transition: color .25s ease; }
.bf-on .bf-n { color: #FFFFFF; font-weight: 500; }
.bf-panel { margin-top: 36rpx; padding: 32rpx; border-radius: 28rpx; background: #1F222A; animation: rise .35s ease; }
@keyframes rise { from { opacity: 0; transform: translateY(14rpx); } to { opacity: 1; transform: translateY(0); } }
.bf-title { display: block; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.bf-desc { display: block; margin-top: 10rpx; font-size: 26rpx; line-height: 1.7; color: #9CA3AF; }
.ba { margin-top: 28rpx; display: flex; align-items: stretch; }
.ba-side { flex: 1; min-width: 0; padding: 18rpx 20rpx; border-radius: 20rpx; display: flex; flex-direction: column; }
.ba-before { background: #262A34; }
.ba-after { background: rgba(220, 0, 0, .12); border: 1rpx solid rgba(220, 0, 0, .35); animation: pop .45s cubic-bezier(.34, 1.56, .64, 1) .12s both; }
@keyframes pop { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
.ba-arrow { width: 56rpx; flex: none; display: flex; align-items: center; justify-content: center; animation: nudge .45s ease .05s both; }
@keyframes nudge { from { opacity: 0; transform: translateX(-10rpx); } to { opacity: 1; transform: translateX(0); } }
.ba-k { font-size: 20rpx; color: #6B7280; }
.ba-k-on { color: #FF4D4D; }
.ba-v { margin-top: 6rpx; font-size: 26rpx; color: #9CA3AF; }
.ba-v-on { color: #FFFFFF; font-weight: 600; }
.ba-name { margin-top: 6rpx; display: flex; align-items: center; }
.ba-nm { font-size: 26rpx; color: #9CA3AF; }
.ba-nm-on { color: #FFFFFF; font-weight: 600; }
.ba-tag { margin-left: 8rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: #35383F; font-size: 18rpx; color: #9CA3AF; }
.ba-vb { margin-left: 8rpx; width: 30rpx; height: 30rpx; border-radius: 50%; background: #DC0000; display: flex; align-items: center; justify-content: center; }

/* 数据价值：不加框，只留数字 */
.mt { display: flex; }
.mt-i { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
.mt-sep { border-left: 1rpx solid #2A2D36; }
.mt-v { display: flex; align-items: baseline; }
.mt-num { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 200; font-size: 96rpx; line-height: 1; color: #F2F2EE; }
.mt-u { margin-left: 4rpx; font-size: 26rpx; font-weight: 500; color: #FF4D4D; }
.mt-l { margin-top: 14rpx; padding: 0 16rpx; font-size: 22rpx; line-height: 1.5; color: #9CA3AF; text-align: center; }
.mt-note { display: block; margin-top: 24rpx; font-size: 20rpx; color: #4B5060; text-align: center; }

/* 认证流程：横向四步 */
.ps { position: relative; display: flex; justify-content: space-between; }
.ps-track { position: absolute; left: 60rpx; right: 60rpx; top: 22rpx; height: 4rpx; border-radius: 2rpx; background: #2A2D36; }
.ps-fill { height: 4rpx; border-radius: 2rpx; background: #DC0000; transition: width .5s ease; }
.s-rejected .ps-fill { background: linear-gradient(90deg, #DC0000, #FF5646); }
.ps-i { position: relative; width: 120rpx; display: flex; flex-direction: column; align-items: center; }
.ps-dot { width: 48rpx; height: 48rpx; border-radius: 50%; background: #2A2D36; border: 4rpx solid #181A20; display: flex; align-items: center; justify-content: center; transition: transform .3s cubic-bezier(.34, 1.56, .64, 1); }
.ps-n { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 24rpx; color: #9CA3AF; }
.ps-done .ps-dot { background: #DC0000; }
.ps-cur .ps-dot { background: #181A20; box-shadow: 0 0 0 4rpx #DC0000; animation: pulse 1.8s ease-in-out infinite; }
.ps-cur .ps-n { color: #FFFFFF; }
.ps-fail .ps-dot { background: #FF5646; }
.ps-sel .ps-dot { transform: scale(1.12); }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4rpx #DC0000, 0 0 0 0 rgba(220, 0, 0, .45); }
  50% { box-shadow: 0 0 0 4rpx #DC0000, 0 0 0 16rpx rgba(220, 0, 0, 0); }
}
.ps-t { margin-top: 14rpx; font-size: 24rpx; color: #6B7280; }
.ps-done .ps-t, .ps-cur .ps-t, .ps-fail .ps-t { color: #E5E7EB; }
.ps-sel .ps-t { color: #FFFFFF; font-weight: 600; }
.ps-desc { margin-top: 32rpx; padding: 28rpx 32rpx; border-radius: 28rpx; background: #1F222A; animation: rise .35s ease; }
.ps-dh { display: flex; align-items: center; }
.ps-dt { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.ps-tag { margin-left: 12rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: rgba(220, 0, 0, .14); font-size: 20rpx; color: #FF4D4D; }
.ps-tag-fail { background: rgba(255, 86, 70, .16); color: #FF5646; }
.ps-dd { display: block; margin-top: 10rpx; font-size: 26rpx; line-height: 1.7; color: #9CA3AF; }

/* 折叠：grid 行高 0fr → 1fr，不用量内容高度；常见问题外层、每个问题都用这一套 */
.fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s ease; }
.fold-in { min-height: 0; overflow: hidden; }
.fqx-on > .fold, .fq-on > .fold { grid-template-rows: 1fr; }
.fqx { border-radius: 28rpx; background: #1F222A; overflow: hidden; }
.fqx-h { display: flex; align-items: center; padding: 32rpx; }
.fqx-t { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.fqx-n { flex: 1; margin-left: 16rpx; font-size: 24rpx; color: #6B7280; }
.fqx-ic { transition: transform .3s ease; }
.fqx-on .fqx-ic { transform: rotate(180deg); }
.fq { margin: 0 32rpx; border-top: 1rpx solid #2A2D36; }
.fq-h { display: flex; align-items: center; padding: 28rpx 0; }
.fq-q { flex: 1; min-width: 0; font-size: 28rpx; color: #E5E7EB; }
.fq-ic { flex: none; margin-left: 16rpx; transition: transform .3s ease; }
.fq-on .fq-ic { transform: rotate(45deg); }
.fq-a { display: block; padding-bottom: 28rpx; font-size: 26rpx; line-height: 1.75; color: #9CA3AF; }

/* 底部按钮 */
.cta {
  position: fixed; z-index: 45; left: 0; right: 0; bottom: 0; padding: 20rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #181A20; border-top: 1px solid #24272F; opacity: 0; transform: translateY(100%); pointer-events: none;
  transition: transform .45s cubic-bezier(.2, .8, .2, 1), opacity .35s ease;
}
.cta-on { opacity: 1; transform: translateY(0); pointer-events: auto; transition-delay: .12s; }
.cta-btn { height: 96rpx; border-radius: 999rpx; background: #DC0000; box-shadow: 0 12rpx 32rpx rgba(220, 0, 0, .32); display: flex; align-items: center; justify-content: center; }
.cta-pending, .cta-verified { background: #2A2D36; box-shadow: none; }
.cta-t { margin-left: 12rpx; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* 认证规则弹层 */
.rs { position: fixed; z-index: 100; left: 0; top: 0; right: 0; bottom: 0; }
.rs-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); opacity: 0; transition: opacity .3s ease; }
.rs-on .rs-mask { opacity: 1; }
.rs-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; padding-bottom: env(safe-area-inset-bottom); border-radius: 40rpx 40rpx 0 0;
  background: #1F222A; transform: translateY(100%); transition: transform .38s cubic-bezier(.2, .8, .2, 1);
}
.rs-on .rs-sheet { transform: translateY(0); }
.rs-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 32rpx 16rpx; }
.rs-title { font-size: 34rpx; font-weight: 600; color: #FFFFFF; }
.rs-x { width: 56rpx; height: 56rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.rs-body { height: 60vh; }
.rs-sec { padding: 16rpx 32rpx 8rpx; }
.rs-h { display: block; margin-bottom: 8rpx; font-size: 28rpx; font-weight: 600; color: #F2F2EE; }
.rs-p { display: block; font-size: 26rpx; line-height: 1.75; color: #9CA3AF; }
.rs-li { display: flex; margin-top: 10rpx; }
.rs-dot { width: 10rpx; height: 10rpx; flex: none; margin: 18rpx 16rpx 0 4rpx; border-radius: 50%; background: #DC0000; }
.rs-lt { flex: 1; min-width: 0; font-size: 26rpx; line-height: 1.75; color: #9CA3AF; }
.rs-foot { display: block; padding: 24rpx 32rpx 48rpx; font-size: 22rpx; color: #6B7280; }

@media (prefers-reduced-motion: reduce) {
  .hc, .beam, .seat-glow, .seat-orbit, .seat-ring, .spark, .hb, .hb-shine, .ps-cur .ps-dot, .bf-panel, .ps-desc, .ba-after, .ba-arrow { animation: none; }
  .hc { opacity: 1; }
  .hc-0 { transform: translate(-18rpx, 85rpx); }
  .hc-1 { transform: translate(58rpx, 85rpx); }
  .hc-2 { transform: translate(134rpx, 85rpx); }
  .cta, .nav, .fold, .fqx-ic, .fq-ic, .bf-ic, .ps-dot, .ps-fill, .rs-sheet, .rs-mask { transition: none; }
}
</style>
