<template>
  <!-- 记分桌：玩家纵向排列；弃牌的人从列表里收起，剩下的人放大；右上角「排行」看累计资产 -->
  <view class="ztt">
    <view class="ztt-head">
      <text class="ztt-name">{{ table.name }}</text>
      <text class="ztt-sub">{{ table.size }} 人桌 · 第 {{ table.handNo }} 手 · 盲注 {{ fmt(blinds.sb) }}/{{ fmt(blinds.bb) }}</text>
      <view class="ztt-ic" :class="{ 'ztt-ic-on': view === 'rank' }" hover-class="ztt-press" @tap="view = view === 'rank' ? 'table' : 'rank'">
        <z-icon :name="view === 'rank' ? 'x' : 'chart-bar-popular'" :size="16" color="#F3EEE6" /><text class="ztt-ic-t">{{ view === 'rank' ? '返回' : '排行' }}</text>
      </view>
      <view class="ztt-leave" hover-class="ztt-press" @tap="emit('leave')"><text class="ztt-leave-t">离桌</text></view>
    </view>

    <z-tally-rank v-if="view === 'rank'" :members="members" :assets="assets" :start="start" :me="me" :highlight="seatedNames" />

    <block v-else>
      <view class="ztt-pot">
        <text class="ztt-pot-v">{{ fmt(pot) }}</text><text class="ztt-pot-k">桌面分</text>
        <text class="ztt-round" :class="{ 'ztt-round-hot': collecting }">{{ roundText }}</text>
      </view>
      <view class="ztt-list" :style="'height:' + listH + 'px'">
        <view v-for="r in rows" :key="r.i" class="ztt-row" :class="{ 'ztt-turn': r.turn, 'ztt-me': r.me, 'ztt-sel': r.sel, 'ztt-dim': r.dim, 'ztt-row-s': rowH < 42 }" :style="'height:' + (r.hidden ? 0 : rowH) + 'px;opacity:' + (r.hidden ? 0 : 1)" @tap="onRow(r)">
          <view class="ztt-av" :style="'width:' + avSize + 'px;height:' + avSize + 'px;font-size:' + Math.round(avSize * 0.42) + 'px;background:' + r.s.bg + ';color:' + r.s.fg"><text>{{ r.s.c }}</text></view>
          <view class="ztt-main">
            <view class="ztt-top">
              <text class="ztt-n" :style="'font-size:' + nameSize + 'px'">{{ r.s.name }}</text>
              <text v-if="r.pos" class="ztt-pos">{{ r.pos }}</text>
              <text v-if="r.last" class="ztt-last">{{ r.last }}</text>
            </view>
            <view class="ztt-bar-w"><view class="ztt-bar" :style="'width:' + r.barW + '%'"></view><text class="ztt-bar-t">{{ r.committed ? '出 ' + fmt(r.committed) + ' 分' : '' }}</text></view>
          </view>
          <view class="ztt-side">
            <view v-if="r.pickable" class="ztt-ck" :class="{ 'ztt-ck-on': r.sel }"><z-icon v-if="r.sel" name="check" :size="14" :stroke="3.4" color="#FFFFFF" /></view>
            <text v-else-if="r.chip" class="ztt-chip" :class="r.up ? 'ztt-chip-up' : 'ztt-chip-down'">{{ r.chip }}</text>
            <text class="ztt-stack">{{ fmt(r.s.stack) }}</text>
          </view>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
