<template>
  <view class="page">
    <!-- 顶栏：返回 + 标题，和胶囊同一行 -->
    <view class="nav" :style="'padding-top:' + nav.statusBar + 'px'">
      <view class="nav-row" :style="'height:' + nav.navH + 'px;padding-right:' + (nav.capsuleW + 12) + 'px'">
        <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="nav-title">附近俱乐部</text>
      </view>
    </view>
    <view :style="'height:' + (nav.statusBar + nav.navH) + 'px'"></view>

    <!-- 城市切换 -->
    <scroll-view scroll-x class="cities" :show-scrollbar="false">
      <view class="cities-row">
        <view v-for="c in CITIES" :key="c.name" class="city" :class="{ 'city-on': c.name === city }" hover-class="press" @tap="switchCity(c.name)">
          <text class="city-t">{{ c.name }}</text>
          <text v-if="c.name === hereCity" class="city-here">当前</text>
        </view>
      </view>
    </scroll-view>

    <!-- 地图：小程序用原生地图；H5 预览没有地图服务，用示意图 -->
    <view class="mapbox">
      <!-- #ifdef MP-WEIXIN -->
      <map id="vmap" class="map" :latitude="mapCenter.latitude" :longitude="mapCenter.longitude" :scale="12" :markers="markers" :show-location="!!pos" @markertap="onMarker" @callouttap="onMarker"></map>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="map map-h5">
        <view class="mh-grid"></view>
        <view class="mh-river"></view>
        <view v-for="(c, i) in clubs" :key="c.id" class="mh-pin" :class="{ 'mh-pin-on': c.id === focusId }" :style="pinStyle(c)" @tap="onMarker({ detail: { markerId: i } })">
          <view class="mh-dot"></view><text class="mh-label">{{ c.name }}</text>
        </view>
        <view class="mh-origin" :style="pinStyle({ venue: origin })"><view class="mh-me"></view></view>
      </view>
      <!-- #endif -->
      <view class="map-tag"><z-icon :name="origin.mine ? 'current-location' : 'map-pin'" :size="12" color="#FFFFFF" /><text class="map-tag-t">{{ origin.mine ? '距离从你的位置算' : '距离从' + city + '市中心算' }}</text></view>
    </view>

    <view class="sum">
      <text class="sum-t">{{ city }} · {{ clubs.length }} 家认证俱乐部</text>
      <text class="sum-s">{{ matchCount }} 场在办赛事</text>
    </view>

    <!-- 俱乐部：环境图、距离、在办赛事；按距离由近到远 -->
    <view v-for="c in clubs" :id="'club-' + c.id" :key="c.id" class="cl" :class="{ 'cl-on': c.id === focusId }" @tap="focusClub(c)">
      <scroll-view scroll-x class="cl-photos" :show-scrollbar="false">
        <view class="cl-photos-row"><view v-for="(ph, k) in c.photoStyles" :key="k" class="cl-ph" :style="ph"><text class="cl-ph-t">{{ PHOTO_NAME[c.photos[k]] }}</text></view></view>
      </scroll-view>
      <view class="cl-body">
        <view class="cl-top">
          <view class="cl-av" :style="'background:' + c.bg + ';color:' + c.fg"><text>{{ c.char }}</text><view class="cl-v"><z-icon name="letter-v" :size="6" :stroke="3.4" color="#FFFFFF" /></view></view>
          <view class="cl-name-w">
            <view class="cl-name-row"><text class="cl-name">{{ c.name }}</text><text class="cl-cert">认证</text></view>
            <text class="cl-addr">{{ c.venue.address }}</text>
          </view>
          <view class="cl-dist"><text class="cl-km">{{ c.kmText }}</text><text class="cl-km-s">{{ origin.mine ? '距你' : '距市中心' }}</text></view>
        </view>
        <view class="cl-meta"><text class="cl-meta-i">营业 {{ c.hours }}</text><text class="cl-meta-i">{{ c.tables }} 张牌桌</text><text class="cl-meta-i">{{ c.since }} 年开业</text></view>
        <text class="cl-intro">{{ c.intro }}</text>
        <block v-if="c.matches.length">
          <text class="cl-ms-t">在办赛事 {{ c.matches.length }}</text>
          <view v-for="m in c.matches" :key="m.id" class="cl-m" hover-class="press-soft" @tap.stop="openMatch(m)">
            <view class="cl-m-cv" :style="m.thumb"></view>
            <view class="cl-m-main"><text class="cl-m-n">{{ m.name }}</text><text class="cl-m-s">{{ m.when }} · {{ (m.participants || []).length }}/{{ m.cap }} 已报名</text></view>
            <text class="cl-m-st" :class="'cl-m-st-' + m.status">{{ STATUS_TEXT[m.status] }}</text>
          </view>
        </block>
        <text v-else class="cl-none">近期没有公开赛</text>
        <view class="cl-acts">
          <view class="cl-act" hover-class="press" @tap.stop="navigate(c)"><z-icon name="navigation" :size="14" color="#FFFFFF" /><text class="cl-act-t">导航</text></view>
        </view>
      </view>
    </view>
    <z-empty v-if="!clubs.length" kind="city" :title="city + '还没有认证俱乐部'" desc="先看看其他城市，或者把你常去的场馆推荐给我们" action="看看北京" @action="switchCity('北京')" />
    <view class="pad"></view>
  </view>
