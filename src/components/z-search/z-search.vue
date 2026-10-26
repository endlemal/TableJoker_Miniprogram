<template>
  <view v-if="show" class="zsm" :class="{ 'zsm-on': open }">
    <view class="zsm-mask" @tap="close" @touchmove.stop.prevent="noop"></view>
    <!-- 搜索栏：从搜索按钮的位置移动、展开到屏幕中间；右边是筛选（搜索范围） -->
    <view class="zsm-pill" :style="pillStyle">
      <input v-if="open" v-model="q" class="zsm-in" :focus="focused" confirm-type="search" placeholder="搜索赛事、主办方、帖子…" placeholder-class="zsm-ph" maxlength="30" :adjust-position="false" @confirm="commit" @keyboardheightchange="onKb" />
      <view v-if="open && q" class="zsm-clear" hover-class="zsm-press" @tap="q = ''"><z-icon name="x" :size="11" :stroke="3" color="#FFFFFF" /></view>
      <view class="zsm-ic"><z-icon name="search" :size="20" color="#6B7280" /></view>
    </view>
    <view class="zsm-filter" :class="{ 'zsm-filter-on': scopeOpen || scope !== 'all' }" :style="filterStyle" hover-class="zsm-press" @tap="scopeOpen = !scopeOpen">
      <z-icon name="adjustments-horizontal" :size="20" color="#FFFFFF" />
    </view>
    <!-- 搜索结果：从搜索栏下面向下展开 -->
    <view class="zsm-panel" :class="{ 'zsm-panel-on': open }" :style="panelStyle">
      <scroll-view scroll-y class="zsm-scroll" :style="'max-height:' + panelMax + 'px'">
        <view v-if="scopeOpen" class="zsm-scopes">
          <text v-for="s in SCOPES" :key="s.key" class="zsm-scope" :class="{ 'zsm-scope-on': scope === s.key }" @tap="setScope(s.key)">{{ s.label }}</text>
        </view>
        <view v-if="!q.trim()" class="zsm-idle">
          <view v-if="history.length" class="zsm-sec"><text class="zsm-sec-t">最近搜索</text><text class="zsm-sec-a" @tap="history = clearHistory()">清除</text></view>
          <view v-if="history.length" class="zsm-chips"><text v-for="h in history" :key="h" class="zsm-chip" @tap="q = h">{{ h }}</text></view>
          <view class="zsm-sec"><text class="zsm-sec-t">大家在搜</text></view>
          <view class="zsm-chips"><text v-for="h in HOT" :key="h" class="zsm-chip zsm-chip-hot" @tap="q = h">{{ h }}</text></view>
          <text class="zsm-tip">输入 6 位房间码可以直接找到比赛；其他城市的比赛和主办方也能搜到</text>
        </view>
        <view v-else>
          <view v-if="res.code" class="zsm-code" hover-class="zsm-press-soft" @tap="pick('match', res.code)">
            <view class="zsm-code-l"><text class="zsm-code-k">房间码</text><text class="zsm-code-v">{{ res.code.roomCode }}</text></view>
            <view class="zsm-main"><text class="zsm-n">{{ res.code.name }}</text><text class="zsm-s">{{ whenOf(res.code) }}{{ res.code.location ? ' · ' + res.code.location.name : '' }}</text></view>
            <view class="zsm-go"><text class="zsm-go-t">进入</text></view>
          </view>
          <block v-if="res.matches.length">
            <view class="zsm-sec"><text class="zsm-sec-t">赛事</text><text class="zsm-sec-a">{{ res.matches.length }}</text></view>
            <view v-for="m in res.matches" :key="m.id" class="zsm-item" hover-class="zsm-press-soft" @tap="pick('match', m)">
              <view class="zsm-thumb" :style="coverStyle(m.cover, 'square')"></view>
              <view class="zsm-main">
                <text class="zsm-n"><text v-for="(seg, i) in splitHit(m.name, q)" :key="i" :class="{ 'zsm-hit': seg.hit }">{{ seg.t }}</text></text>
                <text class="zsm-s"><text v-for="(seg, i) in splitHit(subOf(m), q)" :key="i" :class="{ 'zsm-hit': seg.hit }">{{ seg.t }}</text></text>
              </view>
            </view>
          </block>
          <block v-if="res.clubs.length">
            <view class="zsm-sec"><text class="zsm-sec-t">主办方</text><text class="zsm-sec-a">{{ res.clubs.length }}</text></view>
            <view v-for="c in res.clubs" :key="c.id" class="zsm-item" hover-class="zsm-press-soft" @tap="pick('club', c)">
              <view class="zsm-av" :style="'background:' + c.bg + ';color:' + c.fg"><text>{{ c.char }}</text><view class="zsm-v"><z-icon name="letter-v" :size="6" :stroke="3.4" color="#FFFFFF" /></view></view>
              <view class="zsm-main">
                <text class="zsm-n"><text v-for="(seg, i) in splitHit(c.name, q)" :key="i" :class="{ 'zsm-hit': seg.hit }">{{ seg.t }}</text></text>
                <text class="zsm-s">{{ c.city }} · {{ c.area }}{{ c.rating ? ' · ★ ' + c.rating.toFixed(1) : '' }}</text>
              </view>
            </view>
          </block>
          <block v-if="res.posts.length">
            <view class="zsm-sec"><text class="zsm-sec-t">帖子</text><text class="zsm-sec-a">{{ res.posts.length }}</text></view>
            <view v-for="p in res.posts" :key="p.id" class="zsm-item" hover-class="zsm-press-soft" @tap="pick('post', p)">
              <view class="zsm-thumb" :style="p.coverStyle"></view>
              <view class="zsm-main">
                <text class="zsm-n"><text v-for="(seg, i) in splitHit(p.title, q)" :key="i" :class="{ 'zsm-hit': seg.hit }">{{ seg.t }}</text></text>
                <text class="zsm-s">{{ p.author.name }}{{ p.type === 'report' ? ' · 官方战报' : p.type === 'club' ? ' · 俱乐部动态' : '' }}</text>
              </view>
            </view>
          </block>
          <view v-if="res.empty" class="zsm-empty"><text class="zsm-empty-t">没有找到相关的{{ scopeName }}</text><text class="zsm-empty-s">换个关键词，或者把筛选改成「全部」试试</text></view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
