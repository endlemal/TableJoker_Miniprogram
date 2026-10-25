<template>
  <view v-if="show" class="zsr">
    <!-- 搜索框：在状态栏下面、胶囊左边 -->
    <view class="zsr-head" :style="'padding-top:' + nav.statusBar + 'px'">
      <view class="zsr-row" :style="'height:' + nav.navH + 'px;padding-right:' + (nav.capsuleW + 12) + 'px'">
        <view class="zsr-box">
          <z-icon name="search" :size="16" color="#9CA3AF" />
          <input v-model="q" class="zsr-in" :focus="focused" confirm-type="search" placeholder="赛事、俱乐部、6 位房间码" placeholder-class="zsr-ph" maxlength="30" @confirm="commit" />
          <view v-if="q" class="zsr-clear" hover-class="zsr-press" @tap="q = ''"><z-icon name="x" :size="12" :stroke="3" color="#181A20" /></view>
        </view>
        <text class="zsr-cancel" @tap="close">取消</text>
      </view>
    </view>
    <scroll-view scroll-y class="zsr-body" :style="'top:' + (nav.statusBar + nav.navH) + 'px'">
      <!-- 没输入时：最近搜索和大家在搜 -->
      <view v-if="!q.trim()" class="zsr-idle">
        <view v-if="history.length" class="zsr-sec"><text class="zsr-sec-t">最近搜索</text><text class="zsr-sec-a" @tap="history = clearHistory()">清除</text></view>
        <view v-if="history.length" class="zsr-chips"><text v-for="h in history" :key="h" class="zsr-chip" @tap="q = h">{{ h }}</text></view>
        <view class="zsr-sec"><text class="zsr-sec-t">大家在搜</text></view>
        <view class="zsr-chips"><text v-for="h in HOT" :key="h" class="zsr-chip zsr-chip-hot" @tap="q = h">{{ h }}</text></view>
        <text class="zsr-tip">输入 6 位房间码，可以直接找到对应的比赛</text>
      </view>
      <view v-else class="zsr-res">
        <!-- 6 位房间码：精确命中 -->
        <view v-if="res.code" class="zsr-code" hover-class="zsr-press-soft" @tap="pick('match', res.code)">
          <view class="zsr-code-l"><text class="zsr-code-k">房间码</text><text class="zsr-code-v">{{ res.code.roomCode }}</text></view>
          <view class="zsr-code-m"><text class="zsr-code-n">{{ res.code.name }}</text><text class="zsr-code-s">{{ whenOf(res.code) }}{{ res.code.location ? ' · ' + res.code.location.name : '' }}</text></view>
          <view class="zsr-code-go"><text class="zsr-code-go-t">进入</text></view>
        </view>
        <block v-if="res.matches.length">
          <view class="zsr-sec"><text class="zsr-sec-t">赛事</text><text class="zsr-sec-n">{{ res.matches.length }}</text></view>
          <view v-for="m in res.matches" :key="m.id" class="zsr-item" hover-class="zsr-press-soft" @tap="pick('match', m)">
            <view class="zsr-thumb" :style="thumbOf(m)"></view>
            <view class="zsr-main">
              <text class="zsr-n"><text v-for="(seg, i) in splitHit(m.name, q)" :key="i" :class="{ 'zsr-hit': seg.hit }">{{ seg.t }}</text></text>
              <text class="zsr-s"><text v-for="(seg, i) in splitHit(subOf(m), q)" :key="i" :class="{ 'zsr-hit': seg.hit }">{{ seg.t }}</text></text>
            </view>
          </view>
        </block>
        <block v-if="res.clubs.length">
          <view class="zsr-sec"><text class="zsr-sec-t">俱乐部</text><text class="zsr-sec-n">{{ res.clubs.length }}</text></view>
          <view v-for="c in res.clubs" :key="c.id" class="zsr-item" hover-class="zsr-press-soft" @tap="pick('club', c)">
            <view class="zsr-av" :style="'background:' + c.bg + ';color:' + c.fg"><text>{{ c.char }}</text><view class="zsr-v"><z-icon name="letter-v" :size="6" :stroke="3.4" color="#FFFFFF" /></view></view>
            <view class="zsr-main">
              <text class="zsr-n"><text v-for="(seg, i) in splitHit(c.name, q)" :key="i" :class="{ 'zsr-hit': seg.hit }">{{ seg.t }}</text></text>
              <text class="zsr-s">{{ c.city }} · {{ c.venue.address }}</text>
            </view>
          </view>
        </block>
        <block v-if="res.channels.length">
          <view class="zsr-sec"><text class="zsr-sec-t">频道</text><text class="zsr-sec-n">{{ res.channels.length }}</text></view>
          <view v-for="c in res.channels" :key="c.id" class="zsr-item" hover-class="zsr-press-soft" @tap="pick('channel', c)">
            <view class="zsr-ch" :style="'background:' + c.bg"><z-icon :name="c.icon" :size="20" :color="c.fg" /></view>
            <view class="zsr-main">
              <text class="zsr-n"><text v-for="(seg, i) in splitHit(c.name, q)" :key="i" :class="{ 'zsr-hit': seg.hit }">{{ seg.t }}</text></text>
              <text class="zsr-s">频道</text>
            </view>
          </view>
        </block>
        <z-empty v-if="res.empty" kind="search" compact title="没有找到相关的赛事、俱乐部或频道" desc="换个关键词试试，或者输入 6 位房间码" />
      </view>
      <view class="zsr-pad"></view>
    </scroll-view>
  </view>
