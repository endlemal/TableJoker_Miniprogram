<template>
  <page-meta page-style="overflow:hidden"></page-meta>
  <!-- 注意：整页都不用 @touchstart.stop。小程序的点击由触摸事件合成，拦住 touchstart 会让里面的点击全部失效。
       罗盘和按键在 touchstart 里「接管」这次触摸，外层的左右滑看到已被接管就不处理 -->
  <view class="rc" @touchstart="onSwipeStart" @touchmove="onSwipeMove" @touchend="onSwipeEnd" @touchcancel="onSwipeEnd">
    <!-- 背景：中央大屏画面的放大虚化 + 磨砂玻璃，切换大屏时交叉淡入 -->
    <view class="rc-bg">
      <view v-for="(l, k) in bgLayers" :key="k" class="rc-bg-l" :class="{ 'rc-bg-on': bgOn === k, 'rc-bg-gray': l.gray }">
        <z-fit-img v-if="l.src" :src="l.src" mode="aspectFill" :w="l.w" :h="l.h" :bg="l.tint" />
      </view>
      <view class="rc-bg-glass"></view>
    </view>

    <!-- 顶部导航：返回、页面标题、说明 -->
    <view class="rc-nav" :style="'padding-top:' + nav.statusBar + 'px;height:' + nav.navH + 'px'">
      <view class="rc-gbtn" hover-class="rc-press" @tap.stop="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
      <view class="rc-nav-mid" :style="'padding-right:' + nav.capsuleW + 'px'">
        <text class="rc-nav-t">遥控切屏</text>
        <view class="rc-help-btn" hover-class="rc-press" @tap.stop="openHelp"><z-icon name="help-circle" :size="16" color="rgba(255,255,255,.75)" /></view>
      </view>
    </view>

    <!-- 大屏封面流：中央大、两侧小，露出上一台和下一台 -->
    <view class="rc-glow" :style="glowStyle"></view>
    <view class="rc-flow" :class="{ 'rc-flow-drag': flowDragging }" :style="'top:' + L.flowTop + 'px;height:' + L.flowH + 'px'">
      <view v-if="loaded && !queue.length" class="rc-empty" :style="'width:' + L.W + 'px;height:' + L.H + 'px;margin-left:' + -L.W / 2 + 'px'">
        <text class="rc-empty-t">还没有绑定大屏</text>
        <view class="rc-chip-btn" hover-class="rc-press" @tap.stop="toDevices"><text class="rc-chip-btn-t">去设备管理</text></view>
      </view>
      <view v-for="(d, i) in queue" :key="d.id" class="rc-scr" :class="{ 'rc-scr-cur': i === ci }" :style="scrStyle(i)" @tap.stop="tapScreen(i)">
        <z-tv-screen
          :content="view(d, i).content"
          :groups="groups"
          :device-id="d.id"
          :last-scene="d.coverScene"
          :online="online(d)"
          :loading="!!casting[d.id]"
          :badge="view(d, i).preview ? 'preview' : ''"
          :color="hoverCat.color"
        />
        <view v-if="allMode && online(d)" class="rc-scr-chk"><z-icon name="check" :size="12" :stroke="3" color="#FFFFFF" /></view>
      </view>
    </view>

    <!-- 屏幕正下方：筛选 · 当前大屏 · 大屏列表 -->
    <view class="rc-info" :class="{ 'rc-info-up': filterOpen }" :style="'top:' + L.infoTop + 'px'">
      <view class="rc-sq" :class="{ 'rc-sq-on': filterOpen }" hover-class="rc-press" @tap.stop="toggleFilter">
        <z-icon name="filter" :size="18" :color="filterOpen ? '#0B0C10' : '#FFFFFF'" />
        <view v-if="filterKey !== 'all'" class="rc-sq-dot" :style="'background:' + filterColor"></view>
      </view>
      <view class="rc-ttl">
        <text class="rc-ttl-n" :class="{ 'rc-sys': !fitsDisplay(titleText) }">{{ titleText }}</text>
        <view class="rc-ttl-st" :class="{ 'rc-ttl-pv': statusPreview, 'rc-ttl-off': cur && !online(cur) && !allMode }" :style="statusPreview ? 'border-color:' + hoverCat.color + ';color:' + hoverCat.color : ''">
          <view v-if="!statusPreview" class="rc-ttl-dot"></view>
          <text class="rc-ttl-st-t">{{ statusLine }}</text>
        </view>
        <text class="rc-ttl-m">{{ metaLine }}</text>
      </view>
      <view class="rc-sq" hover-class="rc-press" @tap.stop="openList"><z-icon name="list-details" :size="18" color="#FFFFFF" /></view>
    </view>

    <!-- 筛选：气泡在筛选按钮右侧纵向展开；再点一次筛选按钮或点别处收起 -->
    <view v-if="filterOpen" class="rc-catch" @tap.stop="filterOpen = false"></view>
    <view v-if="filterOpen" class="rc-bubs" :style="'top:' + (L.infoTop + px(35)) + 'px'">
      <view v-for="(t, k) in filterTags" :key="t.key" class="rc-bub" :class="{ 'rc-bub-on': filterKey === t.key }" :style="'animation-delay:' + k * 45 + 'ms'" hover-class="rc-press" @tap.stop="setFilter(t.key)">
        <view class="rc-bub-dot" :style="'background:' + t.color"></view>
        <text class="rc-bub-t">{{ t.label }}</text>
        <text class="rc-bub-n">{{ t.n }}</text>
      </view>
    </view>

    <!-- 投放切屏按键：玻璃拟态镂空，中间按投放分类着色；休眠要长按蓄满 -->
    <view class="rc-halo" :style="'top:' + (L.castTop + L.cast / 2) + 'px;background:' + selCat.color + ';opacity:' + (selCat.hold ? 0.12 + charge * 0.3 : 0.3)"></view>
    <view
      class="rc-cast"
      :class="{ 'rc-cast-dis': !canCast, 'rc-cast-down': pressing }"
      :style="'top:' + L.castTop + 'px'"
      @touchstart="castDown"
      @touchend="castUp"
      @touchcancel="castCancel"
    >
      <view class="rc-cast-hole" :class="{ 'rc-cast-hole-hold': selCat.hold }" :style="selCat.hold ? '' : holeFill">
        <view v-if="selCat.hold" class="rc-water" :style="'top:' + (1 - charge) * 100 + '%'">
          <view class="rc-wave" :style="'background:' + selCat.color"></view>
          <view class="rc-water-body" :style="'background:' + selCat.color"></view>
        </view>
      </view>
      <view class="rc-cast-ic"><z-icon :name="selCat.hold ? 'moon' : 'arrows-exchange'" :size="32" :stroke="2.2" color="#FFFFFF" /></view>
    </view>
    <text class="rc-cast-tip" :style="'top:' + (L.castTop + L.cast + px(18)) + 'px'">{{ castTip }}</text>

    <!-- 罗盘：选框固定在中间，拖动整个罗盘让刻度经过选框；长按锁定 -->
    <view
      class="rc-dial"
      :class="{ 'rc-dial-lock': locked, 'rc-dial-shake': shake }"
      :style="'height:' + L.dialH + 'px'"
      @touchstart="dialStart"
      @touchmove="dialMove"
      @touchend="dialEnd"
      @touchcancel="dialEnd"
    >
      <view class="rc-arc" :style="arcStyle"></view>
      <view class="rc-rot" :class="{ 'rc-rot-drag': dialDragging }" :style="'top:' + (L.arcTop + L.R) + 'px;transform:rotate(' + rot + 'deg)'">
        <view v-for="a in TICKS" :key="'t' + a" class="rc-tick-w" :style="'transform:rotate(' + a + 'deg)'"><view class="rc-tick" :style="tickStyle"></view></view>
        <view v-for="(c, i) in CAST_CATS" :key="c.key" class="rc-node-w" :style="'transform:rotate(' + i * STEP + 'deg)'">
          <text class="rc-node-l" :class="{ 'rc-node-l-on': i === hoverIdx }" :style="labelStyle(c, i)">{{ i === hoverIdx ? c.name : c.label }}</text>
          <view class="rc-node" :class="{ 'rc-node-on': i === hoverIdx }" :style="nodeStyle(c, i)"></view>
        </view>
      </view>
      <view class="rc-sel" :style="'top:' + (L.arcTop - px(30)) + 'px'"><view class="rc-sel-l"></view><view class="rc-sel-r"></view></view>
      <!-- 罗盘下的小字：轮播海报、TV 主题点这里才弹出封面流 -->
      <view class="rc-hint" :class="{ 'rc-hint-act': hintAction }" :style="'top:' + (L.arcTop + px(44)) + 'px'" hover-class="rc-press" @tap.stop="tapHint">
        <z-icon v-if="locked" name="lock" :size="12" :stroke="2.5" :color="hoverCat.color" />
        <text class="rc-hint-t">{{ hintText }}</text>
        <z-icon v-if="hintAction" name="chevron-right" :size="13" color="rgba(255,255,255,.8)" />
      </view>
    </view>

    <!-- 封面流：轮播海报的海报组文件夹 / TV 主题。点一个：转到中间、选中、收起；点别处：保持原来的选择、收起 -->
    <view v-if="picker" class="rc-pk" :class="{ 'rc-pk-on': pickerOn }" @touchstart="pkStart" @touchmove="pkMove" @touchend="pkEnd" @touchcancel="pkEnd">
      <view class="rc-pk-mask" @tap.stop="closePicker"></view>
      <view class="rc-pk-head" :style="'top:' + (nav.statusBar + nav.navH + px(24)) + 'px'">
        <text class="rc-pk-t">{{ picker === 'poster' ? '选择海报组' : 'TV 主题' }}</text>
        <text class="rc-pk-s">{{ picker === 'poster' ? '只有审核通过的海报组才能投放' : '房间的主题在创建比赛页设置' }}</text>
      </view>
      <view class="rc-cf" :class="{ 'rc-cf-drag': pkDragging }">
        <block v-if="picker === 'poster'">
          <view v-if="!castable.length" class="rc-pk-empty">
            <text class="rc-pk-empty-t">还没有审核通过的海报组</text>
            <view class="rc-chip-btn" hover-class="rc-press" @tap.stop="toPosters"><text class="rc-chip-btn-t">去海报广告</text></view>
          </view>
          <view v-for="(g, i) in castable" :key="g.id" class="rc-cf-i" :style="cfStyle(i)" @tap.stop="pkTap(i)">
            <view class="rc-fd" :class="{ 'rc-fd-sel': sel.cat === 'poster' && sel.groupId === g.id }">
              <view class="rc-fd-tab"></view>
              <view class="rc-fd-back"></view>
              <view v-for="(im, k) in g.images.slice(0, 4)" :key="im.id" class="rc-fd-p" :style="paperStyle(k)">
                <z-fit-img :src="imgSrc(im)" mode="aspectFill" :w="1920" :h="1080" bg="#D9D3C8" />
              </view>
              <view class="rc-fd-front">
                <text class="rc-fd-n">{{ g.name }}</text>
                <text class="rc-fd-m">{{ g.images.length }} 张 · {{ g.status === 'live' ? '播放中 ' + (g.liveOn || []).length + ' 台' : '已通过审核' }}</text>
              </view>
              <view v-if="sel.cat === 'poster' && sel.groupId === g.id" class="rc-fd-chk"><z-icon name="check" :size="14" :stroke="3" color="#FFFFFF" /></view>
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
      <text class="rc-pk-hint">左右滑动浏览，点一下选中；点空白处保持原来的选择</text>
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
import { fitsDisplay } from '@/common/font-coverage.js'
import { requireLogin } from '@/common/auth.js'
import { requireHost } from '@/common/cert.js'
import { listDevices, isOnline, castToDevice } from '@/common/devices.js'
import { listGroups, playOn, stopOn } from '@/common/posters.js'
import { CAST_CATS, catOf, liveOf, sameContent, contentText, contentCover, castFields } from '@/common/screens.js'
import { TV_THEMES, ROOM_THEME, HELP } from '@/mock/remote.js'

