<template>
  <page-meta :page-style="roomsShown ? 'overflow:hidden' : ''"></page-meta>
  <view class="page">
    <!-- 紧凑标题栏：大标题滚走后出现（和广场一致） -->
    <view class="cbar" :class="{ 'cbar-on': compact }" :style="cbarStyle">
      <view v-if="canBack" class="cbar-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
      <text class="cbar-t">主办方工作台</text>
    </view>
    <view class="head" :style="headStyle">
      <view class="head-row" :style="headRowStyle">
        <view v-if="canBack" class="h-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="h-title">主办方工作台</text>
      </view>
    </view>

    <!-- 1. 身份卡：银行卡比例（ISO ID-1，1.586 : 1） -->
    <view class="idc">
      <view class="idc-guilloche"></view>
      <view class="idc-sheen"></view>
      <view class="idc-top" hover-class="press-soft" @tap="toCert">
        <view class="club" :style="'background:' + hostProfile.clubBg">
          <z-icon :name="hostProfile.clubIcon" :size="22" :color="hostProfile.clubFg" />
          <view class="club-v"><z-icon name="letter-v" :size="9" :stroke="3.4" color="#FFFFFF" /></view>
        </view>
        <view class="idc-id">
          <view class="idc-row"><text class="idc-name">{{ hostProfile.club }}</text><text class="idc-tag">认证主办方</text></view>
          <text class="idc-sub">主理人 {{ who.nickname }}</text>
        </view>
        <text class="idc-brand">TABLEJOKER</text>
      </view>
      <view class="idc-mid">
        <view class="emv"><view class="emv-h"></view><view class="emv-v"></view></view>
        <view class="idc-no"><text v-for="g in hostProfile.cardNo" :key="g" class="idc-no-g">{{ g }}</text></view>
        <view class="idc-exp"><text class="idc-exp-k">VALID THRU</text><text class="idc-exp-v">{{ hostProfile.expires }}</text></view>
      </view>
      <!-- 内嵌槽：本周概览 -->
      <view class="idc-slot">
        <view v-for="(x, i) in deskMetrics" :key="x.key" class="mt-i" :class="{ 'mt-sep': i > 0 }" hover-class="press-soft" @tap="toast(x.label + '明细即将上线')">
          <view class="mt-v"><text class="mt-num">{{ shownMetric[i] }}</text><text class="mt-u">{{ x.unit }}</text></view>
          <text class="mt-l">{{ x.label }}</text>
        </view>
      </view>
    </view>

    <!-- 双主按钮 -->
    <view class="qa">
      <view class="qa-main" hover-class="press" @tap="go('/pages/create/index')">
        <z-icon name="plus" :size="18" :stroke="2.5" color="#FFFFFF" /><text class="qa-t">创建比赛</text>
      </view>
      <view class="qa-sub" hover-class="press" @tap="openRooms">
        <view class="live-dot"></view><text class="qa-t">房间列表</text><text class="qa-n">({{ rooms.length }})</text>
      </view>
    </view>

    <!-- 2. 待办：默认只显示最紧急的 3 条，其余折叠 -->
    <view class="sec">
      <view class="sec-h">
        <text class="sec-t">待办</text>
        <view v-if="todos.length > 3" class="sec-more" hover-class="press-soft" @tap="todoOpen = !todoOpen">
          <text class="sec-more-t">{{ todoOpen ? '收起' : (todos.length - 3) + '项 · 展开' }}</text>
          <view class="chev" :class="{ 'chev-up': todoOpen }"><z-icon name="chevron-down" :size="14" color="#9CA3AF" /></view>
        </view>
      </view>
      <view class="td">
        <view v-for="(t, i) in todos.slice(0, 3)" :key="t.key" class="td-i" :class="{ 'td-first': i === 0 }" hover-class="press-soft" @tap="doTodo(t)">
          <view class="td-ic" :class="'td-' + t.tone"><z-icon :name="t.icon" :size="14" :color="TONE[t.tone]" /></view>
          <text class="td-t">{{ t.title }}</text>
          <text class="td-m">{{ t.meta }}</text>
          <z-icon name="chevron-right" :size="14" color="#4B5060" />
        </view>
        <view class="fold" :class="{ 'fold-on': todoOpen }"><view class="fold-in">
          <view v-for="t in todos.slice(3)" :key="t.key" class="td-i" hover-class="press-soft" @tap="doTodo(t)">
            <view class="td-ic" :class="'td-' + t.tone"><z-icon :name="t.icon" :size="14" :color="TONE[t.tone]" /></view>
            <text class="td-t">{{ t.title }}</text>
            <text class="td-m">{{ t.meta }}</text>
            <z-icon name="chevron-right" :size="14" color="#4B5060" />
          </view>
        </view></view>
      </view>
    </view>

    <!-- 3. 运营分析：一张卡片 = 可折叠的办赛热力条 + 三合一看板 -->
    <view class="sec">
      <view class="sec-h"><text class="sec-t">运营分析</text><text class="sec-n">近 30 天</text></view>
      <view class="an">
        <view class="hm-h" hover-class="press-soft" @tap="heatOpen = !heatOpen">
          <view class="hm-flame"><z-icon name="flame" :size="13" color="#FF6B6B" /></view>
          <text class="hm-t">{{ heat.month }}月办赛热力</text>
          <text class="hm-sum">办赛 {{ heatDays }} 天 · {{ heatTotal }} 人次</text>
          <view class="chev" :class="{ 'chev-up': heatOpen }"><z-icon name="chevron-down" :size="14" color="#9CA3AF" /></view>
        </view>
        <view class="fold" :class="{ 'fold-on': heatOpen }"><view class="fold-in">
          <scroll-view scroll-x class="hm" :scroll-into-view="heatAnchor" :show-scrollbar="false" :enhanced="true">
            <view class="hm-row">
              <view v-for="x in heat.days" :id="'hd' + x.d" :key="x.d" class="hm-c" :class="{ 'hm-today': x.today, 'hm-future': x.n === null, 'hm-wkd': x.wd === 0 || x.wd === 6 }" @tap="pickDay(x)">
                <view v-if="bubble.d === x.d" class="hm-bub"><text class="hm-bub-t">{{ bubble.text }}</text></view>
                <view class="hm-dot-box"><view class="hdot" :class="'h' + heatLevel(x.n)"></view></view>
                <text class="hm-d">{{ x.d }}</text>
              </view>
            </view>
          </scroll-view>
        </view></view>

        <!-- 三合一胶囊分段切换（样式同广场的分段选择器） -->
        <view class="seg">
          <view class="seg-ind" :style="'transform:translateX(' + tab * 100 + '%)'"></view>
          <view v-for="(t, i) in TABS" :key="t" class="seg-i" @tap="setTab(i)"><text class="seg-t" :class="{ 'seg-t-on': tab === i }">{{ t }}</text></view>
        </view>

        <view class="ch">
          <!-- Tab 1：客群与线上率 -->
          <view v-if="tab === 0" key="t0" class="pane aud">
            <view class="donut">
              <view class="donut-img" :style="donutStyle"></view>
              <view class="donut-c">
                <text class="donut-v">{{ focusGroup ? focusGroup.pct + '%' : audience.onlineRate + '%' }}</text>
                <text class="donut-k">{{ focusGroup ? focusGroup.name : '线上赛率' }}</text>
              </view>
            </view>
            <view class="caps">
              <view v-for="g in groups" :key="g.key" class="cap" :class="{ 'cap-on': focus === g.key, 'cap-dim': focus && focus !== g.key }" @tap="toggleFocus(g.key)">
                <view class="cap-dot" :style="'background:' + g.color"></view>
                <text class="cap-n">{{ g.name }}</text>
                <text class="cap-p">{{ g.pct }}%</text>
                <text class="cap-y" :class="g.yoy >= 0 ? 'up' : 'down'">{{ g.yoyText }}</text>
              </view>
            </view>
          </view>
          <!-- Tab 2：热门道具 TOP 5 -->
          <view v-else-if="tab === 1" key="t1" class="pane pr">
            <view v-for="(p, i) in hotProps" :key="p.key" class="pr-i" :class="'pr-' + (i + 1)">
              <view class="pr-rank"><text class="pr-rank-t">{{ i + 1 }}</text></view>
              <view class="pr-ic"><image class="pr-img" :src="p.img" mode="aspectFit" /></view>
              <text class="pr-n">{{ p.name }}</text>
              <view class="pr-c"><text class="pr-cn">{{ p.count }}</text><text class="pr-cu">次</text></view>
            </view>
          </view>
          <!-- Tab 3：活跃玩家榜 TOP 10 -->
          <scroll-view v-else key="t2" scroll-y class="pane tp">
            <view v-for="(p, i) in topPlayers" :key="p.name" class="tp-i" :class="i < 3 ? 'tp-' + (i + 1) : ''">
              <text class="tp-r" :class="{ 'tp-r-num': i >= 3 }">{{ MEDAL[i] || i + 1 }}</text>
              <view class="tp-av" :style="'background:' + p.bg + ';color:' + p.fg"><text>{{ p.char }}</text></view>
              <text class="tp-n">{{ p.name }}</text>
              <text class="tp-tag">{{ p.matches }} 场</text>
              <view class="tp-pts"><text class="tp-pn">{{ fmt(p.points) }}</text><text class="tp-pu">分</text></view>
            </view>
          </scroll-view>
        </view>

        <!-- 底部：Tab 1 是同比明细（默认折叠）；其他 Tab 是统计口径 -->
        <view v-if="tab === 0">
          <view class="dt-h" hover-class="press-soft" @tap="detailOpen = !detailOpen">
            <text class="dt-t">{{ detailOpen ? '收起同比增长明细表' : '展开完整同比增长明细表' }}</text>
            <view class="chev" :class="{ 'chev-up': detailOpen }"><z-icon name="chevron-down" :size="13" color="#9CA3AF" /></view>
          </view>
          <view class="fold" :class="{ 'fold-on': detailOpen }"><view class="fold-in">
            <view class="dt">
              <view class="dt-r dt-head"><text class="dt-c0">客群</text><text class="dt-c">占比</text><text class="dt-c">本周</text><text class="dt-c">上周</text><text class="dt-c dt-cy">同比</text></view>
              <view v-for="g in groups" :key="g.key" class="dt-r">
                <view class="dt-c0"><view class="cap-dot" :style="'background:' + g.color"></view><text>{{ g.name }}</text></view>
                <text class="dt-c">{{ g.pct }}%</text><text class="dt-c">{{ g.now }}</text><text class="dt-c">{{ g.prev }}</text>
                <text class="dt-c dt-cy" :class="g.yoy >= 0 ? 'up' : 'down'">{{ g.yoyText }}</text>
              </view>
              <view class="dt-r dt-sum">
                <text class="dt-c0">合计</text><text class="dt-c">100%</text><text class="dt-c">{{ sumNow }}</text><text class="dt-c">{{ sumPrev }}</text>
                <text class="dt-c dt-cy" :class="sumYoy >= 0 ? 'up' : 'down'">{{ yoyText(sumYoy) }}</text>
              </view>
            </view>
          </view></view>
        </view>
        <text v-else class="ch-note">{{ tab === 1 ? '按近 30 天使用次数统计' : '按近 30 天荣誉积分排名' }}</text>
      </view>
    </view>

    <!-- 4. 我的比赛：横滑卡片，点开是分享落地页 -->
    <view class="sec">
      <view class="sec-h">
        <text class="sec-t">我的比赛</text>
        <view class="sec-more" hover-class="press-soft" @tap="toast('比赛列表即将上线')"><text class="sec-more-t">全部</text><z-icon name="chevron-right" :size="14" color="#9CA3AF" /></view>
      </view>
    </view>
    <view class="mm">
      <view v-for="m in myMatches" :key="m.id" class="mm-i" hover-class="press-soft" @tap="go('/pages/invite/index?id=' + m.id)">
        <view class="mm-cv" :style="m.cover"><view class="mm-tag" :class="'mm-' + m.status"><view v-if="m.status === 'live'" class="live-dot live-dot-sm"></view><text>{{ m.statusText }}</text></view></view>
        <view class="mm-body">
          <text class="mm-name" :class="{ 'font-sys': !fitsDisplay(m.name) }">{{ m.name }}</text>
          <view class="mm-when"><text class="mm-time">{{ m.time }}</text><text class="mm-date">{{ m.date }}</text></view>
          <view class="mm-bar"><view class="mm-fill" :style="'width:' + m.pct + '%'"></view></view>
          <text class="mm-sign">{{ m.signed }}/{{ m.cap }} 已报名</text>
        </view>
      </view>
    </view>

    <!-- 5. 赛事配置：金刚区，磨砂玻璃面板压在三团彩色光晕上 -->
    <view class="sec">
      <view class="sec-h"><text class="sec-t">赛事配置</text><text class="sec-n">{{ featureCount }} 项功能</text></view>
      <view class="kz">
        <view class="kz-orb kz-orb-r"></view>
        <view class="kz-orb kz-orb-g"></view>
        <view class="kz-orb kz-orb-y"></view>
        <view class="kz-glass">
          <view v-for="g in featureGroups" :key="g.key" class="kz-g">
            <view class="kz-gh"><view class="kz-gdot" :style="'background:' + g.color"></view><text class="kz-gt">{{ g.title }}</text><text class="kz-gn">{{ g.items.length }}</text></view>
            <view class="kz-row">
              <view v-for="it in g.items" :key="it.key" class="kz-i" hover-class="kz-press" :hover-stay-time="80" @tap="openFeature(it)">
                <view class="kz-tile">
                  <image class="kz-img" :src="it.img" mode="aspectFit" />
                  <view v-if="FEATURE_LINKS[it.key]" class="kz-live"></view>
                </view>
                <text class="kz-n">{{ it.name }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <z-tabbar :items="navItems" :active="navActive" @change="onNav" />

    <!-- 房间列表：底部弹层 -->
    <view v-if="roomsShown" class="rs" :class="{ 'rs-on': roomsOpen }">
      <view class="rs-mask" @tap="closeRooms"></view>
      <view class="rs-sheet">
        <view class="rs-grab"></view>
        <view class="rs-head"><text class="rs-title">房间列表</text><text class="rs-sub">{{ rooms.length }} 个房间</text></view>
        <view v-for="r in roomList" :key="r.id" class="rm">
          <view class="rm-cv" :style="r.coverStyle"></view>
          <view class="rm-main">
            <text class="rm-n">{{ r.name }}</text>
            <view class="rm-s"><view class="rm-dot" :class="'rm-' + r.status"></view><text class="rm-st">{{ r.statusText }} · {{ r.players }}</text></view>
          </view>
          <view class="rm-go" :class="{ 'rm-go-live': r.status === 'live' }" hover-class="press" @tap="enterRoom"><text class="rm-go-t">进入</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad, onReady, onPageScroll } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTabbar from '@/components/z-tabbar/z-tabbar.vue'
