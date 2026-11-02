<template>
  <view class="ztw">
    <view class="ztw-head"><text class="ztw-title">确认赢家</text><text class="ztw-hint">平手可多选</text><text class="ztw-time">{{ turnLeft }}s</text></view>
    <scroll-view scroll-y class="ztw-scroll">
      <view v-for="(p, k) in pots" :key="k" class="ztw-pot">
        <view class="ztw-top"><text class="ztw-name">{{ k ? '边池 ' + k : '主池' }}</text><text class="ztw-amount">{{ fmt(p.amount) }}</text><text class="ztw-state">{{ p.winners ? '已定' : (picks[k] || []).length ? '已选 ' + picks[k].length + ' 人' : '请选择' }}</text></view>
        <view class="ztw-players">
          <view v-for="i in p.elig" :key="i" class="ztw-player" :class="{ 'ztw-selected': selected(p, k, i), 'ztw-fixed': !!p.winners }" role="button" :aria-label="seat(i).name" :aria-pressed="selected(p, k, i)" hover-class="ztw-press" @tap="!p.winners && emit('pick', k, i)">
            <view class="ztw-avatar" :style="'background:' + seat(i).bg + ';color:' + seat(i).fg">{{ seat(i).c }}</view><text>{{ seat(i).name }}</text><text v-if="selected(p, k, i)" class="ztw-check">✓</text>
          </view>
        </view>
      </view>
    </scroll-view>
    <view class="ztw-footer"><view class="ztw-confirm" :class="{ 'ztw-disabled': !ready }" role="button" :aria-disabled="!ready" hover-class="ztw-press" @tap="ready && emit('designate')">确认赢家</view></view>
  </view>
</template>
<script setup>
import { computed } from 'vue'
defineOptions({ options: { virtualHost: true } })
const props = defineProps({ table: { type: Object, required: true }, picks: { type: Object, default: () => ({}) }, turnLeft: { type: Number, default: 0 } })
const emit = defineEmits(['pick', 'designate'])
const pots = computed(() => props.table.hand?.pots || [])
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const seat = (i) => props.table.hand?.seatRef[i] || props.table.seats[i] || { name: '已离座', c: '?', bg: '#33363E', fg: '#A9AEB8' }
const selected = (p, k, i) => (p.winners || props.picks[k] || []).includes(i)
const ready = computed(() => pots.value.length > 0 && pots.value.every((p, k) => p.winners || (props.picks[k] || []).length))
</script>
<style>
.ztw { height: 100%; min-height: 0; box-sizing: border-box; padding: 12px; border-radius: 16px; background: #24272E; display: flex; flex-direction: column; animation: ztw-in 220ms ease-out; }
.ztw-head { flex: none; height: 28px; display: flex; align-items: center; margin-bottom: 6px; }
.ztw-title { font-size: 16px; font-weight: 700; color: #F3EEE6; }
.ztw-hint { margin-left: 10px; font-size: 12px; color: #A9AEB8; }
.ztw-time { margin-left: auto; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 18px; color: #FFC53A; }
.ztw-scroll { flex: 1; height: 0; min-height: 0; }
.ztw-pot { padding: 12px; margin-bottom: 8px; border-radius: 12px; background: #1B1D22; }
.ztw-top { display: flex; align-items: baseline; }
.ztw-name { font-size: 14px; color: #F3EEE6; font-weight: 600; }
.ztw-amount { margin-left: 8px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 22px; color: #FFD27A; }
.ztw-state { margin-left: auto; font-size: 11px; color: #A9AEB8; }
.ztw-players { display: flex; flex-wrap: wrap; margin-top: 8px; gap: 8px; }
.ztw-player { display: flex; align-items: center; min-height: 36px; padding: 0 10px 0 4px; border-radius: 18px; background: #33363E; font-size: 13px; color: #F3EEE6; box-shadow: inset 0 0 0 1px transparent; }
.ztw-avatar { flex: none; margin-right: 6px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ztw-selected { background: rgba(255,197,58,.12); box-shadow: inset 0 0 0 1px #FFC53A; }
.ztw-check { margin-left: 5px; color: #FFC53A; }
.ztw-fixed { opacity: .75; }
.ztw-footer { flex: none; padding-top: 10px; }
.ztw-confirm { height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #5865F2; color: #FFFFFF; font-size: 15px; font-weight: 600; }
.ztw-disabled { background: #3A3E48; color: #A9AEB8; }
.ztw-press { opacity: .75; }
@keyframes ztw-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
</style>