const nav = getNavMetrics()
const px = (rpx) => uni.upx2px(rpx)
const toast = (title) => uni.showToast({ title, icon: 'none' })
const buzz = (type = 'light') => { try { uni.vibrateShort({ type }) } catch (e) {} }
const goBack = () => goBackOrHome()

/* ---------- 布局（px）：屏幕和信息在上，罗盘贴底，按键放在两者之间的正中 ---------- */
const sys = uni.getSystemInfoSync()
const safeB = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
const STEP = 15 // 罗盘节点间隔（度）
// 罗盘刻度：节点之间每 3 度一根细刻度
const TICKS = []
for (let a = -12; a <= (CAST_CATS.length - 1) * STEP + 12; a += 3) if (a % STEP !== 0) TICKS.push(a)
const L = (() => {
  const W = px(620)
  const H = Math.round((W * 9) / 16)
  const flowTop = nav.statusBar + nav.navH + px(16)
  const flowH = H + px(28)
  const infoTop = flowTop + flowH + px(18)
  const infoBottom = infoTop + px(150)
  const dialH = px(250) + safeB
  const cast = px(212)
  const room = sys.windowHeight - dialH - infoBottom
  const castTop = infoBottom + Math.max(px(20), (room - cast - px(40)) / 2)
  return { W, H, flowTop, flowH, infoTop, dialH, cast, castTop, R: px(760), arcTop: px(96), spacing: px(410) }
})()

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

