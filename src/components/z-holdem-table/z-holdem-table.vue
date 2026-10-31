<template>
  <!-- 牌桌（低保真布局：公共牌、桌面分、每人的出分柱、名字和位置、头像、本手输赢） -->
  <view class="zht" :class="{ 'zht-dense': dense }">
    <view class="zht-head">
      <text class="zht-name">{{ table.name }}</text>
      <text class="zht-sub">{{ table.size }} 人桌 · 第 {{ table.handNo }} 手 · 盲注 {{ fmt(blinds.sb) }}/{{ fmt(blinds.bb) }}</text>
      <view class="zht-leave" hover-class="zht-press" @tap="emit('leave')"><text class="zht-leave-t">离桌</text></view>
    </view>
    <view class="zht-board">
      <view v-for="k in 5" :key="k" class="zht-bc" :class="{ 'zht-bc-back': !board[k - 1] }">
        <block v-if="board[k - 1]"><text class="zht-bc-r" :style="'color:' + colorOf(board[k - 1])">{{ rankOf(board[k - 1]) }}</text><text class="zht-bc-s" :style="'color:' + colorOf(board[k - 1])">{{ suitOf(board[k - 1]) }}</text></block>
      </view>
    </view>
    <view class="zht-pot"><text class="zht-pot-v">{{ pot }}</text><text class="zht-pot-k">桌面分</text></view>
    <text class="zht-res">{{ resultLine }}</text>
    <view class="zht-dash"></view>
    <view class="zht-cols">
      <view v-for="c in cols" :key="c.i" class="zht-col" :class="{ 'zht-col-turn': c.turn, 'zht-col-fold': c.folded }">
        <view class="zht-bar-w"><view v-if="c.committed" class="zht-bar" :class="{ 'zht-bar-dim': c.folded }" :style="'height:' + c.barH + '%'"><text class="zht-bar-t">出{{ c.committed }}分</text></view></view>
        <block v-if="c.seat">
          <view class="zht-lab"><text class="zht-lab-n">{{ c.seat.name }}</text><text class="zht-lab-p">{{ c.pos }}</text></view>
          <view class="zht-av" :class="{ 'zht-av-turn': c.turn, 'zht-av-me': c.me }" :style="'background:' + c.seat.bg + ';color:' + c.seat.fg"><text>{{ c.seat.c }}</text></view>
          <text v-if="c.chip" class="zht-chip" :class="c.chipUp ? 'zht-chip-up' : 'zht-chip-down'">{{ c.chip }}</text>
          <text v-else class="zht-chip zht-chip-none">{{ c.lastAct || ' ' }}</text>
        </block>
        <block v-else>
          <view class="zht-lab"><text class="zht-lab-n zht-lab-empty">空位</text></view>
          <view class="zht-av zht-av-empty"></view>
          <text class="zht-chip zht-chip-none"> </text>
        </block>
      </view>
    </view>
  </view>
</template>

<script setup>
// 一张牌桌的实时视图。数据来自 common/holdem-room.js 的牌桌对象；自己的手牌在 dm-area 的决策区里，这里只显示公共信息
import { computed } from 'vue'
import { RANK_TEXT, potTotal, positions } from '@/common/holdem.js'