import { getNavMetrics } from '@/common/nav.js'
import { coverStyle, svgUri } from '@/common/svg.js'
import { donutSvg, yoy, yoyText } from '@/common/charts.js'
import { fitsDisplay } from '@/common/font-coverage.js'
import { requireHost, useCertState } from '@/common/cert.js'
import { useProfile } from '@/common/auth.js'
import { tabItems, tapTab } from '@/common/tabs.js'
import { hostMatches } from '@/mock/plaza.js'
import { hostProfile, deskMetrics, rooms, todos, hostHeat, audience, hotProps, topPlayers, featureGroups } from '@/mock/workbench.js'

const nav = getNavMetrics()
const cbarStyle = `height:${nav.statusBar + nav.navH}px;padding-top:${nav.statusBar}px`
const headStyle = `padding-top:${nav.statusBar}px`
const headRowStyle = `height:${nav.navH}px;padding-right:${nav.capsuleW}px`
const toast = (title) => uni.showToast({ title, icon: 'none' })
const go = (url) => uni.navigateTo({ url })
const who = useProfile()
const TONE = { red: '#FF6B6B', amber: '#FFC53A', blue: '#7896DA', green: '#4CB582', gray: '#9CA3AF' }
const p2 = (n) => (n < 10 ? '0' : '') + n
const WEEK = '日一二三四五六'
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/* ---------- 身份卡：本周概览数字递增 ---------- */
const shownMetric = ref(deskMetrics.map(() => '0'))
function countUp() {
  const start = Date.now()
  const tick = () => {
    const t = Math.min(1, (Date.now() - start) / 800)
    const e = 1 - Math.pow(1 - t, 3)
    shownMetric.value = deskMetrics.map((x) => String(Math.round(x.value * e)))
    if (t < 1) setTimeout(tick, 32)
  }
  tick()
}
const toCert = () => go('/pages/host/index')

