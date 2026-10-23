<template>
  <page-meta page-style="overflow:hidden"></page-meta>
  <view class="rc" :class="{ 'rc-compact': L.compact }">
    <view class="rc-bg">
      <view v-for="(l, k) in bgLayers" :key="k" class="rc-bg-l" :class="{ 'rc-bg-on': bgOn === k, 'rc-bg-gray': l.gray }">
        <z-fit-img v-if="l.src" :src="l.src" mode="aspectFill" :w="l.w" :h="l.h" :bg="l.tint" />
      </view>
      <view class="rc-bg-glass"></view>
    </view>

    <view class="rc-nav" :style="'padding-top:' + nav.statusBar + 'px;height:' + nav.navH + 'px;padding-right:' + (nav.capsuleW + px(40)) + 'px'">
      <view class="rc-gbtn" hover-class="rc-press" @tap.stop="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
      <text class="rc-nav-t">遥控切屏</text>
      <view class="rc-help-btn" hover-class="rc-press" @tap.stop="openHelp"><z-icon name="help-circle" :size="18" color="rgba(255,255,255,.8)" /></view>
    </view>

    <!-- 大屏区域只展示设备当前画面；只有这里的左右滑动会切换设备 -->
    <view class="rc-stage-head" :style="'top:' + (L.flowTop - px(56)) + 'px'">
      <view class="rc-live-label"><view class="rc-live-dot" :class="{ 'rc-live-dot-off': !cur || !online(cur) }"></view><text>设备当前画面</text></view>
      <view class="rc-screen-nav">
        <button class="rc-screen-arrow" :class="{ 'rc-screen-arrow-off': busy || ci === 0 }" :disabled="busy || ci === 0" aria-label="上一台大屏" @tap.stop="go(-1)"><z-icon name="chevron-left" :size="17" color="#FFFFFF" /></button>
        <text class="rc-screen-count">{{ queue.length ? ci + 1 : 0 }} / {{ queue.length }}</text>
        <button class="rc-screen-arrow" :class="{ 'rc-screen-arrow-off': busy || ci >= queue.length - 1 }" :disabled="busy || ci >= queue.length - 1" aria-label="下一台大屏" @tap.stop="go(1)"><z-icon name="chevron-right" :size="17" color="#FFFFFF" /></button>
      </view>
    </view>
    <view class="rc-glow" :style="glowStyle"></view>
    <view class="rc-flow" :class="{ 'rc-flow-drag': flowDragging }" :style="'top:' + L.flowTop + 'px;height:' + L.flowH + 'px'" @touchstart="onSwipeStart" @touchmove="onSwipeMove" @touchend="onSwipeEnd" @touchcancel="onSwipeCancel">
      <view v-if="loaded && !queue.length" class="rc-empty" :style="'width:' + L.W + 'px;height:' + L.H + 'px;margin-left:' + -L.W / 2 + 'px'">
        <text class="rc-empty-t">{{ devices.length ? '没有符合筛选的大屏' : '还没有绑定大屏' }}</text>
        <view class="rc-chip-btn" hover-class="rc-press" @tap.stop="devices.length ? setFilter('all') : toDevices()"><text class="rc-chip-btn-t">{{ devices.length ? '查看全部大屏' : '去设备管理' }}</text></view>
      </view>
      <view v-for="(d, i) in queue" :key="d.id" class="rc-scr" :class="{ 'rc-scr-cur': i === ci }" :style="scrStyle(d, i)" @tap.stop="tapScreen(i)">
        <z-tv-screen :content="screenContent(d)" :groups="groups" :device-id="d.id" :last-scene="d.coverScene" :resolution="screenResolutionOf(d)" :preview-width="screenBox(d).w" :online="online(d)" :loading="!!casting[d.id]" :color="selCat.color" />
        <view v-if="allMode && online(d)" class="rc-scr-chk"><z-icon name="check" :size="12" :stroke="3" color="#FFFFFF" /></view>
      </view>
    </view>

    <view class="rc-info" :class="{ 'rc-info-up': filterOpen }" :style="'top:' + L.infoTop + 'px;height:' + L.infoH + 'px'">
      <button class="rc-sq" :class="{ 'rc-sq-on': filterOpen }" :disabled="busy" hover-class="rc-press" @tap.stop="toggleFilter">
        <z-icon name="filter" :size="18" :color="filterOpen ? '#0B0C10' : '#FFFFFF'" /><text>筛选</text>
        <view v-if="filterKey !== 'all'" class="rc-sq-dot" :style="'background:' + filterColor"></view>
      </button>
      <view class="rc-ttl">
        <text class="rc-ttl-n">{{ titleText }}</text>
        <text class="rc-ttl-st-t" :class="{ 'rc-ttl-off': cur && !online(cur) && !allMode }">{{ statusLine }}</text>
      </view>
      <button class="rc-sq" :disabled="busy" hover-class="rc-press" @tap.stop="openList"><z-icon name="list-details" :size="18" color="#FFFFFF" /><text>设备</text></button>
    </view>

    <view v-if="filterOpen" class="rc-catch" @tap.stop="filterOpen = false"></view>
    <view v-if="filterOpen" class="rc-bubs" :style="'top:' + (L.infoTop + px(32)) + 'px'">
      <view v-for="(t, k) in filterTags" :key="t.key" class="rc-bub" :class="{ 'rc-bub-on': filterKey === t.key }" :style="'animation-delay:' + k * 45 + 'ms'" hover-class="rc-press" @tap.stop="setFilter(t.key)">
        <view class="rc-bub-dot" :style="'background:' + t.color"></view><text class="rc-bub-t">{{ t.label }}</text><text class="rc-bub-n">{{ t.n }}</text>
      </view>
    </view>

    <!-- 罗盘始终保留待投放选择；当前设备画面和待投放内容各自独立 -->
    <view class="rc-controls" :style="'top:' + L.controlsTop + 'px;height:' + L.controlsH + 'px;--rc-accent:' + hoverCat.color + ';--category-color:' + hoverCat.color">
      <view class="rc-order" :style="'height:' + L.orderH + 'px'">
        <view class="rc-order-line">
          <text class="rc-order-eyebrow">{{ busy ? '正在投放' : dialDragging ? '松手选中' : '待投放' }}</text>
          <text class="rc-order-content">{{ categoryLabel(hoverCat.key) }}</text>
          <z-icon name="arrow-right" :size="14" :color="hoverCat.color" />
          <text class="rc-order-target">{{ targetLabel }}</text>
        </view>
        <button class="rc-hint" :class="{ 'rc-hint-act': hintAction }" :disabled="busy || dialDragging || !hintAction" @tap.stop="tapHint"><text class="rc-hint-t">{{ dialDragging ? '左右拖动，松手后选择生效' : hintText }}</text><z-icon v-if="hintAction && !dialDragging" name="chevron-right" :size="12" color="#E1E8F6" /></button>
      </view>

      <view class="rc-compass" :style="'height:' + L.compassH + 'px'">
        <view class="rc-dial" :class="{ 'rc-dial-busy': busy }" @touchstart="dialStart" @touchmove="dialMove" @touchend="dialEnd" @touchcancel="dialCancel" @mousedown="dialMouseDown" @mousemove="dialMouseMove" @mouseup="dialMouseUp" @mouseleave="dialMouseCancel">
          <view class="rc-rot" :class="{ 'rc-rot-drag': dialDragging }" :style="'top:' + (L.tickTop + L.R) + 'px;transform:rotate(' + rot + 'deg)'">
            <view v-for="mark in TICKS" :key="'tick-' + mark.angle" class="rc-tick-w" :style="'transform:rotate(' + mark.angle + 'deg)'"><view class="rc-tick" :class="{ 'rc-tick-major': mark.major }" :style="tickStyle(mark)"></view></view>
            <view v-for="(c, i) in CAST_CATS" :key="c.key" class="rc-node-w" :style="'transform:rotate(' + i * STEP + 'deg)'">
              <button class="rc-node-button" :class="{ 'rc-node-selected': i === hoverIdx }" :style="nodeStyle(c, i)" :disabled="busy || i === hoverIdx" :aria-label="'选择' + categoryLabel(c.key)" @tap.stop="tapCategory(i)"><view class="rc-node-disc"><z-icon :name="categoryIcon(c.key)" :size="19" :stroke="1.9" :color="c.color" /></view></button>
            </view>
          </view>
          <view class="rc-dial-index" :style="'top:' + (L.tickTop - px(8)) + 'px'"><view class="rc-dial-index-dot"></view></view>
        </view>
        <view class="rc-cast-wrap rc-sel" :style="'top:' + (L.dialCenter + L.castOffset - L.castH / 2) + 'px;width:' + L.castW + 'px;height:' + L.castH + 'px;margin-left:' + -L.castW / 2 + 'px'">
          <view v-if="selCat.hold && charge > 0" class="rc-charge-ring" :style="chargeStyle"></view>
          <button class="rc-cast" :class="{ 'rc-cast-dis': castDisabled && !busy, 'rc-cast-down': pressing, 'rc-cast-busy': busy, 'rc-cast-success': acknowledged }" :disabled="castDisabled" :aria-label="castAriaLabel" @tap.stop="castTap" @touchstart="castDown" @touchmove="castMove" @touchend="castUp" @touchcancel="castCancel" @mousedown="castMouseDown" @mouseup="castMouseUp" @mouseleave="castMouseCancel" @keydown="castKeyDown" @keyup="castKeyUp">
            <view class="rc-cast-rim"></view>
            <view class="rc-cast-face">
              <view class="rc-cast-icon">
                <view v-if="busy" class="rc-spinner"></view>
                <template v-else>
                  <z-icon :name="castIcon" :size="L.compact ? 32 : 37" :stroke="1.8" :color="!canCast ? '#798396' : acknowledged ? '#8DE9BC' : hoverCat.color" />
                  <view v-if="selCat.hold && pressing" class="rc-cast-ink" :style="chargeInkStyle" aria-hidden="true"><z-icon :name="castIcon" :size="L.compact ? 32 : 37" :stroke="2.8" color="#F2F0FF" /></view>
                </template>
              </view>
              <text class="rc-cast-label">{{ castLabel }}</text>
            </view>
            <view class="rc-cast-sheen"></view>
          </button>
        </view>
      </view>

      <view class="rc-categories" role="group" aria-label="投放分类">
        <button v-for="(c, i) in CAST_CATS" :key="c.key" class="rc-category" :class="{ 'rc-category-on': i === hoverIdx, 'rc-category-busy': busy }" :style="'--category-color:' + c.color" :disabled="busy" :aria-pressed="i === hoverIdx" :aria-label="'切换到' + categoryLabel(c.key)" @tap.stop="tapCategory(i)">
          <text class="rc-category-label">{{ c.label }}</text><view class="rc-category-dot"></view>
        </button>
      </view>

      <view class="rc-feedback" :class="'rc-feedback-' + result.state" aria-live="polite">
        <z-icon v-if="result.state !== 'idle'" :name="result.state === 'success' ? 'check' : result.state === 'sending' ? 'arrows-exchange' : 'alert-triangle'" :size="14" :color="result.state === 'success' ? '#67DDA7' : result.state === 'sending' ? '#BBC7DC' : '#FFB58B'" />
        <text class="rc-feedback-text">{{ feedbackText }}</text>
        <button v-if="result.failed.length && !busy" class="rc-retry" @tap.stop="retryCast">重试</button>
        <button v-else-if="!canCast && !busy" class="rc-retry" @tap.stop="refreshDevices">{{ refreshing ? '刷新中' : '刷新' }}</button>
      </view>
    </view>

    <!-- 封面流：轮播海报的海报组文件夹 / TV 主题。点一个：转到中间、选中、收起；点别处：保持原来的选择、收起 -->
    <view v-if="picker" class="rc-pk" :class="{ 'rc-pk-on': pickerOn }" @touchstart="pkStart" @touchmove="pkMove" @touchend="pkEnd" @touchcancel="pkEnd">
      <view class="rc-pk-mask" @tap.stop="closePicker"></view>
      <view class="rc-pk-head" :style="'top:' + pickerHeadTop + 'px'">
        <text class="rc-pk-t">{{ picker === 'poster' ? '选择海报组' : 'TV 主题' }}</text>
        <text class="rc-pk-s">{{ picker === 'poster' ? '只有审核通过的海报组才能投放' : '房间的主题在创建比赛页设置' }}</text>
      </view>
      <view class="rc-cf" :class="{ 'rc-cf-drag': pkDragging }" :style="'top:' + L.pickerCenter + 'px'">
        <block v-if="picker === 'poster'">
          <view v-if="!castable.length" class="rc-pk-empty">
            <text class="rc-pk-empty-t">还没有审核通过的海报组</text>
            <view class="rc-chip-btn" hover-class="rc-press" @tap.stop="toPosters"><text class="rc-chip-btn-t">去海报广告</text></view>
          </view>
          <view v-for="(g, i) in castable" :key="g.id" class="rc-cf-i" :style="cfStyle(i)" @tap.stop="pkTap(i)">
            <view class="rc-fd" :class="{ 'rc-fd-sel': sel.cat === 'poster' && sel.groupId === g.id }">
              <view class="rc-fd-back"></view>
              <view class="rc-fd-recess"></view>
              <view v-for="(im, k) in g.images.slice(0, 4)" :key="im.id" class="rc-fd-p" :style="paperStyle(k, g.images.length)">
                <z-fit-img :src="imgSrc(im)" mode="aspectFill" :w="1920" :h="1080" bg="#D9D3C8" />
              </view>
              <view class="rc-fd-front" :style="pocketStyle">
                <view class="rc-fd-reflection"></view>
                <view class="rc-fd-caption"><text class="rc-fd-n">{{ g.name }}</text><text class="rc-fd-m">{{ g.images.length }} 张海报{{ g.status === 'live' ? ' · 播放中' : '' }}</text></view>
              </view>
              <view class="rc-fd-lip" :style="pocketLipStyle"></view>
              <view v-if="sel.cat === 'poster' && sel.groupId === g.id" class="rc-fd-chk"><z-icon name="check" :size="13" :stroke="2.5" color="#1A1724" /></view>
            </view>
          </view>
        </block>
        <block v-else>
          <view v-for="(t, i) in TV_THEMES" :key="t.key" class="rc-cf-i rc-cf-th" :style="cfStyle(i)" @tap.stop="pkTap(i)">
            <view class="rc-th">
              <text class="rc-th-n">{{ t.name }}</text>
              <text class="rc-th-d">{{ t.desc }}</text>
              <view v-if="t.key === ROOM_THEME" class="rc-th-tag"><text>当前房间在用</text></view>
            </view>
          </view>
        </block>
      </view>
      <text class="rc-pk-hint" :style="'top:' + (L.pickerCenter + px(picker === 'poster' ? 270 : 190)) + 'px'">{{ picker === 'poster' ? '左右滑动浏览，点一下选中海报组' : '左右滑动浏览主题，点空白处返回' }}</text>
    </view>

    <!-- 大屏胶囊列表：整页变暗，从上方滑入；点任意胶囊切过去，点别处收起 -->
    <view v-if="listShown" class="rc-dl" :class="{ 'rc-dl-on': listOn }">
      <view class="rc-dl-mask" @tap.stop="closeList"></view>
      <view class="rc-dl-panel" :style="'padding-top:' + (nav.statusBar + nav.navH) + 'px'">
        <view class="rc-dl-head"><text class="rc-dl-t">选择大屏</text><text class="rc-dl-s">{{ onlineCount }} 台在线 · 共 {{ devices.length }} 台</text></view>
        <scroll-view scroll-y class="rc-dl-list" :scroll-into-view="'cap-' + (cur ? cur.id : '')">
          <view
            v-for="d in devices"
            :id="'cap-' + d.id"
            :key="d.id"
            class="rc-cap-bar"
            :class="{ 'rc-cap-off': !online(d), 'rc-cap-cur': !allMode && cur && d.id === cur.id, 'rc-cap-all': allMode && online(d) }"
            hover-class="rc-press-soft"
            @tap.stop="pickDevice(d)"
          >
            <view class="rc-cap-cv"><z-fit-img :src="capCover(d).src" mode="aspectFill" :w="capCover(d).w" :h="capCover(d).h" :bg="capCover(d).tint" /></view>
            <view class="rc-cap-mask" :style="capMask(d)"></view>
            <view class="rc-cap-ic" :class="online(d) ? 'rc-cap-ic-on' : 'rc-cap-ic-off'">
              <z-icon :name="online(d) ? 'device-tv' : 'device-tv-off'" :size="20" :color="online(d) ? '#4CB582' : '#FF8A8A'" />
            </view>
            <view class="rc-cap-main"><text class="rc-cap-n">{{ d.name }}</text><text class="rc-cap-s">{{ capSub(d) }}</text></view>
            <view v-if="!allMode && cur && d.id === cur.id" class="rc-cap-tag"><text>当前</text></view>
            <view v-if="allMode && online(d)" class="rc-cap-chk"><z-icon name="check" :size="14" :stroke="3" color="#FFFFFF" /></view>
          </view>
        </scroll-view>
        <view class="rc-dl-all" :class="{ 'rc-dl-all-on': allMode }" hover-class="rc-press" @tap.stop="toggleAll">
          <z-icon name="checks" :size="18" :color="allMode ? '#0B0C10' : '#FFFFFF'" />
          <text class="rc-dl-all-t">{{ allMode ? '取消全选，回到单台' : '一键选中全部 ' + onlineCount + ' 台在线大屏' }}</text>
        </view>
        <view class="rc-dl-grab"></view>
      </view>
    </view>

    <!-- 中央提示：TV 主题不能在这里切换 -->
    <view v-if="cpop.show" class="rc-cpop" :class="{ 'rc-cpop-on': cpop.on }" @tap.stop="hideCpop">
      <view class="rc-cpop-card">
        <view class="rc-cpop-ic"><z-icon name="alert-triangle" :size="22" color="#FFB547" /></view>
        <text class="rc-cpop-t">{{ cpop.title }}</text>
        <text class="rc-cpop-d">{{ cpop.text }}</text>
      </view>
    </view>

    <!-- 操作说明 -->
    <view v-if="helpOpen" class="rc-help">
      <view class="rc-help-mask" @tap.stop="closeHelp"></view>
      <view class="rc-help-card">
        <view class="rc-help-x" hover-class="rc-press" @tap.stop="closeHelp"><z-icon name="x" :size="16" color="rgba(255,255,255,.7)" /></view>
        <text class="rc-help-t">遥控切屏怎么用</text>
        <scroll-view scroll-y class="rc-help-list">
          <view v-for="h in HELP" :key="h.title" class="rc-help-i">
            <view class="rc-help-ic"><z-icon :name="h.icon" :size="18" color="#FFFFFF" /></view>
            <view class="rc-help-main"><text class="rc-help-it">{{ h.title }}</text><text class="rc-help-id">{{ h.text }}</text></view>
          </view>
        </scroll-view>
        <view class="rc-help-ok" hover-class="rc-press" @tap.stop="closeHelp"><text class="rc-help-ok-t">知道了</text></view>
      </view>
    </view>

    <z-pop :show="pop.show" :text="pop.text" :icon="pop.icon" :tone="pop.tone" />
  </view>
