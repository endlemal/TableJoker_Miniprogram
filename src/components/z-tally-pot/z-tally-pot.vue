<template>
  <!-- 桌面分紧接玩法面板：出分时实时显示主池 / 边池；出分结束后主持人给每个池指定赢家（平手多选），
       赢家各自收分，池里的分倒数到 0 后消失 -->
  <view class="ztp">
    <view class="ztp-head">
      <text class="ztp-k">桌面分</text>
      <view class="ztp-v"><z-count :value="total" :duration="900" /></view>
      <scroll-view v-if="breakdown.length" scroll-x :show-scrollbar="false" class="ztp-live-scroll">
        <view class="ztp-live">
          <view v-for="(p, k) in breakdown" :key="p.kind + k" class="ztp-live-chip" :class="{ 'ztp-live-pending': p.kind === 'pending' }" @tap="explainPot(p, k)">
            <text class="ztp-live-k">{{ p.kind === 'pending' ? '待跟' : potName(k) }}</text>
            <text class="ztp-live-v">{{ fmt(p.amount) }}</text>
          </view>
        </view>
      </scroll-view>
      <text v-else class="ztp-stage" :class="'ztp-stage-' + stage">{{ stageText }}</text>
    </view>
    <text v-if="stage === 'bet'" class="ztp-line">{{ stageText }} · 跟至 {{ fmt(hand.currentBet) }} · 本轮 {{ fmt(roundTotal) }}</text>
    <block v-else-if="stage === 'collect' || stage === 'payout'">
      <!-- 池多、人多时在这里面滚动，给玩家行和弹幕保留空间 -->
      <scroll-view scroll-y class="ztp-pots" :style="'max-height:' + maxPots + 'px'">
      <view v-for="(p, k) in pots" :key="k" class="ztp-pot" :class="{ 'ztp-pot-gone': stage === 'payout' && p.left === 0 }">
        <view class="ztp-pot-top">
          <text class="ztp-pot-n">{{ potName(k) }}</text>
          <view class="ztp-pot-v"><z-count :value="stage === 'payout' ? p.left : p.amount" :duration="900" /></view>
          <text class="ztp-pot-s">{{ potState(p, k) }}</text>
        </view>
        <view class="ztp-chips">
          <view v-for="i in (stage === 'collect' ? p.elig : p.winners)" :key="i" class="ztp-chip" :class="chipClass(p, k, i)" hover-class="ztp-press" @tap="tapChip(p, k, i)">
            <view class="ztp-av" :style="'background:' + seat(i).bg + ';color:' + seat(i).fg"><text>{{ seat(i).c }}</text></view>
            <text class="ztp-cn">{{ seat(i).name }}</text>
            <text v-if="stage === 'payout'" class="ztp-cs">{{ p.taken[i] ? '已收' : '+' + fmt(p.shares[i]) }}</text>
          </view>
        </view>
        <view v-if="stage === 'payout' && p.shares[mySeat] && !p.taken[mySeat]" class="ztp-collect" hover-class="ztp-press" @tap="emit('collect', k)">
          <text class="ztp-collect-t">收分 +{{ fmt(p.shares[mySeat]) }}</text>
        </view>
      </view>
      </scroll-view>
      <view class="ztp-foot">
        <block v-if="stage === 'collect'">
          <view v-if="isHost" class="ztp-btn" :class="{ 'ztp-btn-off': !ready }" hover-class="ztp-press" @tap="ready && emit('designate')"><text class="ztp-btn-t">确认赢家</text></view>
          <text v-else class="ztp-wait">待主持人定胜</text>
        </block>
        <text v-else class="ztp-wait">{{ waitPayout }}</text>
        <text class="ztp-timer" :class="{ 'ztp-timer-hot': turnLeft <= 5 }">{{ turnLeft }}s</text>
      </view>
    </block>
    <text v-else-if="stage === 'done'" class="ztp-line">{{ resultText }}</text>
    <text v-else class="ztp-line">至少2人有分可开局</text>
  </view>
</template>

<script setup>
// 数据来自 common/tally-room.js：table（牌桌）、mySeat（自己的座位）、isHost（是不是主持人）、picks（主持人正在指定的赢家）
import { computed } from 'vue'
import ZCount from '@/components/z-count/z-count.vue'
import { potTotal, livePots, ROUND_NAME } from '@/common/tally.js'

