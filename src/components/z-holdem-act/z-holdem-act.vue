<template>
  <!-- 决策区：自己的手牌和牌型；轮到自己时是决策栏（弃牌 / 过牌或跟注 / 加注 / 全下），加注时展开出分栏 -->
  <view class="ha">
    <view class="ha-top">
      <view class="ha-cards">
        <view v-for="(c, k) in myCards" :key="k" class="hc"><text class="hc-r" :style="'color:' + colorOf(c)">{{ RANK_TEXT[c.r] }}</text><text class="hc-s" :style="'color:' + colorOf(c)">{{ SUIT[c.s] }}</text></view>
        <view v-if="!myCards.length" class="hc hc-none"></view>
      </view>
      <view class="ha-info">
        <text class="ha-hand">{{ handName || (myCards.length ? '我的手牌' : '等待下一手') }}</text>
        <text class="ha-stack">记分 {{ fmt(stack) }}</text>
      </view>
      <text v-if="opts" class="ha-timer" :class="{ 'ha-timer-hot': turnLeft <= 5 }">{{ turnLeft }} 秒</text>
    </view>
    <!-- 轮到自己 -->
    <block v-if="opts">
      <view v-if="raising" class="ha-raise">
        <view class="ha-raise-top"><text class="ha-raise-k">加注到</text><text class="ha-raise-v">{{ fmt(raiseTo) }}</text><text class="ha-raise-s">分（本轮）</text></view>
        <slider class="ha-slider" :min="opts.minTo" :max="opts.maxTo" :step="step" :value="raiseTo" activeColor="#5865F2" backgroundColor="#3A3E48" block-color="#F3EEE6" :block-size="22" @changing="raiseTo = $event.detail.value" @change="raiseTo = $event.detail.value" />
        <view class="ha-presets">
          <text class="ha-pre" @tap="raiseTo = opts.minTo">最小</text>
          <text class="ha-pre" @tap="raiseTo = clampTo(Math.round(cur + opts.pot / 2))">½ 池</text>
          <text class="ha-pre" @tap="raiseTo = clampTo(cur + opts.pot)">1 池</text>
          <text class="ha-pre" @tap="raiseTo = opts.maxTo">全下</text>
        </view>
        <view class="ha-row">
          <view class="ha-btn ha-ghost" hover-class="ha-press" @tap="raising = false"><text class="ha-btn-t">取消</text></view>
          <view class="ha-btn ha-primary" hover-class="ha-press" @tap="go('raise', raiseTo)"><text class="ha-btn-t">确认出分 {{ fmt(raiseTo) }}</text></view>
        </view>
      </view>
      <view v-else class="ha-row">
        <view class="ha-btn ha-fold" hover-class="ha-press" @tap="go('fold')"><text class="ha-btn-t">弃牌</text></view>
        <view class="ha-btn" hover-class="ha-press" @tap="go(opts.canCheck ? 'check' : 'call')"><text class="ha-btn-t">{{ opts.canCheck ? '过牌' : '跟注 ' + fmt(opts.toCall) }}</text></view>
        <view v-if="opts.canRaise && opts.maxTo > opts.minTo" class="ha-btn" hover-class="ha-press" @tap="openRaise"><text class="ha-btn-t">加注</text></view>
        <view v-if="opts.canRaise || opts.toCall >= opts.stack" class="ha-btn ha-primary" hover-class="ha-press" @tap="go('allin')"><text class="ha-btn-t">全下 {{ fmt(opts.stack) }}</text></view>
      </view>
    </block>
    <text v-else class="ha-wait">{{ waitText }}</text>
  </view>
</template>

<script setup>
// 自己的决策区，在房间页的 dm-area 里。动作通过 emit('act', action, to) 交给 common/holdem-room.js
import { ref, computed, watch } from 'vue'
import { RANK_TEXT, evaluate, options } from '@/common/holdem.js'