/* ---------- 房间列表 ---------- */
const roomList = rooms.map((r) => ({ ...r, coverStyle: coverStyle(r.cover, 'share') }))
const roomsShown = ref(false)
const roomsOpen = ref(false)
function openRooms() {
  roomsShown.value = true
  setTimeout(() => { roomsOpen.value = true }, 30)
}
function closeRooms() {
  roomsOpen.value = false
  setTimeout(() => { roomsShown.value = false }, 320)
}
// 进入房间前先收起弹层，从房间返回时页面不会被遮住
function enterRoom() {
  roomsOpen.value = false
  roomsShown.value = false
  go('/pages/room/index')
}

/* ---------- 待办 ---------- */
const todoOpen = ref(false)
const TODO_TIPS = { review: '报名审核即将上线', dealers: '荷官管理即将上线', devices: '设备绑定即将上线', msg: '留言即将上线' }
function doTodo(t) {
  if (t.action === 'room') return go('/pages/room/index')
  if (t.action === 'blinds') return go('/pages/create/index?open=blinds')
  if (t.action === 'devices') return go('/pages/devices/index')
  toast(TODO_TIPS[t.action] || '即将上线')
}

/* ---------- 运营分析：办赛热力条 ---------- */
const heat = hostHeat()
const heatOpen = ref(true)
const heatDays = heat.days.filter((x) => x.n > 0).length
const heatTotal = heat.days.reduce((s, x) => s + (x.n || 0), 0)
const heatAnchor = 'hd' + Math.max(1, heat.today - 6) // 让今天落在可见区域
// 和个人主页的打卡日历一样：人越多，点越大、颜色越饱和
const heatLevel = (n) => (n === null ? 'f' : n === 0 ? 0 : n < 10 ? 1 : n < 20 ? 2 : n < 30 ? 3 : 4)
const bubble = reactive({ d: 0, text: '' })
let bubbleTimer = null
function pickDay(x) {
  if (x.n === null) return
  bubble.d = x.d
  bubble.text = x.n ? `${x.n} 人` : '没有办赛'
  clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => { bubble.d = 0 }, 2200)
}

