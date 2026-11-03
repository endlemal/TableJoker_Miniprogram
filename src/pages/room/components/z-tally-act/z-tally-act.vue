<template>
  <!-- 自己的出分区：记分、本手已出；轮到自己时是决策栏（弃牌 / 过牌或跟注 / 加注 / 全下），加注时展开出分栏 -->
  <view class="zta">
    <view class="zta-top">
      <view class="zta-info"><text class="zta-k">余分</text><text class="zta-v">{{ fmt(stack) }}</text><text v-if="mine" class="zta-s">本手 {{ fmt(mine.committed) }}</text></view>
      <text v-if="opts" class="zta-timer" :class="{ 'zta-timer-hot': turnLeft <= 5 }">{{ turnLeft }}s</text>
    </view>
    <!-- 轮到自己 -->
    <block v-if="opts">
      <view v-if="raising" class="zta-raise">
        <view class="zta-raise-top"><text class="zta-raise-k">加至</text><text class="zta-raise-v">{{ fmt(raiseTo) }}</text><text class="zta-raise-s">本轮总额</text></view>
        <slider class="zta-slider" :min="opts.minTo" :max="opts.maxTo" :step="step" :value="raiseTo" activeColor="#5865F2" backgroundColor="#3A3E48" block-color="#F3EEE6" :block-size="22" @changing="raiseTo = $event.detail.value" @change="raiseTo = $event.detail.value" />
        <view class="zta-presets">
          <text class="zta-pre" @tap="raiseTo = opts.minTo">最小</text>
          <text class="zta-pre" @tap="raiseTo = clampTo(Math.round(cur + opts.pot / 2))">½ 池</text>
          <text class="zta-pre" @tap="raiseTo = clampTo(cur + opts.pot)">1 池</text>
          <text class="zta-pre" @tap="raiseTo = opts.maxTo">全下</text>
        </view>
        <view class="zta-row">
          <view class="zta-btn zta-ghost" hover-class="zta-press" @tap="raising = false"><text class="zta-btn-t">取消</text></view>
          <view class="zta-btn zta-primary" hover-class="zta-press" @tap="go('raise', raiseTo)"><text class="zta-btn-t">加至</text><text class="zta-btn-v">{{ fmt(raiseTo) }}</text></view>
        </view>
      </view>
      <view v-else class="zta-row">
        <view class="zta-btn zta-fold" hover-class="zta-press" @tap="go('fold')"><text class="zta-btn-t">弃牌</text></view>
        <view class="zta-btn" hover-class="zta-press" @tap="go(opts.canCheck ? 'check' : 'call')"><text class="zta-btn-t">{{ opts.canCheck ? '过牌' : '跟注' }}</text><text v-if="!opts.canCheck" class="zta-btn-v">{{ fmt(opts.toCall) }}</text></view>
        <view v-if="opts.canRaise && opts.maxTo > opts.minTo" class="zta-btn" hover-class="zta-press" @tap="openRaise"><text class="zta-btn-t">加注</text></view>
        <view v-if="opts.canRaise || opts.toCall >= opts.stack" class="zta-btn zta-primary" hover-class="zta-press" @tap="go('allin')"><text class="zta-btn-t">全下</text><text class="zta-btn-v">{{ fmt(opts.stack) }}</text></view>
      </view>
    </block>
    <text v-else class="zta-wait">{{ waitText }}</text>
  </view>
</template>

<script setup>
// 自己的出分区，在输入栏上方；收分阶段由同位置的 z-tally-collect 接替。
import { ref, computed, watch } from 'vue'
import { options } from '@/common/tally.js'
import { playerStatus } from '@/common/tally-labels.js'
import { fmt } from '@/common/format.js'

