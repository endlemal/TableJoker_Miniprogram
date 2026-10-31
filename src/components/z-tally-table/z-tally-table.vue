<template>
  <!-- 记分桌：所有玩家纵向排列（一屏放得下）；每行是这一轮的出分条和「跟注线」，追平了变绿；
       轮到谁头像外面是环形倒计时；弃牌的人淡出缩小，下面的人往上补齐；右上角「排行」看累计资产 -->
  <view class="ztt">
    <view class="ztt-head">
      <text class="ztt-name">{{ table.name }}</text>
      <text class="ztt-sub">{{ subText }}</text>
      <view class="ztt-ic" :class="{ 'ztt-ic-on': view === 'rank' }" hover-class="ztt-press" @tap="view = view === 'rank' ? 'table' : 'rank'">
        <z-icon :name="view === 'rank' ? 'x' : 'chart-bar-popular'" :size="16" color="#F3EEE6" /><text class="ztt-ic-t">{{ view === 'rank' ? '返回' : '排行' }}</text>
      </view>
      <view class="ztt-leave" hover-class="ztt-press" @tap="emit('leave')"><text class="ztt-leave-t">离桌</text></view>
    </view>

    <z-tally-rank v-if="view === 'rank'" :members="members" :assets="assets" :start="start" :me="me" :highlight="seatedNames" />

    <view v-else class="ztt-list">
      <view v-for="r in rows" :key="r.i" class="ztt-row" :class="{ 'ztt-out': r.out, 'ztt-turn': r.turn, 'ztt-me': r.me, 'ztt-wait': r.waiting, 'ztt-row-s': rowH < 40 }" :style="'height:' + rowH + 'px'">
        <!-- 头像：轮到他时外面一圈是环形倒计时 -->
        <view class="ztt-ring" :style="ringStyle(r)">
          <view class="ztt-av" :style="'width:' + avSize + 'px;height:' + avSize + 'px;font-size:' + Math.round(avSize * 0.42) + 'px;background:' + r.s.bg + ';color:' + r.s.fg"><text>{{ r.s.c }}</text></view>
        </view>
        <view class="ztt-main">
          <view class="ztt-top">
            <text class="ztt-n" :style="'font-size:' + nameSize + 'px'">{{ r.s.name }}</text>
            <text v-if="r.pos" class="ztt-pos">{{ r.pos }}</text>
            <text v-if="r.tag" class="ztt-tag" :class="'ztt-tag-' + r.tagTone">{{ r.tag }}</text>
          </view>
          <!-- 这一轮的出分条；虚线是跟注线（现在要跟到多少），追平了变绿 -->
          <view class="ztt-track">
            <view class="ztt-bar" :class="{ 'ztt-bar-ok': r.matched, 'ztt-bar-total': !betting }" :style="'width:' + r.barW + '%'"></view>
            <view v-if="betting && lineX > 0" class="ztt-line" :style="'left:' + lineX + '%'"></view>
            <text class="ztt-bar-t">{{ r.barText }}</text>
          </view>
        </view>
        <view class="ztt-side">
          <view class="ztt-stack"><z-count :value="r.s.stack" /></view>
          <view v-if="r.chip" class="ztt-chip" :class="r.up ? 'ztt-chip-up' : 'ztt-chip-down'"><text>{{ r.chip }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 一张记分桌的实时视图（没有扑克牌）。数据来自 common/tally-room.js；桌面分和收分在 dm-area 里（z-tally-pot）
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZCount from '@/components/z-count/z-count.vue'
import ZTallyRank from '@/components/z-tally-rank/z-tally-rank.vue'
import { positions, ROUND_NAME } from '@/common/tally.js'

const props = defineProps({
  table: { type: Object, required: true },
  me: { type: String, default: '' },
  blinds: { type: Object, default: () => ({ sb: 0, bb: 0 }) },
  height: { type: Number, default: 300 }, // 这一页能用的高度（px）
  members: { type: Array, default: () => [] },
  assets: { type: Object, default: () => ({}) },
  start: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['leave'])
const view = ref('table')
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const hand = computed(() => props.table.hand)
const betting = computed(() => !!(hand.value && ['preflop', 'flop', 'turn', 'river'].includes(hand.value.street)))
const pos = computed(() => positions(props.table))
const seatedNames = computed(() => props.table.seats.filter(Boolean).map((s) => s.name))
const subText = computed(() => {
  const h = hand.value
  const round = h ? ROUND_NAME[h.street] : '等待开局'
  return `第 ${props.table.handNo} 手 · ${round} · 盲注 ${fmt(props.blinds.sb)}/${fmt(props.blinds.bb)}`
})
// 出分条的比例尺：这一轮里最大的出分和跟注线
const scale = computed(() => {
  const h = hand.value
  if (!h) return 1
  if (betting.value) return Math.max(1, h.currentBet, ...h.order.map((i) => h.players[i].bet))
  return Math.max(1, ...h.order.map((i) => h.players[i].committed))
})
const lineX = computed(() => (hand.value && betting.value ? Math.round((hand.value.currentBet / scale.value) * 100) : 0))
const rows = computed(() => {
  const h = hand.value
  return props.table.seats.map((s, i) => ({ s, i })).filter((x) => x.s).map(({ s, i }) => {
    const p = h && h.players[i]
    const done = !!(h && h.street === 'done')
    const value = p ? (betting.value ? p.bet : p.committed) : 0
    const winner = h && h.street === 'payout' && h.pots && h.pots.some((pt) => pt.shares && pt.shares[i])
    const delta = done && h.result && p ? h.result.delta[i] : 0
    let tag = ''
    let tagTone = ''
    if (p && !done) { tag = winner ? '赢' : p.allIn ? '全下' : p.last; tagTone = winner ? 'win' : p.allIn ? 'hot' : '' }
    if (h && !p && !done) { tag = '下一手'; tagTone = '' }
    return {
      i, s, me: s.pid === props.me, pos: (p && !done && pos.value[i]) || '', tag, tagTone,
      // 这一手进行中弃牌的人：淡出缩小，然后收起（下面的人往上补齐）
      out: !!(p && p.folded && !done),
      waiting: !!(h && !p && !done),
      turn: !!(h && h.toAct === i && betting.value),
      barW: value ? Math.max(4, Math.round((value / scale.value) * 100)) : 0,
      matched: !!(p && betting.value && h.currentBet > 0 && p.bet >= h.currentBet),
      barText: value ? (betting.value ? '出 ' + fmt(value) : '本手 ' + fmt(value)) : '',
      chip: done && delta ? (delta > 0 ? '+' : '−') + fmt(Math.abs(delta)) : '', up: delta > 0
    }
  })
})
// 行高：所有在座的人一屏放得下（28 到 60px）；低于 40px 时一行显示
const HEAD = 34
const rowH = computed(() => Math.max(28, Math.min(60, Math.floor((props.height - HEAD - 6) / Math.max(1, rows.value.length)))))
const avSize = computed(() => Math.max(20, Math.min(40, rowH.value - 12)))
const nameSize = computed(() => Math.round(Math.max(12, Math.min(16, 12 + ((rowH.value - 28) / 32) * 4))))
// 环形倒计时：轮到的人头像外面一圈，从满到空；最后四分之一变黄
const now = ref(Date.now())
let ticker = null
onMounted(() => { ticker = setInterval(() => { if (props.table.turnEnd) now.value = Date.now() }, 100) })
onUnmounted(() => clearInterval(ticker))
function ringStyle(r) {
  const size = avSize.value + 6
  const base = `width:${size}px;height:${size}px;`
  if (!r.turn || !props.table.turnEnd) return base + 'background:transparent'
  const total = Math.max(1, props.table.turnEnd - props.table.turnStart)
  const left = Math.max(0, Math.min(1, (props.table.turnEnd - now.value) / total))
  const c = left > 0.25 ? '#3FCF84' : '#FFC53A'
  return base + `background:conic-gradient(${c} ${(left * 360).toFixed(1)}deg, rgba(243, 238, 230, .12) 0)`
}
</script>

<style>
.ztt { padding: 6px 10px 2px; }
.ztt-head { height: 30px; display: flex; align-items: center; }
.ztt-name { font-size: 15px; font-weight: 700; color: #F3EEE6; }
.ztt-sub { margin-left: 8px; flex: 1; min-width: 0; font-size: 12px; color: #A9AEB8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ztt-ic { height: 26px; margin-left: 6px; padding: 0 10px; border-radius: 13px; background: #2C2F36; display: flex; align-items: center; }
.ztt-ic-on { background: #5865F2; }
.ztt-ic-t { margin-left: 4px; font-size: 12px; color: #F3EEE6; }
.ztt-leave { height: 26px; margin-left: 6px; padding: 0 10px; border-radius: 13px; background: #2C2F36; display: flex; align-items: center; }
.ztt-leave-t { font-size: 12px; color: #F3EEE6; }
.ztt-press { opacity: .7; }
.ztt-list { margin-top: 4px; }
.ztt-row { padding: 0 6px; box-sizing: border-box; border-radius: 10px; overflow: hidden; display: flex; align-items: center; transform-origin: center left;
  transition: height 260ms cubic-bezier(.2, .8, .2, 1), opacity 220ms ease, transform 220ms ease, background 200ms ease; }
/* 弃牌：先淡出缩小（220ms），再收起高度，下面的人往上补齐 */
.ztt-out { opacity: 0; transform: scale(.86); height: 0 !important;
  transition: opacity 220ms ease, transform 220ms ease, height 240ms cubic-bezier(.2, .8, .2, 1) 200ms; }
.ztt-turn { background: rgba(63, 207, 132, .10); }
.ztt-wait { opacity: .45; }
.ztt-me .ztt-n { color: #8EA1FF; }
.ztt-ring { flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ztt-av { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; box-shadow: 0 0 0 2px #0D0E11; }
.ztt-main { flex: 1; min-width: 0; margin-left: 8px; display: flex; flex-direction: column; justify-content: center; }
.ztt-top { display: flex; align-items: center; }
.ztt-n { font-weight: 600; color: #F3EEE6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ztt-pos { margin-left: 6px; flex: none; padding: 0 4px; border-radius: 4px; background: #2C2F36; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 11px; line-height: 15px; color: #C9CDD4; }
.ztt-tag { margin-left: 6px; flex: none; font-size: 11px; color: #A9AEB8; }
.ztt-tag-win { padding: 0 5px; border-radius: 4px; background: #FFC53A; color: #181A20; font-weight: 700; line-height: 15px; }
.ztt-tag-hot { color: #FF8A8A; font-weight: 600; }
.ztt-track { position: relative; margin-top: 3px; height: 14px; border-radius: 3px; background: #1B1D22; overflow: hidden; }
.ztt-bar { height: 100%; border-radius: 3px; background: #E2B04A; transition: width 260ms ease, background 200ms ease; }
.ztt-bar-ok { background: #B7D28A; }
.ztt-bar-total { background: #6B7A55; }
.ztt-line { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px dashed #F3EEE6; opacity: .75; transition: left 260ms ease; }
.ztt-bar-t { position: absolute; left: 6px; top: 0; font-size: 10px; line-height: 14px; color: #1B2410; font-weight: 600; }
.ztt-side { margin-left: 8px; min-width: 58px; display: flex; flex-direction: column; align-items: flex-end; }
.ztt-stack { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 13px; color: #C9CDD4; }
.ztt-chip { margin-top: 2px; height: 16px; padding: 0 6px; border-radius: 8px; font-size: 10px; line-height: 16px; color: #FFFFFF; }
.ztt-chip-down { background: #B3261E; }
.ztt-chip-up { background: #3E8E2F; }
/* 行比较矮（人多）时一行显示：出分条在名字右边 */
.ztt-row-s .ztt-main { flex-direction: row; align-items: center; }
.ztt-row-s .ztt-top { flex: none; max-width: 46%; }
.ztt-row-s .ztt-tag { display: none; }
.ztt-row-s .ztt-track { flex: 1; margin: 0 0 0 8px; height: 12px; }
.ztt-row-s .ztt-bar-t { font-size: 9px; line-height: 12px; }
.ztt-row-s .ztt-side { flex-direction: row-reverse; align-items: center; }
.ztt-row-s .ztt-chip { margin: 0 6px 0 0; }
</style>
