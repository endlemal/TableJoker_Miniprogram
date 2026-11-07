<template>
  <!-- 记分桌：存桌玩家纵向排列，空间不足时在外层页面滚动；每行是本轮出分条，追平了变绿；
       轮到谁头像外面是环形倒计时；弃牌的人淡出缩小，下面的人往上补齐；右上角「排行」看累计资产 -->
  <view class="ztt" :style="'height:' + height + 'px'">
    <view class="ztt-head">
      <text class="ztt-name">{{ table.name }}</text><text v-if="observing" class="ztt-ob">OB</text>
      <text class="ztt-sub">{{ subText }}</text>
      <block v-if="view === 'arrange'">
        <view class="zte-act" hover-class="ztt-press" @tap="shuffle"><z-icon name="arrows-shuffle" :size="14" color="#F3EEE6" /><text class="zte-act-t">随机</text></view>
        <view class="zte-act" hover-class="ztt-press" @tap="view = 'table'"><text class="zte-act-t">取消</text></view>
        <view class="zte-act zte-act-on" hover-class="ztt-press" @tap="finishArrange"><text class="zte-act-t">完成</text></view>
      </block>
      <block v-else>
      <view v-if="canJoin" class="ztt-seat" role="button" hover-class="ztt-press" @tap="emit('join')">入座</view>
      <!-- 主持人：调整座位顺序 -->
      <view v-if="canArrange" class="ztt-ic" hover-class="ztt-press" role="button" aria-label="调整座位顺序" @longpress="showArrangeHint" @tap="startArrange">
        <z-icon name="arrows-sort" :size="16" color="#F3EEE6" />
      </view>
      <view class="ztt-ic" :class="{ 'ztt-ic-on': view === 'rank' }" hover-class="ztt-press" role="button" :aria-label="view === 'rank' ? '返回桌况' : '资产排行'" @longpress="showViewHint" @tap="toggleRank">
        <z-icon :name="view === 'rank' ? 'cards' : 'chart-bar-popular'" :size="16" color="#F3EEE6" />
      </view>
      </block>
    </view>

    <!-- 调座：拖动右边的把手（或长按整行）上下移动；完成后这一手结束、发下一手之前生效 -->
    <view v-if="view === 'arrange'" class="zte">
      <text class="zte-hint">{{ hand && hand.street !== 'done' ? '这一手结束后按新顺序坐' : '完成后按新顺序坐' }} · 拖动右边的把手调整顺序</text>
      <view class="zte-list" @touchmove.stop.prevent="dragMove" @touchend="dragEnd" @touchcancel="dragEnd">
        <view v-for="(pid, i) in order" :key="pid" class="zte-row" :class="{ 'zte-drag': drag.i === i }" :style="rowStyle(i)" @longpress="dragStart(i, $event)">
          <text class="zte-no">{{ i + 1 }}</text>
          <view class="zte-av" :style="'background:' + who(pid).bg + ';color:' + who(pid).fg"><text>{{ who(pid).c }}</text></view>
          <text class="zte-n">{{ who(pid).name }}</text>
          <text v-if="pid === buttonPid" class="zte-btn">庄</text>
          <view class="zte-grip" @touchstart.stop="dragStart(i, $event)"><z-icon name="grip-vertical" :size="18" color="#8E929B" /></view>
        </view>
      </view>
    </view>

    <scroll-view v-show="view === 'rank'" scroll-y class="ztt-rank-view"><z-tally-rank :key="resultMode ? table.id + '-' + table.handNo : 'all'" :members="rankMembers" :assets="displayRankAssets" :start="start" :delta="resultMode ? rankDelta : null" :me="me" :highlight="seatedNames" /></scroll-view>

    <scroll-view v-show="view === 'table'" scroll-y class="ztt-list" :scroll-top="tableScroll" scroll-with-animation @scroll="onTableScroll">
      <view v-for="r in rows" :key="r.s.pid" class="ztt-row" :class="{ 'ztt-out': r.out, 'ztt-turn': r.turn, 'ztt-me': r.me, 'ztt-wait': r.waiting, 'ztt-row-l': rowH >= 60 }" :style="'height:' + rowH + 'px'">
        <!-- 头像：轮到他时外面一圈是环形倒计时 -->
        <view class="ztt-ring" :style="ringBox">
          <!-- 环形倒计时：纯 CSS 动画（两个半圆依次转过去，把绿色一圈慢慢盖掉），不用定时器刷新整张桌 -->
          <view v-if="r.turn && table.turnEnd" :key="'pie' + table.turnStart" class="ztt-pie" :style="pieStyle()">
            <view class="ztt-half ztt-half-r"><view class="ztt-cover ztt-cover-r" :style="coverStyle(0)"></view></view>
            <view class="ztt-half ztt-half-l"><view class="ztt-cover ztt-cover-l" :style="coverStyle(1)"></view></view>
          </view>
          <view class="ztt-av" :style="'width:' + avSize + 'px;height:' + avSize + 'px;font-size:' + Math.round(avSize * 0.42) + 'px;background:' + r.s.bg + ';color:' + r.s.fg"><text>{{ r.s.c }}</text></view>
        </view>
        <view class="ztt-main">
          <view class="ztt-top">
            <text class="ztt-n" :style="'font-size:' + nameSize + 'px'">{{ r.s.name }}</text>
            <text v-if="r.pos" class="ztt-pos">{{ r.pos }}</text>
            <text v-if="r.tag" class="ztt-tag" :class="'ztt-tag-' + r.tagTone" :aria-label="r.detail" @tap.stop="showStatus(r)">{{ r.tag }}</text>
          </view>
          <!-- 这一轮的出分条，追平后变绿 -->
          <view class="ztt-track">
            <view class="ztt-bar" :class="{ 'ztt-bar-ok': r.matched, 'ztt-bar-total': !betting }" :style="'width:' + r.barW + '%'"></view>
            <view class="ztt-bar-right">
              <text v-if="r.action" :key="r.fx ? r.fx.id : 'rest'" class="ztt-action" :class="[r.fx ? 'ztt-impact' : '', 'ztt-action-' + r.actionKind]">{{ r.action }}</text>
              <view class="ztt-bet"><text>{{ fmt(r.value) }}</text></view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
