<template>
  <view class="rr">
    <view class="rr-head">
      <text class="rr-title">排行</text><text class="rr-note">{{ members.length }} 人</text>
      <view class="rr-sort" role="button" :aria-label="'排序与显示设置，当前按' + modeLabel" hover-class="rr-sort-press" @tap="openSort"><z-icon name="rank-sort" :size="20" color="#C9CDD4" /></view>
    </view>
    <text class="rr-hint">{{ editable ? '拖动右侧手柄排序；index 选填，小数字在前' : '由主持人调整排序；index 选填' }}</text>
    <view class="rr-columns"><text>玩家</text><text v-if="showScores" class="rr-score">总分</text><text class="rr-index">index</text><view v-if="editable" class="rr-handle-space" /></view>
    <scroll-view class="rr-scroll" :style="'height:' + height + 'px'" scroll-y :scroll-top="scrollTo" @scroll="onScroll">
      <view class="rr-list" :style="'height:' + rows.length * ROW + 'px'" @mousemove="mouseMove" @mouseup="endDrag" @mouseleave="endDrag">
        <view v-for="(r, i) in displayRows" :key="r.name" class="rr-row" :class="{ 'rr-dragging': drag.name === r.name }" :style="'top:' + (drag.name === r.name ? drag.y : i * ROW) + 'px'">
          <text class="rr-position">{{ i + 1 }}</text><view class="rr-avatar" :style="'background:' + r.bg + ';color:' + r.fg">{{ r.c }}</view><text class="rr-name">{{ r.name }}</text>
          <text v-if="showScores" class="rr-score">{{ format(r.score) }}</text>
          <input v-if="editable" class="rr-index rr-input" type="number" :value="indexDraft[r.name] ?? String(r.index)" :focus="focusedIndex === r.name" confirm-type="done" :cursor-spacing="24" maxlength="6" placeholder="选填" :aria-label="r.name + ' 的排名 index，选填'" @tap="focusIndex(r.name)" @focus="focusIndex(r.name)" @input="indexDraft[r.name] = String($event.detail.value)" @confirm="finishIndex(r.name, $event)" @blur="finishIndex(r.name, $event)" />
          <text v-else class="rr-index">{{ r.index === '' ? '—' : r.index }}</text>
          <view v-if="editable" class="rr-handle" role="button" :aria-label="'拖动排序：' + r.name" @touchstart.stop.prevent="startDrag(r.name, i, $event)" @touchmove.stop.prevent="moveDrag" @touchend.stop.prevent="endDrag" @touchcancel.stop.prevent="cancelDrag" @mousedown.stop.prevent="startMouse(r.name, i, $event)">⠿</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>
