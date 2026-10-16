<template>
  <page-meta :page-style="detail ? 'overflow:hidden' : ''"></page-meta>
  <view class="page">
    <!-- 滚过这条线就切换紧凑标题栏；用相交监听代替 onPageScroll，滚动时不再逐帧通知逻辑层 -->
    <view class="cbar-line"></view>
    <!-- 滚动后出现的紧凑标题栏 -->
    <view class="cbar" :class="{ 'cbar-on': compact }" :style="cbarStyle"><text class="cbar-t">广场</text></view>

    <!-- 大标题：和胶囊同一行；下面是醒目的数字锚点 -->
    <view class="head" :style="headStyle">
      <view class="head-row" :style="headRowStyle">
        <view v-if="canBack" class="h-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="h-title">广场</text>
      </view>
      <view class="h-stat">
        <text class="h-num">{{ p2(publicMatches.length) }}</text>
        <view class="h-stat-t"><text class="h-stat-a">场公开赛</text><text class="h-stat-b">正在报名，点开就能报名或进入</text></view>
      </view>
    </view>

    <!-- 分类：吸顶，选中块跟随滑动 -->
    <view class="chips" :style="chipsStyle">
      <view class="chips-track">
        <view class="chip-ind" :style="'transform:translateX(' + cat * CHIP_STEP + 'rpx)'"></view>
        <view v-for="(c, i) in cats" :key="c.key" class="chip" @tap="setCat(i)">
          <text class="chip-t" :class="{ 'chip-t-on': cat === i }">{{ c.label }}</text>
        </view>
      </view>
      <view class="chips-search" hover-class="press" @tap="toast('搜索待接入')"><z-icon name="search" :size="18" color="#E5E7EB" /></view>
    </view>

    <!-- 正在报名的公开赛：横向卡片，当前卡片放大 -->
    <block v-if="cat === 0">
      <view class="sec-h"><text class="sec-t">正在报名</text><text class="sec-s">左右滑动</text></view>
      <swiper class="feat" previous-margin="32rpx" next-margin="104rpx" :current="featIdx" @change="onFeat">
        <swiper-item v-for="(mt, i) in featured" :key="mt.id">
          <view class="fm" :class="{ 'fm-cur': i === featIdx }" hover-class="fm-press" @tap="openMatch(mt)">
            <view class="fm-cover" :style="mt.coverStyle">
              <view class="fm-line"><text class="fm-line-n">{{ mt.scene.name }}</text><text class="fm-line-t">{{ mt.scene.line }}</text></view>
              <view v-if="!mt.autoApprove" class="fm-flag"><z-icon name="user-check" :size="12" color="#FFC53A" /><text class="fm-flag-t">需审核</text></view>
            </view>
            <view class="fm-body">
              <text class="fm-name" :class="{ 'font-sys': !fitsDisplay(mt.name) }">{{ mt.name }}</text>
              <view v-if="mt.location" class="fm-loc"><z-icon name="map-pin" :size="12" color="#9CA3AF" /><text class="fm-loc-t">{{ mt.location.name }}</text></view>
              <view class="fm-row">
                <view class="fm-when"><text class="fm-time">{{ mt.time }}</text><text class="fm-date">{{ mt.date }}</text></view>
                <view class="fm-sign">
                  <view class="fm-sign-v"><text>{{ mt.signed }}</text><text class="fm-sign-c">/{{ mt.cap }}</text></view>
                  <view class="fm-bar"><view class="fm-bar-fill" :style="'width:' + mt.pct + '%'"></view></view>
                </view>
              </view>
            </view>
          </view>
        </swiper-item>
      </swiper>
      <view class="dots"><view v-for="(mt, i) in featured" :key="mt.id" class="dot" :class="{ 'dot-on': i === featIdx }"></view></view>
      <view class="sec-h sec-h-feed"><text class="sec-t">大家在聊</text></view>
    </block>

    <!-- 瀑布流：带封面的帖子、海报广告、文字型赛事卡片 -->
    <view class="feed" :class="{ 'feed-swap': swapping }">
      <view v-for="(col, ci) in columns" :key="ci" class="col">
        <view
          v-for="it in col"
          :id="'c-' + it.key"
          :key="it.key"
          class="card"
          :class="['card-' + it.kind, { 'card-in': shown[it.key] }]"
          :style="'transition-delay:' + (shown[it.key] ? it.delay : 0) + 'ms'"
          hover-class="card-press"
          :hover-stay-time="60"
          @tap="openItem(it)"
        >
          <block v-if="it.kind === 'post'">
            <view :id="'cv-' + it.key" class="pc-cover" :style="it.coverStyle + ';height:' + it.coverH + 'rpx'"></view>
            <view class="pc-body">
              <text class="pc-title">{{ it.title }}</text>
              <view class="pc-meta">
                <view class="av av-36" :style="'background:' + it.author.bg + ';color:' + it.author.fg"><text>{{ it.author.c }}</text></view>
                <text class="pc-author">{{ it.author.name }}</text>
                <view class="pc-like"><z-icon :name="liked[it.id] ? 'suit-heart' : 'heart'" :size="13" :color="liked[it.id] ? '#FF4D4D' : '#6B7280'" /><text class="pc-like-n">{{ likeCount(it) }}</text></view>
              </view>
            </view>
          </block>

          <view v-else-if="it.kind === 'ad'" class="ad" :class="'ad-' + it.theme">
            <view class="ad-deco">
              <view class="ad-d1"></view><view class="ad-d2"></view><view class="ad-d3"></view><view class="ad-d4"></view>
            </view>
            <text class="ad-tag">推广</text>
            <view class="ad-text">
              <text class="ad-title">{{ it.title }}</text>
              <text class="ad-sub">{{ it.sub }}</text>
              <view class="ad-cta"><text class="ad-cta-t">{{ it.cta }}</text><z-icon :name="it.link.type === 'page' ? 'arrow-up-right' : 'external-link'" :size="13" :color="it.theme === 'shop' ? '#F3EEE6' : '#181A20'" /></view>
            </view>
          </view>

          <view v-else class="mc">
            <view class="mc-top"><text class="mc-srv">{{ it.server }}</text><z-icon name="arrow-up-right" :size="16" color="#181A20" /></view>
            <text class="mc-title" :class="{ 'font-sys': !fitsDisplay(it.name) }">{{ it.name }}</text>
            <text v-if="it.location" class="mc-loc">{{ it.location.name }}</text>
            <view class="mc-meta">
              <view class="mc-when"><text class="mc-time">{{ it.time }}</text><text class="mc-date">{{ it.date }}</text></view>
              <text class="mc-sign">{{ it.signed }}/{{ it.cap }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <view class="more"><text class="more-t">{{ loading ? '正在加载…' : ended || cat === 1 ? '没有更多了' : '' }}</text></view>

    <!-- 微信原生容器只负责接管系统返回，详情继续使用原来的展开/收起动画。 -->
    <!-- #ifdef MP-WEIXIN -->
    <page-container :show="!!detail" :overlay="false" :duration="500" custom-style="height:0;background:transparent;" @beforeleave="closeDetail" />
    <!-- #endif -->

    <!-- 帖子详情：封面从卡片位置展开成顶部大图，正文从下方浮上来；在顶部下拉可以关闭 -->
    <view v-if="detail" class="dt" :class="{ 'dt-on': dtOpen }">
      <view class="dt-bg"></view>
      <view class="dt-move" :class="{ 'dt-drag': dragging }" :style="'transform:translateY(' + drag + 'px) scale(' + (1 - drag / 2400) + ')'">
        <!-- 位置和封面分开绑定：动画只改外层位置，封面的 data URI 只在打开时传一次 -->
        <view class="dt-ghost" :style="ghost"><view class="dt-ghost-cv" :style="detail.coverStyle"></view></view>
        <scroll-view
          class="dt-scroll"
          scroll-y
          @scroll="onDtScroll"
          @touchstart="onDragStart"
          @touchmove="onDragMove"
          @touchend="onDragEnd"
          @touchcancel="onDragEnd"
        >
          <view :style="'height:' + (heroH - 24) + 'px'"></view>
          <view class="dt-sheet">
            <view class="dt-grab"></view>
            <text class="dt-title">{{ detail.title }}</text>
            <view class="dt-author">
              <view class="av av-56" :style="'background:' + detail.author.bg + ';color:' + detail.author.fg"><text>{{ detail.author.c }}</text></view>
              <view class="dt-author-t"><text class="dt-name">{{ detail.author.name }}</text><text class="dt-time">{{ ago(detail.at) }}</text></view>
            </view>
            <text v-for="(para, k) in detail.body" :key="k" class="dt-p">{{ para }}</text>
            <view v-if="detail.match" class="dt-match" hover-class="press-soft" @tap="openMatch(detail.match)">
              <view class="dt-match-cv" :style="detail.match.thumbStyle"></view>
              <view class="dt-match-t"><text class="dt-match-n">{{ detail.match.name }}</text><text class="dt-match-s">{{ detail.match.date }} {{ detail.match.time }}，{{ detail.match.signed }}/{{ detail.match.cap }} 已报名</text></view>
              <z-icon name="chevron-right" :size="16" color="#9CA3AF" />
            </view>
            <view class="dt-pad"></view>
          </view>
        </scroll-view>
      </view>
      <view class="dt-close" :style="closeStyle" hover-class="press" @tap="closeDetail"><z-icon name="x" :size="18" color="#FFFFFF" /></view>
      <view class="dt-bar">
        <view class="dt-act" hover-class="press" @tap="toggleLike(detail)">
          <view :class="likePop ? 'pop-' + likeFlip : ''"><z-icon :name="liked[detail.id] ? 'suit-heart' : 'heart'" :size="22" :color="liked[detail.id] ? '#FF4D4D' : '#E5E7EB'" /></view>
          <text class="dt-act-t">{{ likeCount(detail) }}</text>
        </view>
        <view class="dt-act" hover-class="press" @tap="toast('评论待接入')"><z-icon name="message-circle" :size="22" color="#E5E7EB" /><text class="dt-act-t">{{ detail.comments }}</text></view>
        <button class="dt-share" open-type="share" hover-class="press"><z-icon name="share" :size="18" color="#FFFFFF" /><text class="dt-share-t">分享</text></button>
      </view>
    </view>

    <z-tabbar :items="navItems" :active="navActive" @change="onNav" />
  </view>
</template>

<script setup>
import { ref, reactive, computed, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onReady, onPageScroll, onPullDownRefresh, onReachBottom, onShareAppMessage, onUnload, onBackPress } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTabbar from '@/components/z-tabbar/z-tabbar.vue'
import { getNavMetrics } from '@/common/nav.js'
import { svgUri, coverStyle, nearestSize, postCover, isPostCover } from '@/common/svg.js'
import { fitsDisplay } from '@/common/font-coverage.js'
import { publicMatches, plazaPosts, plazaAds, morePosts, sceneLine, findPublicMatch } from '@/mock/plaza.js'

const instance = getCurrentInstance()
const nav = getNavMetrics()
const winW = nav.winW
const heroH = Math.round(winW * 0.82)
const cbarStyle = `height:${nav.statusBar + nav.navH}px;padding-top:${nav.statusBar}px`
const headStyle = `padding-top:${nav.statusBar}px`
const headRowStyle = `height:${nav.navH}px;padding-right:${nav.capsuleW}px`
const chipsStyle = `top:${nav.statusBar + nav.navH}px`
const closeStyle = `top:${nav.statusBar + Math.max(0, (nav.navH - 36) / 2)}px`

const p2 = (n) => (n < 10 ? '0' : '') + n
const toast = (title) => uni.showToast({ title, icon: 'none' })
const noop = () => {}
const WEEK = '日一二三四五六'
const ago = (t) => {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000))
  if (m < 60) return `${m} 分钟前`
  if (m < 1440) return `${Math.round(m / 60)} 小时前`
  return `${Math.round(m / 1440)} 天前`
}