</template>

<script setup>
// 遥控切屏：沉浸式遥控器。选一台（或全部）大屏 → 用罗盘选投放内容 → 按下中间的按键发送切屏指令
import { ref, reactive, computed, watch } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZPop from '@/components/z-pop/z-pop.vue'
import ZFitImg from '@/components/z-fit-img/z-fit-img.vue'
import ZTvScreen from '@/components/z-tv-screen/z-tv-screen.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { svgUri } from '@/common/svg.js'
import { coverArt } from '@/common/cover-art.js'
import { requireLogin } from '@/common/auth.js'
import { requireHost } from '@/common/cert.js'
import { listDevices, isOnline, castToDevice } from '@/common/devices.js'
import { listGroups, playOn, stopOn } from '@/common/posters.js'
import { fitScreen, posterResolution, screenResolution } from '@/common/poster-display.js'
import { CAST_CATS, catOf, liveOf, sameContent, contentText, contentCover, castFields } from '@/common/screens.js'
import { TV_THEMES, ROOM_THEME, HELP } from '@/mock/remote.js'

const nav = getNavMetrics()
const px = (rpx) => uni.upx2px(rpx)
const toast = (title) => uni.showToast({ title, icon: 'none' })
const buzz = (type = 'light') => { try { uni.vibrateShort({ type }) } catch (e) {} }
const goBack = () => goBackOrHome()