// 搜索栏（页面上的浮层，不是单独的页面）：打开时搜索按钮从原来的位置移动、展开成居中的搜索栏，
// 搜索结果从搜索栏下面向下展开。右边的筛选按钮选择搜索范围：全部 / 赛事 / 主办方 / 帖子。
// 弹出键盘时，搜索栏保持在键盘以上区域的中间。选中一条时 emit('pick', { type, item })
import { ref, computed, watch } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics } from '@/common/nav.js'
import { coverStyle } from '@/common/svg.js'
import { searchAll, splitHit, loadHistory, pushHistory, clearHistory, SCOPES } from '@/common/search.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  from: { type: Object, default: null }, // 搜索按钮的位置 { left, top, width, height }（px）
  matches: { type: Array, default: () => [] },
  clubs: { type: Array, default: () => [] },
  posts: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'pick'])
const HOT = ['深筹赛', '快速赛', '夜航', '外滩', '战报']
const WEEK = '日一二三四五六'
const p2 = (n) => String(n).padStart(2, '0')
const noop = () => {}
const nav = getNavMetrics()
const BAR_H = 52
const GAP = 12
const SIDE = 20
const open = ref(false)
const focused = ref(false)
const q = ref('')
const scope = ref('all')
const scopeOpen = ref(false)
const kb = ref(0)
const history = ref([])
const res = ref(searchAll('', {}))
const scopeName = computed(() => (scope.value === 'all' ? '赛事、主办方或帖子' : SCOPES.find((s) => s.key === scope.value).label))
// 搜索栏的位置：展开后在键盘以上区域的中间；收起时和搜索按钮重合
const barTop = computed(() => Math.max(nav.statusBar + nav.navH + 8, Math.round((nav.winH - kb.value - BAR_H) / 2)))
const pillStyle = computed(() => {
  const f = props.from || { left: nav.winW - SIDE - BAR_H, top: barTop.value, width: BAR_H, height: BAR_H }
  if (!open.value) return `left:${f.left}px;top:${f.top}px;width:${f.width}px;height:${f.height}px`
  return `left:${SIDE}px;top:${barTop.value}px;width:${nav.winW - SIDE * 2 - BAR_H - GAP}px;height:${BAR_H}px`
})
const filterStyle = computed(() => `left:${nav.winW - SIDE - BAR_H}px;top:${barTop.value}px;width:${BAR_H}px;height:${BAR_H}px`)
const panelTop = computed(() => barTop.value + BAR_H + GAP)
const panelMax = computed(() => Math.max(120, nav.winH - kb.value - panelTop.value - 16))
const panelStyle = computed(() => `left:${SIDE}px;right:${SIDE}px;top:${panelTop.value}px`)
watch(() => props.show, (v) => {
  if (!v) return
  history.value = loadHistory()
  q.value = ''
  scope.value = 'all'
  scopeOpen.value = false
  kb.value = 0
  focused.value = false
  setTimeout(() => { open.value = true }, 30)
  setTimeout(() => { focused.value = true }, 380)
})
let timer = null
const run = () => { res.value = searchAll(q.value, { matches: props.matches, clubs: props.clubs, posts: props.posts, scope: scope.value }) }
// 实时检索：输入停 120ms 再搜
watch(q, () => { clearTimeout(timer); timer = setTimeout(run, 120) })
function setScope(k) { scope.value = k; run() }
const onKb = (e) => { kb.value = (e && e.detail && e.detail.height) || 0 }
const whenOf = (m) => { const d = new Date(m.startAt); return `${p2(d.getMonth() + 1)}/${p2(d.getDate())} 周${WEEK[d.getDay()]} ${p2(d.getHours())}:${p2(d.getMinutes())}` }
const subOf = (m) => [m.creator && m.creator.name, whenOf(m), m.location && m.location.name].filter(Boolean).join(' · ')
function commit() { history.value = pushHistory(q.value) }
// 收起：先缩回搜索按钮的位置，动画结束后再关掉
function close(then) {
  focused.value = false
  open.value = false
  setTimeout(() => { emit('close'); if (typeof then === 'function') then() }, 300)
}
function pick(type, item) {
  history.value = pushHistory(q.value)
  close(() => emit('pick', { type, item }))
}
</script>