</template>

<script setup>
// 全局搜索：输入赛事名称、主办方 / 俱乐部名称或 6 位房间码，实时检索赛事、俱乐部和频道。
// 选中一条时 emit('pick', { type, item })，由页面决定去哪里
import { ref, watch, computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZEmpty from '@/components/z-empty/z-empty.vue'
import { getNavMetrics } from '@/common/nav.js'
import { coverStyle } from '@/common/svg.js'
import { searchAll, splitHit, loadHistory, pushHistory, clearHistory } from '@/common/search.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  matches: { type: Array, default: () => [] },
  clubs: { type: Array, default: () => [] },
  channels: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'pick'])
const HOT = ['深筹赛', '快速赛', '夜航', '新手', '外滩']
const WEEK = '日一二三四五六'
const p2 = (n) => String(n).padStart(2, '0')
const nav = getNavMetrics()
const q = ref('')
const focused = ref(false)
const history = ref([])
const res = ref({ code: null, matches: [], clubs: [], channels: [], empty: false })
let timer = null
watch(() => props.show, (v) => {
  if (!v) return
  history.value = loadHistory()
  focused.value = false
  setTimeout(() => { focused.value = true }, 80)
})
// 实时检索：输入停 120ms 再搜，避免每个字都算一遍
watch(q, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => { res.value = searchAll(v, { matches: props.matches, clubs: props.clubs, channels: props.channels }) }, 120)
})
const whenOf = (m) => { const d = new Date(m.startAt); return `${p2(d.getMonth() + 1)}/${p2(d.getDate())} 周${WEEK[d.getDay()]} ${p2(d.getHours())}:${p2(d.getMinutes())}` }
const subOf = (m) => [m.creator && m.creator.name, whenOf(m), m.location && m.location.name].filter(Boolean).join(' · ')
const thumbOf = (m) => coverStyle(m.cover, 'square')
function commit() { history.value = pushHistory(q.value) }
function pick(type, item) {
  history.value = pushHistory(q.value)
  emit('pick', { type, item })
}
function close() {
  q.value = ''
  emit('close')
}
</script>