/* ---------- 布局：大屏居于上半部中央，底部完整露出内容和操作摘要 ---------- */
const sys = uni.getSystemInfoSync()
const safeB = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
const STEP = 22
const TICKS = []
// 密集短刻度和分类长刻度共同构成轮廓，不再绘制连续圆弧。
for (let a = -36; a <= (CAST_CATS.length - 1) * STEP + 36; a += 1.5) {
  if (!CAST_CATS.some((c, i) => Math.abs(a - i * STEP) < 1)) TICKS.push({ angle: a, major: false })
}
CAST_CATS.forEach((c, i) => TICKS.push({ angle: i * STEP, major: true }))
const L = (() => {
  const compact = sys.windowHeight - safeB - nav.statusBar < 720
  const controlsH = px(compact ? 616 : 648)
  const controlsTop = sys.windowHeight - safeB - px(24) - controlsH
  const navBottom = nav.statusBar + nav.navH + px(28)
  const infoH = px(compact ? 112 : 132)
  const headGap = px(compact ? 48 : 64)
  const reserve = headGap + infoH + px(52)
  const W = Math.min(sys.windowWidth - px(32), Math.max(px(320), (controlsTop - navBottom - reserve) * 16 / 9))
  const H = Math.round(W * 9 / 16)
  const spare = Math.max(0, controlsTop - navBottom - H - reserve)
  const flowTop = navBottom + headGap + spare * 0.65
  const flowH = H + px(12)
  const infoTop = flowTop + flowH + px(16)
  const tickTop = px(12)
  const R = px(600)
  const nodeR = R - px(160)
  return { compact, W, H, flowTop, flowH, infoTop, infoH, controlsTop, controlsH, orderH: px(compact ? 100 : 112), compassH: px(compact ? 332 : 348), dialCenter: tickTop + R - nodeR, castOffset: px(compact ? 42 : 50), tickTop, nodeR, castW: px(compact ? 152 : 164), castH: px(compact ? 236 : 252), R, spacing: W * 0.88, pickerCenter: Math.round(sys.windowHeight * 0.48) }
})()
const busy = ref(false)
const refreshing = ref(false)

/* ---------- 提示条 ---------- */
const pop = reactive({ show: false, text: '', icon: 'check', tone: 'red' })
let popTimer = null
function popMsg(text, icon = 'check', tone = 'red') {
  clearTimeout(popTimer)
  Object.assign(pop, { show: true, text, icon, tone })
  popTimer = setTimeout(() => { pop.show = false }, 2600)
}
const cpop = reactive({ show: false, on: false, title: '', text: '' })
let cpopTimer = null
function showCpop(title, text) {
  clearTimeout(cpopTimer)
  Object.assign(cpop, { show: true, on: false, title, text })
  setTimeout(() => { cpop.on = true }, 20)
  cpopTimer = setTimeout(hideCpop, 3800)
}
function hideCpop() {
  cpop.on = false
  setTimeout(() => { cpop.show = false }, 260)
}

/* ---------- 数据 ---------- */
const devices = ref([])
const groups = ref([])
const loaded = ref(false)
const tick = ref(0)
const online = (d) => (tick.value, isOnline(d))
const onlineCount = computed(() => devices.value.filter(online).length)
async function load() {
  const [list, g] = await Promise.all([listDevices(), listGroups()])
  devices.value = list
  groups.value = g.list
  loaded.value = true
}
const castable = computed(() => groups.value.filter((g) => g.status === 'approved' || g.status === 'live'))
const liveCat = (d) => (online(d) ? liveOf(d, groups.value).cat || 'unknown' : 'offline')
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 60) return Math.max(1, m) + ' 分钟前'
  if (m < 1440) return Math.round(m / 60) + ' 小时前'
  return Math.round(m / 1440) + ' 天前'
}

/* ---------- 设备与罗盘分别处理自己的手势，空白处不切换设备 ---------- */
const overlayOpen = () => !!(picker.value || listShown.value || helpOpen.value || filterOpen.value || cpop.show)

/* ---------- 筛选：按大屏正在显示的内容 ---------- */
const filterKey = ref('all')
const filterOpen = ref(false)
const filterTags = computed(() => {
  const n = {}
  devices.value.forEach((d) => { const k = liveCat(d); n[k] = (n[k] || 0) + 1 })
  const tags = [{ key: 'all', label: '全部', color: '#FFFFFF', n: devices.value.length }]
  CAST_CATS.forEach((c) => { if (n[c.key]) tags.push({ key: c.key, label: c.label, color: c.color, n: n[c.key] }) })
  if (n.offline) tags.push({ key: 'offline', label: '离线', color: '#6B7280', n: n.offline })
  return tags
})
const filterColor = computed(() => (filterTags.value.find((t) => t.key === filterKey.value) || {}).color || '#FFFFFF')
const toggleFilter = () => { if (!busy.value) filterOpen.value = !filterOpen.value }
function setFilter(k) {
  if (busy.value) return
  filterKey.value = k
  filterOpen.value = false
  ci.value = 0
  buzz()
}