</template>

<script setup>
// 城市切换与附近俱乐部：切换城市，看同城认证俱乐部的距离、环境图和在办赛事。切换的城市会同步到广场
import { ref, computed, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZEmpty from '@/components/z-empty/z-empty.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { CITIES, CLUBS } from '@/mock/venues.js'
import { publicMatches } from '@/mock/plaza.js'
import { listMatches } from '@/common/store.js'
import { currentCity, setCity, cityOf, userPosition, originFor, distanceKm, fmtKm } from '@/common/geo.js'
import { statusOf } from '@/common/match-filter.js'
import { venueArt } from '@/common/venue-art.js'
import { svgUri, coverStyle } from '@/common/svg.js'

const nav = getNavMetrics()
const PHOTO_NAME = { hall: '大厅', bar: '吧台', lounge: '休息区', vip: '包间' }
const STATUS_TEXT = { open: '报名中', almost: '即将满员', full: '已满员', started: '进行中' }
const WEEK = '日一二三四五六'
const p2 = (n) => String(n).padStart(2, '0')
const city = ref(currentCity())
const pos = ref(null)
const focusId = ref('')
onLoad(async (q) => {
  if (q && q.city && cityOf(q.city)) city.value = q.city
  if (q && q.club) {
    const c = CLUBS.find((x) => x.id === q.club)
    if (c) { city.value = c.city; focusId.value = c.id }
  }
  pos.value = await userPosition()
  if (focusId.value) nextTick(() => setTimeout(() => uni.pageScrollTo({ selector: '#club-' + focusId.value, duration: 300 }), 300))
})
const origin = computed(() => originFor(city.value, pos.value))
// 自己所在的城市（拿到位置时）：城市列表里标「当前」
const hereCity = computed(() => {
  if (!pos.value) return ''
  const near = CITIES.map((c) => ({ c, km: distanceKm(pos.value, c.center) })).sort((a, b) => a.km - b.km)[0]
  return near && near.km < 80 ? near.c.name : ''
})
// 在办赛事：公开的、还没结束的比赛（开赛 6 小时内算进行中）
const matches = computed(() => publicMatches.concat(listMatches().filter((m) => m.isPublic)).filter((m) => m.startAt > Date.now() - 6 * 3600000))
const clubs = computed(() => CLUBS.filter((c) => c.city === city.value).map((c) => {
  const km = distanceKm(origin.value, c.venue)
  const ms = matches.value.filter((m) => m.location && m.location.name === c.venue.name).sort((a, b) => a.startAt - b.startAt).map((m) => {
    const d = new Date(m.startAt)
    return { ...m, when: `${p2(d.getMonth() + 1)}/${p2(d.getDate())} 周${WEEK[d.getDay()]} ${p2(d.getHours())}:${p2(d.getMinutes())}`, status: statusOf(m), thumb: coverStyle(m.cover, 'square') }
  })
  return { ...c, km, kmText: fmtKm(km), matches: ms, photoStyles: c.photos.map((k) => `background-image:url("${svgUri(venueArt(k, c.tone))}")`) }
}).sort((a, b) => a.km - b.km))
const matchCount = computed(() => clubs.value.reduce((n, c) => n + c.matches.length, 0))
const focused = computed(() => clubs.value.find((c) => c.id === focusId.value) || null)
const mapCenter = computed(() => (focused.value ? focused.value.venue : (cityOf(city.value) || CITIES[0]).center))
const markers = computed(() => clubs.value.map((c, i) => ({
  id: i,
  latitude: c.venue.latitude,
  longitude: c.venue.longitude,
  iconPath: c.id === focusId.value ? '/static/venues/pin-on.png' : '/static/venues/pin.png',
  width: 30,
  height: 38,
  callout: { content: c.name, display: 'ALWAYS', fontSize: 12, color: '#FFFFFF', bgColor: '#262A34', padding: 6, borderRadius: 8 }
})))
// H5 示意图：把经纬度换算到地图框里的位置（四周留 12%）
const bounds = computed(() => {
  const pts = clubs.value.map((c) => c.venue).concat([origin.value])
  const lat = pts.map((p) => p.latitude), lng = pts.map((p) => p.longitude)
  return { a: Math.min(...lat), b: Math.max(...lat), c: Math.min(...lng), d: Math.max(...lng) }
})
function pinStyle(c) {
  const b = bounds.value
  const x = b.d > b.c ? (c.venue.longitude - b.c) / (b.d - b.c) : 0.5
  const y = b.b > b.a ? (b.b - c.venue.latitude) / (b.b - b.a) : 0.5
  return `left:${12 + x * 76}%;top:${14 + y * 70}%`
}
function switchCity(name) {
  city.value = name
  setCity(name)
  focusId.value = ''
  uni.pageScrollTo({ scrollTop: 0, duration: 200 })
}
function focusClub(c) { focusId.value = c.id }
function onMarker(e) {
  const c = clubs.value[e.detail.markerId]
  if (!c) return
  focusId.value = c.id
  uni.pageScrollTo({ selector: '#club-' + c.id, duration: 300 })
}
const openMatch = (m) => uni.navigateTo({ url: '/pages/invite/index?id=' + m.id })
function navigate(c) {
  // #ifdef MP-WEIXIN
  uni.openLocation({ latitude: c.venue.latitude, longitude: c.venue.longitude, name: c.name, address: c.venue.address, scale: 16 })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '在小程序里可以打开导航', icon: 'none' })
  // #endif
}
</script>