const props = defineProps({
  table: { type: Object, required: true },
  seat: { type: Number, required: true },
  turnLeft: { type: Number, default: 0 }
})
const emit = defineEmits(['act', 'expand'])
const hand = computed(() => props.table.hand)
const mine = computed(() => (hand.value && hand.value.street !== 'done' && hand.value.players[props.seat]) || null)
const stack = computed(() => (props.table.seats[props.seat] ? props.table.seats[props.seat].stack : 0))
const opts = computed(() => (hand.value ? options(props.table, props.seat) : null))
const cur = computed(() => (hand.value ? hand.value.currentBet : 0))
const step = computed(() => Math.max(1, Math.round(((hand.value && hand.value.blinds.bb) || 100) / 2)))
const raising = ref(false)
watch(raising, (v) => emit('expand', v))
const raiseTo = ref(0)
const clampTo = (v) => (opts.value ? Math.max(opts.value.minTo, Math.min(opts.value.maxTo, v)) : v)
function openRaise() { raiseTo.value = opts.value.minTo; raising.value = true }
watch(opts, (o) => { if (!o) raising.value = false })
function go(action, to) { raising.value = false; emit('act', action, to) }
const waitText = computed(() => {
  const h = hand.value
  const s0 = props.table.seats[props.seat]
  if (s0 && playerStatus(h, s0, props.seat).label === '无分') return '无分 · 暂不可入局'
  if (!h) return '待开 · 至少2人有分'
  if (h.street === 'done') return '本手结束 · 待开'
  if (!h.players[props.seat]) return '候场 · 下一手加入'
  if (h.street === 'collect') return '定胜 · 主持人选赢家'
  if (h.street === 'payout') return '收分中'
  if (mine.value && mine.value.folded) return '已弃牌 · 等下手'
  if (mine.value && mine.value.allIn) return '已全下 · 待结算'
  const s = props.table.seats[h.toAct]
  return s ? `${s.name} 行动中` : ''
})
</script>

<style>
.zta { flex: none; margin-top: 8px; padding: 10px 12px; border-radius: 16px; background: #24272E; }
.zta-top { display: flex; align-items: center; }
.zta-info { flex: 1; min-width: 0; display: flex; align-items: baseline; }
.zta-k { font-size: 12px; color: #A9AEB8; }
.zta-v { margin-left: 6px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 18px; color: #F3EEE6; }
.zta-s { margin-left: 10px; font-size: 12px; color: #A9AEB8; }
.zta-timer { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 18px; color: #3FCF84; }
.zta-timer-hot { color: #FFC53A; }
.zta-row { margin-top: 10px; display: flex; }
.zta-btn { flex: 1; min-width: 0; height: 44px; margin-left: 8px; border-radius: 12px; background: #3A3E48; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.zta-btn:first-child { margin-left: 0; }
.zta-btn-t { font-size: 14px; font-weight: 600; color: #F3EEE6; white-space: nowrap; }
.zta-btn-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 12px; line-height: 15px; color: #F3EEE6; white-space: nowrap; }
.zta-fold { background: #33363E; }
.zta-primary { background: #5865F2; }
.zta-off { background: #3A3E48; }
.zta-off .zta-btn-t { color: #A9AEB8; }
.zta-ghost { flex: none; width: 72px; }
.zta-press { opacity: .75; }
.zta-wait { display: block; margin-top: 6px; font-size: 13px; color: #C9CDD4; }
.zta-raise { margin-top: 8px; }
.zta-raise-top { display: flex; align-items: baseline; }
.zta-raise-k { font-size: 13px; color: #C9CDD4; }
.zta-raise-v { margin-left: 6px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 22px; color: #F3EEE6; }
.zta-raise-s { margin-left: 4px; font-size: 12px; color: #A9AEB8; }
.zta-slider { margin: 6px 4px 0; }
.zta-presets { display: flex; }
.zta-pre { flex: 1; height: 32px; margin-right: 6px; border-radius: 8px; background: #3A3E48; text-align: center; line-height: 32px; font-size: 13px; color: #F3EEE6; }
.zta-pre:last-child { margin-right: 0; }
</style>
