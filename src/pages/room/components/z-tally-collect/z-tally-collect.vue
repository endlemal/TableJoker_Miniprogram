<template>
  <view class="ztc">
    <view class="ztc-head"><text class="ztc-label">{{ due ? '待收' : mySeat < 0 ? 'OB · 收分中' : '等待收分' }}</text><text v-if="due" class="ztc-total">+{{ fmt(due) }}</text><text v-if="due && turnLeft > 0" class="ztc-time">{{ turnLeft }}s</text></view>
    <scroll-view v-if="mine.length" scroll-x :show-scrollbar="false" class="ztc-scroll">
      <view class="ztc-buttons"><view v-for="p in mine" :key="p.k" class="ztc-button" role="button" hover-class="ztc-press" @tap="emit('collect', p.k)"><text class="ztc-btn-label">收{{ p.k ? '边池 ' + p.k : '主池' }}</text><text class="ztc-value">+{{ fmt(p.amount) }}</text></view></view>
    </scroll-view>
    <text v-else class="ztc-wait">{{ waiting || '收分完成' }}</text>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import { fmt } from '@/common/format.js'
const props = defineProps({ table: { type: Object, required: true }, mySeat: { type: Number, default: -1 }, turnLeft: { type: Number, default: 0 } })
const emit = defineEmits(['collect'])
const pots = computed(() => props.table.hand?.pots || [])
const mine = computed(() => pots.value.flatMap((p, k) => p.shares?.[props.mySeat] && !p.taken[props.mySeat] ? [{ k, amount: p.shares[props.mySeat] }] : []))
const due = computed(() => mine.value.reduce((s, p) => s + p.amount, 0))
const waiting = computed(() => {
  const names = [...new Set(pots.value.flatMap((p) => (p.winners || []).filter((i) => !p.taken[i]).map((i) => props.table.hand.seatRef[i]?.name || '玩家')))]
  return names.length ? '待 ' + names.join('、') + ' 收分' : ''
})
</script>
<style>
.ztc { margin-top: 8px; padding: 10px 12px; border-radius: 16px; background: #24272E; }
.ztc-head { display: flex; align-items: baseline; min-height: 22px; }
.ztc-label { font-size: 13px; color: #C9CDD4; }
.ztc-total { margin-left: 8px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 20px; color: #3FCF84; }
.ztc-time { margin-left: auto; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 18px; color: #3FCF84; }
.ztc-scroll { margin-top: 10px; white-space: nowrap; font-size: 12px; line-height: 1; }
.ztc-buttons { display: flex; min-width: 100%; }
.ztc-button { flex: 1 0 100px; height: 44px; margin-right: 8px; border-radius: 12px; background: #3FCF84; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #0D2016; }
.ztc-button:last-child { margin-right: 0; }
.ztc-btn-label { font-size: 13px; line-height: 18px; font-weight: 600; }
.ztc-value { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 14px; line-height: 16px; }
.ztc-wait { display: block; margin-top: 6px; font-size: 12px; line-height: 18px; color: #A9AEB8; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ztc-press { opacity: .75; }
</style>