/* ---------- 大屏封面流 ---------- */
const queue = computed(() => (filterKey.value === 'all' ? devices.value : devices.value.filter((d) => liveCat(d) === filterKey.value)))
const ci = ref(0)
const cur = computed(() => queue.value[Math.min(ci.value, queue.value.length - 1)] || null)
const allMode = ref(false)
const flowDragging = ref(false)
const dragX = ref(0)
function screenResolutionOf(d) {
  const content = screenContent(d)
  const group = content.cat === 'poster' ? groups.value.find((g) => g.id === content.groupId) : null
  return group ? posterResolution(group, d.resolution) : screenResolution(d.resolution)
}
const screenBox = (d) => fitScreen(screenResolutionOf(d), L.W, L.H)
function scrStyle(d, i) {
  const box = screenBox(d)
  const o = i - ci.value + dragX.value / L.spacing
  const a = Math.abs(o)
  const scale = 1 - Math.min(a, 1.4) * 0.2
  const rotY = Math.max(-26, Math.min(26, -o * 20))
  const op = a > 2.2 ? 0 : 1 - Math.max(0, a - 1) * 0.55
  return `width:${box.w}px;height:${box.h}px;top:${(L.H - box.h) / 2}px;margin-left:${-box.w / 2}px;transform:translateX(${(o * L.spacing).toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)});z-index:${100 - Math.round(a * 10)};opacity:${op.toFixed(2)}`
}
function go(step) {
  if (busy.value) return
  const next = Math.max(0, Math.min(queue.value.length - 1, ci.value + step))
  if (next === ci.value) return
  allMode.value = false
  ci.value = next
  buzz()
}
const tapScreen = (i) => { if (i !== ci.value) go(i - ci.value) }
let sw = null
function onSwipeStart(e) {
  if (busy.value || overlayOpen()) return
  const t = e.touches[0]
  sw = { x: t.clientX, y: t.clientY, on: false }
}
function onSwipeMove(e) {
  if (!sw) return
  const t = e.touches[0]
  const dx = t.clientX - sw.x
  const dy = t.clientY - sw.y
  if (!sw.on && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { sw.on = true; flowDragging.value = true }
  if (!sw.on) return
  const atEdge = (dx > 0 && ci.value === 0) || (dx < 0 && ci.value === queue.value.length - 1)
  dragX.value = atEdge ? dx * 0.3 : dx
}
function onSwipeEnd() {
  if (!sw) return
  const was = sw.on
  sw = null
  if (!was) return
  const d = dragX.value
  flowDragging.value = false
  dragX.value = 0
  if (d < -L.W * 0.18) go(1)
  else if (d > L.W * 0.18) go(-1)
}

function onSwipeCancel() {
  sw = null
  flowDragging.value = false
  dragX.value = 0
}

/* ---------- 罗盘：固定中央选择窗，刻度旋转；切换设备不改变选择 ---------- */
const catIdx = ref(2)
const rot = ref(-2 * STEP)
const hoverIdx = computed(() => Math.max(0, Math.min(CAST_CATS.length - 1, Math.round(-rot.value / STEP))))
const hoverCat = computed(() => CAST_CATS[hoverIdx.value])
const dialDragging = ref(false)
const sel = reactive({ cat: 'theme', groupId: '' })
const selCat = computed(() => catOf(sel.cat))
const categoryLabel = (key) => ({ sleep: '休眠', poster: '轮播海报', theme: '房间主题', checkin: '签到墙', list: '赛事列表' }[key] || '待选择')
const categoryIcon = (key) => ({ sleep: 'moon', poster: 'photo', theme: 'device-tv', checkin: 'users', list: 'list-details' }[key] || 'cast')
const nodeStyle = (c, i) => `top:${-L.nodeR - px(44)}px;transform:rotate(${-i * STEP - rot.value}deg);color:${c.color};--node-color:${c.color}`
function tickStyle(mark) {
  const distance = Math.abs(mark.angle + rot.value)
  const focus = Math.max(0, 1 - distance / 54)
  const height = px(mark.major ? 48 : 19 + focus * 24)
  const glow = px(3 + focus * 5)
  // 颜色只取当前分类色，焦点只控制透明度和发光强度，避免混入固定的暗蓝紫。
  return `top:${-L.R}px;height:${height.toFixed(1)}px;background:linear-gradient(180deg,var(--category-color) 12%,var(--category-color) 75%,transparent);opacity:${distance > 65 ? 0 : (0.32 + focus * 0.68).toFixed(2)};box-shadow:0 0 ${glow.toFixed(1)}px var(--category-color)`
}
let dg = null
let ignoreCategoryTapUntil = 0
let lastDialTouchAt = 0
function dialStart(e) {
  lastDialTouchAt = Date.now()
  startDial(e.touches[0].clientX, e.touches[0].clientY)
}
function dialMove(e) {
  moveDial(e.touches[0].clientX, e.touches[0].clientY)
}
function startDial(x, y) {
  if (busy.value || overlayOpen()) return
  dg = { x, y, base: rot.value, moved: false }
}
function moveDial(x, y) {
  if (!dg || busy.value) return
  const dx = x - dg.x
  if (!dg.moved && Math.abs(dx) > px(14) && Math.abs(dx) > Math.abs(y - dg.y)) dg.moved = true
  if (!dg.moved) return
  dialDragging.value = true
  const before = hoverIdx.value
  const min = -(CAST_CATS.length - 1) * STEP
  let next = dg.base + dx / L.R * 180 / Math.PI
  if (next > 0) next *= 0.28
  if (next < min) next = min + (next - min) * 0.28
  rot.value = next
  if (hoverIdx.value !== before) buzz()
}
function dialEnd() {
  if (!dg) return
  const moved = dg.moved
  dg = null
  dialDragging.value = false
  if (moved) { ignoreCategoryTapUntil = Date.now() + 300; setCat(hoverIdx.value) }
}
function dialCancel() {
  dg = null
  dialDragging.value = false
  rot.value = -catIdx.value * STEP
}
function dialMouseDown(e) {
  // #ifdef H5
  // uni-app 的 H5 MouseEvent 保留坐标但不保留 button 字段。
  if ((e.button == null || e.button === 0) && Date.now() - lastDialTouchAt > 800) startDial(e.clientX, e.clientY)
  // #endif
}
function dialMouseMove(e) {
  // #ifdef H5
  if (Date.now() - lastDialTouchAt > 800) moveDial(e.clientX, e.clientY)
  // #endif
}
function dialMouseUp() {
  // #ifdef H5
  if (Date.now() - lastDialTouchAt > 800) dialEnd()
  // #endif
}
function dialMouseCancel() {
  // #ifdef H5
  if (Date.now() - lastDialTouchAt > 800) dialCancel()
  // #endif
}
function tapCategory(idx) {
  if (Date.now() < ignoreCategoryTapUntil || busy.value) return
  setCat(idx)
  buzz()
}
function setCat(idx) {
  if (busy.value || !CAST_CATS[idx]) return
  selectionInitialized = true
  castCancel()
  catIdx.value = idx
  rot.value = -idx * STEP
  sel.cat = CAST_CATS[idx].key
  // 海报组一旦选好也保留，不随分类或目标设备变化而丢失。
  if (sel.cat === 'poster' && !sel.groupId && castable.value.length === 1) sel.groupId = castable.value[0].id
}
let selectionInitialized = false
function initializeSelection() {
  if (selectionInitialized) return
  selectionInitialized = true
  const live = cur.value && online(cur.value) ? liveOf(cur.value, groups.value) : null
  if (!live || !live.cat) return
  const idx = CAST_CATS.findIndex((c) => c.key === live.cat)
  if (idx < 0) return
  catIdx.value = idx
  rot.value = -idx * STEP
  sel.cat = live.cat
  sel.groupId = live.groupId || ''
}
const themeName = (k) => (TV_THEMES.find((t) => t.key === k) || {}).name || ''
const hintAction = computed(() => !!selCat.value.pick)
const hintText = computed(() => {
  if (sel.cat === 'poster') {
    const g = groups.value.find((x) => x.id === sel.groupId)
    return g ? g.name + ' · 更换' : '选择海报组'
  }
  if (sel.cat === 'theme') return themeName(ROOM_THEME) + ' · 浏览主题'
  if (sel.cat === 'sleep') return '长按 1.4 秒，松手取消'
  if (sel.cat === 'checkin') return '当前房间的签到画面'
  return '赛事入口与待开赛列表'
})
function tapHint() {
  if (!busy.value && hintAction.value) openPicker(selCat.value.pick)
}
const selContent = computed(() => ({ cat: sel.cat, groupId: sel.cat === 'poster' ? sel.groupId : '' }))
const ready = computed(() => sel.cat !== 'poster' || castable.value.some((g) => g.id === sel.groupId))
/* ---------- 设备区永远是当前画面；待投放仅展示文字摘要 ---------- */
const screenContent = (d) => online(d) ? liveOf(d, groups.value) : { cat: '' }
const titleText = computed(() => allMode.value ? '全部在线大屏' : cur.value ? cur.value.name : '遥控切屏')
const statusLine = computed(() => {
  if (allMode.value) return `已选中 ${onlineCount.value} 台在线大屏`
  if (!cur.value) return '选择一台大屏开始'
  if (!online(cur.value)) return '离线 · ' + ago(cur.value.lastSeen) + '在线'
  return '正在播放 · ' + (categoryLabel(liveOf(cur.value, groups.value).cat))
})

/* ---------- 背景：中央大屏画面的放大虚化，切换时交叉淡入 ---------- */
const bgLayers = reactive([{ src: '' }, { src: '' }])
const bgOn = ref(0)
const bgCover = computed(() => {
  const d = cur.value
  if (!d) return null
  const c = contentCover(screenContent(d), groups.value, d.id, d.coverScene)
  return { ...c, gray: !online(d) }
})
watch(() => bgCover.value && bgCover.value.src + (bgCover.value.gray ? '-g' : ''), () => {
  const c = bgCover.value
  if (!c) return
  const next = 1 - bgOn.value
  Object.assign(bgLayers[next], c)
  bgOn.value = next
})
const glowStyle = computed(() => {
  const t = (bgCover.value && !bgCover.value.gray && bgCover.value.tint) || '#2A2D36'
  return `top:${L.flowTop + L.H * 0.62}px;width:${L.W * 0.86}px;height:${px(120)}px;margin-left:${-L.W * 0.43}px;background:${t}`
})

/* ---------- 投放：按压反馈只表示输入；请求完成并核对设备状态后才显示成功 ---------- */
const casting = reactive({})
const pressing = ref(false)
const charge = ref(0)
const acknowledged = ref(false)
const flightTargets = ref([])
const result = reactive({ state: 'idle', text: '', failed: [], content: null })
let chargeTimer = null
let ackTimer = null
let pressAt = 0
let pressOrigin = null
let lastTouchAt = 0
let suppressCastTap = false
const targets = computed(() => allMode.value ? devices.value.filter(online) : cur.value && online(cur.value) ? [cur.value] : [])
const canCast = computed(() => targets.value.length > 0)
const castDisabled = computed(() => !canCast.value || busy.value || dialDragging.value)
const targetLabel = computed(() => {
  const list = busy.value ? flightTargets.value : result.failed
  if (list.length) return list.length === 1 ? list[0].name : `${busy.value ? '' : '未完成的 '}${list.length} 台大屏`
  return allMode.value ? `全部 ${targets.value.length} 台在线大屏` : cur.value ? cur.value.name : '尚未选择大屏'
})
const castLabel = computed(() => busy.value ? '发送中' : acknowledged.value ? '已切换' : !ready.value ? '选海报' : pressing.value && selCat.value.hold ? Math.round(charge.value * 100) + '%' : result.failed.length ? '重试' : selCat.value.hold ? '休眠' : '投放')
const castIcon = computed(() => acknowledged.value ? 'check' : result.failed.length ? 'arrows-exchange' : categoryIcon(hoverCat.value.key))
const castAriaLabel = computed(() => `${selCat.value.hold ? '长按休眠' : '投放' + categoryLabel(sel.cat)}，目标${targetLabel.value}`)
const chargeStyle = computed(() => `background:conic-gradient(${selCat.value.color} ${charge.value * 360}deg, rgba(255,255,255,.08) 0deg)`)
const chargeInkStyle = computed(() => `clip-path:polygon(0 ${105 - charge.value * 115}%, 25% ${100 - charge.value * 115}%, 50% ${106 - charge.value * 115}%, 75% ${102 - charge.value * 115}%, 100% ${105 - charge.value * 115}%,100% 100%,0 100%)`)
const feedbackText = computed(() => {
  if (result.state !== 'idle') return result.text
  if (!canCast.value) return cur.value ? '大屏离线，可刷新或切换其他设备' : '请先选择可用的大屏'
  if (!ready.value) return '选好海报组后再发送'
  return selCat.value.hold ? '长按按键 1.4 秒休眠，松手或滑出取消' : allMode.value ? `轻触投放，同时切换 ${targets.value.length} 台大屏` : '轻触按键投放，等待大屏确认'
})
function resetResult() {
  clearTimeout(ackTimer)
  acknowledged.value = false
  Object.assign(result, { state: 'idle', text: '', failed: [], content: null })
}
watch([() => sel.cat, () => sel.groupId, () => cur.value && cur.value.id, allMode], () => {
  if (!busy.value) { castCancel(); resetResult() }
})
function castDown(e) {
  if (e && e.touches) lastTouchAt = Date.now()
  if (castDisabled.value || pressing.value) return
  suppressCastTap = false
  pressing.value = true
  pressAt = Date.now()
  pressOrigin = e && e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
  if (!selCat.value.hold || !ready.value) return
  clearInterval(chargeTimer)
  charge.value = 0
  chargeTimer = setInterval(() => {
    charge.value = Math.min(1, (Date.now() - pressAt) / 1440)
    if (charge.value >= 1) {
      clearInterval(chargeTimer)
      pressing.value = false
      suppressCastTap = true
      buzz('heavy')
      doCast(retrySnapshot())
    }
  }, 40)
}
function castMove(e) {
  if (!pressing.value || !pressOrigin) return
  const t = e.touches[0]
  const centerY = L.controlsTop + L.orderH + L.dialCenter + L.castOffset
  const dx = t.clientX - sys.windowWidth / 2
  const dy = Math.max(0, Math.abs(t.clientY - centerY) - (L.castH - L.castW) / 2)
  if (Math.hypot(dx, dy) > L.castW / 2 + px(12)) castCancel()
}
function castUp() {
  pressing.value = false
  clearInterval(chargeTimer)
  charge.value = 0
  pressOrigin = null
}
function castCancel() {
  // 只有正在进行的按压被取消时才抑制合成 tap，换设备/分类不会吞掉下一次点击。
  suppressCastTap = pressing.value
  castUp()
}
function castTap() {
  if (castDisabled.value || suppressCastTap || selCat.value.hold) return
  if (!ready.value) return openPicker('poster')
  doCast(retrySnapshot())
}
// 普通投放由原生 button 的 tap 统一处理，鼠标只补上按压/休眠蓄力，避免触摸合成鼠标事件重复发送。
function castMouseDown(e) {
  // #ifdef H5
  if ((e.button == null || e.button === 0) && Date.now() - lastTouchAt > 800) castDown()
  // #endif
}
function castMouseUp() {
  // #ifdef H5
  if (Date.now() - lastTouchAt > 800) castUp()
  // #endif
}
function castMouseCancel() {
  // #ifdef H5
  if (pressing.value && Date.now() - lastTouchAt > 800) castCancel()
  // #endif
}
function castKeyDown(e) {
  // #ifdef H5
  if (e.key !== ' ' && e.key !== 'Enter') return
  if (selCat.value.hold) { e.preventDefault(); if (!e.repeat) castDown() }
  else suppressCastTap = false
  // #endif
}
function castKeyUp(e) {
  // #ifdef H5
  if (selCat.value.hold && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); castUp() }
  // #endif
}
function retrySnapshot() {
  return result.failed.length ? { list: result.failed.slice(), content: { ...result.content } } : null
}
function retryCast() {
  if (selCat.value.hold) return toast('长按休眠按键，重试未完成的大屏')
  doCast(retrySnapshot())
}
async function doCast(retry = null) {
  if (busy.value) return
  if (!retry && !ready.value) return openPicker('poster')
  const list = retry ? retry.list.slice() : targets.value.slice()
  if (!list.length) return
  const content = retry ? { ...retry.content } : { ...selContent.value }
  const fields = castFields(content, groups.value)
  flightTargets.value = list
  busy.value = true
  acknowledged.value = false
  clearTimeout(ackTimer)
  Object.assign(result, { state: 'sending', text: list.length > 1 ? `正在切换 ${list.length} 台大屏，请稍候` : `正在切换「${list[0].name}」`, failed: [], content })
  buzz('medium')
  const responses = await Promise.all(list.map(async (d) => {
    casting[d.id] = true
    try {
      const latest = devices.value.find((x) => x.id === d.id)
      if (!latest || !online(latest)) throw new Error('offline')
      if (content.cat === 'poster') await playOn(content.groupId, d.id)
      else await stopOn(d.id)
      await castToDevice(d.id, fields)
      return { d, ok: true }
    } catch (e) { return { d, ok: false } }
  }))
  let refreshed = true
  try { await load() } catch (e) { refreshed = false }
  const failed = responses.filter(({ d, ok }) => {
    const current = devices.value.find((x) => x.id === d.id)
    return !ok || !refreshed || !current || !sameContent(liveOf(current, groups.value), content)
  }).map(({ d }) => d)
  list.forEach((d) => { delete casting[d.id] })
  const count = list.length - failed.length
  const state = !failed.length ? 'success' : count ? 'partial' : 'failure'
  const text = !failed.length ? list.length > 1 ? `${list.length} 台大屏均已确认切换` : `「${list[0].name}」已确认切换` : count ? `已切换 ${count}/${list.length} 台，${failed.length} 台未完成` : list.length > 1 ? `${list.length} 台大屏未确认切换` : `「${list[0].name}」未确认切换`
  Object.assign(result, { state, text, failed, content })
  busy.value = false
  flightTargets.value = []
  charge.value = 0
  if (!failed.length) {
    acknowledged.value = true
    ackTimer = setTimeout(() => { acknowledged.value = false }, 2200)
    buzz('light')
  }
}
async function refreshDevices() {
  if (refreshing.value || busy.value) return
  refreshing.value = true
  try { await load() } catch (e) { toast('刷新失败，请稍后重试') }
  finally { refreshing.value = false }
}