// 一张记分桌的实时视图（没有扑克牌）：桌面分、这一轮、每人本手的出分。
// 列表里只放这一手还在的人（弃牌的收起，剩下的人按可用高度放大）；这一手结束后大家都回来，显示输赢。
// 收分时，有资格的人可以点选（emit('pick', 座位号)）。数据来自 common/tally-room.js
import { ref, computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTallyRank from '@/components/z-tally-rank/z-tally-rank.vue'
import { potTotal, positions, ROUND_NAME } from '@/common/tally.js'

const props = defineProps({
  table: { type: Object, required: true },
  me: { type: String, default: '' },
  blinds: { type: Object, default: () => ({ sb: 0, bb: 0 }) },
  height: { type: Number, default: 260 }, // 这一页能用的高度（px）
  pickPot: { type: Object, default: null }, // 收分时正在选的池 { pot: { amount, elig }, no, total }
  pickSel: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  assets: { type: Object, default: () => ({}) },
  start: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['leave', 'pick'])
const view = ref('table')
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const hand = computed(() => props.table.hand)
const pot = computed(() => {
  const h = hand.value
  if (!h) return 0
  return h.street === 'done' ? (h.result ? h.result.pots.reduce((a, p) => a + p.amount, 0) : 0) : potTotal(h)
})
const collecting = computed(() => !!(hand.value && hand.value.street === 'collect'))
const pos = computed(() => positions(props.table))
const seatedNames = computed(() => props.table.seats.filter(Boolean).map((s) => s.name))
const roundText = computed(() => {
  const h = hand.value
  if (!h) return '等待开局'
  if (h.street === 'collect') {
    if (!props.pickPot) return '收分中'
    if (props.pickPot.total <= 1) return '收分：选赢家'
    return `收分：${props.pickPot.no === 0 ? '主池' : '边池 ' + props.pickPot.no} ${fmt(props.pickPot.pot.amount)}（${props.pickPot.no + 1}/${props.pickPot.total}）`
  }
  if (h.street === 'done') {
    if (!h.result) return '这一手已中止'
    const names = [...new Set(h.result.pots.flatMap((p) => p.winners))].map((i) => props.table.seats[i] && props.table.seats[i].name).filter(Boolean)
    return names.join('、') + ' 收分'
  }
  return ROUND_NAME[h.street]
})
const rows = computed(() => {
  const h = hand.value
  const maxC = h ? Math.max(1, ...h.order.map((i) => h.players[i].committed)) : 1
  const pickElig = collecting.value && props.pickPot ? props.pickPot.pot.elig : []
  return props.table.seats.map((s, i) => ({ s, i })).filter((x) => x.s).map(({ s, i }) => {
    const p = h && h.players[i]
    const done = !!(h && h.street === 'done')
    // 这一手进行中：弃牌的人收起；刚入座、这一手没参加的人也先收起
    const hidden = !!(h && !done && (!p || p.folded))
    const delta = done && h.result && p ? h.result.delta[i] : 0
    return {
      i, s, me: s.pid === props.me, pos: (h && !done && pos.value[i]) || '', last: p && !done ? p.last : '',
      committed: p ? p.committed : 0, barW: p && p.committed ? Math.max(6, Math.round((p.committed / maxC) * 100)) : 0,
      turn: !!(h && h.toAct === i && !done && !collecting.value), hidden,
      dim: (done && p && p.folded) || (collecting.value && !pickElig.includes(i)),
      pickable: pickElig.includes(i), sel: props.pickSel.includes(i),
      chip: done && p && delta ? (delta > 0 ? '+' : '−') + fmt(Math.abs(delta)) : '', up: delta > 0
    }
  })
})
// 行高：可用高度按留在列表里的人数平分（30 到 80px），有人弃牌收起后，剩下的人跟着变大；低于 42px 时一行显示（出分条在名字右边）
const HEAD = 30
const POT = 34
const listH = computed(() => Math.max(60, props.height - HEAD - POT - 4))
const shownCount = computed(() => Math.max(1, rows.value.filter((r) => !r.hidden).length))
const rowH = computed(() => Math.max(30, Math.min(80, Math.floor(listH.value / shownCount.value))))
const avSize = computed(() => Math.max(22, Math.min(48, rowH.value - 12)))
const nameSize = computed(() => Math.round(Math.max(12, Math.min(18, 12 + ((rowH.value - 30) / 50) * 6))))
function onRow(r) { if (r.pickable) emit('pick', r.i) }
</script>

<style>
.ztt { padding: 6px 10px 2px; }
.ztt-head { height: 30px; display: flex; align-items: center; }
.ztt-name { font-size: 15px; font-weight: 700; color: #F3EEE6; }
.ztt-sub { margin-left: 8px; flex: 1; min-width: 0; font-size: 12px; color: #A9AEB8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ztt-ic { height: 26px; margin-left: 6px; padding: 0 10px; border-radius: 14px; background: #2C2F36; display: flex; align-items: center; }
.ztt-ic-on { background: #5865F2; }
.ztt-ic-t { margin-left: 4px; font-size: 12px; color: #F3EEE6; }
.ztt-leave { height: 26px; margin-left: 6px; padding: 0 10px; border-radius: 14px; background: #2C2F36; display: flex; align-items: center; }
.ztt-leave-t { font-size: 12px; color: #F3EEE6; }
.ztt-press { opacity: .7; }
.ztt-pot { height: 34px; display: flex; align-items: baseline; }
.ztt-pot-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 24px; line-height: 34px; color: #F3EEE6; }
.ztt-pot-k { margin-left: 4px; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 16px; color: #F3EEE6; }
.ztt-round { margin-left: auto; font-size: 13px; color: #C9CDD4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%; }
.ztt-round-hot { color: #FFC53A; font-weight: 600; }
.ztt-list { overflow-y: auto; }
.ztt-row { margin-bottom: 0; padding: 0 8px; box-sizing: border-box; border-radius: 12px; overflow: hidden; display: flex; align-items: center; transition: height 260ms cubic-bezier(.2, .8, .2, 1), opacity 220ms ease, background 200ms ease; }
.ztt-turn { background: rgba(63, 207, 132, .12); }
.ztt-me .ztt-n { color: #8EA1FF; }
.ztt-sel { background: rgba(88, 101, 242, .2); }
.ztt-dim { opacity: .45 !important; }
.ztt-av { flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; transition: width 260ms ease, height 260ms ease; }
.ztt-turn .ztt-av { box-shadow: 0 0 0 2px #3FCF84, 0 0 10px rgba(63, 207, 132, .5); }
.ztt-main { flex: 1; min-width: 0; margin-left: 10px; display: flex; flex-direction: column; justify-content: center; }
.ztt-top { display: flex; align-items: center; }
.ztt-n { font-weight: 600; color: #F3EEE6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: font-size 260ms ease; }
.ztt-pos { margin-left: 6px; flex: none; padding: 0 4px; border-radius: 4px; background: #2C2F36; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 11px; line-height: 16px; color: #C9CDD4; }
.ztt-last { margin-left: 6px; flex: none; font-size: 11px; color: #A9AEB8; }
.ztt-bar-w { position: relative; margin-top: 4px; height: 14px; border-radius: 3px; background: #1B1D22; overflow: hidden; }
.ztt-bar { height: 100%; border-radius: 3px; background: #B7D28A; transition: width 260ms ease; }
.ztt-bar-t { position: absolute; left: 6px; top: 0; font-size: 10px; line-height: 14px; color: #1B2410; }
.ztt-side { margin-left: 10px; min-width: 64px; display: flex; flex-direction: column; align-items: flex-end; }
.ztt-stack { margin-top: 2px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 13px; color: #C9CDD4; }
.ztt-chip { height: 18px; padding: 0 6px; border-radius: 9px; font-size: 11px; line-height: 18px; color: #FFFFFF; }
.ztt-chip-down { background: #B3261E; }
.ztt-chip-up { background: #3E8E2F; }
.ztt-ck { width: 24px; height: 24px; box-sizing: border-box; border-radius: 50%; border: 2px solid #C9CDD4; display: flex; align-items: center; justify-content: center; }
.ztt-ck-on { border-color: #5865F2; background: #5865F2; }
/* 行比较矮（人多）时一行显示：名字、位置，出分条在右边，记分在最右 */
.ztt-row-s .ztt-main { flex-direction: row; align-items: center; }
.ztt-row-s .ztt-top { flex: none; max-width: 44%; }
.ztt-row-s .ztt-last { display: none; }
.ztt-row-s .ztt-bar-w { flex: 1; margin: 0 0 0 8px; height: 10px; }
.ztt-row-s .ztt-bar-t { display: none; }
.ztt-row-s .ztt-side { flex-direction: row-reverse; align-items: center; min-width: 0; }
.ztt-row-s .ztt-stack { margin: 0; }
.ztt-row-s .ztt-chip, .ztt-row-s .ztt-ck { margin-left: 6px; }
</style>