// 一张记分桌的实时视图（没有扑克牌）。桌面分紧接玩法面板；定胜区、收分栏位于其下方。
import { ref, computed, watch, nextTick, onMounted, onUnmounted, reactive } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTallyRank from '@/pages/room/components/z-tally-rank/z-tally-rank.vue'
import { positions } from '@/common/tally.js'
import { playerStatus } from '@/common/tally-labels.js'
import { fmt } from '@/common/format.js'

const props = defineProps({
  table: { type: Object, required: true },
  me: { type: String, default: '' },
  observing: { type: Boolean, default: false },
  blinds: { type: Object, default: () => ({ sb: 0, bb: 0 }) },
  height: { type: Number, default: 300 }, // 这一页能用的高度（px）
  members: { type: Array, default: () => [] },
  assets: { type: Object, default: () => ({}) },
  start: { type: Object, default: () => ({}) },
  canArrange: { type: Boolean, default: false } // 主持人：可以调整座位顺序
})
const emit = defineEmits(['join', 'arrange'])
const view = ref('table')
const canJoin = computed(() => props.observing && props.table.seats.some(s => !s) && props.assets[props.me] > 0)
const hand = computed(() => props.table.hand)
const betting = computed(() => !!(hand.value && ['preflop', 'flop', 'turn', 'river'].includes(hand.value.street)))
const pos = computed(() => positions(props.table))
const seatedNames = computed(() => props.table.seats.filter(Boolean).map((s) => s.name))
const subText = computed(() => `${props.table.handNo}手 · ${props.table.seats.filter(Boolean).length}人`)
const showStatus = (r) => uni.showToast({ title: r.detail, icon: 'none', duration: 2600 })
/* ---------- 调座：主持人拖动调整座位顺序（下一手生效） ---------- */
const ROW = 42
const order = ref([])
const drag = reactive({ i: -1, y0: 0, dy: 0 })
const seatedMap = computed(() => { const o = {}; props.table.seats.forEach((x) => { if (x) o[x.pid] = x }); return o })
const who = (pid) => seatedMap.value[pid] || { name: '已离座', c: '?', bg: '#33363E', fg: '#A9AEB8' }
const buttonPid = computed(() => { const t = props.table; return t.button >= 0 && t.seats[t.button] ? t.seats[t.button].pid : '' })
const showArrangeHint = () => uni.showToast({ title: '调整座位顺序', icon: 'none' })
function startArrange() {
  // 正在用的顺序：调过还没生效的先按调过的显示
  const now = props.table.seats.filter(Boolean).map((x) => x.pid)
  const queued = (props.table.pendingOrder || []).filter((id) => now.includes(id))
  order.value = queued.concat(now.filter((id) => !queued.includes(id)))
  view.value = 'arrange'
}
const yOf = (e) => { const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e.detail || {}; return t.clientY || t.pageY || t.y || 0 }
function dragStart(i, e) { drag.i = i; drag.y0 = yOf(e); drag.dy = 0 }
function dragMove(e) { if (drag.i >= 0) drag.dy = yOf(e) - drag.y0 }
const target = () => Math.max(0, Math.min(order.value.length - 1, drag.i + Math.round(drag.dy / ROW)))
function dragEnd() {
  if (drag.i < 0) return
  const to = target()
  if (to !== drag.i) { const list = order.value.slice(); const [x] = list.splice(drag.i, 1); list.splice(to, 0, x); order.value = list }
  drag.i = -1; drag.dy = 0
}
function rowStyle(i) {
  if (drag.i < 0) return ''
  if (i === drag.i) return `transform:translateY(${drag.dy}px)`
  const to = target()
  if (drag.i < i && i <= to) return `transform:translateY(-${ROW}px)`
  if (to <= i && i < drag.i) return `transform:translateY(${ROW}px)`
  return ''
}
function shuffle() {
  const list = order.value.slice()
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]] }
  order.value = list
}
function finishArrange() { emit('arrange', order.value.slice()); view.value = 'table' }
const showViewHint = () => uni.showToast({ title: view.value === 'rank' ? '返回桌况' : '资产排行', icon: 'none' })
// 保留开手前的资产快照。结算时先展示原位次，再一次性播放本手盈亏，避免收分途中反复跳榜。
const resultMode = ref(false)
const rankAssets = ref({})
const rankDelta = ref({})
let rankBefore = {}
let rankTimer = null
let rankVersion = 0
const rankMembers = computed(() => resultMode.value ? props.members.filter((m) => Object.values(hand.value?.seatRef || {}).some((s) => s.name === m.name)) : props.members.filter((m) => seatedNames.value.includes(m.name)))
const displayRankAssets = computed(() => resultMode.value ? rankAssets.value : assetSnapshot(hand.value?.street !== 'done'))
function toggleRank() {
  if (view.value === 'rank') { view.value = 'table'; return }
  rankVersion++; clearTimeout(rankTimer)
  resultMode.value = false; view.value = 'rank'
}
function assetSnapshot(before) {
  const out = { ...props.assets }
  const h = hand.value
  if (h) h.order.forEach((i) => {
    const s = h.seatRef[i]
    const received = (h.pots || []).reduce((sum, p) => sum + (p.taken?.[i] ? p.shares[i] : 0), 0)
    out[s.name] = s.stack + (before && !(h.street === 'done' && !h.result) ? h.players[i].committed - received : 0)
  })
  return out
}
watch(() => [props.table.id, props.table.handNo], () => {
  rankVersion++; clearTimeout(rankTimer)
  resultMode.value = false; view.value = 'table'; rankDelta.value = {}
  rankBefore = assetSnapshot(true); rankAssets.value = { ...rankBefore }
}, { immediate: true })
watch(() => [props.table.id, props.table.handNo, hand.value?.street], async ([, , street]) => {
  if (street !== 'done') return
  const version = ++rankVersion
  const after = assetSnapshot(false)
  const delta = {}
  hand.value.order.forEach((i) => { delta[hand.value.seatRef[i].name] = hand.value.result?.delta[i] || 0 })
  clearTimeout(rankTimer)
  resultMode.value = true; rankAssets.value = { ...rankBefore }; rankDelta.value = {}; view.value = 'rank'
  await nextTick()
  if (version !== rankVersion) return
  rankTimer = setTimeout(() => { rankAssets.value = after; rankDelta.value = delta }, 180)
}, { immediate: true })