/* ---------- 封面流：点一个 → 转到中间 → 选中 → 收起；点别处保持原来的选择 ---------- */
const picker = ref('')
const pickerOn = ref(false)
const pkIdx = ref(0)
const pkDragging = ref(false)
const pkDrag = ref(0)
const pickerHeadTop = computed(() => Math.max(nav.statusBar + nav.navH + px(40), L.pickerCenter - px(picker.value === 'poster' ? 342 : 262)))
let picking = false
let pickerTapAfter = 0
function openPicker(kind) {
  if (busy.value) return
  picker.value = kind
  picking = false
  pickerTapAfter = Date.now() + 320
  pkIdx.value = kind === 'poster' ? Math.max(0, castable.value.findIndex((g) => g.id === sel.groupId)) : Math.max(0, TV_THEMES.findIndex((t) => t.key === ROOM_THEME))
  setTimeout(() => { pickerOn.value = true }, 20)
}
function closePicker() {
  pickerOn.value = false
  setTimeout(() => { picker.value = '' }, 300)
}
const pkCount = () => (picker.value === 'poster' ? castable.value.length : TV_THEMES.length)
function cfStyle(i) {
  const o = i - pkIdx.value + pkDrag.value / px(320)
  const a = Math.abs(o)
  const rotY = Math.max(-60, Math.min(60, -o * 46))
  const op = a > 2.4 ? 0 : 1 - Math.max(0, a - 1.2) * 0.6
  return `transform:translateX(${(o * px(310)).toFixed(1)}px) translateZ(${(-a * px(220)).toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg);z-index:${100 - Math.round(a * 10)};opacity:${op.toFixed(2)}`
}
// 卡片在圆角口袋里错落叠放；最前方保持淡紫色厚边。
const paperStyle = (k, count) => {
  const depth = Math.min(count, 4) - 1 - k
  const pose = [{ x: 18, y: 8, r: -7, color: '#BBA7F0' }, { x: 22, y: -20, r: 5, color: '#F7F8F3' }, { x: -34, y: 24, r: -12, color: '#E3F38D' }, { x: -8, y: 0, r: -3, color: '#A9CEE7' }][depth]
  return `transform:translate(${px(pose.x)}px,${px(pose.y)}px) rotate(${pose.r}deg);z-index:${k + 2};background:${pose.color}`
}
const pocketPath = 'M0 54C0 26 20 10 48 10H84C110 10 110 44 148 47L362 54C402 55 420 77 420 111V156C420 218 390 254 328 254H92C30 254 0 218 0 156Z'
const pocketMask = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 254"><path d="${pocketPath}" fill="white"/></svg>`)
const pocketStyle = `-webkit-mask-image:url("${pocketMask}");mask-image:url("${pocketMask}")`
const pocketLipStyle = `background-image:url("${svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 254"><path d="${pocketPath}" fill="none" stroke="white" stroke-opacity=".22" stroke-width="2"/></svg>`)}")`
const imgSrc = (im) => im.src || svgUri(coverArt(im.scene, im.size || 'wide'))
let pk = null
function pkStart(e) {
  const t = e.touches[0]
  pk = { x: t.clientX, on: false }
}
function pkMove(e) {
  if (!pk) return
  const dx = e.touches[0].clientX - pk.x
  if (!pk.on && Math.abs(dx) > 8) { pk.on = true; pkDragging.value = true }
  if (pk.on) pkDrag.value = dx
}
function pkEnd() {
  if (!pk) return
  const was = pk.on
  pk = null
  if (!was) return
  pickerTapAfter = Date.now() + 300
  const d = pkDrag.value
  pkDragging.value = false
  pkDrag.value = 0
  const n = pkCount()
  if (d < -50 && pkIdx.value < n - 1) { pkIdx.value += 1; buzz() }
  else if (d > 50 && pkIdx.value > 0) { pkIdx.value -= 1; buzz() }
}
function pkTap(i) {
  if (picking || Date.now() < pickerTapAfter) return
  picking = true
  pkIdx.value = i
  buzz('medium')
  setTimeout(() => {
    if (picker.value === 'poster') {
      const g = castable.value[i]
      sel.cat = 'poster'
      sel.groupId = g.id
      closePicker()
      popMsg(`已选「${g.name}」，按下中间的按键就能投放`, 'photo')
    } else {
      const t = TV_THEMES[i]
      closePicker()
      setTimeout(() => showCpop('选择失败', `遥控切屏暂时不支持切换 TV 主题。房间的主题需要在创建比赛页里切换，这里投放的是房间当前的主题「${themeName(ROOM_THEME)}」${t.key === ROOM_THEME ? '' : '，不是「' + t.name + '」'}。`), 320)
    }
  }, 360)
}

/* ---------- 大屏胶囊列表：从上方滑入；点任意胶囊切过去，点别处收起 ---------- */
const listShown = ref(false)
const listOn = ref(false)
function openList() {
  if (busy.value) return
  filterOpen.value = false
  listShown.value = true
  setTimeout(() => { listOn.value = true }, 20)
}
function closeList() {
  listOn.value = false
  setTimeout(() => { listShown.value = false }, 340)
}
function pickDevice(d) {
  if (busy.value) return
  allMode.value = false
  if (!queue.value.includes(d)) filterKey.value = 'all'
  ci.value = Math.max(0, queue.value.findIndex((x) => x.id === d.id))
  buzz()
  closeList()
}
function toggleAll() {
  if (busy.value || !onlineCount.value) return
  allMode.value = !allMode.value
  buzz('medium')
  closeList()
  if (allMode.value) popMsg(`已选中全部 ${onlineCount.value} 台在线大屏，单击按键一起投放`, 'checks')
}
const capCover = (d) => {
  const c = contentCover(online(d) ? liveOf(d, groups.value) : { cat: '' }, groups.value, d.id, d.coverScene)
  return online(d) ? c : { ...c, tint: '#24272F' }
}
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
const capMask = (d) => {
  const t = capCover(d).tint
  return `background:linear-gradient(90deg, ${t} 0%, ${t} 30%, ${hexA(t, 0.82)} 50%, ${hexA(t, 0.25)} 76%, ${hexA(t, 0)} 94%)`
}
const capSub = (d) => (online(d) ? contentText(liveOf(d, groups.value), groups.value) || '空闲' : ago(d.lastSeen) + '在线')

