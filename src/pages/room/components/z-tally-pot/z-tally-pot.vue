<template>
  <!-- 桌面分紧接玩法面板：出分时实时显示主池 / 边池；确认赢家与收分分别由下方独立面板处理 -->
  <view class="ztp">
    <view class="ztp-head">
      <text class="ztp-k">桌面分</text>
      <view class="ztp-v"><z-count :value="total" :duration="900" /></view>
      <scroll-view v-if="breakdown.length" scroll-x :show-scrollbar="false" class="ztp-live-scroll">
        <view class="ztp-live">
          <view v-for="(p, k) in breakdown" :key="p.kind + k" class="ztp-live-chip" @tap="explainPot(p, k)">
            <text class="ztp-live-k">{{ potName(k) }}</text>
            <text class="ztp-live-v">{{ fmt(p.amount) }}</text>
            <text v-if="p.pending" class="ztp-live-pending">待跟 {{ fmt(p.pending) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    <text v-if="stage === 'bet'" class="ztp-line">跟至 {{ fmt(hand.currentBet) }} · 本轮 {{ fmt(roundTotal) }}</text>
    <text v-else-if="stage === 'collect'" class="ztp-line">待主持人确认赢家</text>
    <text v-else-if="stage === 'payout'" class="ztp-line">收分中 · 剩余 {{ fmt(total) }}</text>
    <text v-else-if="stage === 'done'" class="ztp-line">{{ resultText }}</text>
    <text v-else class="ztp-line">至少2人有分可开局</text>
  </view>
</template>

<script setup>
// 只显示桌面分摘要；定胜、收分由独立组件处理。
import { computed } from 'vue'
import ZCount from '@/pages/room/components/z-count/z-count.vue'
import { potTotal, livePots } from '@/common/tally.js'
import { fmt } from '@/common/format.js'

const props = defineProps({
  table: { type: Object, required: true },
})
const hand = computed(() => props.table.hand || {})
const stage = computed(() => {
  const st = hand.value.street
  if (!st) return 'idle'
  if (['preflop', 'flop', 'turn', 'river'].includes(st)) return 'bet'
  return st // collect / payout / done
})
const pots = computed(() => hand.value.pots || [])
const breakdown = computed(() => stage.value === 'bet' ? livePots(hand.value) : ['collect', 'payout'].includes(stage.value) ? pots.value.map((p, k) => ({ kind: k ? 'side' : 'main', amount: stage.value === 'payout' ? p.left : p.amount })) : [])
const total = computed(() => {
  if (stage.value === 'bet') return potTotal(hand.value)
  if (stage.value === 'collect') return pots.value.reduce((a, p) => a + p.amount, 0)
  if (stage.value === 'payout') return pots.value.reduce((a, p) => a + p.left, 0)
  return 0
})
const roundTotal = computed(() => (hand.value.order || []).reduce((a, i) => a + hand.value.players[i].bet, 0))
const seat = (i) => hand.value.seatRef?.[i] || props.table.seats[i] || { name: '已离座', c: '?', bg: '#33363E', fg: '#A9AEB8' }
const potName = (k) => (k === 0 ? '主池' : '边池 ' + k)
function explainPot(p, k) {
  const title = `${potName(k)} · ${fmt(p.amount)}` + (p.pending ? `，含待跟 ${fmt(p.pending)}；无人跟注的超额结算时退回` : '，随本手累计投入更新')
  uni.showToast({ title, icon: 'none', duration: 2400 })
}
const resultText = computed(() => {
  const r = hand.value.result
  if (!r) return '本手中止'
  const names = Object.keys(r.won).map((i) => seat(Number(i)).name + ' 收分 ' + fmt(r.won[i]))
  return names.join('，')
})
</script>

<style>
.ztp { flex: none; margin-top: 8px; padding: 10px 12px; border-radius: 16px; background: #24272E; font-size: 12px; line-height: 1.4; }
.ztp-head { display: flex; align-items: center; min-width: 0; }
.ztp-k { flex: none; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 14px; color: #F3EEE6; }
.ztp-v { flex: none; margin-left: 8px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 26px; line-height: 1; color: #FFD27A; }
.ztp-live-scroll { flex: 1; width: 0; min-width: 0; margin-left: 12px; white-space: nowrap; font-size: 12px; line-height: 1; }
.ztp-live { display: inline-flex; align-items: center; vertical-align: middle; }
.ztp-live-chip { flex: none; display: flex; align-items: center; margin-right: 6px; padding: 5px 8px; border-radius: 10px; background: rgba(255, 210, 122, .09); }
.ztp-live-chip:last-child { margin-right: 0; }
.ztp-live-k { font-size: 11px; color: #C9CDD4; }
.ztp-live-v { margin-left: 5px; font-family: "BoardNum", sans-serif; font-size: 14px; font-weight: 800; color: #FFD27A; }
.ztp-live-pending { margin-left: 6px; padding-left: 6px; border-left: 1px solid #656053; font-size: 10px; color: #A9AEB8; }
.ztp-line { display: block; margin-top: 6px; font-size: 12px; line-height: 1.5; color: #A9AEB8; }
</style>