// 动作由独立序列触发，连续 CHECK 也能重播；过街前的下注快照保留到冲击动画结束。
const ACTIONS = { allin: 'ALL IN', check: 'CHECK', fold: 'FOLD', call: 'CALL', raise: 'RAISE' }
const effects = ref({})
const effectTimers = new Map()
watch(() => [props.table.id, props.table.handNo, hand.value?.actions?.length || 0], ([id, no, n], old) => {
  if (!old || old[0] !== id || old[1] !== no) {
    effectTimers.forEach(clearTimeout); effectTimers.clear(); effects.value = {}; return
  }
  ;(hand.value?.actions || []).slice(old[2], n).forEach((a, j) => {
    clearTimeout(effectTimers.get(a.seat))
    effects.value = { ...effects.value, [a.seat]: { ...a, id: `${no}-${old[2] + j}` } }
    effectTimers.set(a.seat, setTimeout(() => {
      const next = { ...effects.value }; delete next[a.seat]; effects.value = next; effectTimers.delete(a.seat)
    }, 850))
  })
}, { immediate: true })
// 出分条的比例尺：这一轮里最大的出分和跟注线
const scale = computed(() => {
  const h = hand.value
  if (!h) return 1
  if (betting.value) return Math.max(1, h.currentBet, ...h.order.map((i) => h.players[i].bet))
  return Math.max(1, ...h.order.map((i) => h.players[i].committed))
})
const rows = computed(() => {
  const h = hand.value
  return props.table.seats.map((s, i) => ({ s, i })).filter(({ s, i }) => s && (s.stack > 0 || (h && h.street !== 'done' && h.seatRef[i] === s))).map(({ s, i }) => {
    const p = h && h.seatRef[i] === s && h.players[i]
    const done = !!(h && h.street === 'done')
    const fx = effects.value[i]
    const value = fx ? fx.bet : p ? (betting.value ? p.bet : p.committed) : 0
    const lastAction = h?.actions?.slice().reverse().find((a) => a.seat === i && a.street === h.street)
    const actionKind = fx?.kind || lastAction?.kind || ''
    const status = playerStatus(p ? h : null, s, i)
    if (h && !p && h.street !== 'done') Object.assign(status, { label: '候场', tone: 'wait', detail: '本手未参与，从下一手加入。' })
    return {
      i, s, me: s.pid === props.me, pos: (p && !done && pos.value[i]) || '', tag: status.label, tagTone: status.tone, detail: status.detail,
      // 这一手进行中弃牌的人：淡出缩小，然后收起（下面的人往上补齐）
      out: !!(p && p.folded && !done && !fx),
      waiting: !!(h && !p && !done),
      turn: !!(h && h.toAct === i && betting.value),
      barW: value ? Math.min(100, Math.max(4, Math.round((value / scale.value) * 100))) : 0,
      matched: !!(p && betting.value && h.currentBet > 0 && p.bet >= h.currentBet),
      value, fx, actionKind, action: ACTIONS[actionKind] || ''
    }
  })
})
// 两行内容明确占 20 + 4 + 20px，再留上下各 4px；不压缩文字，矮屏交给外层滚动。
const visibleCount = computed(() => rows.value.filter((r) => !r.out).length)
const rowH = computed(() => Math.max(52, Math.min(88, Math.floor((props.height - 42 - Math.max(0, visibleCount.value - 1) * 4) / Math.max(1, visibleCount.value)))))
const avSize = computed(() => Math.max(20, Math.min(48, rowH.value - 12)))
const nameSize = computed(() => Math.round(Math.max(12, Math.min(18, 12 + ((rowH.value - 28) / 60) * 6))))
// 只在行动玩家、可见行数或视口改变时定位；手动浏览期间不持续抢回滚动位置。
const tableScroll = ref(0)
let tableActualScroll = 0, focusVersion = 0
function onTableScroll(e) { tableActualScroll = e.detail.scrollTop }
watch(() => [props.table.id, props.table.handNo, hand.value?.toAct, visibleCount.value, rowH.value, props.height, view.value], async () => {
  const version = ++focusVersion
  if (view.value !== 'table' || !betting.value) return
  const visible = rows.value.filter(r => !r.out)
  const index = visible.findIndex(r => r.turn)
  if (index < 0) return
  const top = index * (rowH.value + 4) + 4
  const bottom = top + rowH.value
  const viewport = Math.max(52, props.height - 42)
  let target = tableActualScroll
  if (top < target) target = Math.max(0, top - 4)
  else if (bottom > target + viewport) target = bottom - viewport + 4
  if (Math.abs(target - tableActualScroll) < 1) return
  tableScroll.value = tableActualScroll
  await nextTick()
  if (version === focusVersion) tableScroll.value = target
}, { immediate: true, flush: 'post' })
// 环形倒计时：轮到的人头像外面一圈，从满到空；最后四分之一变黄
// 环形倒计时（性能）：原来每 100ms 刷新一次整张桌来画渐变，现在交给 CSS 动画。
// 总时长 D、已经过去 e（毫秒）：用负的 animation-delay 对上进度；换人时按 turnStart 重新挂载，动画从头开始
const ringBox = computed(() => { const size = avSize.value + 6; return `width:${size}px;height:${size}px` })
function ringTiming() {
  const D = Math.max(1, props.table.turnEnd - props.table.turnStart)
  return { D, e: Math.max(0, Math.min(D, Date.now() - props.table.turnStart)) }
}
function pieStyle() { const { D, e } = ringTiming(); return `animation-duration:${D}ms;animation-delay:${-e}ms` }
// 右半边在前一半时间里盖完，左半边在后一半时间里盖完
function coverStyle(half) { const { D, e } = ringTiming(); const d = D / 2; return `animation-duration:${d}ms;animation-delay:${half === 0 ? -e : d - e}ms` }
onUnmounted(() => { clearTimeout(rankTimer); rankVersion++; effectTimers.forEach(clearTimeout) })
</script>