/* ---------- 说明 ---------- */
const helpOpen = ref(false)
const openHelp = () => { helpOpen.value = true }
const closeHelp = () => { helpOpen.value = false }
const toDevices = () => uni.navigateTo({ url: '/pages/devices/index' })
const toPosters = () => { closePicker(); uni.navigateTo({ url: '/pages/posters/index' }) }

/* ---------- 页面 ---------- */
let tickTimer = null
onLoad(() => {
  if (!requireLogin() || !requireHost()) return
  // 页面已提供可见的操作提示，说明按需打开，不阻断首次使用
  try {
    uni.setStorageSync('zz_remote_help', 1)
  } catch (e) {}
})
onShow(async () => {
  try { await load(); initializeSelection() } catch (e) { toast('大屏加载失败，请刷新重试') }
  clearInterval(tickTimer)
  tickTimer = setInterval(async () => {
    // 演示服务在读取时续心跳；同时更新设备与海报状态，待投放选择保持不变。
    if (!busy.value) { try { await load() } catch (e) {} }
    tick.value += 1
  }, 15000)
})
onHide(() => { clearInterval(tickTimer); castCancel(); dialCancel(); onSwipeCancel() })
onUnload(() => { clearInterval(tickTimer); clearTimeout(ackTimer); clearTimeout(popTimer); clearTimeout(cpopTimer); castCancel() })
</script>