<script setup>
import { computed, reactive, ref, getCurrentInstance, onUnmounted, watch } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { rankPlayers, parseRankIndex, moveRank } from '@/common/room-ranking.js'
const props = defineProps({ members: Array, assets: Object, state: Object, editable: Boolean, height: { type: Number, default: 240 } })
const emit = defineEmits(['mode', 'index', 'order'])
const modes = [{ key: 'score', label: '总分' }, { key: 'index', label: 'index' }, { key: 'manual', label: '手动' }]
const ROW = 56
const instance = getCurrentInstance()
const rows = computed(() => rankPlayers(props.members, props.assets, props.state))
const showScores = ref(false)
const modeLabel = computed(() => modes.find(m => m.key === props.state.mode)?.label || '总分')
const format = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const indexDraft = reactive({})
const focusedIndex = ref('')
watch(() => props.state.index, values => {
  Object.keys(values).forEach(name => { if (name !== focusedIndex.value) indexDraft[name] = String(values[name]) })
}, { deep: true, immediate: true })
const scrollTo = ref(0)
let scroll = 0, timer = null, bounds = null, mouse = false
const drag = reactive({ name: '', order: [], y: 0, startY: 0, clientY: 0, startScroll: 0, origin: 0, moved: false })
const displayRows = computed(() => drag.name ? drag.order.map(n => rows.value.find(r => r.name === n)).filter(Boolean) : rows.value)
function focusIndex(name) { if (props.editable) { cancelDrag(); focusedIndex.value = name } }
function finishIndex(name, e) {
  setIndex(name, e)
  if (focusedIndex.value === name) focusedIndex.value = ''
}
function openSort() {
  if (drag.name) return
  const options = props.editable ? modes.map(m => ({ mode: m.key, label: `${m.key === props.state.mode ? '✓ ' : ''}${m.label === 'index' ? '按 index 升序' : m.key === 'score' ? '按总分降序' : '手动排序'}` })) : []
  options.push({ label: showScores.value ? '隐藏玩家总分' : '显示玩家总分' })
  uni.showActionSheet({
    itemList: options.map(o => o.label),
    success: ({ tapIndex }) => {
      const option = options[tapIndex]
      if (!option) return
      if (option.mode) { if (props.editable) emit('mode', option.mode) }
      else showScores.value = !showScores.value
    }
  })
}
function setIndex(name, e) {
  if (!props.editable) return
  const value = parseRankIndex(e.detail.value)
  if (value === null) { uni.showToast({ title: 'index 请填正整数，或留空', icon: 'none' }); indexDraft[name] = String(props.state.index[name] ?? ''); return }
  indexDraft[name] = String(value)
  emit('index', name, value)
}
function onScroll(e) { scroll = e.detail.scrollTop }
function startDrag(name, i, e) {
  if (!props.editable) return
  cancelDrag()
  const y = e.touches ? e.touches[0].clientY : e.clientY
  Object.assign(drag, { name, order: rows.value.map(r => r.name), y: i * ROW, startY: y, clientY: y, startScroll: scroll, origin: i * ROW, moved: false })
  scrollTo.value = scroll
  uni.createSelectorQuery().in(instance.proxy).select('.rr-scroll').boundingClientRect(r => { bounds = r }).exec()
  timer = setInterval(() => {
    if (!bounds || !drag.name) return
    const delta = drag.clientY < bounds.top + 32 ? -8 : drag.clientY > bounds.bottom - 32 ? 8 : 0
    const next = Math.max(0, Math.min(rows.value.length * ROW - props.height, scroll + delta))
    if (delta && next !== scroll) { scroll = next; scrollTo.value = next; updateDrag() }
  }, 40)
}
function updateDrag() {
  const delta = drag.clientY - drag.startY + scroll - drag.startScroll
  if (Math.abs(delta) > 4) drag.moved = true
  drag.y = Math.max(0, Math.min((rows.value.length - 1) * ROW, drag.origin + delta))
  drag.order = moveRank(drag.order, drag.name, Math.round(drag.y / ROW))
}
function moveDrag(e) { if (drag.name) { drag.clientY = e.touches ? e.touches[0].clientY : e.clientY; updateDrag() } }
function startMouse(name, i, e) { if (e.button !== 0) return; startDrag(name, i, e); mouse = true }
function mouseMove(e) { if (mouse) moveDrag(e) }
function endDrag() { if (props.editable && drag.name && drag.moved) emit('order', drag.order.slice()); cancelDrag() }
function cancelDrag() { clearInterval(timer); timer = null; drag.name = ''; bounds = null; mouse = false }
watch(() => props.editable, cancelDrag)
onUnmounted(cancelDrag)
</script>
<style>
.rr { color: #F3EEE6; line-height: 1.3; }
.rr-head, .rr-columns, .rr-row { display: flex; align-items: center; }
.rr-head { height: 40px; }
.rr-note { margin-left: auto; }
.rr-sort { flex: none; width: 40px; height: 40px; margin-left: 8px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
.rr-sort .z-icon { width: 20px !important; height: 20px !important; }
.rr-sort-press { background: #383C45; }
.rr-title { font-size: 20px; font-weight: 700; }
.rr-note, .rr-hint, .rr-columns { font-size: 11px; color: #A9AEB8; }
.rr-hint { display: block; margin: 10px 0 6px; }
.rr-columns { height: 24px; padding-left: 4px; }
.rr-columns > text:first-child { flex: 1; }
.rr-scroll { width: 100%; }
.rr-list { position: relative; }
.rr-row { position: absolute; left: 0; right: 0; top: 0; height: 52px; background: #30343C; border-radius: 9px; transition: top 160ms ease; }
.rr-dragging { z-index: 5; background: #454B66; box-shadow: 0 4px 14px #181A2080; transition: none; }
.rr-position { width: 24px; flex: none; text-align: center; font-size: 12px; color: #A9AEB8; }
.rr-avatar { width: 26px; height: 26px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; font-size: 12px; }
.rr-name { flex: 1; min-width: 0; margin-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.rr-score { width: 66px; flex: none; text-align: right; font-size: 12px; }
.rr-index { width: 44px; flex: none; margin: 0 6px; text-align: center; font-size: 12px; }
.rr-input { height: 40px; line-height: 40px; border-radius: 6px; background: #1B1D22; color: #F3EEE6; }
.rr-handle, .rr-handle-space { width: 32px; flex: none; }
.rr-handle { height: 48px; line-height: 48px; text-align: center; font-size: 24px; color: #C9CDD4; touch-action: none; cursor: grab; user-select: none; }
.rr-input:focus-within { box-shadow: inset 0 0 0 1px #8EA1FF; }
@media (prefers-reduced-motion: reduce) { .rr-row { transition: none; } }
</style>