/* ---------- 运营分析：三合一看板 ---------- */
const TABS = ['客群与线上率', '热门道具排行', '活跃玩家榜']
const MEDAL = ['🥇', '🥈', '🥉']
const tab = ref(0)
const focus = ref('')
const groups = audience.groups.map((g) => {
  const v = yoy(g.now, g.prev)
  return { ...g, yoy: v, yoyText: yoyText(v) }
})
const sumNow = groups.reduce((s, g) => s + g.now, 0)
const sumPrev = groups.reduce((s, g) => s + g.prev, 0)
const sumYoy = yoy(sumNow, sumPrev)
const focusGroup = computed(() => groups.find((g) => g.key === focus.value) || null)
// 只在切到这个 Tab 时播放扫出动画；点图例高亮时不重播
let animateDonut = true
const donutStyle = computed(() => {
  const svg = donutSvg(groups.map((g) => ({ key: g.key, value: g.pct, color: g.color })), { focus: focus.value, animate: animateDonut })
  return `background-image:url("${svgUri(svg)}")`
})
function setTab(i) {
  if (i === tab.value) return
  animateDonut = true
  focus.value = ''
  tab.value = i
}
function toggleFocus(key) {
  animateDonut = false
  focus.value = focus.value === key ? '' : key
}
const detailOpen = ref(false)

/* ---------- 我的比赛 ---------- */
const myMatches = hostMatches.map((m) => {
  const d = new Date(m.startAt)
  const signed = (m.participants || []).length
  const live = m.startAt <= Date.now()
  return {
    id: m.id,
    name: m.name,
    cover: coverStyle(m.cover, 'wide'),
    status: live ? 'live' : m.autoApprove ? 'open' : 'review',
    statusText: live ? '进行中' : m.autoApprove ? '报名中' : '需审核',
    // 进行中的比赛显示当前级别和已开赛时长，其余显示开赛时间
    time: live ? 'LV.' + (m.liveLevel || 1) : `${p2(d.getHours())}:${p2(d.getMinutes())}`,
    date: live ? `已开赛 ${Math.max(1, Math.round((Date.now() - m.startAt) / 60000))} 分钟` : `${p2(d.getMonth() + 1)}/${p2(d.getDate())} 周${WEEK[d.getDay()]}`,
    signed,
    cap: m.cap,
    pct: Math.min(100, Math.round((signed / m.cap) * 100))
  }
})

/* ---------- 赛事配置（金刚区） ---------- */
const featureCount = featureGroups.reduce((s, g) => s + g.items.length, 0)
// 已经做好的功能直接打开（右上角有绿点），其余提示即将上线
const FEATURE_LINKS = { blinds: '/pages/create/index?open=blinds', schemes: '/pages/create/index?open=schemes', bind: '/pages/devices/index', poster: '/pages/posters/index' }
function openFeature(it) {
  if (FEATURE_LINKS[it.key]) return go(FEATURE_LINKS[it.key])
  toast(it.name + '即将上线')
}