<style>
.ztt { padding: 6px 10px 2px; line-height: 1.2; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
.ztt-head { flex: none; height: 30px; display: flex; align-items: center; }
.ztt-name { flex: none; font-size: 15px; font-weight: 700; color: #F3EEE6; }
.ztt-sub { margin-left: 8px; flex: 1; min-width: 0; font-size: 12px; color: #A9AEB8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ztt-ic { flex: none; width: 30px; height: 30px; margin-left: 6px; border-radius: 50%; background: #2C2F36; display: flex; align-items: center; justify-content: center; }
.ztt-seat { flex: none; padding: 5px 10px; border-radius: 12px; background: #5865F2; color: #FFFFFF; font-size: 12px; line-height: 18px; }
.ztt-ic-on { background: #5865F2; }
.ztt-press { opacity: .7; }
.ztt-list { margin-top: 4px; }
.ztt-list, .ztt-rank-view { flex: 1; min-height: 0; height: 0; }
.ztt-ob { flex: none; margin-left: 6px; padding: 2px 5px; border-radius: 4px; background: #33363E; font-size: 10px; line-height: 14px; color: #C9CDD4; }
.ztt-row { margin-bottom: 4px; padding: 0 6px; box-sizing: border-box; border-radius: 10px; overflow: hidden; display: flex; align-items: center; transform-origin: center left;
  transition: height 260ms cubic-bezier(.2, .8, .2, 1), margin-bottom 260ms ease, opacity 220ms ease, transform 220ms ease, background 200ms ease; }
/* 弃牌行与其余行同步收放，避免先放大后收起造成瞬时溢出。 */
.ztt-row:last-child { margin-bottom: 0; }
.ztt-out { margin-bottom: 0; opacity: 0; transform: scale(.86); height: 0 !important;
  transition: opacity 180ms ease, transform 220ms ease, height 260ms cubic-bezier(.2, .8, .2, 1); pointer-events: none; }
.ztt-turn { background: rgba(63, 207, 132, .10); }
.ztt-wait .ztt-av { opacity: .55; }
.ztt-me .ztt-n { color: #8EA1FF; }
.ztt-ring { position: relative; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: width 260ms ease, height 260ms ease; }
.ztt-av { position: relative; z-index: 1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 0 0 2px #0D0E11; transition: width 260ms ease, height 260ms ease, font-size 260ms ease; }
.ztt-main { flex: 1; min-width: 0; margin-left: 8px; display: flex; flex-direction: column; justify-content: center; }
.ztt-top { flex: none; height: 20px; min-width: 0; display: flex; align-items: center; }
.ztt-n { min-width: 0; line-height: 20px; font-weight: 600; color: #F3EEE6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ztt-pos { margin-left: 6px; flex: none; padding: 0 4px; border-radius: 4px; background: #2C2F36; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 11px; line-height: 15px; color: #C9CDD4; }
.ztt-tag { margin-left: 6px; flex: none; padding: 0 4px; border-radius: 4px; font-size: 11px; line-height: 15px; color: #A9AEB8; white-space: nowrap; }
.ztt-tag-win { padding: 0 5px; border-radius: 4px; background: #FFC53A; color: #181A20; font-weight: 700; line-height: 15px; }
.ztt-tag-hot { background: rgba(255, 138, 138, .12); color: #FF8A8A; font-weight: 600; }
.ztt-tag-empty { background: rgba(255, 197, 58, .12); color: #FFC53A; }
.ztt-tag-wait { background: #2C2F36; color: #C9CDD4; }
.ztt-tag-turn { background: rgba(63, 207, 132, .12); color: #3FCF84; }
.ztt-track { position: relative; flex: none; margin-top: 4px; height: 20px; border-radius: 4px; background: #1B1D22; }
.ztt-bar { height: 100%; border-radius: 3px; background: #E2B04A; transition: width 260ms ease, background 200ms ease; }
.ztt-bar-ok { background: #B7D28A; }
.ztt-bar-total { background: #6B7A55; }
.ztt-bar-right { position: absolute; inset: 0 5px 0 0; display: flex; align-items: center; justify-content: flex-end; pointer-events: none; }
.ztt-bet { flex: none; min-width: 32px; margin-left: 6px; padding: 1px 5px; border-radius: 4px; text-align: right; background: rgba(13, 14, 17, .82); font-family: "BoardNum", sans-serif; font-size: 13px; line-height: 16px; font-weight: 800; color: #F3EEE6; }
.ztt-action { flex: none; position: relative; padding: 1px 5px; border-radius: 3px; background: #252A28; color: #C9CDD4; font-family: "BoardNum", Impact, sans-serif; font-size: 12px; line-height: 16px; font-weight: 900; letter-spacing: .6px; transform-origin: right center; }
.ztt-action-allin { background: #FFD27A; color: #291604; text-shadow: 1px 1px 0 rgba(255,255,255,.35); }
.ztt-action-raise { background: #8EA1FF; color: #10162E; }
.ztt-action-check { background: #B7D28A; color: #18220F; }
.ztt-action-fold { background: #604447; color: #FFE1DC; }
.ztt-impact { z-index: 2; animation: ztt-hit 720ms cubic-bezier(.2,.8,.2,1) both; box-shadow: 2px 2px 0 #0D0E11; }
.ztt-impact::after { content: ''; position: absolute; inset: -4px; border: 2px solid currentColor; border-radius: 5px; pointer-events: none; animation: ztt-ring-hit 500ms ease-out both; }
@keyframes ztt-hit {
  0% { opacity: 0; transform: translateX(12px) scale(1.65) rotate(-10deg); }
  20% { opacity: 1; transform: translateX(-3px) scale(.88) rotate(4deg); }
  38% { transform: translateX(2px) scale(1.18) rotate(-3deg); }
  58% { transform: translateX(-1px) scale(.97) rotate(1deg); }
  100% { opacity: 1; transform: none; }
}
@keyframes ztt-ring-hit { 0% { opacity: .8; transform: scale(.85); } 100% { opacity: 0; transform: scale(1.5); } }
.ztt-row-l .ztt-track { height: 26px; margin-top: 6px; }
.ztt-row-l .ztt-action { font-size: 15px; line-height: 20px; }
.ztt-row-l .ztt-bet { font-size: 17px; line-height: 20px; }
@media (prefers-reduced-motion: reduce) {
  .ztt-impact, .ztt-impact::after { animation: none; }
  .ztt-row, .ztt-bar, .ztt-ring, .ztt-av { transition: none; }
}

/* 环形倒计时：绿色圆底，两个半圆（轨道色）按时间转过来盖住；最后四分之一变黄 */
.ztt-pie { position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; overflow: hidden; background: #3FCF84; animation-name: ztt-pie-color; animation-timing-function: linear; animation-fill-mode: both; }
@keyframes ztt-pie-color { 0%, 74.9% { background-color: #3FCF84; } 75%, 100% { background-color: #FFC53A; } }
.ztt-half { position: absolute; top: 0; width: 50%; height: 100%; overflow: hidden; }
.ztt-half-r { right: 0; }
.ztt-half-l { left: 0; }
.ztt-cover { position: absolute; top: 0; width: 200%; height: 100%; border-radius: 50%; animation-name: ztt-pie-turn; animation-timing-function: linear; animation-fill-mode: both; }
.ztt-cover-r { left: -100%; background: linear-gradient(to right, #26332C 50%, transparent 50%); }
.ztt-cover-l { left: 0; background: linear-gradient(to right, transparent 50%, #26332C 50%); }
@keyframes ztt-pie-turn { from { transform: rotate(0deg); } to { transform: rotate(180deg); } }
/* 调座 */
.zte-act { flex: none; height: 26px; margin-left: 6px; padding: 0 10px; border-radius: 13px; background: #2C2F36; display: flex; align-items: center; }
.zte-act-on { background: #5865F2; }
.zte-act-t { margin-left: 2px; font-size: 12px; color: #F3EEE6; }
.zte { flex: 1; min-height: 0; margin-top: 4px; display: flex; flex-direction: column; }
.zte-hint { flex: none; font-size: 11px; line-height: 18px; color: #A9AEB8; }
.zte-list { position: relative; margin-top: 4px; }
.zte-row { height: 38px; margin-bottom: 4px; padding: 0 4px 0 8px; border-radius: 10px; background: #24272E; display: flex; align-items: center; transition: transform 160ms ease; }
.zte-drag { position: relative; z-index: 2; background: #343846; box-shadow: 0 8px 18px rgba(0, 0, 0, .45); transition: none; }
.zte-no { width: 20px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 13px; color: #8E929B; }
.zte-av { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.zte-n { margin-left: 8px; flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: #F3EEE6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zte-btn { margin-right: 6px; padding: 0 5px; border-radius: 4px; background: #FFC53A; font-size: 11px; font-weight: 700; line-height: 16px; color: #181A20; }
.zte-grip { width: 40px; height: 38px; display: flex; align-items: center; justify-content: center; }
</style>
