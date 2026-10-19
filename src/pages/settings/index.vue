<template>
  <view class="set">
    <!-- 顶部导航：返回 + 居中标题 -->
    <view class="nav" :style="navStyle">
      <view class="nav-back" :style="backStyle" hover-class="press" @tap="goBackOrHome">
        <z-icon name="arrow-left" :size="20" color="#FFFFFF" />
      </view>
      <text class="nav-title">设置</text>
    </view>

    <view class="body" :style="bodyStyle">
      <!-- 账号卡片 -->
      <view class="card me" hover-class="press-soft" @tap="toProfile">
        <view class="me-av">
          <image v-if="who.avatarUrl" class="me-av-img" :src="who.avatarUrl" mode="aspectFill" />
          <text v-else>{{ who.char }}</text>
        </view>
        <view class="me-main">
          <text class="me-name">{{ who.nickname }}</text>
          <text class="me-sub">{{ subline }}</text>
        </view>
        <z-icon name="chevron-right" :size="16" color="#6B7280" />
      </view>

      <!-- 通用 -->
      <text class="sec-title">通用</text>
      <view class="card group">
        <view v-for="(r, i) in general" :key="r.key" class="row" :class="{ 'row--sep': i > 0 }" @tap="r.action && onRow(r.action)">
          <view class="row-ic" :style="`background:${r.tint}`"><z-icon :name="r.icon" :size="18" :color="r.color" /></view>
          <view class="row-main">
            <text class="row-t">{{ r.title }}</text>
            <text class="row-d">{{ r.desc }}</text>
          </view>
          <switch v-if="r.kind === 'switch'" class="row-sw" :checked="reduceMotion" color="#DC0000" @change="onReduce" />
          <template v-else>
            <text v-if="r.value" class="row-val">{{ r.value }}</text>
            <z-icon name="chevron-right" :size="14" color="#4B5563" />
          </template>
        </view>
      </view>

      <!-- 关于 -->
      <text class="sec-title">关于</text>
      <view class="card group">
        <view v-for="(r, i) in about" :key="r.key" class="row" :class="{ 'row--sep': i > 0 }" @tap="onRow(r.action)">
          <view class="row-ic" :style="`background:${r.tint}`"><z-icon :name="r.icon" :size="18" :color="r.color" /></view>
          <view class="row-main">
            <text class="row-t">{{ r.title }}</text>
            <text v-if="r.desc" class="row-d">{{ r.desc }}</text>
          </view>
          <text v-if="r.value" class="row-val">{{ r.value }}</text>
          <z-icon name="chevron-right" :size="14" color="#4B5563" />
        </view>
      </view>

      <!-- 底部：退出登录 -->
      <view class="logout" hover-class="press" @tap="onLogout">
        <z-icon name="door-enter" :size="18" color="#FF6B6B" />
        <text class="logout-t">退出登录</text>
      </view>
      <text class="logout-note">退出后需要重新登录才能进入桌趣</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { useProfile, logout, requireLogin } from '@/common/auth.js'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'

const nav = getNavMetrics()
const navStyle = `height:${nav.statusBar + nav.navH}px;padding-top:${nav.statusBar}px`
const backStyle = `top:${nav.statusBar + Math.max(0, (nav.navH - 40) / 2)}px`
const bodyStyle = `padding-top:${nav.statusBar + nav.navH + 8}px`

const toast = (title) => uni.showToast({ title, icon: 'none' })

/* ---------- 我：和首页底部用户栏同一份身份信息 ---------- */
const who = useProfile()
const subline = computed(() => [who.seat ? `第 ${who.seat} 位桌友` : '', who.city].filter(Boolean).join(' · ') || '已登录')
const toProfile = () => uni.navigateTo({ url: '/pages/profile/index' })

/* ---------- 设置项 ---------- */
const general = [
  { key: 'motion', icon: 'sparkles', tint: '#28233F', color: '#B8ADF5', title: '减少动态效果', desc: '减少界面动画与过渡效果', kind: 'switch' },
  { key: 'cache', icon: 'refresh', tint: '#17302A', color: '#8FD3B6', title: '清除缓存', desc: '清理图片等临时文件', action: 'cache' }
]
const about = [
  { key: 'help', icon: 'help-circle', tint: '#1E2A38', color: '#9CC3F0', title: '帮助与反馈', desc: '使用问题与建议反馈', action: 'help' },
  { key: 'about', icon: 'dice', tint: '#3A2C10', color: '#F4B740', title: '关于桌趣', value: '演示版 1.0.0', action: 'about' }
]