/* ---------- 触摸归属：罗盘和按键在 touchstart 里接管，外层的左右滑就不处理 ---------- */
let claim = ''
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
const toggleFilter = () => { filterOpen.value = !filterOpen.value }
function setFilter(k) {
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
function scrStyle(i) {
  const o = i - ci.value + dragX.value / L.spacing
  const a = Math.abs(o)
  const scale = 1 - Math.min(a, 1.4) * 0.2
  const rotY = Math.max(-26, Math.min(26, -o * 20))
  const op = a > 2.2 ? 0 : 1 - Math.max(0, a - 1) * 0.55
  return `width:${L.W}px;height:${L.H}px;margin-left:${-L.W / 2}px;transform:translateX(${(o * L.spacing).toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)});z-index:${100 - Math.round(a * 10)};opacity:${op.toFixed(2)}`
}
function go(step) {
  const next = Math.max(0, Math.min(queue.value.length - 1, ci.value + step))
  if (next === ci.value) return
  ci.value = next
  buzz()
}
const tapScreen = (i) => { if (i !== ci.value) go(i - ci.value) }
let sw = null
function onSwipeStart(e) {
  if (claim || overlayOpen()) return
  const t = e.touches[0]
  sw = { x: t.clientX, y: t.clientY, on: false }
}
function onSwipeMove(e) {
  if (!sw || claim) return
  const t = e.touches[0]
  const dx = t.clientX - sw.x
  const dy = t.clientY - sw.y
  if (!sw.on && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { sw.on = true; flowDragging.value = true }
  if (!sw.on) return
  const atEdge = (dx > 0 && ci.value === 0) || (dx < 0 && ci.value === queue.value.length - 1)
  dragX.value = atEdge ? dx * 0.3 : dx
}
function onSwipeEnd() {
  claim = '' // 子元素的 touchend 先执行完，这里统一放开
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

/* ---------- 罗盘：选框固定，拖动整个罗盘让节点经过选框 ---------- */
const catIdx = ref(1)
const rot = ref(-STEP)
const dialDragging = ref(false)
const locked = ref(false)
const shake = ref(false)
const hoverIdx = computed(() => Math.max(0, Math.min(CAST_CATS.length - 1, Math.round(-rot.value / STEP))))
const hoverCat = computed(() => CAST_CATS[hoverIdx.value])
const sel = reactive({ cat: 'poster', groupId: '' })
const selCat = computed(() => catOf(sel.cat))
let dg = null
// 长按：自己计时（650ms 内没有移动）锁定 / 解锁
let lpTimer = null
function dialStart(e) {
  claim = 'dial'
  const t = e.touches[0]
  dg = { x: t.clientX, base: rot.value, idx: hoverIdx.value, moved: false, toggled: false }
  clearTimeout(lpTimer)
  lpTimer = setTimeout(() => { if (dg && !dg.moved) toggleLock() }, 650)
  if (!locked.value) dialDragging.value = true
}
function dialMove(e) {
  if (!dg) return
  const dx = e.touches[0].clientX - dg.x
  if (Math.abs(dx) > 6 && !dg.moved) { dg.moved = true; clearTimeout(lpTimer) }
  if (locked.value) {
    if (dg.moved && !shake.value) { shake.value = true; toast('罗盘已锁定，长按解锁'); setTimeout(() => { shake.value = false }, 500) }
    return
  }
  const deg = (dx / L.R) * (180 / Math.PI)
  const min = -(CAST_CATS.length - 1) * STEP
  let r = dg.base + deg
  if (r > 0) r *= 0.35
  if (r < min) r = min + (r - min) * 0.35
  rot.value = r
  if (hoverIdx.value !== dg.idx) { dg.idx = hoverIdx.value; buzz() }
}
function dialEnd() {
  clearTimeout(lpTimer)
  if (!dg) return
  const toggled = dg.toggled
  dg = null
  if (toggled || locked.value) return
  dialDragging.value = false
  setCat(hoverIdx.value)
}
function toggleLock() {
  if (dg) dg.toggled = true
  dialDragging.value = false
  rot.value = -catIdx.value * STEP
  locked.value = !locked.value
  buzz('heavy')
  popMsg(locked.value ? `罗盘已锁定在「${selCat.value.name}」，切换大屏时保持不变` : '罗盘已解锁', locked.value ? 'lock' : 'lock-open', locked.value ? 'red' : 'gray')
}
// 只切换分类，不自动弹出封面流（轮播海报、TV 主题点罗盘下的小字再选）
function setCat(idx) {
  catIdx.value = idx
  rot.value = -idx * STEP
  const c = CAST_CATS[idx]
  if (c.key === sel.cat) return
  sel.cat = c.key
  const live = cur.value ? liveOf(cur.value, groups.value) : { cat: '' }
  sel.groupId = c.key === 'poster' ? (live.cat === 'poster' ? live.groupId : castable.value.length === 1 ? castable.value[0].id : '') : ''
}
// 没锁定时，换一台大屏，罗盘跟着它此刻显示的内容走
function syncToDevice() {
  if (locked.value || !cur.value || !online(cur.value)) return
  const live = liveOf(cur.value, groups.value)
  if (!live.cat) return
  const idx = CAST_CATS.findIndex((c) => c.key === live.cat)
  catIdx.value = idx
  rot.value = -idx * STEP
  sel.cat = live.cat
  sel.groupId = live.groupId
}
watch(() => cur.value && cur.value.id, syncToDevice)
const arcStyle = computed(() => {
  const c = hoverCat.value.color
  return `left:50%;margin-left:${-L.R}px;top:${L.arcTop}px;width:${L.R * 2}px;height:${L.R * 2}px;border-color:${c};box-shadow:0 0 ${px(26)}px ${c}55`
})
const tickStyle = computed(() => `top:${-L.R - px(5)}px`)
const nodeStyle = (c, i) => {
  const on = i === hoverIdx.value
  const s = on ? px(30) : px(18)
  return `width:${s}px;height:${s}px;left:${-s / 2}px;top:${-L.R - s / 2}px;border-color:${c.color};${on ? `background:${c.color};box-shadow:0 0 0 ${px(8)}px ${c.color}33, 0 0 ${px(26)}px ${c.color}` : ''}`
}
const labelStyle = (c, i) => `top:${-L.R - px(i === hoverIdx.value ? 72 : 58)}px;${i === hoverIdx.value ? 'color:' + c.color : ''}`
const themeName = (k) => (TV_THEMES.find((t) => t.key === k) || {}).name || ''
const hintAction = computed(() => !locked.value && sel.cat === hoverCat.value.key && !!selCat.value.pick)
const hintText = computed(() => {
  if (sel.cat !== hoverCat.value.key) return '松手选中'
  const head = locked.value ? '已锁定 · ' : ''
  if (sel.cat === 'poster') {
    const g = groups.value.find((x) => x.id === sel.groupId)
    if (locked.value) return head + (g ? g.name : '还没选海报组')
    return g ? `${g.name} · 点此更换` : '点此选择海报组'
  }
  if (sel.cat === 'theme') return head + `房间主题「${themeName(ROOM_THEME)}」` + (locked.value ? '' : ' · 点此浏览')
  if (sel.cat === 'sleep') return head + '电视黑屏待机，长按按键投放'
  if (sel.cat === 'checkin') return head + '显示当前房间的签到墙'
  return head + '回到赛事列表主界面'
})
function tapHint() {
  if (locked.value) return toast('罗盘已锁定，长按解锁')
  if (hintAction.value) openPicker(selCat.value.pick)
}

/* ---------- 每块屏幕显示什么：预览还是正在播放 ---------- */
const selContent = computed(() => ({ cat: sel.cat, groupId: sel.cat === 'poster' ? sel.groupId : '' }))
const ready = computed(() => !(sel.cat === 'poster' && !sel.groupId))
// 没锁定时，中央的大屏预览选中的内容；锁定时只显示它此刻的画面，投放后才变
function view(d, i) {
  const on = online(d)
  const live = on ? liveOf(d, groups.value) : { cat: '' }
  const preview = on && !locked.value && !allMode.value && i === ci.value && !casting[d.id] && ready.value && !sameContent(selContent.value, live)
  return { content: preview ? selContent.value : live, preview }
}
const statusPreview = computed(() => !!cur.value && view(cur.value, ci.value).preview)
const titleText = computed(() => (allMode.value ? '全部在线大屏' : cur.value ? cur.value.name : '遥控切屏'))
const statusLine = computed(() => {
  if (allMode.value) return `已选中 ${onlineCount.value} 台，单击按键一起投放`
  if (!cur.value) return '没有大屏'
  if (!online(cur.value)) return '离线 · ' + ago(cur.value.lastSeen) + '在线'
  const v = view(cur.value, ci.value)
  return (v.preview ? '预览 · ' : '正在播放 · ') + (contentText(v.content, groups.value) || '空闲')
})
const metaLine = computed(() => {
  if (allMode.value) return '点右侧列表可以回到单台'
  if (!cur.value) return ''
  const res = cur.value.resolution ? `${cur.value.resolution.w}×${cur.value.resolution.h} · ` : ''
  return res + `${ci.value + 1} / ${queue.value.length}`
})

/* ---------- 背景：中央大屏画面的放大虚化，切换时交叉淡入 ---------- */
const bgLayers = reactive([{ src: '' }, { src: '' }])
const bgOn = ref(0)
const bgCover = computed(() => {
  const d = cur.value
  if (!d) return null
  const c = contentCover(view(d, ci.value).content, groups.value, d.id, d.coverScene)
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

/* ---------- 投放切屏按键 ---------- */
const casting = reactive({})
const pressing = ref(false)
const charge = ref(0)
let chargeTimer = null
let pressAt = 0
const targets = computed(() => (allMode.value ? devices.value.filter(online) : cur.value && online(cur.value) ? [cur.value] : []))
const canCast = computed(() => targets.value.length > 0)
const holeFill = computed(() => {
  const c = selCat.value.color
  return `background:radial-gradient(circle at 34% 26%, #FFFFFF66 0%, ${c} 44%, ${c}D0 100%);box-shadow:0 0 ${px(36)}px ${c}99, inset 0 ${px(-10)}px ${px(22)}px rgba(0,0,0,.22)`
})
const castTip = computed(() => {
  if (!canCast.value) return cur.value ? '大屏离线，联网后才能投放' : '没有可投放的大屏'
  if (sel.cat === 'poster' && !sel.groupId) return '先在罗盘下方选一组海报'
  if (selCat.value.hold) return charge.value > 0 ? `蓄力中 ${Math.round(charge.value * 100)}%` : '长按蓄满，投放休眠'
  return allMode.value ? `单击投放到全部 ${targets.value.length} 台` : '单击投放'
})
function castDown() {
  claim = 'cast'
  if (!canCast.value) return toast(castTip.value)
  pressing.value = true
  pressAt = Date.now()
  if (!selCat.value.hold) return
  clearInterval(chargeTimer)
  chargeTimer = setInterval(() => {
    charge.value = Math.min(1, charge.value + 0.028)
    if (charge.value >= 1) {
      clearInterval(chargeTimer)
      pressing.value = false
      buzz('heavy')
      doCast()
      setTimeout(drain, 500)
    }
  }, 40)
}
function castUp() {
  if (!pressing.value) return
  pressing.value = false
  if (selCat.value.hold) return drain()
  if (Date.now() - pressAt > 800) return
  if (sel.cat === 'poster' && !sel.groupId) return openPicker('poster')
  doCast()
}
function castCancel() {
  pressing.value = false
  if (selCat.value.hold) drain()
}
function drain() {
  clearInterval(chargeTimer)
  chargeTimer = setInterval(() => {
    charge.value = Math.max(0, charge.value - 0.06)
    if (charge.value <= 0) clearInterval(chargeTimer)
  }, 30)
}
function doCast() {
  const list = targets.value.slice()
  if (!list.length) return
  const content = { ...selContent.value }
  const fields = castFields(content, groups.value)
  buzz('medium')
  list.forEach((d, k) => {
    setTimeout(async () => {
      casting[d.id] = true
      try {
        if (content.cat === 'poster') await playOn(content.groupId, d.id)
        else await stopOn(d.id)
        await castToDevice(d.id, fields)
      } catch (e) {
        toast(`「${d.name}」没有切换成功`)
      }
      setTimeout(async () => {
        delete casting[d.id]
        await load()
      }, 900)
    }, k * 220)
  })
  const text = (content.cat === 'theme' ? 'TV 主题 · ' : '') + contentText(content, groups.value)
  popMsg(list.length > 1 ? `已投放到 ${list.length} 台大屏：${text}` : `已投放到「${list[0].name}」：${text}`, 'arrows-exchange')
}

/* ---------- 封面流：点一个 → 转到中间 → 选中 → 收起；点别处保持原来的选择 ---------- */
const picker = ref('')
const pickerOn = ref(false)
const pkIdx = ref(0)
const pkDragging = ref(false)
const pkDrag = ref(0)
let picking = false
function openPicker(kind) {
  if (locked.value) return
  picker.value = kind
  picking = false
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
// 文件夹里的海报：错位叠在一起，只露出上沿
const paperStyle = (k) => `transform:translate(${px(-30 + k * 20)}px, ${px(-k * 8)}px) rotate(${-9 + k * 6}deg);z-index:${k + 1}`
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
  const d = pkDrag.value
  pkDragging.value = false
  pkDrag.value = 0
  const n = pkCount()
  if (d < -50 && pkIdx.value < n - 1) { pkIdx.value += 1; buzz() }
  else if (d > 50 && pkIdx.value > 0) { pkIdx.value -= 1; buzz() }
}
function pkTap(i) {
  if (picking) return
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
  filterOpen.value = false
  listShown.value = true
  setTimeout(() => { listOn.value = true }, 20)
}
function closeList() {
  listOn.value = false
  setTimeout(() => { listShown.value = false }, 340)
}
function pickDevice(d) {
  allMode.value = false
  if (!queue.value.includes(d)) filterKey.value = 'all'
  ci.value = Math.max(0, queue.value.findIndex((x) => x.id === d.id))
  buzz()
  closeList()
}
function toggleAll() {
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
  // 第一次打开：先看操作说明
  try {
    if (!uni.getStorageSync('zz_remote_help')) {
      helpOpen.value = true
      uni.setStorageSync('zz_remote_help', 1)
    }
  } catch (e) {}
})
onShow(async () => {
  await load()
  syncToDevice()
  clearInterval(tickTimer)
  tickTimer = setInterval(() => { tick.value += 1 }, 15000)
})
onHide(() => clearInterval(tickTimer))
onUnload(() => { clearInterval(tickTimer); clearInterval(chargeTimer); clearTimeout(lpTimer) })
</script>

<style>
/* 沉浸式遥控器：和全站的暗色主题不同，用玻璃拟态和投放分类的颜色；类名都带 rc- 前缀 */
/* overflow: clip 连程序滚动也挡住（overflow: hidden 的容器仍可能被 scrollIntoView 之类的调用滚走） */
.rc { position: fixed; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; overflow: clip; background: #06070A; color: #FFFFFF; }
.rc-press { opacity: .78; transform: scale(.94); }
.rc-press-soft { opacity: .85; }
.rc-sys { font-family: "PingFang SC", "Microsoft YaHei", sans-serif !important; font-weight: 700 !important; letter-spacing: 1rpx !important; }

/* 背景 */
.rc-bg { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
.rc-bg-l { position: absolute; left: -20%; top: -12%; right: -20%; bottom: 30%; opacity: 0; transition: opacity .8s ease; filter: blur(44px) saturate(1.4); }
.rc-bg-on { opacity: .95; }
.rc-bg-gray { filter: blur(44px) grayscale(1) brightness(.55); }
.rc-bg-glass { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(6, 7, 10, .36) 0%, rgba(6, 7, 10, .18) 30%, rgba(6, 7, 10, .7) 58%, #06070A 82%); }

/* 顶部导航 */
.rc-nav { position: absolute; z-index: 20; left: 0; right: 0; top: 0; box-sizing: content-box; padding-left: 24rpx; display: flex; align-items: center; }
.rc-gbtn {
  width: 68rpx; height: 68rpx; flex: none; border-radius: 50%; background: rgba(255, 255, 255, .1); display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, .24); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.rc-nav-mid { position: absolute; left: 0; right: 0; bottom: 0; top: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.rc-nav-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 36rpx; letter-spacing: 6rpx; color: #FFFFFF; }
.rc-help-btn { margin-left: 10rpx; width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; pointer-events: auto; }

/* 大屏封面流 */
.rc-glow { position: absolute; z-index: 9; left: 50%; border-radius: 50%; filter: blur(34px); opacity: .7; transition: background .8s ease; }
.rc-flow { position: absolute; z-index: 10; left: 0; right: 0; perspective: 1400px; }
.rc-scr {
  position: absolute; left: 50%; top: 10rpx; box-sizing: border-box; border-radius: 24rpx; overflow: hidden; background: #000000;
  box-shadow: 0 0 0 2rpx rgba(255, 255, 255, .12), 0 30rpx 60rpx rgba(0, 0, 0, .5); transition: transform .5s cubic-bezier(.2, .8, .2, 1), opacity .5s ease;
}
.rc-flow-drag .rc-scr { transition: none; }
.rc-scr-cur { box-shadow: 0 0 0 3rpx rgba(255, 255, 255, .55), 0 34rpx 70rpx rgba(0, 0, 0, .6); }
.rc-scr-chk { position: absolute; right: 14rpx; top: 12rpx; width: 38rpx; height: 38rpx; border-radius: 50%; background: #3DDC97; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, .4); }
.rc-empty { position: absolute; left: 50%; top: 10rpx; box-sizing: border-box; border-radius: 24rpx; border: 2rpx dashed rgba(255, 255, 255, .28); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rc-empty-t { font-size: 26rpx; color: rgba(255, 255, 255, .75); }
.rc-chip-btn { margin-top: 20rpx; height: 64rpx; padding: 0 28rpx; border-radius: 999rpx; background: rgba(255, 255, 255, .16); display: flex; align-items: center; }
.rc-chip-btn-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }

/* 屏幕正下方：筛选 · 当前大屏 · 大屏列表 */
.rc-info { position: absolute; z-index: 12; left: 36rpx; right: 36rpx; height: 150rpx; display: flex; align-items: center; }
.rc-info-up { z-index: 45; }
.rc-sq {
  position: relative; width: 80rpx; height: 80rpx; flex: none; border-radius: 26rpx; background: rgba(255, 255, 255, .1); display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, .24); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: background .2s ease;
}
.rc-sq-on { background: rgba(255, 255, 255, .9); }
.rc-sq-dot { position: absolute; right: 12rpx; top: 12rpx; width: 14rpx; height: 14rpx; border-radius: 50%; box-shadow: 0 0 0 3rpx rgba(6, 7, 10, .6); }
.rc-ttl { flex: 1; min-width: 0; margin: 0 16rpx; display: flex; flex-direction: column; align-items: center; }
.rc-ttl-n { max-width: 100%; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 46rpx; line-height: 1.15; letter-spacing: 3rpx; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 4rpx 18rpx rgba(0, 0, 0, .45); }
.rc-ttl-st { margin-top: 12rpx; max-width: 100%; box-sizing: border-box; height: 48rpx; padding: 0 20rpx; border-radius: 999rpx; background: rgba(255, 255, 255, .1); border: 2rpx solid transparent; display: flex; align-items: center; }
.rc-ttl-pv { border-style: dashed; background: rgba(0, 0, 0, .25); }
.rc-ttl-off { background: rgba(255, 255, 255, .06); }
.rc-ttl-dot { width: 12rpx; height: 12rpx; flex: none; margin-right: 10rpx; border-radius: 50%; background: #3DDC97; box-shadow: 0 0 10rpx #3DDC97; }
.rc-ttl-off .rc-ttl-dot { background: #6B7280; box-shadow: none; }
.rc-ttl-st-t { font-size: 23rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-ttl-m { margin-top: 10rpx; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 20rpx; letter-spacing: 2rpx; color: rgba(255, 255, 255, .45); }

/* 筛选气泡 */
.rc-catch { position: absolute; z-index: 40; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .25); }
.rc-bubs { position: absolute; z-index: 46; left: 136rpx; display: flex; flex-direction: column; align-items: flex-start; }
.rc-bub {
  margin-bottom: 14rpx; height: 66rpx; padding: 0 26rpx 0 20rpx; border-radius: 999rpx; background: rgba(30, 32, 40, .78); display: flex; align-items: center;
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, .22), 0 12rpx 30rpx rgba(0, 0, 0, .35); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  animation: rc-bub .42s cubic-bezier(.34, 1.56, .64, 1) backwards;
}
@keyframes rc-bub { from { opacity: 0; transform: translateX(-30rpx) scale(.7); } to { opacity: 1; transform: none; } }
.rc-bub-on { background: rgba(255, 255, 255, .92); }
.rc-bub-on .rc-bub-t, .rc-bub-on .rc-bub-n { color: #0B0C10; }
.rc-bub-dot { width: 16rpx; height: 16rpx; border-radius: 50%; box-shadow: 0 0 0 3rpx rgba(255, 255, 255, .12); }
.rc-bub-t { margin-left: 12rpx; font-size: 24rpx; color: #FFFFFF; }
.rc-bub-n { margin-left: 14rpx; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 26rpx; color: rgba(255, 255, 255, .65); }

/* 投放切屏按键 */
.rc-halo { position: absolute; z-index: 13; left: 50%; width: 340rpx; height: 340rpx; margin: -170rpx 0 0 -170rpx; border-radius: 50%; filter: blur(46px); transition: background .4s ease, opacity .2s ease; animation: rc-breathe 3.2s ease-in-out infinite; }
@keyframes rc-breathe { 50% { transform: scale(1.12); } }
.rc-cast {
  position: absolute; z-index: 15; left: 50%; width: 212rpx; height: 212rpx; margin-left: -106rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 30% 22%, rgba(255, 255, 255, .36), rgba(255, 255, 255, .08) 48%, rgba(255, 255, 255, .03) 72%);
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .45), inset 0 -14rpx 30rpx rgba(0, 0, 0, .28), 0 30rpx 60rpx rgba(0, 0, 0, .45), 0 0 0 16rpx rgba(255, 255, 255, .04);
  backdrop-filter: blur(18px) saturate(160%); -webkit-backdrop-filter: blur(18px) saturate(160%); transition: transform .18s ease;
}
.rc-cast-down { transform: scale(.93); }
.rc-cast-dis { opacity: .45; }
.rc-cast-hole { position: relative; width: 142rpx; height: 142rpx; border-radius: 50%; overflow: hidden; transition: background .4s ease, box-shadow .4s ease; }
.rc-cast-hole-hold { background: rgba(255, 255, 255, .02); box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .5), inset 0 8rpx 24rpx rgba(0, 0, 0, .35); }
.rc-water { position: absolute; left: 0; right: 0; bottom: 0; transition: top .06s linear; }
.rc-water-body { position: absolute; left: 0; right: 0; top: 10rpx; bottom: 0; opacity: .92; }
.rc-wave { position: absolute; left: -50%; top: -150rpx; width: 200%; height: 170rpx; border-radius: 42%; opacity: .92; animation: rc-wave 2.6s linear infinite; }
@keyframes rc-wave { to { transform: rotate(360deg); } }
.rc-cast-ic { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.rc-cast-tip { position: absolute; z-index: 15; left: 0; right: 0; text-align: center; font-size: 22rpx; letter-spacing: 1rpx; color: rgba(255, 255, 255, .62); }

/* 罗盘 */
.rc-dial { position: absolute; z-index: 14; left: 0; right: 0; bottom: 0; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 14%, #000 86%, transparent 100%); }
.rc-dial-shake { animation: rc-shake .45s ease; }
@keyframes rc-shake { 20%, 60% { transform: translateX(-12rpx); } 40%, 80% { transform: translateX(12rpx); } }
.rc-arc { position: absolute; box-sizing: border-box; border-radius: 50%; border-width: 4rpx; border-style: solid; transition: border-color .3s ease, box-shadow .3s ease; }
.rc-dial-lock .rc-arc { border-style: dashed; }
.rc-rot { position: absolute; left: 50%; width: 0; height: 0; transition: transform .45s cubic-bezier(.2, .8, .2, 1); }
.rc-rot-drag { transition: none; }
.rc-tick-w, .rc-node-w { position: absolute; left: 0; top: 0; width: 0; height: 0; }
.rc-tick { position: absolute; left: -1rpx; width: 2rpx; height: 10rpx; border-radius: 1rpx; background: rgba(255, 255, 255, .28); }
.rc-node { position: absolute; box-sizing: border-box; border-radius: 50%; border-width: 4rpx; border-style: solid; background: #0B0C10; transition: width .25s ease, height .25s ease, left .25s ease, top .25s ease, background .25s ease, box-shadow .25s ease; }
.rc-node-l { position: absolute; left: -150rpx; width: 300rpx; text-align: center; font-size: 20rpx; color: rgba(255, 255, 255, .42); white-space: nowrap; transition: color .25s ease, top .25s ease, font-size .25s ease; }
.rc-node-l-on { font-size: 30rpx; font-weight: 700; letter-spacing: 2rpx; text-shadow: 0 0 20rpx rgba(0, 0, 0, .6); }
.rc-sel { position: absolute; left: 50%; width: 64rpx; height: 60rpx; margin-left: -32rpx; pointer-events: none; }
.rc-sel-l, .rc-sel-r { position: absolute; top: 0; bottom: 0; width: 3rpx; border-radius: 2rpx; background: rgba(255, 255, 255, .7); box-shadow: 0 0 8rpx rgba(255, 255, 255, .45); }
.rc-sel-l { left: 0; }
.rc-sel-r { right: 0; }
.rc-hint { position: absolute; left: 50%; transform: translateX(-50%); max-width: 600rpx; height: 52rpx; padding: 0 22rpx; border-radius: 999rpx; display: flex; align-items: center; white-space: nowrap; }
.rc-hint-act { background: rgba(255, 255, 255, .1); box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, .22); }
.rc-hint-t { margin: 0 6rpx; font-size: 22rpx; color: rgba(255, 255, 255, .72); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-hint-act .rc-hint-t { color: #FFFFFF; }

/* 封面流选择层 */
.rc-pk { position: absolute; z-index: 60; left: 0; top: 0; right: 0; bottom: 0; opacity: 0; transition: opacity .3s ease; }
.rc-pk-on { opacity: 1; }
.rc-pk-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(5, 6, 9, .6); backdrop-filter: blur(26px); -webkit-backdrop-filter: blur(26px); }
.rc-pk-head { position: absolute; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.rc-pk-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 44rpx; letter-spacing: 4rpx; color: #FFFFFF; }
.rc-pk-s { margin-top: 10rpx; font-size: 22rpx; color: rgba(255, 255, 255, .6); }
.rc-cf { position: absolute; left: 0; right: 0; top: 44%; height: 0; perspective: 1200px; transform-style: preserve-3d; pointer-events: none; }
.rc-cf-i { position: absolute; left: 50%; top: 0; width: 400rpx; height: 320rpx; margin: -160rpx 0 0 -200rpx; transform-style: preserve-3d; pointer-events: auto; transition: transform .45s cubic-bezier(.2, .8, .2, 1), opacity .45s ease; }
.rc-cf-th { width: 440rpx; height: 260rpx; margin: -130rpx 0 0 -220rpx; }
.rc-cf-drag .rc-cf-i { transition: none; }
.rc-pk-empty { position: absolute; left: 80rpx; right: 80rpx; top: -120rpx; height: 240rpx; border-radius: 28rpx; border: 2rpx dashed rgba(255, 255, 255, .3); display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto; }
.rc-pk-empty-t { font-size: 26rpx; color: rgba(255, 255, 255, .8); }
.rc-pk-hint { position: absolute; left: 0; right: 0; bottom: 18%; text-align: center; font-size: 22rpx; color: rgba(255, 255, 255, .55); pointer-events: none; }

/* 海报组文件夹：液态玻璃 */
.rc-fd { position: absolute; left: 0; top: 0; width: 400rpx; height: 320rpx; }
.rc-fd-tab { position: absolute; left: 28rpx; top: 20rpx; width: 150rpx; height: 44rpx; border-radius: 20rpx 20rpx 0 0; background: rgba(46, 48, 64, .95); }
.rc-fd-back { position: absolute; left: 0; top: 52rpx; right: 0; bottom: 0; border-radius: 36rpx; background: linear-gradient(160deg, rgba(50, 52, 70, .96), rgba(20, 21, 30, .96)); box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .12); }
.rc-fd-p { position: absolute; left: 104rpx; top: 56rpx; width: 196rpx; height: 146rpx; box-sizing: border-box; padding: 7rpx 7rpx 18rpx; border-radius: 8rpx; background: #F3EEE6; box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, .45); }
.rc-fd-front {
  position: absolute; z-index: 20; left: -6rpx; right: -6rpx; bottom: -4rpx; height: 196rpx; box-sizing: border-box; padding: 32rpx 32rpx 0; border-radius: 36rpx;
  background: linear-gradient(165deg, rgba(255, 255, 255, .36), rgba(255, 255, 255, .1) 55%, rgba(255, 92, 122, .16));
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, .55), inset 0 0 0 2rpx rgba(255, 255, 255, .28), 0 20rpx 40rpx rgba(0, 0, 0, .35);
  backdrop-filter: blur(16px) saturate(170%); -webkit-backdrop-filter: blur(16px) saturate(170%); display: flex; flex-direction: column;
}
.rc-fd-sel .rc-fd-front { box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, .55), inset 0 0 0 4rpx #FF5C7A, 0 20rpx 40rpx rgba(0, 0, 0, .35); }
.rc-fd-n { font-size: 32rpx; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, .3); }
.rc-fd-m { margin-top: 8rpx; font-size: 22rpx; color: rgba(255, 255, 255, .8); }
.rc-fd-chk { position: absolute; z-index: 30; right: 20rpx; bottom: 24rpx; width: 46rpx; height: 46rpx; border-radius: 50%; background: #FF5C7A; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 16rpx rgba(255, 92, 122, .5); }

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
  .rc-wave, .rc-bub, .rc-dial-shake, .rc-halo { animation: none; }
  .rc-bg-l, .rc-scr, .rc-rot, .rc-cf-i, .rc-dl-panel, .rc-pk, .rc-glow { transition: none; }
}
</style>