/* ---------- 紧凑标题栏 ---------- */
// 和广场一致用 onPageScroll：相交监听在部分模拟器上不回调。只在越过阈值时更新，避免频繁 setData
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
/* 画布 375px，左右边距 20px（40rpx）。暗黑竞技红：底 #181A20，卡片 #1F222A，内嵌槽 #181A20，品牌红 #DC0000，台呢绿 #4CB582，琥珀黄 #FFC53A */
.page { position: relative; min-height: 100vh; background: #181A20; padding-bottom: calc(300rpx + env(safe-area-inset-bottom)); }
.press { opacity: .8; transform: scale(.96); }
.press-soft { opacity: .85; }
.font-sys { font-family: "PingFang SC", "Microsoft YaHei", sans-serif !important; font-weight: 600 !important; letter-spacing: 0 !important; }

/* 紧凑标题栏、大标题 */
.cbar {
  position: fixed; z-index: 30; left: 0; right: 0; top: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  background: #181A20; opacity: 0; transform: translateY(-12rpx); transition: opacity .25s ease, transform .3s ease; pointer-events: none;
}
.cbar-on { opacity: 1; transform: translateY(0); pointer-events: auto; }
.cbar-back { position: absolute; left: 24rpx; bottom: 12rpx; width: 64rpx; height: 64rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.cbar-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; color: #FFFFFF; }
.head { padding: 0 40rpx; }
.head-row { display: flex; align-items: center; box-sizing: border-box; }
.h-back { width: 64rpx; height: 64rpx; flex: none; margin-right: 20rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.h-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 56rpx; line-height: 1; letter-spacing: 4rpx; color: #FFFFFF; white-space: nowrap; }

/* 1. 身份卡：670 × 422rpx，银行卡比例 */
.idc {
  position: relative; overflow: hidden; margin: 24rpx 40rpx 0; height: 422rpx; box-sizing: border-box; padding: 28rpx 28rpx 24rpx;
  display: flex; flex-direction: column; justify-content: space-between; border-radius: 32rpx;
  background:
    radial-gradient(circle at 92% 0%, rgba(220, 0, 0, .32), rgba(220, 0, 0, 0) 46%),
    linear-gradient(135deg, #2B1A20 0%, #1F222A 52%, #1B1D24 100%);
  border: 1rpx solid rgba(255, 255, 255, .07); box-shadow: 0 24rpx 48rpx rgba(0, 0, 0, .45);
}
/* 防伪底纹：一圈圈细同心圆，像银行卡的扭索纹 */
.idc-guilloche {
  position: absolute; left: -120rpx; bottom: -260rpx; width: 640rpx; height: 640rpx; border-radius: 50%; pointer-events: none;
  background: repeating-radial-gradient(circle, rgba(255, 255, 255, .035) 0, rgba(255, 255, 255, .035) 1px, transparent 1px, transparent 14rpx);
}
/* 缓慢扫过的一道镭射光 */
.idc-sheen {
  position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, .07) 46%, rgba(255, 220, 220, .1) 50%, rgba(255, 255, 255, .07) 54%, transparent 62%);
  background-size: 260% 260%; animation: sheen 7s ease-in-out infinite;
}
@keyframes sheen { 0%, 60% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
.idc-top { position: relative; display: flex; align-items: center; }
.club { position: relative; width: 84rpx; height: 84rpx; flex: none; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3rpx rgba(244, 183, 64, .8); }
.club-v {
  position: absolute; right: -10rpx; bottom: -10rpx; width: 34rpx; height: 34rpx; box-sizing: border-box; border-radius: 50%;
  background: #DC0000; border: 4rpx solid #241B21; display: flex; align-items: center; justify-content: center;
}
.idc-id { flex: 1; min-width: 0; margin-left: 24rpx; }
.idc-row { display: flex; align-items: center; }
.idc-name { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 36rpx; letter-spacing: 2rpx; color: #FFFFFF; white-space: nowrap; }
.idc-tag { margin-left: 12rpx; padding: 4rpx 12rpx; border-radius: 999rpx; background: rgba(220, 0, 0, .18); font-size: 18rpx; font-weight: 600; color: #FF6B6B; white-space: nowrap; }
.idc-sub { display: block; margin-top: 8rpx; font-size: 22rpx; color: #9CA3AF; }
.idc-brand { align-self: flex-start; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 22rpx; letter-spacing: 2rpx; color: rgba(255, 255, 255, .55); }
.idc-mid { position: relative; display: flex; align-items: center; }
.emv {
  position: relative; width: 64rpx; height: 48rpx; flex: none; border-radius: 10rpx; overflow: hidden;
  background: linear-gradient(135deg, #F6D58E 0%, #D9A441 55%, #B98322 100%); box-shadow: inset 0 0 0 1rpx rgba(0, 0, 0, .25);
}
.emv-h { position: absolute; left: 0; right: 0; top: 50%; height: 2rpx; margin-top: -1rpx; background: rgba(60, 40, 10, .45); }
.emv-v { position: absolute; top: 0; bottom: 0; left: 50%; width: 2rpx; margin-left: -1rpx; background: rgba(60, 40, 10, .45); }
.idc-no { flex: 1; min-width: 0; margin-left: 24rpx; display: flex; }
.idc-no-g { margin-right: 18rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 700; font-size: 30rpx; letter-spacing: 3rpx; color: #E5E7EB; text-shadow: 0 1rpx 0 rgba(0, 0, 0, .6), 0 -1rpx 0 rgba(255, 255, 255, .12); }
.idc-exp { display: flex; flex-direction: column; align-items: flex-end; }
.idc-exp-k { font-size: 14rpx; letter-spacing: 2rpx; color: #6B7280; }
.idc-exp-v { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 26rpx; color: #E5E7EB; }
/* 内嵌槽 */
.idc-slot { position: relative; display: flex; padding: 22rpx 0; border-radius: 22rpx; background: #181A20; box-shadow: inset 0 2rpx 8rpx rgba(0, 0, 0, .45); }
.mt-i { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
.mt-sep { border-left: 1rpx solid #262A34; }
.mt-v { display: flex; align-items: baseline; }
.mt-num { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 200; font-size: 56rpx; line-height: 1; color: #F2F2EE; }
.mt-u { margin-left: 4rpx; font-size: 18rpx; color: #FF6B6B; }
.mt-l { margin-top: 8rpx; font-size: 20rpx; color: #9CA3AF; }

/* 双主按钮 */
.qa { display: flex; margin: 24rpx 40rpx 0; }
.qa-main, .qa-sub { height: 88rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.qa-main { flex: 1; background: #DC0000; box-shadow: 0 12rpx 28rpx rgba(220, 0, 0, .3); }
.qa-sub { flex: 1; margin-left: 20rpx; background: #2A2D36; }
.qa-t { margin-left: 10rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.qa-n { margin-left: 4rpx; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 28rpx; color: #9CA3AF; }
.live-dot { width: 14rpx; height: 14rpx; flex: none; border-radius: 50%; background: #4CB582; box-shadow: 0 0 0 0 rgba(76, 181, 130, .6); animation: live 1.8s ease-out infinite; }
.live-dot-sm { width: 10rpx; height: 10rpx; margin-right: 8rpx; }
@keyframes live { 0% { box-shadow: 0 0 0 0 rgba(76, 181, 130, .6); } 100% { box-shadow: 0 0 0 14rpx rgba(76, 181, 130, 0); } }

/* 区块 */
.sec { margin-top: 56rpx; padding: 0 40rpx; }
.sec-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.sec-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 38rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.sec-n { font-size: 22rpx; color: #6B7280; }
.sec-more { display: flex; align-items: center; }
.sec-more-t { margin-right: 4rpx; font-size: 24rpx; color: #9CA3AF; }
.chev { display: flex; transition: transform .3s ease; }
.chev-up { transform: rotate(180deg); }
.fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s ease; }
.fold-on { grid-template-rows: 1fr; }
.fold-in { min-height: 0; overflow: hidden; }

/* 2. 待办：单行 */
.td { border-radius: 28rpx; background: #1F222A; padding: 0 24rpx; }
.td-i { display: flex; align-items: center; height: 88rpx; border-top: 1rpx solid #2A2D36; }
.td-first { border-top: none; }
.td-ic { width: 48rpx; height: 48rpx; flex: none; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; }
.td-red { background: rgba(220, 0, 0, .14); }
.td-amber { background: rgba(255, 197, 58, .14); }
.td-blue { background: rgba(120, 150, 218, .14); }
.td-green { background: rgba(76, 181, 130, .14); }
.td-gray { background: rgba(156, 163, 175, .12); }
.td-t { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; font-size: 26rpx; color: #F2F2EE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-m { margin-right: 8rpx; font-size: 22rpx; color: #6B7280; white-space: nowrap; }

/* 3. 运营分析：一张卡 */
.an { padding: 22rpx; border-radius: 28rpx; background: #1F222A; }
.hm-h { display: flex; align-items: center; }
.hm-flame { width: 36rpx; height: 36rpx; border-radius: 10rpx; background: rgba(220, 0, 0, .14); display: flex; align-items: center; justify-content: center; }
.hm-t { margin-left: 12rpx; font-size: 26rpx; font-weight: 600; color: #F2F2EE; }
.hm-sum { flex: 1; margin-left: 12rpx; font-size: 22rpx; color: #6B7280; }
.hm { margin-top: 4rpx; white-space: nowrap; }
.hm-row { display: flex; padding: 40rpx 4rpx 0; }
.hm-c { position: relative; width: 44rpx; flex: none; display: flex; flex-direction: column; align-items: center; }
.hm-dot-box { width: 34rpx; height: 34rpx; display: flex; align-items: center; justify-content: center; }
.hdot { flex: none; border-radius: 50%; transition: transform .2s ease; }
.h0 { width: 6rpx; height: 6rpx; background: #2C2F38; }
.h1 { width: 10rpx; height: 10rpx; background: #5E2226; }
.h2 { width: 16rpx; height: 16rpx; background: #9A1C1F; }
.h3 { width: 22rpx; height: 22rpx; background: #C81414; }
.h4 { width: 30rpx; height: 30rpx; background: #FF3B30; box-shadow: 0 0 14rpx rgba(255, 59, 48, .55); }
.hf { width: 6rpx; height: 6rpx; background: transparent; box-shadow: inset 0 0 0 1rpx #30343E; }
.hm-d { margin-top: 6rpx; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 18rpx; color: #6B7280; }
.hm-wkd .hm-d { color: #9CA3AF; }
.hm-today .hm-d { padding: 0 6rpx; border-radius: 6rpx; background: #DC0000; color: #FFFFFF; }
.hm-future .hm-d { color: #3A3E48; }
.hm-bub {
  position: absolute; z-index: 2; left: 50%; bottom: 100%; width: 112rpx; margin: 0 0 -8rpx -56rpx; padding: 2rpx 0; border-radius: 10rpx; background: #F2F2EE;
  text-align: center; white-space: nowrap; animation: bub .32s cubic-bezier(.34, 1.56, .64, 1);
}
.hm-bub::after { content: ''; position: absolute; left: 50%; bottom: -8rpx; margin-left: -8rpx; border: 8rpx solid transparent; border-bottom: 0; border-top-color: #F2F2EE; }
.hm-bub-t { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 20rpx; line-height: 30rpx; color: #181A20; }
@keyframes bub { from { opacity: 0; transform: translateY(10rpx) scale(.8); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* 三合一分段（同广场：内嵌轨道 + 象牙白滑块） */
.seg { position: relative; margin-top: 16rpx; display: flex; padding: 6rpx; border-radius: 999rpx; background: #181A20; }
.seg-ind {
  position: absolute; left: 6rpx; top: 6rpx; width: calc((100% - 12rpx) / 3); height: 52rpx; border-radius: 999rpx; background: #F2F2EE;
  transition: transform .42s cubic-bezier(.34, 1.36, .64, 1);
}
.seg-i { position: relative; flex: 1; height: 52rpx; display: flex; align-items: center; justify-content: center; }
.seg-t { font-size: 22rpx; color: #9CA3AF; transition: color .25s ease; }
.seg-t-on { color: #181A20; font-weight: 600; }

/* 图表区：三个 Tab 共用同一高度 */
.ch { margin-top: 16rpx; height: 212rpx; }
.pane { height: 212rpx; animation: pane .35s ease; }
@keyframes pane { from { opacity: 0; transform: translateY(10rpx); } to { opacity: 1; transform: translateY(0); } }
.aud { display: flex; align-items: center; }
.donut { position: relative; width: 200rpx; height: 200rpx; flex: none; }
.donut-img { position: absolute; left: 0; top: 0; width: 200rpx; height: 200rpx; background-size: 100% 100%; }
.donut-c { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.donut-v { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 48rpx; line-height: 1; color: #FFFFFF; }
.donut-k { margin-top: 6rpx; font-size: 18rpx; color: #9CA3AF; }
.caps { flex: 1; min-width: 0; margin-left: 20rpx; }
.cap {
  display: flex; align-items: center; height: 56rpx; margin-bottom: 10rpx; padding: 0 16rpx; border-radius: 999rpx; background: #181A20;
  border: 2rpx solid transparent; transition: border-color .25s ease, opacity .25s ease;
}
.cap-on { border-color: #35383F; }
.cap-dim { opacity: .5; }
.cap-dot { width: 12rpx; height: 12rpx; flex: none; border-radius: 50%; }
.cap-n { margin-left: 10rpx; flex: 1; min-width: 0; font-size: 22rpx; color: #CBD5E1; white-space: nowrap; }
.cap-p { margin-right: 10rpx; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 24rpx; color: #F2F2EE; }
.cap-y { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 20rpx; white-space: nowrap; }
.up { color: #4CB582; }
.down { color: #FF6B6B; }

/* Tab 2：TOP 5 勋章小卡 */
.pr { display: flex; justify-content: space-between; }
.pr-i { position: relative; width: 116rpx; height: 212rpx; box-sizing: border-box; padding-top: 26rpx; border-radius: 22rpx; background: #181A20; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.pr-i::before { content: ''; position: absolute; left: 0; top: 0; right: 0; height: 6rpx; background: #35383F; }
.pr-1::before { background: #F4B740; }
.pr-2::before { background: #C9D1DB; }
.pr-3::before { background: #D08A4E; }
.pr-1 { background: linear-gradient(180deg, rgba(244, 183, 64, .12), #181A20 55%); }
.pr-rank { position: absolute; left: 8rpx; top: 12rpx; width: 28rpx; height: 28rpx; border-radius: 50%; background: #35383F; display: flex; align-items: center; justify-content: center; }
.pr-1 .pr-rank { background: #F4B740; }
.pr-2 .pr-rank { background: #C9D1DB; }
.pr-3 .pr-rank { background: #D08A4E; }
.pr-rank-t { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 18rpx; color: #181A20; }
.pr-4 .pr-rank-t, .pr-5 .pr-rank-t { color: #E5E7EB; }
.pr-ic { width: 64rpx; height: 64rpx; border-radius: 50%; background: #EFE9DF; display: flex; align-items: center; justify-content: center; }
.pr-img { width: 42rpx; height: 42rpx; }
.pr-n { margin-top: 10rpx; padding: 0 6rpx; height: 56rpx; font-size: 20rpx; line-height: 28rpx; color: #CBD5E1; text-align: center; }
.pr-c { margin-top: 6rpx; display: flex; align-items: baseline; }
.pr-cn { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 30rpx; color: #F2F2EE; }
.pr-cu { margin-left: 2rpx; font-size: 18rpx; color: #6B7280; }

/* Tab 3：TOP 10 领奖台胶囊行 */
.tp { overflow: hidden; }
.tp-i { display: flex; align-items: center; height: 64rpx; margin-bottom: 10rpx; padding: 0 16rpx 0 12rpx; border-radius: 999rpx; background: #181A20; }
.tp-1 { background: linear-gradient(90deg, rgba(244, 183, 64, .18), #181A20 70%); }
.tp-2 { background: linear-gradient(90deg, rgba(201, 209, 219, .14), #181A20 70%); }
.tp-3 { background: linear-gradient(90deg, rgba(208, 138, 78, .16), #181A20 70%); }
.tp-r { width: 44rpx; flex: none; font-size: 30rpx; text-align: center; }
.tp-r-num { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 24rpx; color: #6B7280; }
.tp-av { width: 44rpx; height: 44rpx; flex: none; margin-left: 6rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 600; }
.tp-n { flex: 1; min-width: 0; margin-left: 14rpx; font-size: 24rpx; color: #F2F2EE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tp-tag { margin-right: 16rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: #262A34; font-size: 18rpx; color: #9CA3AF; }
.tp-pts { display: flex; align-items: baseline; }
.tp-pn { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 26rpx; color: #FFC53A; }
.tp-pu { margin-left: 2rpx; font-size: 18rpx; color: #6B7280; }

/* 同比明细（折叠） */
.dt-h { margin-top: 12rpx; height: 44rpx; display: flex; align-items: center; justify-content: center; border-top: 1rpx solid #2A2D36; }
.dt-t { margin-right: 6rpx; font-size: 22rpx; color: #9CA3AF; }
.dt { margin-top: 8rpx; border-radius: 18rpx; background: #181A20; padding: 8rpx 16rpx; }
.dt-r { display: flex; align-items: center; height: 56rpx; border-top: 1rpx solid #24272F; }
.dt-head { border-top: none; height: 48rpx; }
.dt-head .dt-c0, .dt-head .dt-c { font-size: 20rpx; color: #6B7280; }
.dt-c0 { width: 150rpx; flex: none; display: flex; align-items: center; font-size: 22rpx; color: #CBD5E1; }
.dt-c0 .cap-dot { margin-right: 10rpx; }
.dt-c { flex: 1; text-align: right; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 24rpx; color: #E5E7EB; }
.dt-cy { flex: 1.3; }
.dt-sum .dt-c0 { color: #F2F2EE; font-weight: 600; }
.ch-note { display: block; margin-top: 12rpx; height: 44rpx; line-height: 44rpx; text-align: center; font-size: 20rpx; color: #4B5060; border-top: 1rpx solid #2A2D36; }

/* 4. 我的比赛 */
.mm { display: flex; overflow-x: auto; padding: 0 40rpx 8rpx; }
.mm::-webkit-scrollbar { display: none; }
.mm-i { flex: none; width: 420rpx; margin-right: 20rpx; border-radius: 28rpx; overflow: hidden; background: #1F222A; }
.mm-cv { position: relative; height: 180rpx; }
.mm-tag { position: absolute; left: 16rpx; top: 16rpx; display: flex; align-items: center; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .62); font-size: 20rpx; }
.mm-live { color: #4CB582; }
.mm-open { color: #4CB582; }
.mm-review { color: #FFC53A; }
.mm-body { padding: 18rpx 22rpx 22rpx; }
.mm-name { display: block; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 32rpx; line-height: 1.25; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mm-when { margin-top: 8rpx; display: flex; align-items: baseline; }
.mm-time { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 36rpx; line-height: 1; color: #F2F2EE; }
.mm-date { margin-left: 10rpx; font-size: 22rpx; color: #9CA3AF; }
.mm-bar { margin-top: 14rpx; height: 6rpx; border-radius: 3rpx; background: #30343E; overflow: hidden; }
.mm-fill { height: 6rpx; background: #F2F2EE; }
.mm-sign { display: block; margin-top: 8rpx; font-size: 22rpx; color: #9CA3AF; }

/* 5. 金刚区：磨砂玻璃 */
.kz { position: relative; }
.kz-orb { position: absolute; border-radius: 50%; filter: blur(40px); opacity: .7; pointer-events: none; }
.kz-orb-r { left: -40rpx; top: -20rpx; width: 320rpx; height: 320rpx; background: #DC0000; }
.kz-orb-g { right: -30rpx; top: 160rpx; width: 280rpx; height: 280rpx; background: #4CB582; opacity: .5; }
.kz-orb-y { left: 180rpx; bottom: -40rpx; width: 260rpx; height: 260rpx; background: #FFC53A; opacity: .45; }
.kz-glass {
  position: relative; padding: 24rpx 16rpx 8rpx; border-radius: 32rpx; border: 2rpx solid transparent;
  background:
    linear-gradient(rgba(31, 34, 42, .5), rgba(31, 34, 42, .5)) padding-box,
    linear-gradient(135deg, rgba(255, 255, 255, .42), rgba(255, 255, 255, .06) 38%, rgba(255, 255, 255, .04) 62%, rgba(220, 0, 0, .5)) border-box;
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, .14), 0 24rpx 48rpx rgba(0, 0, 0, .35);
  backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%);
}
.kz-g { margin-bottom: 16rpx; }
.kz-gh { display: flex; align-items: center; padding: 0 8rpx; }
.kz-gdot { width: 10rpx; height: 10rpx; border-radius: 50%; }
.kz-gt { margin-left: 10rpx; font-size: 22rpx; font-weight: 600; color: #E5E7EB; }
.kz-gn { margin-left: 8rpx; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 20rpx; color: #6B7280; }
.kz-row { margin-top: 14rpx; display: flex; flex-wrap: wrap; }
.kz-i { width: 20%; display: flex; flex-direction: column; align-items: center; margin-bottom: 12rpx; }
.kz-tile {
  position: relative; width: 100rpx; height: 100rpx; border-radius: 28rpx; background: rgba(239, 233, 223, .94);
  display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, .3), inset 0 1rpx 0 rgba(255, 255, 255, .8);
  transition: transform .3s cubic-bezier(.34, 1.56, .64, 1);
}
.kz-press .kz-tile { transform: scale(.9); transition-duration: .12s; }
.kz-img { width: 64rpx; height: 64rpx; }
.kz-live { position: absolute; right: 10rpx; top: 10rpx; width: 14rpx; height: 14rpx; border-radius: 50%; background: #4CB582; box-shadow: 0 0 0 4rpx #EFE9DF; }
.kz-n { margin-top: 12rpx; font-size: 22rpx; color: #E5E7EB; }

/* 房间列表弹层 */
.rs { position: fixed; z-index: 100; left: 0; top: 0; right: 0; bottom: 0; }
.rs-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); opacity: 0; transition: opacity .3s ease; }
.rs-on .rs-mask { opacity: 1; }
.rs-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 16rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); border-radius: 40rpx 40rpx 0 0;
  background: #1F222A; transform: translateY(100%); transition: transform .38s cubic-bezier(.2, .8, .2, 1);
}
.rs-on .rs-sheet { transform: translateY(0); }
.rs-grab { width: 72rpx; height: 8rpx; margin: 0 auto 20rpx; border-radius: 4rpx; background: #35383F; }
.rs-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.rs-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 38rpx; color: #FFFFFF; }
.rs-sub { font-size: 22rpx; color: #6B7280; }
.rm { display: flex; align-items: center; padding: 20rpx 0; border-top: 1rpx solid #2A2D36; }
.rm-cv { width: 120rpx; height: 96rpx; flex: none; border-radius: 18rpx; background-size: cover; }
.rm-main { flex: 1; min-width: 0; margin: 0 20rpx; }
.rm-n { display: block; font-size: 28rpx; font-weight: 600; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm-s { margin-top: 8rpx; display: flex; align-items: center; }
.rm-dot { width: 12rpx; height: 12rpx; border-radius: 50%; margin-right: 10rpx; }
.rm-live { background: #4CB582; animation: live 1.8s ease-out infinite; }
.rm-soon { background: #FFC53A; }
.rm-st { font-size: 22rpx; color: #9CA3AF; }
.rm-go { height: 60rpx; padding: 0 28rpx; border-radius: 999rpx; background: #2A2D36; display: flex; align-items: center; }
.rm-go-live { background: #DC0000; }
.rm-go-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }

@media (prefers-reduced-motion: reduce) {
  .idc-sheen, .live-dot, .rm-live, .pane, .hm-bub { animation: none; }
  .cbar, .fold, .chev, .seg-ind, .kz-tile, .rs-sheet, .rs-mask { transition: none; }
}
</style>
