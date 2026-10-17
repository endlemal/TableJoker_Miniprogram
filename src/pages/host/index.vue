<template>
  <page-meta :page-style="rulesShown ? 'overflow:hidden' : ''"></page-meta>
  <view class="page" :class="'s-' + state">
    <!-- 滚动标记：越过 cbar-line 显示紧凑标题栏；看到 end-line 时底部按钮换下导航栏 -->
    <view class="cbar-line"></view>

    <!-- 紧凑标题栏：大标题滚走后出现（和广场一致），说明图标跟在标题右侧 -->
    <view class="cbar" :class="{ 'cbar-on': compact }" :style="cbarStyle">
      <view v-if="canBack" class="cbar-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
      <view class="cbar-mid">
        <text class="cbar-t">平台认证</text>
        <view class="cbar-rule" hover-class="press" @tap="openRules"><z-icon name="book" :size="14" color="#9CA3AF" /></view>
      </view>
    </view>

    <!-- 大标题：和广场页同一套标题字体；说明图标放在标题右侧 -->
    <view class="head" :style="headStyle">
      <view class="head-row" :style="headRowStyle">
        <view v-if="canBack" class="h-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="h-title">平台认证</text>
        <view class="h-rule" hover-class="press" @tap="openRules"><z-icon name="book" :size="16" color="#E5E7EB" /></view>
      </view>
    </view>

    <!-- 首屏：左侧标语，右侧海报（贴右边缘，底部渐隐），左下角 Lottie 位压住海报一角并伸进下方面板 -->
    <view class="hero">
      <view class="slogan">
        <text class="sl-t">组织</text>
        <text class="sl-t">更好的</text>
        <text class="sl-t">桌游对局</text>
        <view class="sl-line"></view>
      </view>
      <view class="poster">
        <image class="poster-img" src="/static/host/poster.jpg" mode="aspectFill" />
        <view class="poster-fade"></view>
      </view>
      <!-- Lottie 动画位：接入时在这里放 <canvas type="2d">，现在是静态占位 -->
      <view class="lottie" :style="lottieArt"></view>
      <text class="h-sub">完成平台认证，解锁专属标识、更多展示机会与高级能力</text>
    </view>

    <!-- 面板：从这里开始是认证的具体内容 -->
    <view class="sheet">
      <view class="lead">
        <view class="lead-main">
          <view class="lead-row">
            <text class="lead-t">{{ stInfo.title }}</text>
            <view class="lead-arrow" hover-class="press" @tap="toContent"><z-icon name="arrow-down" :size="20" :stroke="2.5" color="#FF4D4D" /></view>
          </view>
          <text class="lead-s">{{ stInfo.statusLine }}</text>
        </view>
        <view class="lead-btn" :class="'lead-btn-' + state" hover-class="press" @tap="openCertify">
          <text class="lead-btn-t">{{ stInfo.cta }}</text>
          <z-icon name="chevron-right" :size="14" color="#FFFFFF" />
        </view>
      </view>

      <!-- 核心权益：点图标看说明和认证前后的变化；「认证标识」用头像演示，右下角加 V -->
      <view class="sec sec-first">
        <text class="sec-t">核心权益</text>
        <view class="bf">
          <view v-for="(b, i) in benefits" :key="b.key" class="bf-i" :class="{ 'bf-on': bIdx === i }" @tap="bIdx = i">
            <view class="bf-ic"><z-icon :name="b.icon" :size="22" :color="bIdx === i ? '#FFFFFF' : '#FF6B6B'" /></view>
            <text class="bf-n">{{ b.name }}</text>
          </view>
        </view>
        <view :key="bIdx" class="bf-panel">
          <text class="bf-title">{{ cur.title }}</text>
          <text class="bf-desc">{{ cur.desc }}</text>
          <view class="ba">
            <view class="ba-side ba-before">
              <text class="ba-k">认证前</text>
              <view v-if="cur.visual === 'avatar'" class="ba-who">
                <view class="ava"><text class="ava-c">{{ me.char }}</text></view>
                <text class="ba-v">{{ cur.before }}</text>
              </view>
              <text v-else class="ba-v">{{ cur.before }}</text>
            </view>
            <view class="ba-arrow"><z-icon name="arrow-right" :size="16" color="#FF6B6B" /></view>
            <view class="ba-side ba-after">
              <text class="ba-k ba-k-on">认证后</text>
              <view v-if="cur.visual === 'avatar'" class="ba-who">
                <view class="ava ava-on">
                  <text class="ava-c">{{ me.char }}</text>
                  <view class="vb"><z-icon name="letter-v" :size="10" :stroke="3.4" color="#FFFFFF" /></view>
                </view>
                <text class="ba-v ba-v-on">{{ cur.after }}</text>
              </view>
              <text v-else class="ba-v ba-v-on">{{ cur.after }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 功能特权：三组，点开某一项才显示说明 -->
      <view class="sec">
        <view class="sec-h">
          <text class="sec-t sec-t-inline">功能特权</text>
          <view class="sec-tag" :class="{ 'sec-tag-on': !locked }">
            <z-icon :name="locked ? 'lock' : 'check'" :size="11" :stroke="2.5" :color="locked ? '#9CA3AF' : '#4CB582'" />
            <text class="sec-tag-t">{{ locked ? '认证后解锁' : '已开通' }}</text>
          </view>
        </view>
        <view v-for="(g, gi) in privileges" :key="g.key" class="pg">
          <view class="pg-h">
            <view class="pg-ic" :style="'background:' + g.tint"><z-icon :name="g.icon" :size="16" :color="g.color" /></view>
            <text class="pg-t">{{ g.title }}</text>
            <text class="pg-n">{{ g.items.length }} 项</text>
          </view>
          <view class="pg-grid">
            <view v-for="(it, ii) in g.items" :key="it.key" class="pi" @tap="pickPriv(gi, ii)">
              <view class="pi-ic" :style="pSel[gi] === ii ? 'background:' + g.tint + ';border-color:' + g.color : ''">
                <z-icon :name="it.icon" :size="20" :color="g.color" />
                <view v-if="locked" class="pi-lock"><z-icon name="lock" :size="9" :stroke="2.5" color="#9CA3AF" /></view>
              </view>
              <text class="pi-n" :class="{ 'pi-n-on': pSel[gi] === ii }">{{ it.name }}</text>
            </view>
          </view>
          <view class="fold" :class="{ 'fold-on': pSel[gi] !== undefined }">
            <view class="fold-in"><text class="pi-desc">{{ pDesc[gi] }}</text></view>
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

      <!-- 认证流程：竖向，左侧是进度轨道，右侧是每一步的说明 -->
      <view class="sec">
        <text class="sec-t">认证流程</text>
        <view class="ps">
          <view v-for="(s, i) in steps" :key="i" class="ps-i" :class="'ps-' + stepState(i)">
            <view class="ps-track">
              <view class="ps-dot">
                <z-icon v-if="stepState(i) === 'done'" name="check" :size="12" :stroke="3" color="#FFFFFF" />
                <z-icon v-else-if="stepState(i) === 'fail'" name="x" :size="12" :stroke="3" color="#FFFFFF" />
                <text v-else class="ps-n">{{ i + 1 }}</text>
              </view>
              <view v-if="i < steps.length - 1" class="ps-line"></view>
            </view>
            <view class="ps-desc">
              <view class="ps-row">
                <text class="ps-t">{{ s.title }}</text>
                <text v-if="stepTag(i)" class="ps-tag" :class="{ 'ps-tag-fail': stepState(i) === 'fail' }">{{ stepTag(i) }}</text>
              </view>
              <text class="ps-d">{{ s.desc }}</text>
            </view>
          </view>
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
          <view class="fold" :class="{ 'fold-on': faqListOpen }"><view class="fold-in">
            <view v-for="(f, i) in faqs" :key="i" class="fq" :class="{ 'fq-on': faqOpen[i] }">
              <view class="fq-h" hover-class="press-soft" @tap="toggleFaq(i)">
                <text class="fq-q">{{ f.q }}</text>
                <view class="fq-ic"><z-icon name="plus" :size="14" color="#9CA3AF" /></view>
              </view>
              <view class="fold" :class="{ 'fold-on': faqOpen[i] }"><view class="fold-in"><text class="fq-a">{{ f.a }}</text></view></view>
            </view>
          </view></view>
        </view>
        <view class="rules-link" hover-class="press-soft" @tap="openRules">
          <z-icon name="book" :size="14" color="#9CA3AF" /><text class="rules-link-t">查看完整认证规则</text><z-icon name="chevron-right" :size="14" color="#6B7280" />
        </view>
      </view>
      <view class="end-line"></view>
    </view>

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
import { ref, reactive, computed, getCurrentInstance } from 'vue'
import { onLoad, onReady, onUnload, onPageScroll, onShareAppMessage } from '@dcloudio/uni-app'
import { getCertState, useCertState } from '@/common/cert.js'
import { tabItems, tapTab } from '@/common/tabs.js'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTabbar from '@/components/z-tabbar/z-tabbar.vue'
import { getNavMetrics } from '@/common/nav.js'
import { svgUri } from '@/common/svg.js'
import { lottiePlaceholder } from '@/common/host-art.js'
import { CERTIFY_WEB, WEBVIEW_ENABLED } from '@/common/config.js'
import { me } from '@/mock/data.js'
import { STATE_INFO, benefits, privileges, metrics, metricsNote, steps, faqs, rules } from '@/mock/host.js'

const instance = getCurrentInstance()
const nav = getNavMetrics()
const cbarStyle = `height:${nav.statusBar + nav.navH}px;padding-top:${nav.statusBar}px`
const headStyle = `padding-top:${nav.statusBar}px`
const headRowStyle = `height:${nav.navH}px;padding-right:${nav.capsuleW}px`
const lottieArt = `background-image:url("${svgUri(lottiePlaceholder())}")`
const toast = (title) => uni.showToast({ title, icon: 'none' })

/* ---------- 认证状态 ---------- */
const STATES = ['none', 'pending', 'verified', 'rejected']
const state = ref(getCertState())
const stInfo = computed(() => STATE_INFO[state.value])
const locked = computed(() => state.value !== 'verified')
// 开发预览：用 ?state=pending 之类的参数打开，只在本页预览这个状态，不改变账号的模式。
// 进入或退出「认证后模式」请在首页连点左上角标志 5 次

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
  if (state.value === 'verified' && i === steps.length - 1) return '已生效'
  return ''
}

