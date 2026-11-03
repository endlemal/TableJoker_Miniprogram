<template>
  <view class="tvs" :class="'tvs-kind-' + kind">
    <view v-if="kind === 'poster' && posterImages.length" class="tvs-bg">
      <view v-for="(im, i) in posterImages" :key="im.id" class="tvs-poster" :class="{ 'tvs-poster-on': i === posterIndex }" :aria-hidden="i !== posterIndex">
        <z-fit-img :src="posterImageSrc(im, fit)" :mode="fit" :w="posterImageSize(im).w" :h="posterImageSize(im).h" :scale="centerScale" />
      </view>
    </view>
    <view v-else-if="kind !== 'sleep' && kind !== 'off'" class="tvs-bg"><z-fit-img :src="cover.src" mode="aspectFill" :w="cover.w" :h="cover.h" :bg="cover.tint" /></view>

    <view v-if="kind === 'theme'" class="tvs-fill tvs-theme">
      <text class="tvs-lv">LV.3 · 100/200</text>
      <text class="tvs-time">18:42</text>
      <text class="tvs-room">{{ room.name }}</text>
    </view>
    <view v-else-if="kind === 'checkin'" class="tvs-fill tvs-wall">
      <text class="tvs-h">签到墙</text>
      <view class="tvs-grid">
        <view v-for="(p, k) in avatars" :key="k" class="tvs-av" :class="{ 'tvs-av-wait': k >= 9 }" :style="'background:' + p.bg + ';color:' + p.fg"><text>{{ p.char }}</text></view>
      </view>
      <text class="tvs-cnt">18/27 已签到</text>
    </view>
    <view v-else-if="kind === 'list'" class="tvs-fill tvs-list">
      <text class="tvs-h">赛事列表</text>
      <view v-for="m in matches" :key="m.id" class="tvs-row"><text class="tvs-row-n">{{ m.name }}</text><text class="tvs-row-t">{{ m.t }}</text></view>
    </view>
    <view v-else-if="kind === 'sleep'" class="tvs-fill tvs-sleep">
      <z-icon name="moon" :size="22" color="#3A3F5C" />
      <text class="tvs-dim">休眠中</text>
    </view>
    <view v-else-if="kind === 'off'" class="tvs-fill tvs-off">
      <z-icon name="device-tv-off" :size="22" color="#4B5060" />
      <text class="tvs-dim">离线</text>
    </view>
    <text v-if="kind === 'poster' && groupName" class="tvs-chip">{{ groupName }}</text>

    <!-- 预览 / 正在播放 -->
    <view v-if="badge === 'preview'" class="tvs-badge tvs-badge-pv" :style="'border-color:' + color + ';color:' + color"><text>预览</text></view>
    <view v-else-if="badge === 'live'" class="tvs-badge"><view class="tvs-live"></view><text>正在播放</text></view>

    <!-- 投放中：屏幕里的加载动画 -->
    <view v-if="loading" class="tvs-loading">
      <view class="tvs-ring" :style="'border-top-color:' + color"></view>
      <text class="tvs-load-t">正在切换…</text>
      <view class="tvs-bar"><view class="tvs-bar-in" :style="'background:' + color"></view></view>
    </view>
  </view>
</template>

<script setup>
// 一台大屏的画面：按投放分类画出电视上会显示的样子（计时器主题、海报、签到墙、赛事列表、休眠、离线）
import { ref, computed, watch, onUnmounted } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZFitImg from '@/components/z-fit-img/z-fit-img.vue'
import { contentCover, currentRoom } from '@/common/screens.js'
import { posterFit, posterImageSrc, posterImageSize, screenResolution } from '@/common/poster-display.js'
import { topPlayers } from '@/mock/workbench.js'
import { hostMatches } from '@/mock/plaza.js'