<style>
.page { min-height: 100vh; background: #181A20; }
.nav { position: fixed; z-index: 30; left: 0; right: 0; top: 0; background: #181A20; }
.nav-row { padding-left: 24rpx; display: flex; align-items: center; box-sizing: border-box; }
.nav-back { width: 64rpx; height: 64rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.nav-title { margin-left: 20rpx; font-size: 34rpx; font-weight: 700; color: #FFFFFF; }
.cities { white-space: nowrap; }
.cities-row { padding: 12rpx 32rpx 20rpx; display: flex; }
.city { height: 64rpx; margin-right: 16rpx; padding: 0 28rpx; border-radius: 999rpx; background: #1F222A; display: flex; align-items: center; flex: none; }
.city-t { font-size: 26rpx; color: #E5E7EB; }
.city-on { background: #DC0000; }
.city-on .city-t { color: #FFFFFF; font-weight: 600; }
.city-here { margin-left: 8rpx; padding: 0 8rpx; border-radius: 8rpx; background: rgba(255, 255, 255, .18); font-size: 18rpx; color: #FFFFFF; }
.mapbox { position: relative; margin: 0 32rpx; height: 420rpx; border-radius: 28rpx; overflow: hidden; background: #11141A; }
.map { width: 100%; height: 100%; }
.map-h5 { position: relative; background: #12161E; }
.mh-grid { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(255, 255, 255, .05) 2rpx, transparent 2rpx), linear-gradient(90deg, rgba(255, 255, 255, .05) 2rpx, transparent 2rpx); background-size: 60rpx 60rpx; }
.mh-river { position: absolute; left: -10%; top: 58%; width: 120%; height: 34rpx; background: #1C2E44; transform: rotate(-8deg); }
.mh-pin { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; }
.mh-dot { width: 26rpx; height: 26rpx; border-radius: 50% 50% 50% 0; background: #DC0000; transform: rotate(-45deg); box-shadow: 0 0 0 4rpx rgba(255, 255, 255, .9); }
.mh-pin-on .mh-dot { background: #F4B740; }
.mh-label { margin-top: 6rpx; padding: 2rpx 10rpx; border-radius: 8rpx; background: rgba(38, 42, 52, .92); font-size: 18rpx; color: #FFFFFF; white-space: nowrap; }
.mh-origin { position: absolute; transform: translate(-50%, -50%); }
.mh-me { width: 22rpx; height: 22rpx; border-radius: 50%; background: #3D7BFF; box-shadow: 0 0 0 8rpx rgba(61, 123, 255, .25); }
.map-tag { position: absolute; left: 20rpx; bottom: 20rpx; height: 48rpx; padding: 0 16rpx; border-radius: 999rpx; background: rgba(24, 26, 32, .85); display: flex; align-items: center; }
.map-tag-t { margin-left: 6rpx; font-size: 20rpx; color: #FFFFFF; }
.sum { margin: 32rpx 32rpx 8rpx; display: flex; align-items: baseline; justify-content: space-between; }
.sum-t { font-size: 32rpx; font-weight: 700; color: #FFFFFF; }
.sum-s { font-size: 24rpx; color: #9CA3AF; }
.cl { margin: 20rpx 32rpx 0; border-radius: 28rpx; background: #1F222A; overflow: hidden; box-shadow: inset 0 0 0 2rpx transparent; transition: box-shadow .2s ease; }
.cl-on { box-shadow: inset 0 0 0 3rpx #F4B740; }
.cl-photos { white-space: nowrap; }
.cl-photos-row { padding: 16rpx 16rpx 0; display: flex; }
.cl-ph { position: relative; width: 380rpx; height: 230rpx; margin-right: 12rpx; flex: none; border-radius: 18rpx; background-size: cover; background-position: center; }
.cl-ph-t { position: absolute; left: 14rpx; bottom: 12rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: rgba(0, 0, 0, .55); font-size: 20rpx; color: #FFFFFF; }
.cl-body { padding: 20rpx 24rpx 24rpx; }
.cl-top { display: flex; align-items: center; }
.cl-av { position: relative; width: 80rpx; height: 80rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; }
.cl-v { position: absolute; right: -2rpx; bottom: -2rpx; width: 28rpx; height: 28rpx; box-sizing: border-box; border-radius: 50%; border: 3rpx solid #1F222A; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.cl-name-w { flex: 1; min-width: 0; margin: 0 16rpx 0 18rpx; }
.cl-name-row { display: flex; align-items: center; }
.cl-name { font-size: 30rpx; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-cert { margin-left: 10rpx; flex: none; padding: 0 10rpx; border-radius: 8rpx; background: rgba(220, 0, 0, .18); font-size: 20rpx; color: #FF8A8A; }
.cl-addr { display: block; margin-top: 6rpx; font-size: 23rpx; color: #C9CDD4; }
.cl-dist { flex: none; display: flex; flex-direction: column; align-items: flex-end; }
.cl-km { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 34rpx; color: #FFFFFF; }
.cl-km-s { font-size: 20rpx; color: #9CA3AF; }
.cl-meta { margin-top: 16rpx; display: flex; flex-wrap: wrap; }
.cl-meta-i { margin-right: 12rpx; margin-bottom: 8rpx; padding: 4rpx 14rpx; border-radius: 8rpx; background: #262A34; font-size: 21rpx; color: #C9CDD4; }
.cl-intro { display: block; margin-top: 6rpx; font-size: 24rpx; line-height: 1.6; color: #9CA3AF; }
.cl-ms-t { display: block; margin-top: 18rpx; font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.cl-m { margin-top: 12rpx; padding: 14rpx; border-radius: 18rpx; background: #262A34; display: flex; align-items: center; }
.cl-m-cv { width: 72rpx; height: 72rpx; flex: none; border-radius: 14rpx; background-size: cover; }
.cl-m-main { flex: 1; min-width: 0; margin: 0 14rpx 0 16rpx; display: flex; flex-direction: column; }
.cl-m-n { font-size: 26rpx; font-weight: 600; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-m-s { margin-top: 4rpx; font-size: 21rpx; color: #9CA3AF; }
.cl-m-st { flex: none; padding: 4rpx 12rpx; border-radius: 999rpx; font-size: 20rpx; background: rgba(76, 181, 130, .16); color: #4CB582; }
.cl-m-st-almost { background: rgba(255, 122, 69, .16); color: #FF7A45; }
.cl-m-st-full, .cl-m-st-started { background: rgba(156, 163, 175, .16); color: #9CA3AF; }
.cl-none { display: block; margin-top: 16rpx; font-size: 23rpx; color: #6B7280; }
.cl-acts { margin-top: 18rpx; display: flex; }
.cl-act { height: 60rpx; padding: 0 24rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; }
.cl-act-t { margin-left: 6rpx; font-size: 24rpx; color: #FFFFFF; }
.pad { height: calc(60rpx + env(safe-area-inset-bottom)); }
.press { opacity: .75; }
.press-soft { background: #2E313A; }
</style>
