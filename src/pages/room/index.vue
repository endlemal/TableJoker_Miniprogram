<template>
  <view class="room">
    <!-- 导航：返回 + 搪瓷站名牌 -->
    <view class="nav" :style="navStyle">
      <view class="back" hover-class="press" @tap="goBackOrHome">
        <z-icon name="arrow-left" :size="18" color="#FFFFFF" />
      </view>
      <view class="plaque">
        <view class="plaque-ring"></view>
        <view class="rivet" style="left:12rpx;top:12rpx"></view>
        <view class="rivet" style="right:12rpx;top:12rpx"></view>
        <view class="rivet" style="left:12rpx;bottom:12rpx"></view>
        <view class="rivet" style="right:12rpx;bottom:12rpx"></view>
        <text class="plaque-zh">{{ room.name }}</text>
        <text class="plaque-py">{{ room.pinyin }}</text>
      </view>
    </view>

    <!-- 级别行 -->
    <view class="lv-row">
      <block v-if="!isBreak">
        <text class="lv-word">第</text>
        <view class="lv-flaps">
          <z-flap :value="levelDigits[0]" :w="18" :h="26" :fs="26" :hinge="1" :pin="4" :stack="3" />
          <view class="lv-gap"></view>
          <z-flap :value="levelDigits[1]" :w="18" :h="26" :fs="26" :hinge="1" :pin="4" :stack="3" />
        </view>
        <text class="lv-word">级</text>
      </block>
      <text v-else class="lv-word">休息</text>
      <text class="lv-elapsed">已进行 {{ elapsedMin }} 分钟</text>
      <text class="lv-state" :style="{ color: stateColor }">{{ stateWord }}</text>
    </view>

    <!-- 牌桌：左右各三个座位，中间是翻牌钟面板 -->
    <view class="table">
      <view class="seat-col">
        <view v-for="s in leftSeats" :key="s.no" class="seat" :class="{ 'seat-me': s.me }">
          <view class="seat-av" :style="{ background: s.bg, color: s.fg }"><text>{{ s.c }}</text></view>
          <text class="seat-name">{{ s.name }}</text>
          <text class="seat-no">{{ s.no }} 号位</text>
        </view>
      </view>

      <view class="board" @longpress="jumpToEnd">
        <view class="bd-top">
          <text class="bd-tag">{{ room.type }}</text>
          <view class="bd-brk">
            <text class="bd-brk-k">{{ isBreak ? '距下次休息' : '距休息' }}</text>
            <text class="bd-brk-v">{{ toBreak }}</text>
          </view>
        </view>

        <view class="clock">
          <z-flap :value="clockDigits[0]" :w="39" :h="65" :fs="72" :color="clockColor" />
          <view class="clock-gap"></view>
          <z-flap :value="clockDigits[1]" :w="39" :h="65" :fs="72" :color="clockColor" />
          <view class="colon">
            <view class="colon-dot" :style="{ background: clockColor }"></view>
            <view class="colon-dot" :style="{ background: clockColor }"></view>
          </view>
          <z-flap :value="clockDigits[2]" :w="39" :h="65" :fs="72" :color="clockColor" />
          <view class="clock-gap"></view>
          <z-flap :value="clockDigits[3]" :w="39" :h="65" :fs="72" :color="clockColor" />
        </view>

        <view class="prog"><view class="prog-fill" :style="{ width: progress + '%' }"></view></view>

        <view class="blinds">
          <view v-for="b in blindItems" :key="b.label" class="bl-item">
            <z-flap :value="b.value" :w="52" :h="26" :fs="22" :hinge="1" :pin="4" :stack="3" />
            <text class="bl-cap">{{ b.label }}</text>
          </view>
        </view>

        <!-- 组件公共区：同一时间只显示一个组件 -->
        <view class="slot">
          <view v-if="slotKind === 'ticker'" class="ticker">
            <view class="lane">
              <view class="mq" :style="'animation-duration:' + tickerDur + 's'">
                <text v-for="t in tickerItems" :key="t.key" class="mq-msg" :class="'mq-' + t.type">{{ t.label }}</text>
              </view>
            </view>
            <view class="mesh"></view>
          </view>
          <view v-else class="cards" @longpress.stop="dealFlop">
            <view
              v-for="(c, i) in boardCards"
              :key="i"
              class="cd"
              :class="{ 'cd-back': !c.up, 'cd-deal': c.anim }"
              :style="'animation-delay:' + c.delay + 'ms'"
              @tap="reveal(i)"
            >
              <block v-if="c.up">
                <text class="cd-r" :style="{ color: c.color }">{{ c.rank }}</text>
                <view class="cd-s"><z-icon :name="c.suit" :size="14" :color="c.color" /></view>
              </block>
              <view v-else class="cd-frame">
                <view class="cd-pip" style="left:0;top:0"></view>
                <view class="cd-pip" style="right:0;top:0"></view>
                <view class="cd-pip" style="left:0;bottom:0"></view>
                <view class="cd-pip" style="right:0;bottom:0"></view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="seat-col">
        <view v-for="s in rightSeats" :key="s.no" class="seat" :class="{ 'seat-me': s.me }">
          <view class="seat-av" :style="{ background: s.bg, color: s.fg }"><text>{{ s.c }}</text></view>
          <text class="seat-name">{{ s.name }}</text>
          <text class="seat-no">{{ s.no }} 号位</text>
        </view>
      </view>
    </view>

    <!-- 底排：盲注表 + 三个座位 + 邀请 -->
    <view class="seat-row">
      <view class="seat seat-tool" hover-class="press" @tap="structOpen = !structOpen">
        <z-icon name="list" :size="22" color="#E5E7EB" />
        <text class="seat-tool-t">盲注表</text>
      </view>
      <view v-for="s in bottomSeats" :key="s.no" class="seat" :class="{ 'seat-me': s.me }">
        <view class="seat-av" :style="{ background: s.bg, color: s.fg }"><text>{{ s.c }}</text></view>
        <text class="seat-name">{{ s.name }}</text>
        <text class="seat-no">{{ s.no }} 号位</text>
      </view>
      <button class="seat seat-share" open-type="share" hover-class="press">
        <z-icon name="plus" :size="22" color="#FF4D4D" />
        <text class="seat-share-t">邀请</text>
      </button>

      <!-- 盲注结构：时刻表样式的悬浮面板 -->
      <view v-if="structOpen" class="struct">
        <view class="st-head">
          <view class="st-title-wrap">
            <text class="st-title">盲注结构</text>
            <text class="st-sub">共 {{ totalLevels }} 级</text>
          </view>
          <view class="st-close" hover-class="press" @tap="structOpen = false">
            <z-icon name="x" :size="14" color="#8F8F8A" />
          </view>
        </view>
        <view class="tr tr-head">
          <text class="tc">级别</text><text class="tc">盲注</text><text class="tc">前注</text><text class="tc">时长</text><text class="tc">开始</text>
        </view>
        <view v-for="r in timetable" :key="r.key" class="tr" :class="{ 'tr-cur': r.current, 'tr-last': r.last }">
          <view v-if="r.current" class="tr-bar"></view>
          <text class="tc" :class="{ 'tc-hei': r.isBreak }" :style="r.lvColor ? 'color:' + r.lvColor : ''">{{ r.lv }}</text>
          <text class="tc" :class="{ 'tc-hei': r.isBreak }">{{ r.blinds }}</text>
          <text class="tc">{{ r.ante }}</text>
          <view class="tc tc-dur"><text>{{ r.dur }}</text><text class="tc-unit">分</text></view>
          <text class="tc" :class="{ 'tc-hei': r.current }" :style="r.current ? 'color:' + stateColor : ''">{{ r.start }}</text>
        </view>
      </view>
    </view>

    <view class="dots">
      <view v-for="n in room.tables" :key="n" class="dot" :class="{ 'dot-on': n === room.table }"></view>
    </view>
    <view class="divider"></view>

    <!-- 聊天 -->
    <scroll-view class="chat" scroll-y :scroll-into-view="chatAnchor" scroll-with-animation>
      <view v-for="m in chat" :id="'m' + m.id" :key="m.id" class="msg">
        <view class="msg-av" :style="{ background: m.bg, color: m.fg }"><text>{{ m.c }}</text></view>
        <view class="msg-body">
          <view class="msg-top">
            <text class="msg-name">{{ m.name }}</text>
            <text class="msg-time">{{ m.time }}</text>
          </view>
          <text class="msg-text">{{ m.text }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 消息栏：右侧加号展开玩法组件 -->
    <view class="composer" :style="composerStyle">
      <view class="cmp-row">
        <view class="cmp-input">
          <input
            v-model="draft"
            class="cmp-field"
            placeholder="这把我跟了"
            placeholder-class="cmp-ph"
            confirm-type="send"
            :adjust-position="false"
            :cursor-spacing="16"
            @confirm="send"
            @focus="panelOpen = false"
            @keyboardheightchange="onKeyboard"
          />
          <view class="cmp-send" hover-class="press" @tap="send">
            <z-icon name="corner-down-left" :size="18" color="#F3EEE6" />
          </view>
        </view>
        <view class="cmp-more" :class="{ 'cmp-more-on': panelOpen }" hover-class="press" @tap="panelOpen = !panelOpen">
          <z-icon name="plus" :size="22" color="#FFFFFF" />
        </view>
      </view>
      <view v-if="panelOpen" class="panel">
        <text class="panel-title">玩法组件</text>
        <view class="panel-grid">
          <view v-for="c in components" :key="c.key" class="cp" :class="{ 'cp-on': slotKind === c.key }" @tap="pick(c)">
            <view class="cp-ic"><z-icon :name="c.icon" :size="22" :color="slotKind === c.key ? '#FF4D4D' : '#E5E7EB'" /></view>
            <text class="cp-t">{{ c.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="structOpen" class="mask" @tap="structOpen = false"></view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onLoad, onShow, onHide, onUnload, onReady, onShareAppMessage } from '@dcloudio/uni-app'
import { requireLogin } from '@/common/auth.js'
// 必须登录：未登录（比如扫码直接打开房间）转到登录页，登录后回到这里
onLoad(() => { requireLogin() })
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZFlap from '@/components/z-flap/z-flap.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { me, room } from '@/mock/data.js'

const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW + 8}px`

const pad2 = (n) => (n < 10 ? '0' : '') + n
const mmss = (sec) => { const m = Math.min(99, Math.floor(sec / 60)); return pad2(m) + ':' + pad2(sec % 60) }
const hhmm = (ms) => { const d = new Date(ms); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
const fmtNum = (n) => {
  if (!n) return '—'
  if (n >= 10000) return (Math.round(n / 1000) / 10) + '万'
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
const toast = (title) => uni.showToast({ title, icon: 'none' })

/* ---------- 计时引擎（演示版：本地时钟推算；正式版应以服务端快照为准） ---------- */
let levelNo = 0
const S = room.structure.map((e) => (e.type === 'level' ? { ...e, no: ++levelNo } : { ...e }))
const totalLevels = levelNo
const idx = ref(room.startIndex)
const remaining = ref(room.remainingSec)
const now = ref(Date.now())
let endAt = Date.now() + room.remainingSec * 1000
const usedBefore = S.slice(0, room.startIndex).reduce((sum, e) => sum + e.dur, 0)
const startedAt = Date.now() - (usedBefore + S[room.startIndex].dur - room.remainingSec) * 1000

const cur = computed(() => S[idx.value])
const isBreak = computed(() => cur.value.type === 'break')
const nextLevel = computed(() => S.slice(idx.value + 1).find((e) => e.type === 'level'))
const levelDigits = computed(() => pad2(isBreak.value ? (nextLevel.value ? nextLevel.value.no : 0) : cur.value.no).split(''))
const stateWord = computed(() => (isBreak.value ? '休息中' : remaining.value <= 60 ? '最后一分钟' : '进行中'))
const stateColor = computed(() => (isBreak.value || remaining.value <= 60 ? '#FFC53A' : '#3FCF84'))
const clockColor = computed(() => (!isBreak.value && remaining.value <= 60 ? '#FFC53A' : '#F2F2EE'))
const progress = computed(() => (((cur.value.dur - remaining.value) / cur.value.dur) * 100).toFixed(1))
const elapsedMin = computed(() => Math.max(0, Math.floor((now.value - startedAt) / 60000)))
const toBreak = computed(() => {
  let acc = remaining.value
  for (let j = idx.value + 1; j < S.length; j++) {
    if (S[j].type === 'break') return mmss(acc)
    acc += S[j].dur
  }
  return '--:--'
})
const blindItems = computed(() => {
  const e = isBreak.value ? nextLevel.value : cur.value
  return [
    { label: isBreak.value ? '休息后小盲' : '小盲', value: e ? fmtNum(e.sb) : '—' },
    { label: '大盲', value: e ? fmtNum(e.bb) : '—' },
    { label: '前注', value: e ? fmtNum(e.ante) : '—' }
  ]
})
const timetable = computed(() => {
  const rows = []
  let startMs = now.value + remaining.value * 1000
  for (let k = 0; k < 6 && idx.value + k < S.length; k++) {
    const e = S[idx.value + k]
    if (k > 1) startMs += S[idx.value + k - 1].dur * 1000
    const level = e.type === 'level'
    rows.push({
      key: idx.value + k,
      current: k === 0,
      isBreak: !level,
      lv: level ? pad2(e.no) : '休息',
      lvColor: k === 0 ? stateColor.value : level ? '' : '#FFC53A',
      blinds: level ? `${fmtNum(e.sb)}/${fmtNum(e.bb)}` : e.note || '—',
      ante: level ? fmtNum(e.ante) : '',
      dur: Math.round(e.dur / 60),
      start: k === 0 ? stateWord.value : hhmm(startMs),
      last: false
    })
  }
  if (rows.length) rows[rows.length - 1].last = true
  return rows
})

const toDigits = (sec) => {
  const t = mmss(sec)
  return [t[0], t[1], t[3], t[4]]
}
const clockDigits = ref(toDigits(room.remainingSec))
let rippleTimers = []
function setClock(sec) {
  const next = toDigits(sec)
  let order = 0
  // 同时变化的数字从右往左依次翻，间隔 55ms
  for (let i = 3; i >= 0; i--) {
    if (clockDigits.value[i] === next[i]) continue
    const k = i
    rippleTimers.push(setTimeout(() => { clockDigits.value[k] = next[k] }, order++ * 55))
  }
}
function tick() {
  const t = Date.now()
  now.value = t
  let rem = Math.ceil((endAt - t) / 1000)
  while (rem <= 0 && idx.value < S.length - 1) {
    idx.value += 1
    endAt += S[idx.value].dur * 1000
    rem = Math.ceil((endAt - t) / 1000)
  }
  remaining.value = Math.max(0, rem)
  setClock(remaining.value)
}
let timer = null
const start = () => { stop(); tick(); timer = setInterval(tick, 1000) }
const stop = () => {
  if (timer) clearInterval(timer)
  timer = null
  rippleTimers.forEach(clearTimeout)
  rippleTimers = []
}
// 开发用：长按面板跳到本级最后 15 秒，方便看最后一分钟变色和换级翻牌
function jumpToEnd() {
  endAt = Date.now() + 15000
  tick()
  toast('演示：跳到本级最后 15 秒')
}

/* ---------- 座位 ---------- */
const seats = ref(room.seats.map((s) => ({ ...s })))
const bySeat = (n) => seats.value.find((s) => s.no === n)
const leftSeats = computed(() => [1, 2, 3].map(bySeat))
const bottomSeats = computed(() => [4, 5, 6].map(bySeat))
const rightSeats = computed(() => [9, 8, 7].map(bySeat))
function shuffleSeats() {
  const nos = seats.value.map((s) => s.no)
  for (let i = nos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = nos[i]; nos[i] = nos[j]; nos[j] = tmp
  }
  seats.value = seats.value.map((s, i) => ({ ...s, no: nos[i] }))
}

/* ---------- 组件公共区：走字灯 / 公共牌 ---------- */
const slotKind = ref('ticker')
const danmaku = ref(room.chat.filter((m) => m.seat === 8).map((m) => ({ from: '七七', text: m.text })))
const tickerItems = computed(() => {
  const one = [{ type: 'notice', label: '【公告】' + room.notice }]
    .concat(danmaku.value.map((d) => ({ type: 'danmaku', label: d.from + '：' + d.text })))
  return one.concat(one).map((t, i) => ({ ...t, key: i }))
})
const tickerDur = computed(() => {
  const half = tickerItems.value.slice(0, tickerItems.value.length / 2)
  const px = half.reduce((sum, t) => sum + t.label.length * 22 + 56, 0)
  return Math.max(10, Math.round(px / 45))
})

const SUITS = [
  { name: 'suit-spade', color: '#141414' },
  { name: 'suit-heart', color: '#DC0000' },
  { name: 'suit-diamond', color: '#DC0000' },
  { name: 'suit-club', color: '#141414' }
]
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
const faceUp = (rank, s) => ({ up: true, rank, suit: SUITS[s].name, color: SUITS[s].color, id: rank + s, anim: false, delay: 0 })
const faceDown = () => ({ up: false, anim: false, delay: 0 })
const boardCards = ref([faceUp('A', 0), faceUp('K', 1), faceUp('7', 2), faceDown(), faceDown()])
function drawCard(used) {
  let card
  do { card = faceUp(RANKS[Math.floor(Math.random() * 13)], Math.floor(Math.random() * 4)) } while (used.includes(card.id))
  return card
}
function animate(list) {
  setTimeout(() => {
    boardCards.value = boardCards.value.map((c, i) => (list.includes(i) ? { ...c, anim: true, delay: list.indexOf(i) * 90 } : c))
    setTimeout(() => { boardCards.value = boardCards.value.map((c) => ({ ...c, anim: false, delay: 0 })) }, 360 + list.length * 90)
  }, 16)
}
function dealFlop() {
  const used = []
  const flop = [0, 1, 2].map(() => { const c = drawCard(used); used.push(c.id); return c })
  boardCards.value = flop.concat([faceDown(), faceDown()])
  animate([0, 1, 2, 3, 4])
}
function reveal(i) {
  if (boardCards.value[i].up) return
  const used = boardCards.value.filter((c) => c.up).map((c) => c.id)
  const list = boardCards.value.slice()
  list[i] = drawCard(used)
  boardCards.value = list
  animate([i])
}

/* ---------- 聊天与消息栏 ---------- */
const fmtTime = (d) => `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
const mySeat = room.seats.find((s) => s.me)
const chat = ref(room.chat.map((m) => {
  const p = room.seats.find((s) => s.no === m.seat)
  return { id: m.id, name: p.name, c: p.c, bg: p.bg, fg: p.fg, text: m.text, time: fmtTime(new Date(Date.now() - m.minutesAgo * 60000)) }
}))
const chatAnchor = ref('')
const draft = ref('')
const panelOpen = ref(false)
const keyboard = ref(0)
const structOpen = ref(false)
const composerStyle = computed(() => (keyboard.value ? `padding-bottom:${keyboard.value + 8}px` : ''))

function send() {
  const text = draft.value.trim()
  if (!text) return toast('先输入内容')
  const id = Date.now()
  chat.value.push({ id, name: me.nickname, c: me.char, bg: mySeat.bg, fg: mySeat.fg, text, time: fmtTime(new Date()) })
  // 聊天消息同时以琥珀色弹幕出现在走字灯上
  danmaku.value = danmaku.value.concat([{ from: me.nickname, text }]).slice(-4)
  draft.value = ''
  nextTick(() => { chatAnchor.value = 'm' + id })
}
function onKeyboard(e) {
  keyboard.value = (e.detail && e.detail.height) || 0
  if (keyboard.value) panelOpen.value = false
}

const components = [
  { key: 'cards', label: '公共牌', icon: 'cards' },
  { key: 'ticker', label: '走字灯', icon: 'speakerphone' },
  { key: 'seats', label: '抽座位', icon: 'arrows-shuffle' },
  { key: 'pot', label: '边池计算', icon: 'calculator' }
]
function pick(c) {
  if (c.key === 'cards' || c.key === 'ticker') {
    if (slotKind.value === c.key) return
    slotKind.value = c.key
    if (c.key === 'cards') animate([0, 1, 2, 3, 4])
    return
  }
  if (c.key === 'seats') { shuffleSeats(); toast('已重新抽座位') }
  if (c.key === 'pot') toast('边池计算待接入')
}

onShow(start)
onHide(stop)
onUnload(stop)
onReady(() => { chatAnchor.value = 'm' + chat.value[chat.value.length - 1].id })
onShareAppMessage(() => ({ title: `${room.name}，${room.table} 号桌等你入座`, path: '/pages/invite/index' }))
</script>

<style>
.room { position: relative; height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #181A20; }
.press { opacity: .82; transform: scale(.97); }

/* 导航 + 站名牌 */
.nav { flex: none; display: flex; align-items: center; box-sizing: border-box; padding-left: 32rpx; }
.back { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.plaque {
  position: relative; margin-left: 16rpx; height: 80rpx; box-sizing: border-box; padding: 0 32rpx;
  border-radius: 12rpx; background: #1C4E9D; border-bottom: 6rpx solid #0E2A57;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.plaque-ring { position: absolute; left: 6rpx; top: 6rpx; right: 6rpx; bottom: 6rpx; border: 3rpx solid rgba(255, 255, 255, .6); border-radius: 8rpx; }
.rivet { position: absolute; width: 8rpx; height: 8rpx; border-radius: 50%; background: rgba(255, 255, 255, .75); }
.plaque-zh { font-family: "BoardHei", "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 900; font-size: 30rpx; line-height: 1; letter-spacing: 3rpx; color: #FFFFFF; }
.plaque-py { margin-top: 6rpx; font-family: "BoardNum", "Helvetica Neue", Arial, sans-serif; font-weight: 700; font-size: 20rpx; line-height: 1; letter-spacing: 3rpx; color: rgba(255, 255, 255, .8); }

/* 级别行 */
.lv-row { flex: none; display: flex; align-items: center; height: 72rpx; padding: 0 32rpx; }
.lv-word { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 36rpx; color: #F2F2EE; }
.lv-flaps { display: flex; margin: 0 12rpx; padding-bottom: 6rpx; }
.lv-gap { width: 14rpx; }
.lv-elapsed { margin-left: 16rpx; font-size: 24rpx; color: #8F8F8A; }
.lv-state { margin-left: auto; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 32rpx; letter-spacing: 2rpx; }

/* 牌桌 */
.table { flex: none; display: flex; justify-content: space-between; padding: 8rpx 24rpx 0; }
.seat-col { display: flex; flex-direction: column; justify-content: space-between; height: 504rpx; }
.seat {
  position: relative; width: 112rpx; height: 152rpx; box-sizing: border-box; padding-top: 16rpx;
  border-radius: 28rpx; background: #1F222A; display: flex; flex-direction: column; align-items: center;
}
.seat-me { background: #262A34; border: 1rpx solid #3A3D46; }
.seat-av { width: 68rpx; height: 68rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 500; }
.seat-name { margin-top: 12rpx; max-width: 100rpx; font-size: 22rpx; line-height: 28rpx; color: #E5E7EB; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.seat-me .seat-name { color: #FFFFFF; }
.seat-no { font-size: 22rpx; line-height: 28rpx; color: #6B7280; }

.board {
  width: 446rpx; height: 504rpx; box-sizing: border-box; padding: 24rpx;
  border-radius: 16rpx; background: #050505;
  display: flex; flex-direction: column; justify-content: space-between;
}
.bd-top { display: flex; align-items: center; justify-content: space-between; height: 36rpx; }
.bd-tag {
  height: 36rpx; line-height: 36rpx; padding: 0 12rpx; border-radius: 6rpx; background: #1C4E9D; color: #FFFFFF;
  font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 22rpx; letter-spacing: 2rpx;
}
.bd-brk { display: flex; align-items: baseline; }
.bd-brk-k { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 22rpx; color: #8F8F8A; }
.bd-brk-v { margin-left: 8rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 36rpx; line-height: 1; letter-spacing: 1rpx; color: #F2F2EE; }

.clock { display: flex; align-items: center; justify-content: center; padding-bottom: 10rpx; }
.clock-gap { width: 8rpx; }
.colon { display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 38rpx; margin: 0 12rpx; }
.colon-dot { width: 10rpx; height: 10rpx; }

.prog { height: 6rpx; border-radius: 3rpx; background: #1A1A1A; overflow: hidden; }
.prog-fill { height: 6rpx; background: #F2F2EE; }

.blinds { display: flex; justify-content: space-around; padding-top: 4rpx; }
.bl-item { display: flex; flex-direction: column; align-items: center; }
.bl-cap { margin-top: 14rpx; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 20rpx; color: #8F8F8A; }

.slot { position: relative; height: 96rpx; border-radius: 8rpx; overflow: hidden; background: #161616; border: 1rpx solid #262626; }
.ticker, .lane, .mesh, .cards { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
.lane { overflow: hidden; white-space: nowrap; }
.mq { display: inline-flex; align-items: center; height: 100%; animation-name: mq-roll; animation-timing-function: linear; animation-iteration-count: infinite; }
.mq-msg { flex: none; margin-right: 112rpx; white-space: nowrap; font-family: "BoardHei", "BoardNum", "PingFang SC", sans-serif; font-weight: 900; font-size: 44rpx; line-height: 94rpx; }
.mq-notice { color: #FF3B30; text-shadow: 0 0 10rpx rgba(255, 59, 48, .6); }
.mq-danmaku { color: #FFB22E; text-shadow: 0 0 10rpx rgba(255, 178, 46, .55); }
.mesh { background-image: radial-gradient(circle, rgba(5, 5, 5, 0) 0.8px, #050505 1.05px); background-size: 2px 2px; pointer-events: none; }
@keyframes mq-roll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.cards { background: #050505; display: flex; align-items: center; justify-content: center; }
.cd { position: relative; width: 60rpx; height: 84rpx; margin: 0 5rpx; border-radius: 8rpx; background: #F2F2EE; }
.cd-back { background: #B80000; }
.cd-deal { animation: cd-in 280ms cubic-bezier(.3, 1.3, .5, 1) both; }
.cd-r { position: absolute; left: 8rpx; top: 6rpx; font-family: "BoardNum", "Helvetica Neue", sans-serif; font-weight: 800; font-size: 34rpx; line-height: 1; }
.cd-s { position: absolute; right: 6rpx; bottom: 6rpx; }
.cd-frame { position: absolute; left: 6rpx; top: 6rpx; right: 6rpx; bottom: 6rpx; border: 2rpx solid #F3B3B3; border-radius: 6rpx; }
.cd-frame .cd-pip { position: absolute; width: 8rpx; height: 8rpx; border-radius: 50%; background: #F2F2EE; margin: 20rpx 10rpx; }
@keyframes cd-in { from { transform: perspective(400rpx) rotateY(90deg); } to { transform: perspective(400rpx) rotateY(0deg); } }

/* 底排 */
.seat-row { position: relative; flex: none; display: flex; justify-content: space-between; padding: 24rpx 24rpx 0; }
.seat-tool { justify-content: center; padding-top: 0; }
.seat-tool-t { margin-top: 10rpx; font-size: 22rpx; color: #9CA3AF; }
.seat-share {
  margin: 0; padding: 0; line-height: normal; justify-content: center;
  background: #2A1216; border: 2rpx dashed #7A2A2E; border-radius: 28rpx; color: #FF4D4D;
}
.seat-share::after { border: none; }
.seat-share-t { margin-top: 10rpx; font-size: 22rpx; color: #FF4D4D; }

.struct {
  position: absolute; z-index: 60; left: 24rpx; bottom: calc(100% + 16rpx); width: 600rpx; box-sizing: border-box;
  padding: 20rpx 20rpx 12rpx; background: #050505; border: 4rpx solid #262626; border-radius: 8rpx;
}
.st-head { display: flex; align-items: center; justify-content: space-between; height: 52rpx; margin-bottom: 12rpx; }
.st-title-wrap { display: flex; align-items: baseline; }
.st-title { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 32rpx; color: #F2F2EE; }
.st-sub { margin-left: 16rpx; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 24rpx; color: #8F8F8A; }
.st-close { width: 52rpx; height: 52rpx; box-sizing: border-box; border-radius: 8rpx; border: 4rpx solid #262626; display: flex; align-items: center; justify-content: center; }
.tr { position: relative; display: grid; grid-template-columns: 80rpx 184rpx 96rpx 80rpx 1fr; align-items: center; height: 60rpx; border-bottom: 4rpx solid #262626; }
.tr-last { border-bottom: 0; }
.tr-cur { background: #101010; }
.tr-bar { position: absolute; left: 0; top: 12rpx; bottom: 12rpx; width: 6rpx; background: #3FCF84; }
.tr-head { height: 48rpx; }
.tr-head .tc { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 24rpx; color: #8F8F8A; }
.tc { text-align: center; white-space: nowrap; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 700; font-size: 34rpx; color: #F2F2EE; }
.tc-hei { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 26rpx; }
.tc-dur { display: flex; align-items: baseline; justify-content: center; }
.tc-unit { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 22rpx; }

.dots { flex: none; display: flex; justify-content: center; margin-top: 20rpx; }
.dot { width: 12rpx; height: 12rpx; border-radius: 6rpx; margin: 0 6rpx; background: #3A3D46; }
.dot-on { width: 32rpx; background: #F3EEE6; }
.divider { flex: none; height: 1px; margin: 20rpx 32rpx 0; background: #24272F; }

/* 聊天 */
.chat { flex: 1; height: 0; box-sizing: border-box; padding: 0 32rpx; }
.msg { display: flex; align-items: flex-start; padding-top: 24rpx; }
.msg-av { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.msg-body { flex: 1; min-width: 0; margin-left: 20rpx; }
.msg-top { display: flex; align-items: baseline; justify-content: space-between; }
.msg-name { font-size: 24rpx; font-weight: 500; color: #9CA3AF; }
.msg-time { font-size: 22rpx; color: #6B7280; }
.msg-text { display: block; margin-top: 4rpx; font-size: 26rpx; line-height: 1.45; color: #E5E7EB; word-break: break-all; }

/* 消息栏 */
.composer { flex: none; padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom)); background: #181A20; border-top: 1px solid #24272F; }
.cmp-row { display: flex; align-items: center; }
.cmp-input { flex: 1; height: 88rpx; box-sizing: border-box; padding: 0 10rpx 0 28rpx; border-radius: 28rpx; background: #1F222A; display: flex; align-items: center; }
.cmp-field { flex: 1; height: 88rpx; font-size: 28rpx; color: #FFFFFF; }
.cmp-ph { color: #6B7280; }
.cmp-send { width: 68rpx; height: 68rpx; flex: none; border-radius: 20rpx; background: #35383F; display: flex; align-items: center; justify-content: center; }
.cmp-more { width: 88rpx; height: 88rpx; flex: none; margin-left: 16rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; transition: transform .2s ease; }
.cmp-more-on { transform: rotate(45deg); }
.panel { padding-top: 28rpx; }
.panel-title { display: block; margin-bottom: 20rpx; font-size: 24rpx; color: #6B7280; }
.panel-grid { display: flex; }
.cp { flex: 1; display: flex; flex-direction: column; align-items: center; }
.cp-ic { width: 104rpx; height: 104rpx; box-sizing: border-box; border-radius: 28rpx; background: #1F222A; border: 2rpx solid #262A34; display: flex; align-items: center; justify-content: center; }
.cp-on .cp-ic { background: #2A1216; border-color: #DC0000; }
.cp-t { margin-top: 12rpx; font-size: 22rpx; color: #9CA3AF; }
.cp-on .cp-t { color: #FFFFFF; }

.mask { position: fixed; z-index: 50; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .25); }
</style>
