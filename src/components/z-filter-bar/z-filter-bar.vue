<template>
  <view class="zf">
    <view class="zf-row">
      <view v-for="k in KEYS" :key="k" class="zf-chip" :class="{ 'zf-chip-on': isOn(k), 'zf-chip-open': open === k }" hover-class="zf-press" @tap="toggle(k)">
        <text class="zf-chip-t">{{ labels[k] }}</text>
        <z-icon :name="open === k ? 'chevron-up' : 'chevron-down'" :size="12" :color="isOn(k) ? '#FF6B6B' : '#9CA3AF'" />
      </view>
      <view v-if="filtered" class="zf-reset" hover-class="zf-press" @tap="reset"><z-icon name="rotate" :size="13" color="#9CA3AF" /></view>
    </view>
    <!-- 选项面板：盖在列表上面，点空白处收起 -->
    <view v-if="open" class="zf-mask" @tap="open = ''" @touchmove.stop.prevent="noop"></view>
    <view v-if="open" class="zf-panel">
      <block v-for="o in OPTS[open]" :key="o.key">
        <picker v-if="o.key === 'pick'" mode="date" :value="value.day || today" :start="today" @change="onDay">
          <view class="zf-opt" :class="{ 'zf-opt-on': value.date === 'pick' }"><text>{{ value.date === 'pick' && value.day ? '指定日期：' + value.day : '指定日期…' }}</text><z-icon name="calendar" :size="14" color="#9CA3AF" /></view>
        </picker>
        <view v-else class="zf-opt" :class="{ 'zf-opt-on': value[open] === o.key }" hover-class="zf-press" @tap="choose(o.key)">
          <text>{{ o.label }}</text>
          <z-icon v-if="value[open] === o.key" name="check" :size="14" :stroke="3" color="#FF6B6B" />
        </view>
      </block>
    </view>
  </view>
</template>

<script setup>
// 赛事筛选栏：日期、赛制、报名状态、距离，可以组合；点一项展开选项面板，选完收起。改动时 emit('change', 新的筛选条件)
import { ref, computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { DATE_OPTS, FORMAT_OPTS, STATUS_OPTS, DIST_OPTS, emptyFilter, isFiltered, filterLabels } from '@/common/match-filter.js'

const props = defineProps({ value: { type: Object, default: () => emptyFilter() } })
const emit = defineEmits(['change'])
const KEYS = ['date', 'format', 'status', 'dist']
const OPTS = { date: DATE_OPTS, format: FORMAT_OPTS, status: STATUS_OPTS, dist: DIST_OPTS }
const open = ref('')
const noop = () => {}
const labels = computed(() => filterLabels(props.value))
const filtered = computed(() => isFiltered(props.value))
const isOn = (k) => props.value[k] !== 'all'
const p2 = (n) => String(n).padStart(2, '0')
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` })()
const toggle = (k) => { open.value = open.value === k ? '' : k }
function choose(key) {
  emit('change', { ...props.value, [open.value]: key, ...(open.value === 'date' ? { day: '' } : {}) })
  open.value = ''
}
function onDay(e) {
  emit('change', { ...props.value, date: 'pick', day: e.detail.value })
  open.value = ''
}
function reset() {
  emit('change', emptyFilter())
  open.value = ''
}
</script>

<style>
.zf { position: relative; z-index: 20; }
.zf-row { padding: 16rpx 32rpx 8rpx; display: flex; align-items: center; }
.zf-chip { height: 60rpx; margin-right: 14rpx; padding: 0 16rpx 0 22rpx; border-radius: 999rpx; background: #1F222A; display: flex; align-items: center; }
.zf-chip-t { margin-right: 6rpx; font-size: 24rpx; color: #E5E7EB; white-space: nowrap; }
.zf-chip-on { background: rgba(220, 0, 0, .14); box-shadow: inset 0 0 0 2rpx rgba(220, 0, 0, .55); }
.zf-chip-on .zf-chip-t { color: #FF8A8A; font-weight: 600; }
.zf-chip-open { background: #262A34; }
.zf-reset { width: 60rpx; height: 60rpx; margin-left: auto; border-radius: 50%; background: #1F222A; display: flex; align-items: center; justify-content: center; }
.zf-mask { position: fixed; z-index: 21; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .45); }
.zf-panel { position: absolute; z-index: 22; left: 24rpx; right: 24rpx; top: 92rpx; padding: 8rpx 0; border-radius: 24rpx; background: #262A34; box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, .5); animation: zf-in .16s ease-out; }
@keyframes zf-in { from { opacity: 0; transform: translateY(-10rpx); } to { opacity: 1; transform: none; } }
.zf-opt { height: 88rpx; padding: 0 28rpx; display: flex; align-items: center; justify-content: space-between; font-size: 27rpx; color: #E5E7EB; }
.zf-opt-on { color: #FF6B6B; font-weight: 600; }
.zf-press { opacity: .75; }
</style>