const props = defineProps({ table: { type: Object, required: true }, seat: { type: Number, required: true }, turnLeft: { type: Number, default: 0 } })
const emit = defineEmits(['act'])
const SUIT = { s: '♠\uFE0E', h: '♥\uFE0E', d: '♦\uFE0E', c: '♣\uFE0E' }
const colorOf = (c) => (c.s === 'h' || c.s === 'd' ? '#D0302B' : '#141414')
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const hand = computed(() => props.table.hand)
const me = computed(() => (hand.value && hand.value.players[props.seat]) || null)
const myCards = computed(() => (me.value ? me.value.cards : []))
const stack = computed(() => (props.table.seats[props.seat] ? props.table.seats[props.seat].stack : 0))
const handName = computed(() => (me.value && hand.value.board.length >= 3 ? '当前：' + evaluate(me.value.cards.concat(hand.value.board)).name : ''))
const opts = computed(() => (hand.value ? options(props.table, props.seat) : null))
const cur = computed(() => (hand.value ? hand.value.currentBet : 0))
const step = computed(() => Math.max(1, Math.round(((hand.value && hand.value.blinds.bb) || 100) / 2)))
const raising = ref(false)
const raiseTo = ref(0)
const clampTo = (v) => (opts.value ? Math.max(opts.value.minTo, Math.min(opts.value.maxTo, v)) : v)
function openRaise() { raiseTo.value = opts.value.minTo; raising.value = true }
watch(opts, (o) => { if (!o) raising.value = false })
function go(action, to) { raising.value = false; emit('act', action, to) }
const waitText = computed(() => {
  const h = hand.value
  if (!h) return '等待开局（至少两人入座）'
  if (h.street === 'done') return '这一手结束了，马上开下一手'
  if (me.value && me.value.folded) return '你已弃牌，等待下一手'
  if (me.value && me.value.allIn) return '你已全下，等待发完公共牌'
  const s = props.table.seats[h.toAct]
  return s ? `等待 ${s.name} 行动…` : ''
})
</script>

<style>
.ha { margin-top: 8px; padding: 10px 12px; border-radius: 16px; background: #24272E; }
.ha-top { display: flex; align-items: center; }
.ha-cards { display: flex; }
.hc { width: 32px; height: 44px; margin-right: 4px; border-radius: 5px; background: #F2F1EC; padding: 3px 4px; box-sizing: border-box; display: flex; flex-direction: column; }
.hc-none { background: #3A3E48; }
.hc-r { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 14px; line-height: 1; }
.hc-s { margin-top: 4px; align-self: center; font-size: 14px; line-height: 1; }
.ha-info { flex: 1; min-width: 0; margin-left: 8px; display: flex; flex-direction: column; }
.ha-hand { font-size: 14px; font-weight: 600; color: #F3EEE6; }
.ha-stack { margin-top: 2px; font-size: 12px; color: #A9AEB8; }
.ha-timer { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 18px; color: #3FCF84; }
.ha-timer-hot { color: #FFC53A; }
.ha-row { margin-top: 10px; display: flex; }
.ha-btn { flex: 1; height: 44px; margin-left: 8px; border-radius: 12px; background: #3A3E48; display: flex; align-items: center; justify-content: center; }
.ha-btn:first-child { margin-left: 0; }
.ha-btn-t { font-size: 14px; font-weight: 600; color: #F3EEE6; white-space: nowrap; }
.ha-fold { background: #33363E; }
.ha-primary { background: #5865F2; }
.ha-ghost { flex: none; width: 72px; }
.ha-press { opacity: .75; }
.ha-wait { display: block; margin-top: 8px; font-size: 13px; color: #C9CDD4; }
.ha-raise { margin-top: 8px; }
.ha-raise-top { display: flex; align-items: baseline; }
.ha-raise-k { font-size: 13px; color: #C9CDD4; }
.ha-raise-v { margin-left: 6px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 22px; color: #F3EEE6; }
.ha-raise-s { margin-left: 4px; font-size: 12px; color: #A9AEB8; }
.ha-slider { margin: 6px 4px 0; }
.ha-presets { display: flex; }
.ha-pre { flex: 1; height: 32px; margin-right: 6px; border-radius: 8px; background: #3A3E48; text-align: center; line-height: 32px; font-size: 13px; color: #F3EEE6; }
.ha-pre:last-child { margin-right: 0; }
</style>