const props = defineProps({
  table: { type: Object, required: true },
  mySeat: { type: Number, default: -1 },
  isHost: { type: Boolean, default: false },
  picks: { type: Object, default: () => ({}) },
  turnLeft: { type: Number, default: 0 },
  maxPots: { type: Number, default: 200 } // 池列表最多多高（px），超出在里面滚动
})
const emit = defineEmits(['pick', 'designate', 'collect'])
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const hand = computed(() => props.table.hand || {})
const stage = computed(() => {
  const st = hand.value.street
  if (!st) return 'idle'
  if (['preflop', 'flop', 'turn', 'river'].includes(st)) return 'bet'
  return st // collect / payout / done
})
const stageText = computed(() => (stage.value === 'idle' ? '待开' : ROUND_NAME[hand.value.street]))
const pots = computed(() => hand.value.pots || [])
const breakdown = computed(() => stage.value === 'bet' ? livePots(hand.value) : [])
const total = computed(() => {
  if (stage.value === 'bet') return potTotal(hand.value)
  if (stage.value === 'collect') return pots.value.reduce((a, p) => a + p.amount, 0)
  if (stage.value === 'payout') return pots.value.reduce((a, p) => a + p.left, 0)
  return 0
})
const roundTotal = computed(() => (hand.value.order || []).reduce((a, i) => a + hand.value.players[i].bet, 0))
const seat = (i) => props.table.seats[i] || { name: '已离座', c: '?', bg: '#33363E', fg: '#A9AEB8' }
const potName = (k) => (k === 0 ? '主池' : '边池 ' + k)
function explainPot(p, k) {
  const title = p.kind === 'pending' ? '尚未被跟注的超额，跟注后计入对应牌池' : `${potName(k)} · ${fmt(p.amount)}，随本手累计投入更新`
  uni.showToast({ title, icon: 'none', duration: 2400 })
}
function potState(p, k) {
  if (stage.value === 'payout') return p.left === 0 ? '已收' : '待收'
  if (p.winners) return '已定 · ' + seat(p.winners[0]).name
  const n = (props.picks[k] || []).length
  return n ? `已选${n}人${n > 1 ? ' · 平分' : ''}` : props.isHost ? '选赢家 · 可多选' : '待定'
}
function chipClass(p, k, i) {
  if (stage.value === 'payout') return p.taken[i] ? 'ztp-chip-done' : 'ztp-chip-win'
  if (p.winners) return 'ztp-chip-win'
  return (props.picks[k] || []).includes(i) ? 'ztp-chip-on' : ''
}
function tapChip(p, k, i) {
  if (stage.value !== 'collect' || p.winners || !props.isHost) return
  emit('pick', k, i)
}
const ready = computed(() => pots.value.every((p, k) => p.winners || (props.picks[k] || []).length))
const waitPayout = computed(() => {
  const mine = pots.value.some((p) => p.shares && p.shares[props.mySeat] && !p.taken[props.mySeat])
  return mine ? '待收 · 点击收分' : '等待收分'
})
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
.ztp-live-pending { background: #33363E; }
.ztp-live-pending .ztp-live-v { color: #C9CDD4; }
.ztp-stage { flex: none; margin-left: auto; padding: 2px 8px; border-radius: 10px; background: #33363E; font-size: 12px; color: #C9CDD4; }
.ztp-stage-collect { background: #FFC53A; color: #181A20; font-weight: 700; }
.ztp-stage-payout { background: #3FCF84; color: #0D2016; font-weight: 700; }
.ztp-line { display: block; margin-top: 6px; font-size: 12px; line-height: 1.5; color: #A9AEB8; }
.ztp-pots { margin-top: 2px; }
.ztp-pot { margin-top: 6px; padding: 8px; border-radius: 12px; background: #1B1D22; transition: opacity 400ms ease, transform 400ms ease; }
.ztp-pot-gone { opacity: 0; transform: scale(.94); }
.ztp-pot-top { display: flex; align-items: baseline; }
.ztp-pot-n { font-size: 13px; font-weight: 700; color: #F3EEE6; }
.ztp-pot-v { margin-left: 6px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 18px; color: #FFD27A; }
.ztp-pot-s { margin-left: auto; font-size: 11px; color: #A9AEB8; }
.ztp-chips { margin-top: 6px; display: flex; flex-wrap: wrap; }
.ztp-chip { height: 28px; margin: 0 6px 6px 0; padding: 0 8px 0 3px; border-radius: 14px; background: #2C2F36; box-shadow: inset 0 0 0 1px transparent; display: flex; align-items: center; }
.ztp-chip-on { background: rgba(88, 101, 242, .25); box-shadow: inset 0 0 0 2px #5865F2; }
.ztp-chip-win { background: rgba(255, 197, 58, .16); box-shadow: inset 0 0 0 1px #FFC53A; }
.ztp-chip-done { opacity: .5; }
.ztp-av { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
.ztp-cn { margin-left: 4px; font-size: 12px; color: #F3EEE6; }
.ztp-cs { margin-left: 4px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 12px; color: #FFD27A; }
.ztp-collect { margin-top: 2px; height: 36px; border-radius: 10px; background: #3FCF84; display: flex; align-items: center; justify-content: center; }
.ztp-collect-t { font-size: 14px; font-weight: 700; color: #0D2016; }
.ztp-foot { margin-top: 8px; display: flex; align-items: center; }
.ztp-btn { flex: 1; height: 40px; border-radius: 12px; background: #5865F2; display: flex; align-items: center; justify-content: center; }
.ztp-btn-off { background: #3A3E48; }
.ztp-btn-off .ztp-btn-t { color: #A9AEB8; }
.ztp-btn-t { font-size: 14px; font-weight: 700; color: #FFFFFF; }
.ztp-wait { flex: 1; font-size: 12px; color: #C9CDD4; }
.ztp-timer { margin-left: 10px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 16px; color: #3FCF84; }
.ztp-timer-hot { color: #FFC53A; }
.ztp-press { opacity: .75; }
</style>