function onRow(action) {
  if (action === 'cache') return onClearCache()
  if (action === 'help') return toast('帮助与反馈待接入')
  if (action === 'about') {
    uni.showModal({
      title: '关于桌趣',
      content: '桌趣 TableJoker，一个和朋友聚会、组局玩桌游的小平台。当前为演示版 1.0.0。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#DC0000'
    })
  }
}

/* ---------- 减少动态效果：保存在本地 ---------- */
const REDUCE_KEY = 'zz_set_reduce_motion'
const read = (k, d) => {
  try {
    const v = uni.getStorageSync(k)
    return v === '' || v === undefined || v === null ? d : v
  } catch (e) {
    return d
  }
}
const reduceMotion = ref(!!read(REDUCE_KEY, false))
function onReduce(e) {
  reduceMotion.value = !!(e && e.detail && e.detail.value)
  try { uni.setStorageSync(REDUCE_KEY, reduceMotion.value) } catch (e) {}
}

/* ---------- 清除缓存：只提示，账号和比赛数据都不受影响 ---------- */
function onClearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '确定清除本地缓存吗？账号和比赛数据会保留。',
    confirmText: '清除',
    confirmColor: '#DC0000',
    success: (res) => {
      if (res.confirm) toast('缓存已清除')
    }
  })
}

/* ---------- 退出登录：清掉登录态，回到登录页 ---------- */
function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '退出后需要重新登录才能进入桌趣，确定退出吗？',
    confirmText: '退出登录',
    confirmColor: '#DC0000',
    success: (res) => {
      if (!res.confirm) return
      logout()
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
}

onLoad(() => {
  requireLogin()
})
</script>

<style>
.set { min-height: 100vh; background: #181A20; }
.press { opacity: .82; transform: scale(.97); }
.press-soft { opacity: .9; }

/* 顶部导航 */
.nav {
  position: fixed; z-index: 30; left: 0; right: 0; top: 0;
  display: flex; align-items: center; justify-content: center; box-sizing: border-box;
}
.nav-title { font-size: 34rpx; font-weight: 600; color: #FFFFFF; }
.nav-back {
  position: absolute; left: 32rpx; width: 80rpx; height: 80rpx; box-sizing: border-box; border-radius: 50%;
  background: rgba(14, 15, 19, .6); border: 1rpx solid rgba(255, 255, 255, .12);
  display: flex; align-items: center; justify-content: center;
}

/* 内容 */
.body { padding-left: 24rpx; padding-right: 24rpx; padding-bottom: calc(64rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.card { background: #1F222A; border: 1rpx solid #2A2D36; border-radius: 32rpx; overflow: hidden; }

/* 账号卡片 */
.me { margin-top: 8rpx; padding: 28rpx; display: flex; align-items: center; }
.me-av {
  width: 112rpx; height: 112rpx; flex: none; border-radius: 50%; background: #F1E4D3;
  display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 500; color: #8A1C1C;
}
.me-av-img { width: 100%; height: 100%; border-radius: 50%; display: block; }
.me-main { flex: 1; min-width: 0; margin-left: 24rpx; display: flex; flex-direction: column; }
.me-name { font-size: 34rpx; font-weight: 500; color: #FFFFFF; }
.me-sub { margin-top: 8rpx; font-size: 24rpx; color: #9CA3AF; }

/* 分组 */
.sec-title { display: block; margin: 32rpx 8rpx 16rpx; font-size: 26rpx; font-weight: 500; color: #9CA3AF; }
.row { display: flex; align-items: center; padding: 26rpx 28rpx; }
.row--sep { border-top: 1rpx solid #2A2D36; }
.row-ic {
  width: 64rpx; height: 64rpx; flex: none; border-radius: 20rpx;
  display: flex; align-items: center; justify-content: center;
}
.row-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; }
.row-t { font-size: 30rpx; color: #FFFFFF; }
.row-d { margin-top: 6rpx; font-size: 22rpx; color: #6B7280; }
.row-val { margin-right: 8rpx; font-size: 26rpx; color: #6B7280; }
.row-sw { flex: none; margin-left: 16rpx; transform: scale(.85); transform-origin: right center; }

/* 退出登录 */
.logout {
  margin-top: 64rpx; height: 104rpx; box-sizing: border-box; border-radius: 999rpx;
  background: #2A1216; border: 1rpx solid #5A2228;
  display: flex; align-items: center; justify-content: center;
}
.logout-t { margin-left: 12rpx; font-size: 30rpx; font-weight: 500; color: #FF6B6B; }
.logout-note { display: block; margin-top: 16rpx; text-align: center; font-size: 22rpx; color: #6B7280; }
</style>