// dense：展示区比较矮（小屏手机）时，公共牌和出分柱缩小、不单独显示结果那一行（输赢看头像下面的数字）
const props = defineProps({ table: { type: Object, required: true }, me: { type: String, default: '' }, blinds: { type: Object, default: () => ({ sb: 0, bb: 0 }) }, dense: { type: Boolean, default: false } })
const emit = defineEmits(['leave'])
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const SUIT = { s: '♠\uFE0E', h: '♥\uFE0E', d: '♦\uFE0E', c: '♣\uFE0E' }
const rankOf = (c) => RANK_TEXT[c.r]
const suitOf = (c) => SUIT[c.s]
const colorOf = (c) => (c.s === 'h' || c.s === 'd' ? '#D0302B' : '#141414')
const hand = computed(() => props.table.hand)
const board = computed(() => (hand.value ? hand.value.board : []))
const pot = computed(() => potTotal(hand.value))
const pos = computed(() => positions(props.table))
const resultLine = computed(() => {
  const h = hand.value
  if (!h) return '等待开局'
  if (h.street !== 'done') return { preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌' }[h.street]
  if (!h.result) return '这一手已中止'
  const w = h.result.pots.flatMap((p) => p.winners)
  const names = [...new Set(w)].map((i) => props.table.seats[i] && props.table.seats[i].name).filter(Boolean)
  const win = Object.values(h.result.won).reduce((a, b) => a + b, 0)
  const how = h.result.showdown && w.length ? '，' + (h.result.hands[w[0]] || {}).name : '（其他人弃牌）'
  return `${names.join('、')} 赢得 ${fmt(win)} 分${how}`
})
const cols = computed(() => {
  const h = hand.value
  const maxC = h ? Math.max(1, ...h.order.map((i) => h.players[i].committed)) : 1
  return props.table.seats.map((seat, i) => {
    const p = h && h.players[i]
    const done = h && h.street === 'done' && h.result
    const delta = done ? h.result.delta[i] : 0
    const committed = p ? p.committed : 0
    let chip = ''
    if (done && p) chip = (delta > 0 ? '+' : delta < 0 ? '−' : '') + fmt(Math.abs(delta))
    else if (committed) chip = '−' + fmt(committed)
    return {
      i, seat, me: seat && seat.pid === props.me, pos: pos.value[i] || '',
      committed, barH: Math.max(8, Math.round((committed / maxC) * 100)),
      folded: !!(p && p.folded), turn: !!(h && h.street !== 'done' && h.toAct === i),
      chip: chip === '0' ? '' : chip, chipUp: done && delta > 0, lastAct: p ? p.last : ''
    }
  })
})
</script>

<style>
.zht { padding: 8px 6px 2px; }
.zht-head { display: flex; align-items: baseline; padding: 0 4px; }
.zht-name { font-size: 14px; font-weight: 700; color: #F3EEE6; }
.zht-sub { margin-left: 8px; flex: 1; min-width: 0; font-size: 12px; color: #A9AEB8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zht-leave { height: 26px; padding: 0 12px; border-radius: 14px; background: #2C2F36; display: flex; align-items: center; }
.zht-leave-t { font-size: 12px; color: #F3EEE6; }
.zht-press { opacity: .7; }
.zht-board { margin-top: 6px; display: flex; justify-content: center; }
.zht-bc { width: 34px; height: 46px; margin: 0 3px; border-radius: 5px; background: #F2F1EC; display: flex; flex-direction: column; align-items: flex-start; padding: 3px 4px; box-sizing: border-box; animation: zht-bc-in 280ms cubic-bezier(.2, .8, .2, 1); }
@keyframes zht-bc-in { from { transform: translateY(-10px) rotate(-6deg); opacity: 0; } to { transform: none; opacity: 1; } }
.zht-bc-back { background: #A8251D; animation: none; }
.zht-bc-r { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 15px; line-height: 1; }
.zht-bc-s { margin-top: 4px; align-self: center; font-size: 15px; line-height: 1; }
.zht-pot { margin-top: 4px; display: flex; align-items: baseline; justify-content: center; }
.zht-pot-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 20px; color: #F3EEE6; }
.zht-pot-k { margin-left: 4px; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 17px; color: #F3EEE6; }
.zht-res { display: block; margin-top: 0; text-align: center; font-size: 11px; color: #C9CDD4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zht-dash { margin: 4px 4px 0; border-top: 1px dashed #5A5E66; }
.zht-cols { display: flex; }
.zht-col { flex: 1; min-width: 0; padding-top: 4px; display: flex; flex-direction: column; align-items: center; border-radius: 6px; }
.zht-col-turn { background: linear-gradient(180deg, rgba(183, 210, 138, 0), rgba(183, 210, 138, .16)); }
.zht-col-fold { opacity: .45; }
.zht-bar-w { width: 60%; height: 38px; display: flex; align-items: flex-end; justify-content: center; }
.zht-bar { width: 100%; background: #B7D28A; border-radius: 2px 2px 0 0; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: height 240ms ease; }
.zht-bar-dim { background: #5B6B44; }
.zht-bar-t { font-size: 9px; color: #3F4A2A; writing-mode: vertical-rl; white-space: nowrap; }
.zht-lab { margin-top: 3px; height: 40px; display: flex; flex-direction: row-reverse; align-items: flex-end; justify-content: center; }
.zht-lab-n { font-size: 10px; color: #C9CDD4; writing-mode: vertical-rl; white-space: nowrap; overflow: hidden; max-height: 40px; }
.zht-lab-p { margin-right: 1px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 13px; color: #F3EEE6; writing-mode: vertical-rl; }
.zht-lab-empty { color: #6E737C; }
.zht-av { margin-top: 3px; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; box-sizing: border-box; }
.zht-av-me { box-shadow: 0 0 0 2px #5865F2; }
.zht-av-turn { box-shadow: 0 0 0 2px #3FCF84, 0 0 10px rgba(63, 207, 132, .55); animation: zht-av-pulse 1.4s ease-in-out infinite; }
@keyframes zht-av-pulse { 50% { box-shadow: 0 0 0 2px #3FCF84, 0 0 2px rgba(63, 207, 132, .2); } }
.zht-av-empty { border: 1px dashed #4B4F58; background: transparent; }
.zht-chip { margin-top: 3px; min-width: 28px; height: 14px; padding: 0 2px; box-sizing: border-box; border-radius: 7px; font-size: 9px; line-height: 14px; text-align: center; color: #FFFFFF; white-space: nowrap; }
.zht-chip-down { background: #B3261E; }
.zht-chip-up { background: #3E8E2F; }
.zht-chip-none { background: transparent; color: #A9AEB8; }
.zht-dense .zht-bc { width: 28px; height: 38px; padding: 2px 3px; }
.zht-dense .zht-bc-r { font-size: 13px; }
.zht-dense .zht-bc-s { margin-top: 2px; font-size: 13px; }
.zht-dense .zht-res { display: none; }
.zht-dense .zht-bar-w { height: 30px; }
</style>
