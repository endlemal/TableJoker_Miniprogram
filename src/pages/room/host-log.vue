<template>
  <view class="hl">
    <view class="nav" :style="navStyle">
      <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="20" color="#F3EEE6" /></view>
      <view class="nav-main"><text class="nav-t">主持人操作日志</text><text class="nav-s">{{ matchName }} · {{ hosts.length }} 位主持人</text></view>
    </view>
    <view :style="'height:' + (nav.statusBar + nav.navH) + 'px'"></view>

    <view v-if="!allowed" class="empty"><z-icon name="lock" :size="30" color="#8E929B" /><text class="empty-t">只有主持人能看到操作日志</text></view>
    <block v-else>
      <!-- 筛选：类型、主持人 -->
      <scroll-view scroll-x class="chips" :show-scrollbar="false">
        <view class="chips-row">
          <view v-for="c in chipList" :key="c.key" class="chip" :class="{ 'chip-on': type === c.key }" hover-class="press" @tap="type = c.key">
            <z-icon v-if="c.icon" :name="c.icon" :size="14" :color="type === c.key ? '#181A20' : '#C9CDD4'" />
            <text class="chip-t">{{ c.name }}</text><text class="chip-n">{{ c.n }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="who">
        <view class="who-i" :class="{ 'who-on': !host }" hover-class="press" @tap="host = ''"><text class="who-all">全部</text></view>
        <view v-for="h in hosts" :key="h.name" class="who-i" :class="{ 'who-on': host === h.name }" hover-class="press" @tap="host = host === h.name ? '' : h.name">
          <view class="who-av" :style="'background:' + h.bg + ';color:' + h.fg"><text>{{ h.c }}</text></view>
          <text class="who-n">{{ h.name }}</text>
        </view>
      </view>
      <!-- 列表：按天分组，最新的在上面 -->
      <view v-if="!groups.length" class="empty"><z-icon name="history" :size="30" color="#8E929B" /><text class="empty-t">没有符合条件的操作</text></view>
      <view v-for="g in groups" :key="g.day" class="day">
        <text class="day-t">{{ g.day }}</text>
        <view v-for="l in g.list" :key="l.id" class="row">
          <view class="row-av" :style="'background:' + l.host.bg + ';color:' + l.host.fg"><text>{{ l.host.c }}</text></view>
          <view class="row-main">
            <text class="row-t"><text class="row-who">{{ l.host.name }}</text> {{ l.text }}</text>
            <view class="row-meta"><text class="row-time">{{ hhmm(l.at) }}</text><view class="row-tag"><z-icon :name="LOG_TYPES[l.type].icon" :size="11" color="#A9AEB8" /><text class="row-tag-t">{{ LOG_TYPES[l.type].name }}</text></view></view>
          </view>
        </view>
      </view>
      <text v-if="groups.length" class="foot">只保留最近 500 条</text>
    </block>
  </view>
</template>

<script setup>
// 主持人共同操作日志：这场比赛所有主持人（发起人和共同主持）做过的操作。从房间「更多 → 主持人」底部进入。
// 可以按类型（计时、申请、现场、记分、座位）和主持人筛选；只有主持人能看到
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { requireLogin } from '@/common/auth.js'
import { hhmm } from '@/common/format.js'
import { hostLog, LOG_TYPES } from '@/common/host-log.js'
import { room, me } from '@/mock/data.js'

const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW + 8}px`
const matchId = ref('demo')
const list = ref([])
const type = ref('all')
const host = ref('')
const matchName = room.name
const allowed = room.hosts.some((h) => h.name === me.nickname)
const COLORS = { '老周': ['#3D3550', '#D6CCFF'], '七七': ['#4A2433', '#F5B5C8'] }
// 主持人列表：房间的主持人（日志里出现过的人带上他们的头像颜色）
const hosts = computed(() => room.hosts.map((h) => {
  const seen = list.value.find((l) => l.host.name === h.name)
  const [bg, fg] = COLORS[h.name] || ['#F1E4D3', '#8A1C1C']
  return seen ? seen.host : { name: h.name, c: h.name.slice(0, 1), bg, fg }
}))
const load = () => { list.value = hostLog(matchId.value) }
onLoad((q) => { if (!requireLogin()) return; if (q && q.id) matchId.value = q.id; load() })
onShow(load)
const byHost = computed(() => list.value.filter((l) => !host.value || l.host.name === host.value))
const chipList = computed(() => [{ key: 'all', name: '全部', icon: '', n: byHost.value.length }].concat(Object.keys(LOG_TYPES).map((k) => ({ key: k, name: LOG_TYPES[k].name, icon: LOG_TYPES[k].icon, n: byHost.value.filter((l) => l.type === k).length }))))
const WEEK = '日一二三四五六'
function dayOf(t) {
  const d = new Date(t)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  return diff === 0 ? '今天' : diff === 1 ? '昨天' : `${d.getMonth() + 1} 月 ${d.getDate()} 日 周${WEEK[d.getDay()]}`
}
const groups = computed(() => {
  const out = []
  byHost.value.filter((l) => type.value === 'all' || l.type === type.value).forEach((l) => {
    const day = dayOf(l.at)
    const g = out[out.length - 1]
    if (g && g.day === day) g.list.push(l)
    else out.push({ day, list: [l] })
  })
  return out
})
</script>

<style>
.hl { min-height: 100vh; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: #181A20; }
.press { opacity: .8; }
.nav { position: fixed; z-index: 20; left: 0; right: 0; top: 0; padding-left: 24rpx; box-sizing: border-box; background: #181A20; display: flex; align-items: center; }
.nav-back { width: 72rpx; height: 72rpx; flex: none; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.nav-main { margin-left: 20rpx; min-width: 0; display: flex; flex-direction: column; }
.nav-t { font-size: 32rpx; font-weight: 700; color: #F3EEE6; }
.nav-s { font-size: 22rpx; color: #8E929B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chips { margin-top: 16rpx; white-space: nowrap; }
.chips-row { display: flex; padding: 0 32rpx; }
.chip { flex: none; height: 60rpx; margin-right: 16rpx; padding: 0 22rpx; border-radius: 30rpx; background: #262A34; display: flex; align-items: center; }
.chip-on { background: #F3EEE6; }
.chip-t { margin-left: 6rpx; font-size: 26rpx; color: #C9CDD4; }
.chip-on .chip-t { color: #181A20; font-weight: 700; }
.chip-n { margin-left: 8rpx; font-size: 22rpx; color: #8E929B; }
.chip-on .chip-n { color: #5A5D66; }
.who { margin-top: 20rpx; padding: 0 32rpx; display: flex; flex-wrap: wrap; }
.who-i { height: 60rpx; margin: 0 16rpx 12rpx 0; padding: 0 20rpx 0 8rpx; border-radius: 30rpx; background: #1F222A; box-shadow: inset 0 0 0 2rpx #2C2F36; display: flex; align-items: center; }
.who-on { box-shadow: inset 0 0 0 3rpx #F3EEE6; }
.who-all { padding-left: 12rpx; font-size: 26rpx; color: #F3EEE6; }
.who-av { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 600; }
.who-n { margin-left: 10rpx; font-size: 26rpx; color: #F3EEE6; }
.day { margin-top: 24rpx; padding: 0 32rpx; }
.day-t { display: block; margin-bottom: 8rpx; font-size: 24rpx; font-weight: 700; color: #8E929B; }
.row { padding: 20rpx 0; border-bottom: 1rpx solid #262A34; display: flex; align-items: flex-start; }
.row-av { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
.row-main { flex: 1; min-width: 0; margin-left: 20rpx; }
.row-t { font-size: 28rpx; line-height: 1.5; color: #E5E2DB; }
.row-who { font-weight: 700; color: #F3EEE6; }
.row-meta { margin-top: 8rpx; display: flex; align-items: center; }
.row-time { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 22rpx; color: #8E929B; }
.row-tag { margin-left: 16rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: #262A34; display: flex; align-items: center; }
.row-tag-t { margin-left: 4rpx; font-size: 20rpx; color: #A9AEB8; }
.empty { margin-top: 160rpx; display: flex; flex-direction: column; align-items: center; }
.empty-t { margin-top: 20rpx; font-size: 28rpx; color: #8E929B; }
.foot { display: block; margin-top: 32rpx; text-align: center; font-size: 22rpx; color: #5A5D66; }
</style>
