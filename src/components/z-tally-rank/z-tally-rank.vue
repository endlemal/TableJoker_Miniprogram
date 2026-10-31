<template>
  <!-- 排行：累计资产的条形赛马——按资产从高到低，条的长度对应资产；每手结束后条和名次一起动 -->
  <view class="ztr">
    <view class="ztr-head"><text class="ztr-t">排行 · 累计资产</text><text class="ztr-s">每手结束后更新</text></view>
    <view class="ztr-list" :style="'height:' + list.length * ROW + 'px'">
      <view v-for="r in list" :key="r.name" class="ztr-row" :class="{ 'ztr-me': r.name === me, 'ztr-hl': highlight.includes(r.name) }" :style="'transform:translateY(' + r.rank * ROW + 'px)'">
        <text class="ztr-rank" :class="{ 'ztr-rank-top': r.rank < 3 }">{{ r.rank + 1 }}</text>
        <view class="ztr-av" :style="'background:' + r.bg + ';color:' + r.fg"><text>{{ r.c }}</text></view>
        <view class="ztr-main">
          <view class="ztr-bar-w"><view class="ztr-bar" :style="'width:' + r.w + '%;background:' + r.bar"></view><text class="ztr-n">{{ r.name }}</text></view>
        </view>
        <view class="ztr-side"><text class="ztr-v">{{ fmt(r.v) }}</text><text class="ztr-d" :class="r.d > 0 ? 'ztr-up' : r.d < 0 ? 'ztr-down' : ''">{{ r.d > 0 ? '+' : r.d < 0 ? '−' : '' }}{{ r.d ? fmt(Math.abs(r.d)) : '持平' }}</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
// members：房间里所有人；assets：现在的资产；start：起点（累计盈亏 = 现在 − 起点）；highlight：和自己同桌的人
import { computed } from 'vue'

const props = defineProps({
  members: { type: Array, default: () => [] },
  assets: { type: Object, default: () => ({}) },
  start: { type: Object, default: () => ({}) },
  me: { type: String, default: '' },
  highlight: { type: Array, default: () => [] }
})
const ROW = 34
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
// 列表按名字固定顺序渲染（这样每一行是同一个元素），名次只改变它的位置，换位时有动画
const list = computed(() => {
  const vals = props.members.map((m) => ({ ...m, v: props.assets[m.name] || 0, d: (props.assets[m.name] || 0) - (props.start[m.name] || 0) }))
  const order = vals.slice().sort((a, b) => b.v - a.v || a.name.localeCompare(b.name))
  const max = Math.max(1, order[0] ? order[0].v : 1)
  return vals.map((r) => ({ ...r, rank: order.indexOf(r), w: Math.max(4, Math.round((r.v / max) * 100)), bar: r.d > 0 ? '#3FCF84' : r.d < 0 ? '#E0605A' : '#8E929B' }))
})
</script>

<style>
.ztr { padding: 4px 0 8px; }
.ztr-head { height: 28px; display: flex; align-items: baseline; justify-content: space-between; }
.ztr-t { font-size: 14px; font-weight: 700; color: #F3EEE6; }
.ztr-s { font-size: 11px; color: #A9AEB8; }
.ztr-list { position: relative; }
.ztr-row { position: absolute; left: 0; right: 0; top: 0; height: 30px; display: flex; align-items: center; transition: transform 700ms cubic-bezier(.2, .8, .2, 1); }
.ztr-rank { width: 20px; flex: none; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 14px; color: #8E929B; }
.ztr-rank-top { color: #FFC53A; }
.ztr-av { width: 24px; height: 24px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
.ztr-main { flex: 1; min-width: 0; margin-left: 8px; }
.ztr-bar-w { position: relative; height: 22px; border-radius: 4px; background: #1B1D22; overflow: hidden; }
.ztr-bar { height: 100%; border-radius: 4px; opacity: .85; transition: width 700ms cubic-bezier(.2, .8, .2, 1), background 300ms ease; }
.ztr-n { position: absolute; left: 8px; top: 0; font-size: 12px; line-height: 22px; color: #0D0E11; font-weight: 600; white-space: nowrap; }
.ztr-hl .ztr-bar-w { box-shadow: inset 0 0 0 1px rgba(243, 238, 230, .35); }
.ztr-me .ztr-bar-w { box-shadow: inset 0 0 0 2px #8EA1FF; }
.ztr-side { width: 76px; flex: none; margin-left: 8px; display: flex; flex-direction: column; align-items: flex-end; }
.ztr-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 13px; line-height: 15px; color: #F3EEE6; }
.ztr-d { font-size: 10px; line-height: 13px; color: #A9AEB8; }
.ztr-up { color: #3FCF84; }
.ztr-down { color: #FF8A8A; }
</style>