// 跳到官网认证入口；个人主体的小程序不能用 web-view，改为复制链接
function openCertify() {
  if (stInfo.value.link === 'workbench') return uni.redirectTo({ url: '/pages/workbench/index' })
  const url = CERTIFY_WEB[stInfo.value.link]
  if (!WEBVIEW_ENABLED) {
    return uni.setClipboardData({ data: url, success: () => toast('链接已复制，请在浏览器打开') })
  }
  uni.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}&title=${encodeURIComponent('平台认证')}` })
}
const toContent = () => uni.pageScrollTo({ selector: '.sec-first', duration: 320 })

/* ---------- 权益、特权、指标、常见问题 ---------- */
const bIdx = ref(0)
const cur = computed(() => benefits[bIdx.value])
// 每组记住选中的那一项；收起时保留文字，折叠动画结束前不会闪空
const pSel = reactive({})
const pDesc = reactive({})
function pickPriv(gi, ii) {
  if (pSel[gi] === ii) {
    delete pSel[gi]
    return
  }
  pSel[gi] = ii
  pDesc[gi] = privileges[gi].items[ii].desc
}
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

/* ---------- 滚动：紧凑标题栏、到底切换按钮、指标入场 ---------- */
const compact = ref(false)
const atBottom = ref(false)
const observers = []
function observe() {
  // 小程序：用相交监听，滚动时不往逻辑层发事件
  // #ifndef H5
  try {
    const make = (margins) => uni.createIntersectionObserver(instance && instance.proxy).relativeToViewport(margins)
    const ioBar = make({ top: 0 })
    ioBar.observe('.cbar-line', (res) => { compact.value = res.intersectionRatio === 0 && res.boundingClientRect.top < 0 })
    const ioEnd = make({ bottom: 0 })
    ioEnd.observe('.end-line', (res) => { atBottom.value = res.intersectionRatio > 0 })
    const ioMt = make({ bottom: -60 })
    ioMt.observe('.mt', (res) => { if (res.intersectionRatio > 0) countUp() })
    observers.push(ioBar, ioEnd, ioMt)
  } catch (e) {
    countUp()
  }
  // #endif
}
// H5：uni 的相交监听以页面容器为参照，不可靠，改用滚动事件
// #ifdef H5
onPageScroll(({ scrollTop }) => {
  compact.value = scrollTop > 72
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
onShareAppMessage(() => ({ title: '平台认证：点亮认证标识', path: '/pages/host/index', imageUrl: '/static/host/poster.jpg' }))

/* ---------- 底部导航 ---------- */
// 底部导航：跟着账号的模式（认证后模式时第四个入口是「主办方工作台」）
const certState = useCertState()
const navItems = computed(() => tabItems(certState.value))
const navActive = ref(3)
function onNav(i) {
  tapTab(navItems.value, i, 'host', (k) => { navActive.value = k })
}
</script>

<style>
/* 配色只用一种强调色：品牌红只给主按钮、当前步骤和箭头；其余是中性灰阶，功能特权三组用海报里的颜色 */
.page { position: relative; min-height: 100vh; background: #181A20; }
.press { opacity: .8; transform: scale(.96); }
.press-soft { opacity: .85; }
.cbar-line { position: absolute; left: 0; top: 200rpx; width: 1px; height: 1px; }
.end-line { width: 100%; height: 2rpx; }

/* 紧凑标题栏（同广场） */
.cbar {
  position: fixed; z-index: 30; left: 0; right: 0; top: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  background: #181A20; opacity: 0; transform: translateY(-12rpx); transition: opacity .25s ease, transform .3s ease; pointer-events: none;
}
.cbar-on { opacity: 1; transform: translateY(0); pointer-events: auto; }
.cbar-back { position: absolute; left: 24rpx; bottom: 12rpx; width: 64rpx; height: 64rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.cbar-mid { display: flex; align-items: center; }
.cbar-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; color: #FFFFFF; }
.cbar-rule { margin-left: 12rpx; width: 44rpx; height: 44rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }

/* 大标题 + 说明图标 */
.head { padding: 0 40rpx; }
.head-row { display: flex; align-items: center; box-sizing: border-box; }
.h-back { width: 64rpx; height: 64rpx; flex: none; margin-right: 20rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.h-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 64rpx; line-height: 1; letter-spacing: 4rpx; color: #FFFFFF; }
.h-rule {
  margin-left: 16rpx; width: 56rpx; height: 56rpx; flex: none; border-radius: 50%; box-sizing: border-box;
  background: #22252D; border: 1rpx solid #30343E; display: flex; align-items: center; justify-content: center;
}

/* 首屏：海报贴右边缘，底部渐隐到页面底色 */
.hero { position: relative; z-index: 2; height: 860rpx; margin-top: 24rpx; margin-bottom:-90rpx}
.slogan { position: absolute; left: 40rpx; top: 72rpx; display: flex; flex-direction: column; }
.sl-t { font-size: 24rpx; line-height: 1.7; letter-spacing: 2rpx; color: #9CA3AF; }
.sl-line { width: 2rpx; height: 200rpx; margin: 28rpx 0 0 4rpx; background: #3A3E48; }
.poster { position: absolute; left: 196rpx; right: 0; top: 0; height: 780rpx; border-radius: 40rpx 0 0 40rpx; overflow: hidden; background: #1A1512; }
.poster-img { width: 100%; height: 100%; display: block; }
.poster-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 240rpx; background: linear-gradient(180deg, rgba(24, 26, 32, 0), rgba(24, 26, 32, .85)); }
.lottie {
  position: absolute; z-index: 3; left: 40rpx; top: 540rpx; width: 256rpx; height: 256rpx; border-radius: 40rpx;
  background-size: 100% 100%; box-shadow: 0 24rpx 48rpx rgba(0, 0, 0, .45);
}
.h-sub { position: absolute; left: 328rpx; right: 40rpx; top: 670rpx; font-size: 24rpx; line-height: 1.65; color: #9CA3AF; }

/* 面板 */
.sheet {
  position: relative; z-index: 1; min-height: 100vh; border-radius: 48rpx 48rpx 0 0; background: #1F222A;
  padding:80rpx 0 calc(300rpx + env(safe-area-inset-bottom));
}
.lead { display: flex; align-items: center; margin-top:-20rpx ;padding: 0rpx 40rpx; }
.lead-main { flex: 1; min-width: 0; }
.lead-row { display: flex; align-items: center; }
.lead-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 52rpx; line-height: 1.2; letter-spacing: 2rpx; color: #FFFFFF; }
.lead-arrow { margin-left: 12rpx; padding-top: 6rpx; animation: bob 1.8s ease-in-out infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8rpx); } }
.lead-s { display: block; margin-top: 10rpx; font-size: 24rpx; line-height: 1.5; color: #9CA3AF; }
.s-verified .lead-s { color: #F4B740; }
.s-rejected .lead-s { color: #FF6B6B; }
/* 按钮：和全站主按钮一致的红色胶囊 */
.lead-btn {
  flex: none; margin:20rpx 40rpx 0rpx 0rpx; height: 80rpx; padding: 0 24rpx 0 34rpx; border-radius: 999rpx; background: #DC0000;
  box-shadow: 0 12rpx 28rpx rgba(220, 0, 0, .32); display: flex; align-items: center;
}
.lead-btn-pending, .lead-btn-verified { background: #35383F; box-shadow: none; }
.lead-btn-t { margin-right: 4rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }

/* 区块：标题和广场一样用标题字体 */
.sec { margin-top: 26rpx; padding: 0 40rpx; }
.sec-t { display: block; margin-bottom: 32rpx; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.sec-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.sec-t-inline { margin-bottom: 0; }
.sec-tag { height: 44rpx; padding: 0 16rpx; border-radius: 999rpx; background: #262A34; display: flex; align-items: center; }
.sec-tag-on { background: rgba(76, 181, 130, .14); }
.sec-tag-t { margin-left: 6rpx; font-size: 22rpx; color: #9CA3AF; }
.sec-tag-on .sec-tag-t { color: #4CB582; }

/* 核心权益 */
.bf { display: flex; justify-content: space-between; }
.bf-i { width: 116rpx; display: flex; flex-direction: column; align-items: center; }
.bf-ic {
  width: 96rpx; height: 96rpx; border-radius: 30rpx; box-sizing: border-box; background: #262A34; border: 1rpx solid #30343E;
  display: flex; align-items: center; justify-content: center;
  transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), background .25s ease, box-shadow .25s ease;
}
.bf-on .bf-ic { background: #DC0000; border-color: #DC0000; transform: translateY(-6rpx) scale(1.06); box-shadow: 0 12rpx 28rpx rgba(220, 0, 0, .3); }
.bf-n { margin-top: 16rpx; font-size: 22rpx; color: #6B7280; transition: color .25s ease; }
.bf-on .bf-n { color: #FFFFFF; font-weight: 500; }
.bf-panel { margin-top: 36rpx; padding: 32rpx; border-radius: 32rpx; background: #262A34; animation: rise .35s ease; }
@keyframes rise { from { opacity: 0; transform: translateY(14rpx); } to { opacity: 1; transform: translateY(0); } }
.bf-title { display: block; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.bf-desc { display: block; margin-top: 10rpx; font-size: 26rpx; line-height: 1.7; color: #9CA3AF; }
.ba { margin-top: 28rpx; display: flex; align-items: stretch; }
.ba-side { flex: 1; min-width: 0; padding: 20rpx; border-radius: 24rpx; display: flex; flex-direction: column; }
.ba-before { background: #1F222A; }
.ba-after { background: rgba(220, 0, 0, .1); border: 1rpx solid rgba(220, 0, 0, .3); animation: pop .45s cubic-bezier(.34, 1.56, .64, 1) .12s both; }
@keyframes pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
.ba-arrow { width: 56rpx; flex: none; display: flex; align-items: center; justify-content: center; }
.ba-k { font-size: 20rpx; color: #6B7280; }
.ba-k-on { color: #FF6B6B; }
.ba-v { margin-top: 8rpx; font-size: 26rpx; color: #9CA3AF; }
.ba-v-on { color: #FFFFFF; font-weight: 600; }
/* 头像：认证后右下角加 V */
.ba-who { margin-top: 12rpx; display: flex; align-items: center; }
.ba-who .ba-v { margin: 0 0 0 16rpx; }
.ava {
  position: relative; width: 72rpx; height: 72rpx; flex: none; border-radius: 50%; background: #F3EEE6; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center;
}
.ava-c { font-size: 32rpx; font-weight: 600; color: #181A20; }
.ava-on { box-shadow: 0 0 0 4rpx #F4B740; }
.vb {
  position: absolute; right: -8rpx; bottom: -8rpx; width: 34rpx; height: 34rpx; box-sizing: border-box; border-radius: 50%;
  background: #DC0000; border: 4rpx solid #2A1F25; display: flex; align-items: center; justify-content: center;
  animation: v-add .5s cubic-bezier(.34, 1.56, .64, 1) .45s both;
}
@keyframes v-add { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }

/* 功能特权：图标用分组色，底色保持中性；选中时只加一圈分组色 */
.pg { margin-top: 20rpx; padding: 28rpx 28rpx 8rpx; border-radius: 32rpx; background: #262A34; }
.pg-h { display: flex; align-items: center; }
.pg-ic { width: 48rpx; height: 48rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.pg-t { margin-left: 14rpx; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 32rpx; letter-spacing: 2rpx; color: #F2F2EE; }
.pg-n { margin-left: auto; font-size: 22rpx; color: #6B7280; }
.pg-grid { margin-top: 28rpx; display: flex; }
.pi { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; padding-bottom: 20rpx; }
.pi-ic {
  position: relative; width: 88rpx; height: 88rpx; box-sizing: border-box; border-radius: 26rpx; background: #1F222A; border: 2rpx solid transparent;
  display: flex; align-items: center; justify-content: center; transition: background .25s ease, border-color .25s ease;
}
.pi-lock { position: absolute; right: -8rpx; top: -8rpx; width: 30rpx; height: 30rpx; border-radius: 50%; background: #262A34; border: 2rpx solid #30343E; display: flex; align-items: center; justify-content: center; }
.pi-n { margin-top: 14rpx; font-size: 22rpx; color: #9CA3AF; }
.pi-n-on { color: #FFFFFF; font-weight: 500; }
.pi-desc { display: block; padding: 4rpx 4rpx 24rpx; font-size: 24rpx; line-height: 1.7; color: #D1D5DB; }

/* 数据价值 */
.mt { display: flex; }
.mt-i { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
.mt-sep { border-left: 1rpx solid #30343E; }
.mt-v { display: flex; align-items: baseline; }
.mt-num { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 200; font-size: 96rpx; line-height: 1; color: #F2F2EE; }
.mt-u { margin-left: 4rpx; font-size: 26rpx; font-weight: 500; color: #FF6B6B; }
.mt-l { margin-top: 14rpx; padding: 0 16rpx; font-size: 22rpx; line-height: 1.5; color: #9CA3AF; text-align: center; }
.mt-note { display: block; margin-top: 24rpx; font-size: 20rpx; color: #4B5060; text-align: center; }

/* 认证流程：左侧轨道，右侧说明 */
.ps-i { display: flex; }
.ps-track { width: 52rpx; flex: none; display: flex; flex-direction: column; align-items: center; }
.ps-dot { width: 48rpx; height: 48rpx; flex: none; border-radius: 50%; background: #30343E; display: flex; align-items: center; justify-content: center; }
.ps-n { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 24rpx; color: #9CA3AF; }
.ps-line { flex: 1; width: 4rpx; min-height: 48rpx; margin: 10rpx 0; border-radius: 2rpx; background: #30343E; }
.ps-done .ps-dot, .ps-done .ps-line { background: #DC0000; }
.ps-cur .ps-dot { background: #1F222A; box-shadow: 0 0 0 4rpx #DC0000; animation: pulse 1.8s ease-in-out infinite; }
.ps-cur .ps-n { color: #FFFFFF; }
.ps-fail .ps-dot { background: #FF5646; }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4rpx #DC0000, 0 0 0 0 rgba(220, 0, 0, .45); }
  50% { box-shadow: 0 0 0 4rpx #DC0000, 0 0 0 16rpx rgba(220, 0, 0, 0); }
}
.ps-desc { flex: 1; min-width: 0; margin-left: 24rpx; padding-bottom: 44rpx; }
.ps-row { display: flex; align-items: center; min-height: 48rpx; }
.ps-t { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.ps-todo .ps-t { color: #9CA3AF; }
.ps-tag { margin-left: 12rpx; padding: 2rpx 14rpx; border-radius: 999rpx; background: rgba(220, 0, 0, .14); font-size: 20rpx; color: #FF6B6B; }
.ps-tag-fail { background: rgba(255, 86, 70, .16); color: #FF5646; }
.ps-d { display: block; margin-top: 8rpx; font-size: 26rpx; line-height: 1.7; color: #9CA3AF; }

/* 折叠：grid 行高 0fr → 1fr，不用量内容高度 */
.fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s ease; }
.fold-on { grid-template-rows: 1fr; }
.fold-in { min-height: 0; overflow: hidden; }

/* 常见问题 */
.fqx { border-radius: 32rpx; background: #262A34; overflow: hidden; }
.fqx-h { display: flex; align-items: center; padding: 32rpx; }
.fqx-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.fqx-n { flex: 1; margin-left: 16rpx; font-size: 24rpx; color: #6B7280; }
.fqx-ic { transition: transform .3s ease; }
.fqx-on .fqx-ic { transform: rotate(180deg); }
.fq { margin: 0 32rpx; border-top: 1rpx solid #30343E; }
.fq-h { display: flex; align-items: center; padding: 28rpx 0; }
.fq-q { flex: 1; min-width: 0; font-size: 28rpx; color: #E5E7EB; }
.fq-ic { flex: none; margin-left: 16rpx; transition: transform .3s ease; }
.fq-on .fq-ic { transform: rotate(45deg); }
.fq-a { display: block; padding-bottom: 28rpx; font-size: 26rpx; line-height: 1.75; color: #9CA3AF; }
.rules-link { margin-top: 28rpx; display: flex; align-items: center; justify-content: center; }
.rules-link-t { margin: 0 6rpx 0 8rpx; font-size: 24rpx; color: #9CA3AF; }

/* 底部按钮 */
.cta {
  position: fixed; z-index: 45; left: 0; right: 0; bottom: 0; padding: 20rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #1F222A; border-top: 1px solid #2A2D36; opacity: 0; transform: translateY(100%); pointer-events: none;
  transition: transform .45s cubic-bezier(.2, .8, .2, 1), opacity .35s ease;
}
.cta-on { opacity: 1; transform: translateY(0); pointer-events: auto; transition-delay: .12s; }
.cta-btn { height: 96rpx; border-radius: 999rpx; background: #DC0000; box-shadow: 0 12rpx 32rpx rgba(220, 0, 0, .32); display: flex; align-items: center; justify-content: center; }
.cta-pending, .cta-verified { background: #35383F; box-shadow: none; }
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
.rs-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; color: #FFFFFF; }
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
  .lead-arrow, .ps-cur .ps-dot, .bf-panel, .ba-after, .vb { animation: none; }
  .cta, .cbar, .fold, .fqx-ic, .fq-ic, .bf-ic, .pi-ic, .rs-sheet, .rs-mask { transition: none; }
}
</style>