<style>
.zsm { position: fixed; z-index: 300; left: 0; top: 0; right: 0; bottom: 0; }
.zsm-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(10, 10, 14, 0); transition: background .3s ease; }
.zsm-on .zsm-mask { background: rgba(10, 10, 14, .72); }
.zsm-pill { position: absolute; box-sizing: border-box; padding: 0 8rpx 0 36rpx; border-radius: 999rpx; background: #FFFFFF; box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, .35); display: flex; align-items: center; overflow: hidden;
  transition: left .34s cubic-bezier(.2, .8, .2, 1), top .34s cubic-bezier(.2, .8, .2, 1), width .34s cubic-bezier(.2, .8, .2, 1), height .34s cubic-bezier(.2, .8, .2, 1); }
.zsm-in { flex: 1; min-width: 0; height: 100%; font-size: 28rpx; color: #181A20; }
.zsm-ph { color: #9CA3AF; }
.zsm-clear { width: 34rpx; height: 34rpx; margin: 0 8rpx; flex: none; border-radius: 50%; background: #C9CDD4; display: flex; align-items: center; justify-content: center; }
.zsm-ic { width: 80rpx; height: 80rpx; flex: none; display: flex; align-items: center; justify-content: center; }
.zsm-filter { position: absolute; border-radius: 50%; background: #DC0000; box-shadow: 0 12rpx 30rpx rgba(220, 0, 0, .45); display: flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(.3); transition: opacity .2s ease .12s, transform .34s cubic-bezier(.34, 1.56, .64, 1) .1s, background .2s ease; }
.zsm-on .zsm-filter { opacity: 1; transform: none; }
.zsm-filter-on { background: #FF4D4D; box-shadow: 0 0 0 6rpx rgba(255, 77, 77, .3), 0 12rpx 30rpx rgba(220, 0, 0, .45); }
.zsm-panel { position: absolute; border-radius: 32rpx; background: #FFFFFF; overflow: hidden; box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, .35);
  opacity: 0; transform: translateY(-16rpx) scaleY(.92); transform-origin: top center; transition: opacity .22s ease, transform .3s cubic-bezier(.2, .8, .2, 1); pointer-events: none; }
.zsm-panel-on { opacity: 1; transform: none; pointer-events: auto; transition-delay: .16s; }
.zsm-scroll { padding: 8rpx 28rpx 24rpx; box-sizing: border-box; }
.zsm-scopes { padding-top: 16rpx; display: flex; }
.zsm-scope { margin-right: 12rpx; height: 56rpx; line-height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; background: #F2F2F5; font-size: 24rpx; color: #4B5060; }
.zsm-scope-on { background: #DC0000; color: #FFFFFF; font-weight: 600; }
.zsm-sec { margin-top: 24rpx; display: flex; align-items: baseline; justify-content: space-between; }
.zsm-sec-t { font-size: 24rpx; font-weight: 700; color: #181A20; }
.zsm-sec-a { font-size: 22rpx; color: #9CA3AF; }
.zsm-chips { margin-top: 14rpx; display: flex; flex-wrap: wrap; }
.zsm-chip { margin: 0 12rpx 12rpx 0; height: 52rpx; line-height: 52rpx; padding: 0 22rpx; border-radius: 999rpx; background: #F2F2F5; font-size: 24rpx; color: #35383F; }
.zsm-chip-hot { background: rgba(220, 0, 0, .08); color: #C81E1E; }
.zsm-tip { display: block; margin-top: 12rpx; font-size: 22rpx; line-height: 1.6; color: #9CA3AF; }
.zsm-code { margin-top: 20rpx; padding: 20rpx; border-radius: 24rpx; background: #FFF1F1; box-shadow: inset 0 0 0 2rpx rgba(220, 0, 0, .35); display: flex; align-items: center; }
.zsm-code-l { margin-right: 20rpx; display: flex; flex-direction: column; }
.zsm-code-k { font-size: 20rpx; color: #DC0000; }
.zsm-code-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 38rpx; letter-spacing: 4rpx; color: #181A20; }
.zsm-go { height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; }
.zsm-go-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.zsm-item { padding: 16rpx 0; display: flex; align-items: center; border-bottom: 1rpx solid #F0F0F3; }
.zsm-thumb { width: 84rpx; height: 84rpx; flex: none; border-radius: 18rpx; background-size: cover; background-position: center; background-color: #E5E7EB; }
.zsm-av { position: relative; width: 80rpx; height: 80rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; }
.zsm-v { position: absolute; right: -2rpx; bottom: -2rpx; width: 28rpx; height: 28rpx; box-sizing: border-box; border-radius: 50%; border: 3rpx solid #FFFFFF; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.zsm-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; }
.zsm-n { font-size: 28rpx; font-weight: 600; color: #181A20; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zsm-s { margin-top: 4rpx; font-size: 22rpx; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zsm-hit { color: #DC0000; }
.zsm-empty { padding: 48rpx 0 32rpx; display: flex; flex-direction: column; align-items: center; }
.zsm-empty-t { font-size: 28rpx; font-weight: 600; color: #181A20; }
.zsm-empty-s { margin-top: 8rpx; font-size: 22rpx; color: #9CA3AF; }
.zsm-press { opacity: .75; }
.zsm-press-soft { background: #F7F7F9; }
</style>