<style>
.zsr { position: fixed; z-index: 300; left: 0; top: 0; right: 0; bottom: 0; background: #181A20; animation: zsr-in .2s ease-out; }
@keyframes zsr-in { from { opacity: 0; transform: translateY(24rpx); } to { opacity: 1; transform: none; } }
.zsr-head { position: absolute; left: 0; right: 0; top: 0; background: #181A20; }
.zsr-row { padding-left: 24rpx; display: flex; align-items: center; box-sizing: border-box; }
.zsr-box { flex: 1; min-width: 0; height: 64rpx; padding: 0 16rpx 0 20rpx; border-radius: 999rpx; background: #262A34; display: flex; align-items: center; }
.zsr-in { flex: 1; min-width: 0; height: 64rpx; margin-left: 10rpx; font-size: 26rpx; color: #FFFFFF; }
.zsr-ph { color: #6B7280; }
.zsr-clear { width: 32rpx; height: 32rpx; border-radius: 50%; background: #9CA3AF; display: flex; align-items: center; justify-content: center; }
.zsr-cancel { margin-left: 20rpx; font-size: 28rpx; color: #E5E7EB; }
.zsr-body { position: absolute; left: 0; right: 0; bottom: 0; }
.zsr-idle, .zsr-res { padding: 8rpx 32rpx 0; }
.zsr-sec { margin-top: 28rpx; display: flex; align-items: baseline; justify-content: space-between; }
.zsr-sec-t { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }
.zsr-sec-a, .zsr-sec-n { font-size: 22rpx; color: #9CA3AF; }
.zsr-chips { margin-top: 16rpx; display: flex; flex-wrap: wrap; }
.zsr-chip { margin: 0 14rpx 14rpx 0; height: 56rpx; line-height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; background: #262A34; font-size: 24rpx; color: #E5E7EB; }
.zsr-chip-hot { background: rgba(220, 0, 0, .14); color: #FF8A8A; }
.zsr-tip { display: block; margin-top: 24rpx; font-size: 22rpx; color: #6B7280; }
.zsr-code { margin-top: 20rpx; padding: 22rpx; border-radius: 24rpx; background: linear-gradient(135deg, #3A1215, #262A34); box-shadow: inset 0 0 0 2rpx rgba(220, 0, 0, .5); display: flex; align-items: center; }
.zsr-code-l { display: flex; flex-direction: column; }
.zsr-code-k { font-size: 20rpx; color: #FF8A8A; }
.zsr-code-v { margin-top: 2rpx; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 40rpx; letter-spacing: 4rpx; color: #FFFFFF; }
.zsr-code-m { flex: 1; min-width: 0; margin-left: 24rpx; display: flex; flex-direction: column; }
.zsr-code-n { font-size: 28rpx; font-weight: 600; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zsr-code-s { margin-top: 4rpx; font-size: 22rpx; color: #C9CDD4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zsr-code-go { height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; }
.zsr-code-go-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.zsr-item { padding: 18rpx 0; display: flex; align-items: center; border-bottom: 1rpx solid #24272F; }
.zsr-thumb { width: 88rpx; height: 88rpx; flex: none; border-radius: 18rpx; background-size: cover; background-position: center; }
.zsr-av { position: relative; width: 80rpx; height: 80rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; }
.zsr-v { position: absolute; right: -2rpx; bottom: -2rpx; width: 28rpx; height: 28rpx; box-sizing: border-box; border-radius: 50%; border: 3rpx solid #181A20; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.zsr-ch { width: 80rpx; height: 80rpx; flex: none; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.zsr-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; }
.zsr-n { font-size: 28rpx; font-weight: 500; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zsr-s { margin-top: 6rpx; font-size: 22rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zsr-hit { color: #FF6B6B; font-weight: 700; }
.zsr-pad { height: calc(60rpx + env(safe-area-inset-bottom)); }
.zsr-press { opacity: .7; }
.zsr-press-soft { background: rgba(255, 255, 255, .04); }
</style>