/* ---------- 封面样式（环境场景按画面重心裁切） ---------- */
// 比赛场景按容器比例取对应尺寸（每种尺寸单独构图）；帖子插画只有竖版一种
const postCache = {}
const coverStyleOf = (key, size = 'banner') => {
  if (!isPostCover(key)) return coverStyle(key, size)
  return postCache[key] || (postCache[key] = `background-image:url("${svgUri(postCover(key))}");background-size:cover;background-position:center`)
}

/* ---------- 赛事 ---------- */
const decorate = (m) => {
  const d = new Date(m.startAt)
  const signed = (m.participants || []).length
  return {
    ...m,
    kind: 'match',
    key: 'm-' + m.id,
    scene: sceneLine(m.cover),
    coverStyle: coverStyleOf(m.cover, 'banner'),
    thumbStyle: coverStyleOf(m.cover, 'share'),
    time: `${p2(d.getHours())}:${p2(d.getMinutes())}`,
    date: `${p2(d.getMonth() + 1)}/${p2(d.getDate())} 周${WEEK[d.getDay()]}`,
    signed,
    pct: Math.min(100, Math.round((signed / m.cap) * 100))
  }
}
const featured = publicMatches.map(decorate)
const featIdx = ref(0)
const onFeat = (e) => { featIdx.value = e.detail.current }
function openMatch(m) {
  uni.navigateTo({ url: '/pages/invite/index?id=' + m.id })
}