<style>
/* 页面与控件均使用 rc- 前缀，避免小程序 apply-shared 样式相互覆盖 */
.rc { position: fixed; inset: 0; overflow: hidden; overflow: clip; background: #080B12; color: #FFFFFF; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
.rc-press { opacity: .78; transform: scale(.96); }
.rc-press-soft { opacity: .85; }
.rc-screen-arrow, .rc-sq, .rc-node-button, .rc-hint, .rc-cast, .rc-category, .rc-retry { margin: 0; padding: 0; border: 0; line-height: 1.4; font-family: inherit; background: transparent; color: inherit; box-sizing: border-box; }
.rc-screen-arrow::after, .rc-sq::after, .rc-node-button::after, .rc-hint::after, .rc-cast::after, .rc-category::after, .rc-retry::after { border: 0; }
.rc-screen-arrow, .rc-node-button, .rc-hint, .rc-category, .rc-retry { background: transparent !important; }

/* 沉浸背景跟随设备当前画面；内容选择不再改变整个页面背景 */
.rc-bg { position: absolute; inset: 0; pointer-events: none; }
.rc-bg-l { position: absolute; left: -8%; top: -4%; right: -8%; bottom: -2%; opacity: 0; transition: opacity .7s ease; filter: blur(16px) saturate(1.1); }
.rc-bg-on { opacity: .64; }
.rc-bg-gray { filter: blur(16px) grayscale(1) brightness(.55); }
.rc-bg-glass { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,11,18,.34), rgba(8,11,18,.2) 30%, rgba(8,11,18,.7) 62%, #080B12 97%); }
.rc-nav { position: absolute; z-index: 20; left: 0; right: 0; top: 0; box-sizing: content-box; padding-left: 40rpx; display: flex; align-items: center; }
.rc-gbtn { width: 64rpx; height: 64rpx; flex: none; margin-right: 20rpx; border-radius: 50%; background: rgba(255,255,255,.07); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1rpx rgba(255,255,255,.12); }
.rc-nav-t { flex: none; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 56rpx; line-height: 1; letter-spacing: 4rpx; color: #FFFFFF; white-space: nowrap; }
.rc-help-btn { width: 64rpx; height: 64rpx; margin-left: auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

/* 大屏向屏幕中部靠拢，增加可见尺寸 */
.rc-stage-head { position: absolute; z-index: 11; left: 24rpx; right: 24rpx; height: 48rpx; display: flex; align-items: center; justify-content: space-between; }
.rc-live-label { display: flex; align-items: center; font-size: 24rpx; letter-spacing: 2rpx; color: rgba(235,242,255,.7); }
.rc-live-dot { width: 10rpx; height: 10rpx; margin-right: 12rpx; border-radius: 50%; background: #67DDA7; }
.rc-live-dot-off { background: #7E899C; }
.rc-screen-nav { display: flex; align-items: center; }
.rc-screen-arrow { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.rc-screen-arrow-off { opacity: .25; }
.rc-screen-count { min-width: 56rpx; text-align: center; font-size: 23rpx; font-variant-numeric: tabular-nums; color: #D6DFEF; }
.rc-glow { position: absolute; z-index: 9; left: 50%; border-radius: 50%; filter: blur(26px); opacity: .35; transition: background .7s ease; pointer-events: none; }
.rc-flow { position: absolute; z-index: 10; left: 0; right: 0; perspective: 1400px; }
.rc-scr { position: absolute; left: 50%; top: 0; box-sizing: border-box; border-radius: 24rpx; overflow: hidden; background: #05070B; box-shadow: 0 0 0 1rpx rgba(255,255,255,.14), 0 20rpx 60rpx rgba(0,0,0,.42); transition: transform .45s cubic-bezier(.2,.8,.2,1), opacity .45s ease; }
.rc-flow-drag .rc-scr { transition: none; }
.rc-scr-cur { box-shadow: 0 0 0 2rpx rgba(255,255,255,.43), 0 24rpx 70rpx rgba(0,0,0,.5); }
.rc-scr-chk { position: absolute; right: 16rpx; top: 14rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #36A978; display: flex; align-items: center; justify-content: center; }
.rc-empty { position: absolute; left: 50%; top: 0; box-sizing: border-box; border-radius: 24rpx; border: 2rpx dashed rgba(255,255,255,.25); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rc-empty-t { font-size: 27rpx; color: #D7DEEB; }
.rc-chip-btn { margin-top: 20rpx; height: 68rpx; padding: 0 28rpx; border-radius: 999rpx; background: rgba(255,255,255,.12); display: flex; align-items: center; }
.rc-chip-btn-t { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }
.rc-info { position: absolute; z-index: 12; left: 24rpx; right: 24rpx; height: 132rpx; display: flex; align-items: center; }
.rc-info-up { z-index: 45; }
.rc-sq { position: relative; width: 88rpx; height: 108rpx; flex: none; border-radius: 22rpx; display: flex; flex-direction: column; gap: 9rpx; align-items: center; justify-content: center; font-size: 23rpx; color: #E8EDF7; background: transparent !important; }
.rc-sq-on { background: rgba(255,255,255,.9) !important; color: #0B0C10; }
.rc-sq-dot { position: absolute; right: 17rpx; top: 16rpx; width: 11rpx; height: 11rpx; border-radius: 50%; }
.rc-ttl { flex: 1; min-width: 0; margin: 0 12rpx; display: flex; flex-direction: column; align-items: center; }
.rc-ttl-n { max-width: 100%; font-size: 40rpx; font-weight: 650; line-height: 1.4; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-ttl-st-t { max-width: 100%; margin-top: 8rpx; font-size: 24rpx; color: #B6C3D7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-ttl-off { color: #A5ADBD; }

/* 筛选气泡 */
.rc-catch { position: absolute; z-index: 40; inset: 0; background: rgba(0,0,0,.25); }
.rc-bubs { position: absolute; z-index: 46; left: 126rpx; display: flex; flex-direction: column; align-items: flex-start; }
.rc-bub { margin-bottom: 14rpx; height: 72rpx; padding: 0 26rpx 0 20rpx; border-radius: 999rpx; background: #252C3A; display: flex; align-items: center; box-shadow: inset 0 0 0 1rpx rgba(255,255,255,.16), 0 12rpx 30rpx rgba(0,0,0,.35); animation: rc-bub .3s ease backwards; }
@keyframes rc-bub { from { opacity: 0; transform: translateX(-16rpx); } to { opacity: 1; transform: none; } }
.rc-bub-on { background: #E9EEF8; }
.rc-bub-on .rc-bub-t, .rc-bub-on .rc-bub-n { color: #0B0C10; }
.rc-bub-dot { width: 14rpx; height: 14rpx; border-radius: 50%; }
.rc-bub-t { margin-left: 12rpx; font-size: 26rpx; color: #FFFFFF; }
.rc-bub-n { margin-left: 18rpx; font-size: 25rpx; color: #B5C0D3; }

/* 待投放摘要固定在罗盘旁，只说明将投放的内容和目标 */
.rc-controls { position: absolute; z-index: 14; left: 0; right: 0; }
.rc-order { margin: 0 28rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rc-order-line { display: flex; align-items: center; justify-content: center; gap: 14rpx; width: 100%; min-width: 0; }
.rc-order-eyebrow { flex: none; font-size: 23rpx; color: #A9B6CA; }
.rc-order-content { flex: none; font-size: 31rpx; font-weight: 650; line-height: 44rpx; color: #F5F8FF; }
.rc-order-target { max-width: 260rpx; min-width: 0; font-size: 29rpx; font-weight: 550; color: #E6EDF9; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rc-hint { max-width: 100%; height: 48rpx; display: flex; align-items: center; justify-content: center; gap: 5rpx; text-align: center; }
.rc-hint-t { min-width: 0; font-size: 24rpx; color: #ADBBD1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-hint-act .rc-hint-t { color: #E1E8F6; }

/* 刻度本身构成轮廓：密集分类色渐变短条，固定银色指示针 */
.rc-compass { position: relative; }
.rc-dial { position: absolute; inset: 0; overflow: hidden; touch-action: pan-y; -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); }
.rc-dial-busy { opacity: .55; }
.rc-rot { position: absolute; left: 50%; width: 0; height: 0; transition: transform .42s cubic-bezier(.2,.8,.2,1); }
.rc-rot-drag { transition: none; }
.rc-tick-w, .rc-node-w { position: absolute; left: 0; top: 0; width: 0; height: 0; }
.rc-tick { position: absolute; left: -1.5rpx; width: 3rpx; border-radius: 2rpx; pointer-events: none; }
.rc-tick-major { left: -2rpx; width: 4rpx; }
.rc-dial-index { position: absolute; z-index: 2; left: 50%; width: 2rpx; height: 64rpx; margin-left: -1rpx; border-radius: 2rpx; background: linear-gradient(180deg, #FFFFFF, #C8D2E1); box-shadow: 0 0 8rpx rgba(225,240,255,.3); pointer-events: none; }
.rc-dial-index-dot { position: absolute; top: -5rpx; left: -2rpx; width: 6rpx; height: 6rpx; border-radius: 50%; background: #F5FBFF; }
.rc-node-button { position: absolute; left: -44rpx; width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; overflow: visible; }
.rc-node-disc { width: 59rpx; height: 59rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(145deg, rgba(91,107,132,.45), rgba(23,32,47,.7)); box-shadow: inset 0 2rpx 1rpx rgba(255,255,255,.4), inset 0 0 0 1rpx rgba(235,244,255,.25), 0 5rpx 12rpx rgba(0,0,0,.3); transition: background .2s ease, box-shadow .2s ease; pointer-events: none; }
.rc-node-selected { opacity: 0; pointer-events: none; }

/* 竖直玻璃胶囊：分类颜色落在图标，按压高光与休眠水位保留 */
.rc-cast-wrap { position: absolute; z-index: 3; left: 50%; }
.rc-charge-ring { position: absolute; inset: -9rpx; padding: 3rpx; border-radius: 999rpx; -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
.rc-cast { position: relative; width: 100%; height: 100%; border-radius: 999rpx; overflow: visible; background: linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.035) 40%, rgba(255,255,255,.08) 67%, rgba(255,255,255,.18)) !important; box-shadow: inset 0 2rpx 2rpx rgba(255,255,255,.55), inset 0 -4rpx 5rpx rgba(255,255,255,.2), inset 0 0 0 1rpx rgba(255,255,255,.22), 0 14rpx 24rpx -10rpx rgba(0,0,0,.6); backdrop-filter: blur(2px) saturate(135%); -webkit-backdrop-filter: blur(2px) saturate(135%); transition: transform .22s cubic-bezier(.25,1,.5,1), box-shadow .22s ease; }
.rc-cast-rim { position: absolute; z-index: 3; inset: 0; padding: 2rpx; border-radius: 999rpx; background: conic-gradient(from -55deg, rgba(255,255,255,.95), rgba(255,255,255,.04) 17%, rgba(255,255,255,.18) 39%, rgba(255,255,255,.8) 54%, rgba(255,255,255,.04) 73%, rgba(255,255,255,.95)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
.rc-cast-face { position: absolute; inset: 10rpx; border-radius: 999rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; background: radial-gradient(ellipse at 50% 45%, rgba(11,18,31,.25), transparent 72%); box-shadow: inset 0 0 0 1rpx rgba(255,255,255,.07); pointer-events: none; }
.rc-cast-icon { position: relative; min-height: 76rpx; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2rpx 3rpx rgba(0,0,0,.28)); transform: perspective(300rpx) rotateX(-6deg); transition: transform .22s ease; }
.rc-cast-ink { position: absolute; inset: 0; transition: clip-path .06s linear; }
.rc-cast-label { font-size: 25rpx; font-weight: 600; line-height: 34rpx; letter-spacing: 3rpx; color: #EDF3FF; }
.rc-cast-sheen { position: absolute; z-index: 4; inset: 0; border-radius: 999rpx; overflow: hidden; pointer-events: none; }
.rc-cast-sheen::after { content: ""; position: absolute; inset: -30%; background: linear-gradient(125deg, transparent 30%, rgba(255,255,255,.2) 43%, rgba(255,255,255,.025) 54%, transparent 65%); transform: translateX(-22%) rotate(-12deg); transition: transform .45s cubic-bezier(.25,1,.5,1); }
.rc-cast-down { transform: perspective(600rpx) rotateX(10deg) scale(.965); box-shadow: inset 0 4rpx 8rpx rgba(0,0,0,.16), inset 0 -3rpx 3rpx rgba(255,255,255,.38), 0 5rpx 10rpx -6rpx rgba(0,0,0,.6); }
.rc-cast-down .rc-cast-icon { transform: perspective(300rpx) rotateX(6deg) scale(1.04); }
.rc-cast-down .rc-cast-sheen::after { transform: translateX(24%) rotate(8deg); }
.rc-cast-dis { background: linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.015)) !important; box-shadow: inset 0 0 0 1rpx rgba(255,255,255,.16); }
.rc-cast-dis .rc-cast-label { color: #8793A8; }
.rc-cast-dis .rc-cast-rim { opacity: .4; }
.rc-cast-success .rc-cast-label { color: #8DE9BC; }
.rc-spinner { width: 64rpx; height: 64rpx; box-sizing: border-box; border: 4rpx solid rgba(231,240,255,.2); border-top-color: #EDF3FF; border-radius: 50%; animation: rc-spin .75s linear infinite; }
@keyframes rc-spin { to { transform: rotate(360deg); } }
/* 水平分类名称也是直接入口，颜色和中央图标一一对应 */
.rc-categories { display: flex; align-items: center; margin: 0 20rpx; }
.rc-category { position: relative; flex: 1; min-width: 0; height: 88rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; overflow: visible; color: #B5C1D5; transition: color .2s ease, opacity .2s ease; }
.rc-category-label { font-size: 25rpx; font-weight: 500; line-height: 36rpx; white-space: nowrap; }
.rc-category-on { color: var(--category-color); }
.rc-category-on .rc-category-label { font-weight: 650; }
.rc-category-dot { width: 14rpx; height: 4rpx; border-radius: 3rpx; background: var(--category-color); opacity: .35; transition: width .2s ease, opacity .2s ease; }
.rc-category-on .rc-category-dot { width: 30rpx; opacity: 1; }
.rc-category-busy { opacity: .5; }
.rc-feedback { height: 64rpx; margin: 6rpx 28rpx 0; display: flex; align-items: center; justify-content: center; gap: 10rpx; }
.rc-feedback-text { min-width: 0; font-size: 24rpx; color: #B5C1D5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-feedback-success .rc-feedback-text { color: #8DE9BC; }
.rc-feedback-partial .rc-feedback-text, .rc-feedback-failure .rc-feedback-text { color: #FFB58B; }
.rc-retry { min-width: 72rpx; height: 64rpx; flex: none; display: flex; align-items: center; justify-content: center; font-size: 25rpx; font-weight: 600; color: #F2F6FF; }
.rc-compact .rc-order-content { font-size: 29rpx; }
.rc-compact .rc-order-target { font-size: 27rpx; max-width: 250rpx; }
.rc-compact .rc-feedback { height: 60rpx; }

/* 封面流选择层 */
.rc-pk { position: absolute; z-index: 60; left: 0; top: 0; right: 0; bottom: 0; opacity: 0; transition: opacity .3s ease; }
.rc-pk-on { opacity: 1; }
.rc-pk-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(5, 6, 9, .6); backdrop-filter: blur(26px); -webkit-backdrop-filter: blur(26px); }
.rc-pk-head { position: absolute; left: 28rpx; right: 28rpx; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.rc-pk-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 44rpx; letter-spacing: 4rpx; color: #FFFFFF; }
.rc-pk-s { margin-top: 10rpx; font-size: 22rpx; color: rgba(255, 255, 255, .6); }
.rc-cf { position: absolute; left: 0; right: 0; height: 0; perspective: 1200px; transform-style: preserve-3d; pointer-events: none; }
.rc-cf-i { position: absolute; left: 50%; top: 0; width: 420rpx; height: 420rpx; margin: -210rpx 0 0 -210rpx; transform-style: preserve-3d; pointer-events: auto; transition: transform .45s cubic-bezier(.2, .8, .2, 1), opacity .45s ease; }
.rc-cf-th { width: 440rpx; height: 260rpx; margin: -130rpx 0 0 -220rpx; }
.rc-cf-drag .rc-cf-i { transition: none; }
.rc-pk-empty { position: absolute; left: 80rpx; right: 80rpx; top: -120rpx; height: 240rpx; border-radius: 28rpx; border: 2rpx dashed rgba(255, 255, 255, .3); display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto; }
.rc-pk-empty-t { font-size: 26rpx; color: rgba(255, 255, 255, .8); }
.rc-pk-hint { position: absolute; left: 28rpx; right: 28rpx; text-align: center; font-size: 24rpx; line-height: 38rpx; color: rgba(255, 255, 255, .65); pointer-events: none; }

/* 圆角立体口袋：黑色厚背板、叠放卡片和磨砂玻璃前袋 */
.rc-fd { position: absolute; inset: 0; width: 420rpx; height: 420rpx; border-radius: 100rpx; filter: drop-shadow(0 24rpx 30rpx rgba(0,0,0,.35)); }
.rc-fd-back { position: absolute; inset: 0; border-radius: 100rpx; background: linear-gradient(145deg, #303234, #17191B 42%, #252729); box-shadow: inset 0 2rpx 1rpx rgba(255,255,255,.3), inset 0 -5rpx 8rpx rgba(0,0,0,.65), inset 0 0 0 2rpx rgba(255,255,255,.12); }
.rc-fd-recess { position: absolute; left: 24rpx; right: 24rpx; top: 30rpx; bottom: 24rpx; border-radius: 78rpx; background: linear-gradient(160deg, #101315, #050708 75%); box-shadow: inset 0 6rpx 16rpx rgba(0,0,0,.6), inset 0 0 0 1rpx rgba(255,255,255,.06); }
.rc-fd-p { position: absolute; left: 80rpx; top: 60rpx; width: 244rpx; height: 278rpx; box-sizing: border-box; padding: 10rpx; border-radius: 43rpx; overflow: hidden; box-shadow: inset 0 3rpx 2rpx rgba(255,255,255,.65), inset 0 0 0 2rpx rgba(255,255,255,.3), 0 8rpx 18rpx rgba(0,0,0,.32); }
.rc-fd-front { position: absolute; z-index: 20; left: 0; right: 0; bottom: 0; height: 254rpx; overflow: hidden; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: 100% 100%; mask-size: 100% 100%; background: linear-gradient(155deg, rgba(61,65,65,.45), rgba(18,20,24,.63) 38%, rgba(8,10,13,.96) 100%); backdrop-filter: blur(14px) saturate(150%); -webkit-backdrop-filter: blur(14px) saturate(150%); }
.rc-fd-reflection { position: absolute; left: 28rpx; right: 24rpx; top: -12rpx; height: 186rpx; border-radius: 35%; background: radial-gradient(ellipse at 16% 32%, rgba(207,238,131,.3), transparent 35%), radial-gradient(ellipse at 64% 30%, rgba(181,143,247,.45), transparent 66%); filter: blur(16rpx); opacity: .7; pointer-events: none; }
.rc-fd-lip { position: absolute; z-index: 21; left: 0; right: 0; bottom: 0; height: 254rpx; background-size: 100% 100%; background-repeat: no-repeat; pointer-events: none; }
.rc-fd-caption { position: absolute; z-index: 2; left: 34rpx; right: 78rpx; bottom: 30rpx; display: flex; flex-direction: column; }
.rc-fd-n { display: block; font-size: 29rpx; font-weight: 600; line-height: 42rpx; color: #F6F5FC; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 2rpx 8rpx rgba(0,0,0,.5); }
.rc-fd-m { display: block; margin-top: 4rpx; font-size: 22rpx; line-height: 32rpx; color: rgba(239,236,250,.63); }
.rc-fd-sel .rc-fd-back { box-shadow: inset 0 2rpx 1rpx rgba(255,255,255,.45), inset 0 0 0 3rpx #C9B5F7, 0 0 0 7rpx rgba(185,159,243,.12); }
.rc-fd-chk { position: absolute; z-index: 30; right: 27rpx; bottom: 34rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #E3D8FF; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2rpx 1rpx rgba(255,255,255,.65), 0 4rpx 10rpx rgba(0,0,0,.2); }

/* TV 主题卡片：黑色矩形占位 */
.rc-th { position: absolute; left: 0; top: 0; width: 440rpx; height: 260rpx; box-sizing: border-box; padding: 0 30rpx; border-radius: 26rpx; background: #000000; box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .16), 0 24rpx 50rpx rgba(0, 0, 0, .5); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rc-th-n { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 46rpx; letter-spacing: 4rpx; color: #FFFFFF; }
.rc-th-d { margin-top: 10rpx; font-size: 22rpx; color: rgba(255, 255, 255, .55); text-align: center; }
.rc-th-tag { position: absolute; left: 20rpx; top: 18rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(255, 181, 71, .2); font-size: 18rpx; color: #FFB547; }

/* 大屏胶囊列表 */
.rc-dl { position: absolute; z-index: 70; left: 0; top: 0; right: 0; bottom: 0; }
.rc-dl-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .66); opacity: 0; transition: opacity .3s ease; }
.rc-dl-on .rc-dl-mask { opacity: 1; }
.rc-dl-panel {
  position: absolute; left: 0; right: 0; top: 0; padding-bottom: 20rpx; border-radius: 0 0 44rpx 44rpx; background: rgba(16, 17, 24, .95);
  box-shadow: 0 30rpx 60rpx rgba(0, 0, 0, .5); transform: translateY(-105%); transition: transform .4s cubic-bezier(.2, .8, .2, 1);
}
.rc-dl-on .rc-dl-panel { transform: translateY(0); }
.rc-dl-head { padding: 16rpx 40rpx 20rpx; display: flex; align-items: baseline; justify-content: space-between; }
.rc-dl-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.rc-dl-s { font-size: 22rpx; color: rgba(255, 255, 255, .55); }
.rc-dl-list { max-height: 820rpx; }
.rc-cap-bar {
  position: relative; height: 116rpx; margin: 0 32rpx 20rpx; box-sizing: border-box; padding-left: 14rpx; border-radius: 999rpx; overflow: hidden; display: flex; align-items: center;
  background: #1F222A; box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .1);
}
.rc-cap-cur { box-shadow: inset 0 0 0 4rpx #FFFFFF, 0 0 24rpx rgba(255, 255, 255, .25); }
.rc-cap-all { box-shadow: inset 0 0 0 3rpx #3DDC97; }
.rc-cap-cv { position: absolute; left: 28%; top: 0; right: 0; bottom: 0; }
.rc-cap-off .rc-cap-cv { filter: grayscale(1) brightness(.6); opacity: .75; }
.rc-cap-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
.rc-cap-ic { position: relative; width: 84rpx; height: 84rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.rc-cap-ic-on { background: rgba(12, 32, 22, .7); box-shadow: inset 0 0 0 3rpx #4CB582; }
.rc-cap-ic-off { background: rgba(36, 14, 16, .7); box-shadow: inset 0 0 0 3rpx rgba(255, 107, 107, .6); }
.rc-cap-main { position: relative; flex: 1; min-width: 0; margin: 0 24rpx 0 20rpx; }
.rc-cap-n { display: block; font-size: 30rpx; font-weight: 700; color: #FFFFFF; text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, .45); }
.rc-cap-s { display: block; margin-top: 4rpx; font-size: 22rpx; color: rgba(242, 242, 238, .78); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-cap-tag { position: absolute; right: 26rpx; top: 50%; margin-top: -20rpx; height: 40rpx; padding: 0 16rpx; border-radius: 999rpx; background: #FFFFFF; display: flex; align-items: center; font-size: 20rpx; font-weight: 700; color: #0B0C10; }
.rc-cap-chk { position: absolute; right: 26rpx; top: 50%; width: 44rpx; height: 44rpx; margin-top: -22rpx; border-radius: 50%; background: #3DDC97; display: flex; align-items: center; justify-content: center; }
.rc-dl-all { margin: 12rpx 32rpx 0; height: 96rpx; border-radius: 999rpx; background: rgba(255, 255, 255, .12); box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .22); display: flex; align-items: center; justify-content: center; }
.rc-dl-all-on { background: #3DDC97; box-shadow: none; }
.rc-dl-all-t { margin-left: 12rpx; font-size: 28rpx; font-weight: 700; color: #FFFFFF; }
.rc-dl-all-on .rc-dl-all-t { color: #0B0C10; }
.rc-dl-grab { width: 72rpx; height: 8rpx; margin: 20rpx auto 0; border-radius: 4rpx; background: rgba(255, 255, 255, .22); }

/* 中央提示 */
.rc-cpop { position: absolute; z-index: 80; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .25s ease; }
.rc-cpop-on { opacity: 1; }
.rc-cpop-card {
  width: 560rpx; box-sizing: border-box; padding: 40rpx 36rpx 36rpx; border-radius: 36rpx; background: rgba(28, 30, 38, .86); display: flex; flex-direction: column; align-items: center;
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .2), 0 30rpx 70rpx rgba(0, 0, 0, .55); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transform: scale(.9); transition: transform .3s cubic-bezier(.34, 1.4, .64, 1);
}
.rc-cpop-on .rc-cpop-card { transform: scale(1); }
.rc-cpop-ic { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(255, 181, 71, .16); display: flex; align-items: center; justify-content: center; }
.rc-cpop-t { margin-top: 18rpx; font-size: 32rpx; font-weight: 700; color: #FFFFFF; }
.rc-cpop-d { margin-top: 12rpx; font-size: 24rpx; line-height: 1.7; color: rgba(255, 255, 255, .78); text-align: center; }

/* 操作说明 */
.rc-help { position: absolute; z-index: 90; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; }
.rc-help-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .62); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.rc-help-card { position: relative; width: 640rpx; box-sizing: border-box; padding: 44rpx 32rpx 32rpx; border-radius: 40rpx; background: rgba(22, 24, 32, .94); box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .14); }
.rc-help-x { position: absolute; right: 24rpx; top: 24rpx; width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(255, 255, 255, .08); display: flex; align-items: center; justify-content: center; }
.rc-help-t { display: block; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; text-align: center; }
.rc-help-list { margin-top: 24rpx; max-height: 760rpx; }
.rc-help-i { display: flex; padding: 18rpx 0; }
.rc-help-ic { width: 60rpx; height: 60rpx; flex: none; border-radius: 18rpx; background: rgba(255, 255, 255, .1); display: flex; align-items: center; justify-content: center; }
.rc-help-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; }
.rc-help-it { font-size: 28rpx; font-weight: 700; color: #FFFFFF; }
.rc-help-id { margin-top: 6rpx; font-size: 23rpx; line-height: 1.65; color: rgba(255, 255, 255, .7); }
.rc-help-ok { margin-top: 24rpx; height: 88rpx; border-radius: 999rpx; background: #FFFFFF; display: flex; align-items: center; justify-content: center; }
.rc-help-ok-t { font-size: 28rpx; font-weight: 700; color: #0B0C10; }

@media (prefers-reduced-motion: reduce) {
  .rc-bub, .rc-spinner { animation: none; }
  .rc-bg-l, .rc-scr, .rc-cf-i, .rc-dl-panel, .rc-pk, .rc-glow, .rc-cast, .rc-node-disc, .rc-rot, .rc-cast-icon, .rc-cast-ink, .rc-cast-sheen::after { transition: none; }
}
</style>