const props = defineProps({
  content: { type: Object, default: () => ({ cat: '' }) },
  groups: { type: Array, default: () => [] },
  deviceId: { type: String, default: '' },
  lastScene: { type: String, default: '' },
  resolution: { type: Object, default: () => ({ w: 3840, h: 2160 }) },
  previewWidth: { type: Number, default: 0 },
  online: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  playing: { type: Boolean, default: true },
  badge: { type: String, default: '' },
  color: { type: String, default: '#FFFFFF' }
})
const kind = computed(() => (!props.online ? 'off' : props.content.cat || 'off'))
const cover = computed(() => contentCover(props.content, props.groups, props.deviceId, props.lastScene))
const room = currentRoom()
const group = computed(() => props.groups.find((x) => x.id === props.content.groupId))
const groupName = computed(() => group.value ? group.value.name : '')
const posterImages = computed(() => group.value ? group.value.images || [] : [])
const fit = computed(() => posterFit(group.value))
const posterKey = computed(() => `${props.content.groupId}-${fit.value}-${props.resolution.w}x${props.resolution.h}`)
const posterInterval = computed(() => Math.max(1, Number(group.value && group.value.dwell) || 8) * 1000)
const posterIndex = ref(0)
let posterTimer = null
// 普通画面层只自动轮播，不注册滑动手势；触摸直接冒泡给遥控页。
watch(posterKey, () => { posterIndex.value = 0 })
watch([kind, posterKey, posterInterval, () => posterImages.value.length, () => props.loading, () => props.playing], () => {
  clearInterval(posterTimer)
  if (posterIndex.value >= posterImages.value.length) posterIndex.value = 0
  if (kind.value !== 'poster' || props.loading || !props.playing || posterImages.value.length < 2) return
  posterTimer = setInterval(() => { posterIndex.value = (posterIndex.value + 1) % posterImages.value.length }, posterInterval.value)
}, { immediate: true })
onUnmounted(() => clearInterval(posterTimer))
const centerScale = computed(() => props.previewWidth / screenResolution(props.resolution).w)
const avatars = topPlayers.concat(topPlayers.slice(0, 2))
const p2 = (n) => (n < 10 ? '0' : '') + n
const matches = hostMatches.slice(0, 3).map((m) => { const d = new Date(m.startAt); return { id: m.id, name: m.name, t: m.startAt <= Date.now() ? '进行中' : `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}` } })
</script>

<style>
.tvs { position: relative; width: 100%; height: 100%; overflow: hidden; background: #050507; }
.tvs-bg { position: absolute; left: 0; top: 0; right: 0; bottom: 0; width: 100%; height: 100%; }
.tvs-poster { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity .7s ease; }
.tvs-poster-on { opacity: 1; }
.tvs-fill { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tvs-theme { background: rgba(4, 6, 10, .55); }
.tvs-lv { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 20rpx; letter-spacing: 2rpx; color: #FFB547; }
.tvs-time { margin-top: 4rpx; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 96rpx; line-height: 1; color: #F2F2EE; text-shadow: 0 0 24rpx rgba(242, 242, 238, .3); }
.tvs-room { margin-top: 8rpx; font-size: 18rpx; color: rgba(242, 242, 238, .7); }
.tvs-wall { background: rgba(4, 18, 10, .62); }
.tvs-list { background: rgba(4, 8, 20, .66); align-items: stretch; padding: 0 40rpx; }
.tvs-h { font-size: 22rpx; font-weight: 700; letter-spacing: 4rpx; color: #F2F2EE; }
.tvs-list .tvs-h { text-align: left; margin-bottom: 10rpx; }
.tvs-grid { margin-top: 12rpx; width: 360rpx; display: flex; flex-wrap: wrap; justify-content: center; }
.tvs-av { width: 44rpx; height: 44rpx; margin: 6rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18rpx; font-weight: 600; }
.tvs-av-wait { opacity: .25; }
.tvs-cnt { margin-top: 10rpx; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 20rpx; color: #3DDC97; }
.tvs-row { display: flex; justify-content: space-between; height: 48rpx; align-items: center; border-top: 1rpx solid rgba(255, 255, 255, .12); }
.tvs-row-n { font-size: 20rpx; color: #E5E7EB; }
.tvs-row-t { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 18rpx; color: #4DA3FF; }
.tvs-sleep { background: #030305; }
.tvs-off { background: #15161B; }
.tvs-dim { margin-top: 8rpx; font-size: 18rpx; color: #4B5060; }
.tvs-chip { position: absolute; left: 14rpx; bottom: 12rpx; max-width: 70%; padding: 4rpx 12rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .6); font-size: 18rpx; color: #F2F2EE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tvs-badge { position: absolute; left: 14rpx; top: 12rpx; display: flex; align-items: center; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .6); font-size: 18rpx; color: #E5E7EB; }
.tvs-badge-pv { background: rgba(10, 10, 12, .55); border: 2rpx dashed; font-weight: 700; letter-spacing: 2rpx; }
.tvs-live { width: 10rpx; height: 10rpx; margin-right: 8rpx; border-radius: 50%; background: #3DDC97; box-shadow: 0 0 8rpx #3DDC97; }
.tvs-loading { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(4, 4, 8, .72); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tvs-ring { width: 56rpx; height: 56rpx; box-sizing: border-box; border-radius: 50%; border: 5rpx solid rgba(255, 255, 255, .15); animation: tvs-spin .8s linear infinite; }
@keyframes tvs-spin { to { transform: rotate(360deg); } }
.tvs-load-t { margin-top: 14rpx; font-size: 20rpx; color: #E5E7EB; }
.tvs-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 6rpx; background: rgba(255, 255, 255, .1); }
.tvs-bar-in { height: 6rpx; animation: tvs-load .9s ease-out forwards; }
@keyframes tvs-load { from { width: 0; } to { width: 100%; } }
</style>