/* ---------- 帖子与广告 ---------- */
const CARD_W = (750 - 64 - 20) / 2
const decoratePost = (p) => ({
  ...p,
  key: 'p-' + p.id,
  coverStyle: coverStyleOf(p.cover, nearestSize(p.ratio)),
  coverH: Math.round(CARD_W / p.ratio),
  match: p.matchId ? decorate(findPublicMatch(p.matchId)) : null
})
const posts = ref(plazaPosts.map(decoratePost))
const ads = plazaAds.map((a) => ({ ...a, key: 'a-' + a.id }))
const liked = reactive({})
const likeCount = (p) => p.likes + (liked[p.id] ? 1 : 0)

/* ---------- 分类与瀑布流 ---------- */
const cats = [{ key: 'all', label: '全部' }, { key: 'match', label: '赛事' }, { key: 'post', label: '帖子' }]
const CHIP_STEP = 136
const cat = ref(0)
const swapping = ref(false)
const shown = reactive({})
const page = ref(1)
const loading = ref(false)
const ended = ref(false)

const feedItems = computed(() => {
  if (cat.value === 1) return featured.slice()
  if (cat.value === 2) return posts.value.slice()
  // 全部：帖子为主，穿插海报广告和文字型赛事卡片
  const out = []
  const extraMatches = featured.slice(1)
  posts.value.forEach((p, i) => {
    out.push(p)
    if (i === 1 && ads[0]) out.push(ads[0])
    if (i === 2 && extraMatches[0]) out.push(extraMatches[0])
    if (i === 5 && ads[1]) out.push(ads[1])
    if (i === 6 && extraMatches[2]) out.push(extraMatches[2])
    if (i === 9 && ads[2]) out.push(ads[2])
  })
  return out
})
const estH = (it) => (it.kind === 'post' ? it.coverH + 150 : it.kind === 'ad' ? CARD_W * 1.36 : 300)
// 按估算高度把卡片放进较矮的一列；首屏的卡片按列内顺序错开入场
const columns = computed(() => {
  const cols = [[], []]
  const hs = [0, 0]
  feedItems.value.forEach((it) => {
    const c = hs[0] <= hs[1] ? 0 : 1
    cols[c].push({ ...it, delay: Math.min(360, cols[c].length * 70 + c * 40) })
    hs[c] += estH(it) + 20
  })
  return cols
})

let io = null
function observeCards() {
  if (io) io.disconnect()
  try {
    io = uni.createIntersectionObserver(instance && instance.proxy, { observeAll: true })
    io.relativeToViewport({ bottom: 40 }).observe('.card', (res) => {
      if (res.intersectionRatio > 0 && res.id) shown[res.id.slice(2)] = true
    })
  } catch (e) {
    feedItems.value.forEach((it) => { shown[it.key] = true })
  }
}
const resetShown = () => Object.keys(shown).forEach((k) => delete shown[k])

function setCat(i) {
  if (i === cat.value) return
  swapping.value = true
  setTimeout(() => {
    resetShown()
    cat.value = i
    swapping.value = false
    nextTick(() => setTimeout(observeCards, 30))
  }, 160)
}

/* ---------- 打开 ---------- */
function openItem(it) {
  if (it.kind === 'post') return openPost(it)
  if (it.kind === 'match') return openMatch(it)
  openLink(it.link)
}
function openLink(link) {
  if (link.type === 'page') return uni.navigateTo({ url: link.url })
  if (link.type === 'web') {
    return uni.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(link.url)}&title=${encodeURIComponent(link.title || '')}` })
  }
  // #ifdef MP
  uni.navigateToMiniProgram({ appId: link.appId, path: link.path, fail: () => toast('没能打开小程序') })
  // #endif
  // #ifndef MP
  toast('请在微信里打开')
  // #endif
}

/* ---------- 帖子详情：容器展开 ---------- */
const detail = ref(null)
const dtOpen = ref(false)
let detailClosing = false
let detailOpenTimer = null
let detailCloseTimer = null
const ghost = ref('')
const EASE = 'cubic-bezier(.2,.8,.2,1)'
const MOVE = `transition:left .5s ${EASE},top .5s ${EASE},width .5s ${EASE},height .5s ${EASE},border-radius .5s ${EASE};`
const rectOf = (sel) => new Promise((resolve) => {
  uni.createSelectorQuery().select(sel).boundingClientRect((r) => resolve(r)).exec()
})
const ghostAt = (r, anim) => `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:12px;${anim ? MOVE : 'transition:none;'}`
const ghostFull = (anim) => `left:0;top:0;width:${winW}px;height:${heroH}px;border-radius:0;${anim ? MOVE : 'transition:none;'}`

async function openPost(it, instant) {
  if (detail.value) return
  const r = instant ? null : await rectOf('#cv-' + it.key)
  if (detail.value) return
  detail.value = it
  dtTop = 0
  dtOpen.value = false
  ghost.value = r ? ghostAt(r, false) : ghostFull(false)
  detailOpenTimer = setTimeout(() => {
    ghost.value = ghostFull(true)
    dtOpen.value = true
  }, 30)
}
async function closeDetail() {
  if (!detail.value || detailClosing) return
  detailClosing = true
  clearTimeout(detailOpenTimer)
  const r = await rectOf('#cv-' + detail.value.key)
  ghost.value = r && r.width ? ghostAt(r, true) : ghostFull(true)
  dtOpen.value = false
  detailCloseTimer = setTimeout(() => {
    detail.value = null
    drag.value = 0
    dragging.value = false
    detailClosing = false
  }, 500)
}

onBackPress(() => {
  if (!detail.value) return false
  closeDetail()
  return true
})

// 在正文顶部往下拉：跟手位移，超过阈值就收回卡片
const drag = ref(0)
const dragging = ref(false)
let dtTop = 0
let y0 = 0
const onDtScroll = (e) => { dtTop = e.detail.scrollTop }
const onDragStart = (e) => { y0 = e.touches[0].clientY; dragging.value = dtTop <= 2 }
const onDragMove = (e) => {
  if (!dragging.value) return
  const dy = e.touches[0].clientY - y0
  drag.value = dy > 0 ? Math.round(dy * 0.55) : 0
}
const onDragEnd = () => {
  if (!dragging.value) return
  dragging.value = false
  if (drag.value > 110) closeDetail()
  else drag.value = 0
}

const likePop = ref(false)
const likeFlip = ref(0)
function toggleLike(p) {
  liked[p.id] = !liked[p.id]
  likeFlip.value = likeFlip.value ? 0 : 1
  likePop.value = true
}

/* ---------- 页面 ---------- */
const compact = ref(false)
let cbarIo = null
// 小程序：用相交监听，滚动时不往逻辑层发事件。
// H5：uni 的相交监听以页面容器为参照，标记线永远算「可见」，所以改用 onPageScroll（H5 没有逻辑层和视图层之分，没有额外开销）
// #ifdef H5
onPageScroll(({ scrollTop }) => {
  const on = scrollTop > 72
  if (on !== compact.value) compact.value = on
})
// #endif
function observeCompact() {
  // #ifdef H5
  return
  // #endif
  try {
    cbarIo = uni.createIntersectionObserver(instance && instance.proxy)
    cbarIo.relativeToViewport({ top: 0 }).observe('.cbar-line', (res) => {
      const on = res.intersectionRatio === 0 && res.boundingClientRect.top < 0
      if (on !== compact.value) compact.value = on
    })
  } catch (e) {}
}
let deepPost = ''
const canBack = ref(false)
const goBack = () => uni.navigateBack()
onLoad((q) => {
  deepPost = (q && q.post) || ''
  canBack.value = getCurrentPages().length > 1
})
onReady(() => {
  observeCompact()
  observeCards()
  if (deepPost) {
    const it = posts.value.find((p) => p.id === deepPost)
    if (it) setTimeout(() => openPost(it, true), 300)
  }
})
onUnload(() => {
  clearTimeout(detailOpenTimer)
  clearTimeout(detailCloseTimer)
  if (io) io.disconnect()
  if (cbarIo) cbarIo.disconnect()
})

onPullDownRefresh(() => {
  setTimeout(() => {
    resetShown()
    posts.value = plazaPosts.slice().sort(() => Math.random() - 0.5).map(decoratePost)
    page.value = 1
    ended.value = false
    uni.stopPullDownRefresh()
    nextTick(() => setTimeout(observeCards, 30))
  }, 600)
})
onReachBottom(() => {
  if (cat.value === 1 || loading.value || ended.value) return
  loading.value = true
  setTimeout(() => {
    posts.value = posts.value.concat(morePosts(page.value).map(decoratePost))
    page.value += 1
    loading.value = false
    if (page.value > 3) ended.value = true
    nextTick(() => setTimeout(observeCards, 30))
  }, 600)
})
onShareAppMessage(() => (detail.value
  ? { title: detail.value.title, path: '/pages/plaza/index?post=' + detail.value.id }
  : { title: '广场：正在报名的公开赛', path: '/pages/plaza/index' }))

/* ---------- 底部导航 ---------- */
const navItems = [
  { key: 'me', label: '我的', icon: 'user' },
  { key: 'plaza', label: '广场', icon: 'compass' },
  { key: 'rank', label: '排行', icon: 'chart-bar' },
  { key: 'host', label: '成为主办方', icon: 'flag' }
]
const navActive = ref(1)
const NAV_TIPS = ['', '', '排行页面待接入', '主办方申请待接入']
function onNav(i) {
  if (i === 0) return uni.redirectTo({ url: '/pages/profile/index' })
  if (i === 3) return uni.redirectTo({ url: '/pages/host/index' })
  navActive.value = i
  if (NAV_TIPS[i]) setTimeout(() => toast(NAV_TIPS[i]), 420)
}
</script>

<style>
.page { position: relative; min-height: 100vh; background: #181A20; padding-bottom: calc(300rpx + env(safe-area-inset-bottom)); }
.press { opacity: .8; transform: scale(.96); }
.press-soft { opacity: .85; }
.font-sys { font-family: "PingFang SC", "Microsoft YaHei", sans-serif !important; font-weight: 600 !important; letter-spacing: 0 !important; }
.av { display: flex; align-items: center; justify-content: center; flex: none; border-radius: 50%; font-weight: 500; }
.av-36 { width: 36rpx; height: 36rpx; font-size: 18rpx; }
.av-56 { width: 72rpx; height: 72rpx; font-size: 28rpx; }

/* 紧凑标题栏 */
.cbar-line { position: absolute; left: 0; top: 72px; width: 1px; height: 1px; pointer-events: none; }
.cbar {
  position: fixed; z-index: 30; left: 0; right: 0; top: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  background: #181A20; opacity: 0; transform: translateY(-12rpx); transition: opacity .25s ease, transform .3s ease; pointer-events: none;
}
.cbar-on { opacity: 1; transform: translateY(0); }
.cbar-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; color: #FFFFFF; }

/* 大标题与数字锚点 */
.head { padding-left: 32rpx; padding-right: 32rpx; }
.head-row { display: flex; align-items: center; box-sizing: border-box; }
.h-back { width: 64rpx; height: 64rpx; flex: none; margin-right: 20rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.h-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 68rpx; line-height: 1; letter-spacing: 4rpx; color: #FFFFFF; }
.h-stat { display: flex; align-items: center; margin-top: 12rpx; }
.h-num { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 200; font-size: 132rpx; line-height: 1; letter-spacing: -2rpx; color: #F2F2EE; }
.h-stat-t { margin-left: 20rpx; display: flex; flex-direction: column; }
.h-stat-a { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }
.h-stat-b { margin-top: 6rpx; font-size: 24rpx; color: #6B7280; }

/* 分类 */
.chips { position: sticky; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 20rpx 32rpx; background: #181A20; }
.chips-track { position: relative; display: flex; padding: 6rpx; border-radius: 999rpx; background: #1F222A; }
.chip-ind {
  position: absolute; left: 6rpx; top: 6rpx; width: 132rpx; height: 60rpx; border-radius: 999rpx; background: #F2F2EE;
  transition: transform .42s cubic-bezier(.34, 1.36, .64, 1);
}
.chip { position: relative; width: 132rpx; height: 60rpx; margin-right: 4rpx; display: flex; align-items: center; justify-content: center; }
.chip-t { font-size: 26rpx; color: #9CA3AF; transition: color .25s ease; }
.chip-t-on { color: #181A20; font-weight: 500; }
.chips-search { width: 72rpx; height: 72rpx; border-radius: 50%; background: #1F222A; display: flex; align-items: center; justify-content: center; }

/* 正在报名 */
.sec-h { display: flex; align-items: baseline; justify-content: space-between; padding: 16rpx 32rpx 0; }
.sec-h-feed { padding-top: 40rpx; padding-bottom: 4rpx; }
.sec-t { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }
.sec-s { font-size: 24rpx; color: #6B7280; }
.feat { height: 452rpx; margin-top: 20rpx; }
.fm {
  height: 432rpx; margin-right: 20rpx; border-radius: 32rpx; overflow: hidden; background: #1F222A;
  transform: scale(.92); opacity: .55; transition: transform .45s cubic-bezier(.2, .8, .2, 1), opacity .45s ease;
}
.fm-cur { transform: scale(1); opacity: 1; }
.fm-press { transform: scale(.97); }
.fm-cover { position: relative; height: 232rpx; }
.fm-line { position: absolute; left: 20rpx; bottom: 20rpx; display: flex; align-items: center; padding: 8rpx 18rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .55); }
.fm-line-n { font-size: 22rpx; font-weight: 500; color: #FFFFFF; }
.fm-line-t { margin-left: 12rpx; font-size: 22rpx; color: #E5E7EB; }
.fm-flag { position: absolute; right: 20rpx; top: 20rpx; display: flex; align-items: center; padding: 6rpx 14rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .6); }
.fm-flag-t { margin-left: 6rpx; font-size: 22rpx; color: #FFC53A; }
.fm-body { padding: 22rpx 28rpx 0; }
.fm-name { display: block; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; line-height: 1.2; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-loc { margin-top: 8rpx; display: flex; align-items: center; }
.fm-loc-t { margin-left: 6rpx; font-size: 22rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-row { margin-top: 14rpx; display: flex; align-items: flex-end; justify-content: space-between; }
.fm-when { display: flex; align-items: baseline; }
.fm-time { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 52rpx; line-height: 1; color: #F2F2EE; }
.fm-date { margin-left: 12rpx; font-size: 24rpx; color: #9CA3AF; }
.fm-sign { width: 168rpx; }
.fm-sign-v { display: flex; align-items: baseline; justify-content: flex-end; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 34rpx; color: #F2F2EE; }
.fm-sign-c { font-size: 26rpx; color: #8F8F8A; }
.fm-bar { margin-top: 10rpx; height: 6rpx; border-radius: 3rpx; background: #2A2D36; overflow: hidden; }
.fm-bar-fill { height: 6rpx; background: #F2F2EE; }
.dots { display: flex; justify-content: center; margin-top: 8rpx; }
.dot { width: 10rpx; height: 10rpx; margin: 0 6rpx; border-radius: 5rpx; background: #35383F; transition: width .35s cubic-bezier(.34, 1.56, .64, 1), background .3s ease; }
.dot-on { width: 32rpx; background: #F2F2EE; }

/* 瀑布流 */
.feed { display: flex; justify-content: space-between; padding: 20rpx 32rpx 0; transition: opacity .16s ease; }
.feed-swap { opacity: 0; }
.col { width: 333rpx; }
.card {
  margin-bottom: 20rpx; border-radius: 24rpx; overflow: hidden; background: #1F222A;
  opacity: 0; transform: translateY(56rpx) scale(.98);
  transition: opacity .5s ease, transform .65s cubic-bezier(.2, .8, .2, 1);
}
.card-in { opacity: 1; transform: translateY(0) scale(1); }
.card.card-press { transform: scale(.965); transition-duration: .18s; transition-delay: 0ms; }

.pc-cover { width: 100%; }
.pc-body { padding: 18rpx 20rpx 20rpx; }
.pc-title { display: block; font-size: 27rpx; font-weight: 500; line-height: 1.45; color: #F2F2EE; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pc-meta { margin-top: 14rpx; display: flex; align-items: center; }
.pc-author { margin-left: 10rpx; flex: 1; min-width: 0; font-size: 22rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-like { display: flex; align-items: center; }
.pc-like-n { margin-left: 4rpx; font-size: 22rpx; color: #6B7280; }

/* 海报广告 */
.card-ad { background: transparent; }
.ad { position: relative; height: 453rpx; padding: 28rpx; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
.ad-festival { background: #DC0000; }
.ad-camp { background: #17302A; }
.ad-shop { background: #F3EEE6; }
.ad-tag { position: absolute; left: 20rpx; top: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(0, 0, 0, .28); font-size: 20rpx; color: #FFFFFF; }
.ad-shop .ad-tag { background: rgba(24, 26, 32, .12); color: #181A20; }
.ad-deco { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
.ad-d1, .ad-d2, .ad-d3, .ad-d4 { position: absolute; }
.ad-festival .ad-d1, .ad-festival .ad-d2, .ad-festival .ad-d3, .ad-festival .ad-d4 { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(243, 238, 230, .22); }
.ad-festival .ad-d1 { right: 40rpx; top: 56rpx; } .ad-festival .ad-d2 { right: 136rpx; top: 56rpx; }
.ad-festival .ad-d3 { right: 40rpx; top: 152rpx; } .ad-festival .ad-d4 { right: 136rpx; top: 152rpx; }
.ad-camp .ad-d1 { right: 28rpx; top: 40rpx; width: 120rpx; height: 168rpx; border-radius: 14rpx; background: #F3EEE6; transform: rotate(14deg); }
.ad-camp .ad-d2 { right: 104rpx; top: 52rpx; width: 120rpx; height: 168rpx; border-radius: 14rpx; background: #B80000; border: 6rpx solid #F3B3B3; box-sizing: border-box; transform: rotate(-8deg); }
.ad-camp .ad-d3 { right: 72rpx; top: 104rpx; width: 34rpx; height: 34rpx; background: #DC0000; transform: rotate(59deg); }
.ad-shop .ad-d1 { right: 40rpx; top: 52rpx; width: 120rpx; height: 120rpx; border-radius: 26rpx; background: #181A20; transform: rotate(-12deg); }
.ad-shop .ad-d2 { right: 82rpx; top: 94rpx; width: 34rpx; height: 34rpx; border-radius: 50%; background: #DC0000; }
.ad-shop .ad-d3 { right: 150rpx; top: 150rpx; width: 84rpx; height: 84rpx; border-radius: 20rpx; background: #2A2D36; transform: rotate(14deg); }
.ad-text { position: relative; display: flex; flex-direction: column; align-items: flex-start; }
.ad-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 56rpx; line-height: 1.1; color: #F3EEE6; }
.ad-sub { margin-top: 12rpx; font-size: 22rpx; line-height: 1.5; color: rgba(243, 238, 230, .85); }
.ad-shop .ad-title { color: #181A20; }
.ad-shop .ad-sub { color: #4B5060; }
.ad-cta { margin-top: 20rpx; height: 52rpx; padding: 0 20rpx; border-radius: 999rpx; background: #F3EEE6; display: flex; align-items: center; }
.ad-shop .ad-cta { background: #181A20; }
.ad-cta-t { margin-right: 6rpx; font-size: 22rpx; font-weight: 500; color: #181A20; }
.ad-shop .ad-cta-t { color: #F3EEE6; }

/* 文字型赛事卡片：象牙白，对照参考里的排版卡片 */
.card-match { background: #F2F2EE; }
.mc { height: 300rpx; padding: 22rpx 22rpx 24rpx; box-sizing: border-box; display: flex; flex-direction: column; }
.mc-top { display: flex; align-items: flex-start; justify-content: space-between; }
.mc-srv { font-size: 20rpx; line-height: 1.3; color: #6B6A64; }
.mc-title { margin-top: auto; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 44rpx; line-height: 1.15; color: #181A20; }
.mc-loc { margin-top: 8rpx; font-size: 20rpx; color: #6B6A64; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-meta { margin-top: 16rpx; padding-top: 14rpx; border-top: 2rpx solid #DEDBD2; display: flex; align-items: baseline; justify-content: space-between; }
.mc-when { display: flex; align-items: baseline; }
.mc-time { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 34rpx; color: #181A20; }
.mc-date { margin-left: 8rpx; font-size: 20rpx; color: #6B6A64; }
.mc-sign { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 28rpx; color: #DC0000; }

.more { padding: 12rpx 0 0; text-align: center; }
.more-t { font-size: 24rpx; color: #6B7280; }

/* 帖子详情 */
.dt { position: fixed; z-index: 200; left: 0; top: 0; right: 0; bottom: 0; }
.dt-bg { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: #181A20; opacity: 0; transition: opacity .35s ease; }
.dt-on .dt-bg { opacity: 1; }
.dt-move { position: absolute; left: 0; top: 0; right: 0; bottom: 0; transition: transform .45s cubic-bezier(.34, 1.3, .64, 1); }
.dt-drag { transition: none; }
.dt-ghost { position: absolute; z-index: 1; overflow: hidden; background-color: #1F222A; }
.dt-ghost-cv { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
.dt-scroll { position: absolute; z-index: 2; left: 0; top: 0; right: 0; bottom: 0; box-sizing: border-box; opacity: 0; transform: translateY(80rpx); transition: opacity .35s ease, transform .5s cubic-bezier(.2, .8, .2, 1); }
.dt-on .dt-scroll { opacity: 1; transform: translateY(0); transition-delay: .16s; }
.dt-sheet { min-height: 100vh; padding: 16rpx 36rpx 0; background: #181A20; border-radius: 48rpx 48rpx 0 0; }
.dt-grab { width: 72rpx; height: 8rpx; margin: 0 auto 28rpx; border-radius: 4rpx; background: #35383F; }
.dt-title { display: block; font-size: 44rpx; font-weight: 600; line-height: 1.35; color: #FFFFFF; }
.dt-author { margin-top: 28rpx; display: flex; align-items: center; }
.dt-author-t { margin-left: 20rpx; display: flex; flex-direction: column; }
.dt-name { font-size: 28rpx; font-weight: 500; color: #E5E7EB; }
.dt-time { margin-top: 4rpx; font-size: 22rpx; color: #6B7280; }
.dt-p { display: block; margin-top: 28rpx; font-size: 30rpx; line-height: 1.85; color: #D1D5DB; }
.dt-match { margin-top: 36rpx; padding: 20rpx; border-radius: 24rpx; background: #1F222A; display: flex; align-items: center; }
.dt-match-cv { width: 128rpx; height: 88rpx; flex: none; border-radius: 16rpx; }
.dt-match-t { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; display: flex; flex-direction: column; }
.dt-match-n { font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.dt-match-s { margin-top: 6rpx; font-size: 22rpx; color: #9CA3AF; }
.dt-pad { height: calc(220rpx + env(safe-area-inset-bottom)); }
.dt-close {
  position: absolute; z-index: 5; left: 32rpx; width: 72rpx; height: 72rpx; border-radius: 50%; box-sizing: border-box;
  background: rgba(14, 15, 19, .6); border: 1rpx solid rgba(255, 255, 255, .14); display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity .3s ease .2s;
}
.dt-on .dt-close { opacity: 1; }
.dt-bar {
  position: absolute; z-index: 5; left: 0; right: 0; bottom: 0; display: flex; align-items: center;
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); background: #181A20; border-top: 1px solid #24272F;
  transform: translateY(100%); transition: transform .45s cubic-bezier(.2, .8, .2, 1);
}
.dt-on .dt-bar { transform: translateY(0); transition-delay: .2s; }
.dt-act { display: flex; align-items: center; margin-right: 40rpx; }
.dt-act-t { margin-left: 10rpx; font-size: 26rpx; color: #E5E7EB; }
.dt-share {
  margin: 0 0 0 auto; padding: 0 32rpx; height: 80rpx; line-height: normal; border-radius: 999rpx; background: #DC0000;
  display: flex; align-items: center; justify-content: center;
}
.dt-share::after { border: none; }
.dt-share-t { margin-left: 10rpx; font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.pop-0 { animation: pop-0 .42s cubic-bezier(.34, 1.56, .64, 1); }
.pop-1 { animation: pop-1 .42s cubic-bezier(.34, 1.56, .64, 1); }
@keyframes pop-0 { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes pop-1 { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .card, .fm, .dt-move, .dt-scroll, .dt-bar, .chip-ind, .dot, .cbar { transition: none; }
  .pop-0, .pop-1 { animation: none; }
}
</style>
