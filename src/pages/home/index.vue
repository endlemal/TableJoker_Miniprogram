<template>
  <view class="home">
    <!-- 服务器栏 -->
    <view class="rail" :style="railStyle">
      <view class="logo" hover-class="press" @tap="toast('桌游聚')">
        <view class="logo-pip" style="left:26rpx;top:26rpx"></view>
        <view class="logo-pip" style="left:54rpx;top:26rpx"></view>
        <view class="logo-pip" style="left:26rpx;top:54rpx"></view>
        <view class="logo-pip" style="left:54rpx;top:54rpx"></view>
      </view>
      <view class="rail-sep"></view>
      <view v-for="s in servers" :key="s.id" class="srv-wrap" @tap="current = s.id">
        <view v-if="s.id === current" class="srv-ind"></view>
        <view class="srv" :class="{ 'srv-on': s.id === current }" :style="{ background: s.bg }" hover-class="press">
          <z-icon :name="s.icon" :size="24" :color="s.fg" />
          <view v-if="s.unread" class="srv-badge"><text>{{ s.unread }}</text></view>
        </view>
      </view>
      <view class="srv srv-add" hover-class="press" @tap="toast('添加服务器')">
        <z-icon name="plus" :size="24" color="#FF4D4D" />
      </view>
    </view>

    <view class="main" :style="mainStyle">
      <!-- 胶囊所在行：显示当前服务器名 -->
      <view class="topbar" :style="topbarStyle">
        <text class="srv-name">{{ currentServer.name }}</text>
        <z-icon name="chevron-down" :size="16" color="#9CA3AF" />
      </view>

      <!-- 比赛卡片 -->
      <view class="card match">
        <view class="match-head">
          <text class="match-title">比赛</text>
          <view class="dice-art">
            <view class="da-shadow"></view>
            <view class="pawn-base"></view>
            <view class="pawn-body"></view>
            <view class="pawn-collar"></view>
            <view class="pawn-head"></view>
            <view class="die die-a"><view class="pip pip-ace"></view></view>
            <view class="die die-b">
              <view class="pip pip-s" style="left:11rpx;top:11rpx"></view>
              <view class="pip pip-s" style="left:37rpx;top:11rpx"></view>
              <view class="pip pip-s" style="left:11rpx;top:37rpx"></view>
              <view class="pip pip-s" style="left:37rpx;top:37rpx"></view>
            </view>
          </view>
        </view>
        <text class="match-sub">创建专属您与朋友的桌游空间</text>
        <text class="match-desc">服务器是您和朋友聚首的地方，创建您自己的房间比赛，开始畅聊吧。</text>
        <view class="btn-primary" hover-class="press" @tap="createMatch">
          <z-icon name="plus" :size="18" color="#FFFFFF" />
          <text class="btn-label">创建比赛</text>
        </view>
        <view class="btn-row">
          <view class="btn-scan" hover-class="press" @tap="scanJoin">
            <z-icon name="scan" :size="20" color="#FFFFFF" />
          </view>
          <view class="btn-invite" hover-class="press" @tap="joinByLink">
            <z-icon name="link" :size="18" color="#FFFFFF" />
            <text class="btn-label-sm">我有一个邀请链接</text>
          </view>
        </view>
      </view>

      <!-- 赛事卡片 -->
      <view class="card event" hover-class="press-soft" @tap="uni.navigateTo({ url: '/pages/room/index' })">
        <view class="event-banner" :style="bannerStyle">
          <view class="event-more" @tap.stop="toast('更多操作')">
            <z-icon name="dots" :size="16" color="#FFFFFF" />
          </view>
        </view>
        <view class="event-body">
          <view class="event-avatar"><z-icon name="trophy" :size="24" color="#5C3B00" /></view>
          <view class="event-name-row">
            <view v-if="event.verified" class="verified"><z-icon name="check" :size="11" :stroke="3" color="#FFFFFF" /></view>
            <text class="event-name">{{ event.name }}</text>
          </view>
          <text class="event-desc">{{ event.desc }}</text>
          <view class="event-meta">
            <view class="meta-left">
              <view v-for="(m, i) in event.members" :key="i" class="mini-av" :class="{ 'mini-av-on': i > 0 }" :style="{ background: m.bg, color: m.fg }">
                <text>{{ m.c }}</text>
              </view>
              <text class="meta-count">{{ event.signed }}/{{ event.capacity }} 已报名</text>
            </view>
            <view class="meta-time">
              <z-icon name="calendar-event" :size="14" color="#FF4D4D" />
              <text class="meta-time-text">{{ event.time }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部用户栏：点击进入个人主页 -->
    <view class="dock-bar" hover-class="press-soft" @tap="toProfile">
      <view>
        <view class="dock-rank">
          <z-icon name="diamond" :size="14" color="#F4B740" />
          <text class="dock-rank-text">{{ me.rank }}</text>
        </view>
        <text class="dock-name">{{ me.nickname }}</text>
      </view>
      <view class="dock-right">
        <!-- 直达广场：不用先进个人主页再切换 -->
        <view class="dock-plaza" hover-class="press" @tap.stop="toPlaza">
          <z-icon name="compass" :size="16" color="#FFFFFF" />
          <text class="dock-plaza-t">广场</text>
          <view class="dock-plaza-n"><text>{{ openMatches }}</text></view>
        </view>
        <view class="dock-set" hover-class="press" @tap.stop="toast('设置')">
          <z-icon name="settings" :size="18" color="#9CA3AF" />
        </view>
      </view>
    </view>
    <view class="dock-avatar" @tap="toProfile">
      <text>{{ me.char }}</text>
      <view v-if="me.online" class="dock-online"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics } from '@/common/nav.js'
import { svgUri, bloodMoonBanner } from '@/common/svg.js'
import { me, servers, featuredEvent as event } from '@/mock/data.js'
import { publicMatches } from '@/mock/plaza.js'

const nav = getNavMetrics()
const current = ref(servers[0].id)
const currentServer = computed(() => servers.find((s) => s.id === current.value) || servers[0])

const railStyle = `padding-top:${nav.statusBar + Math.max(8, (nav.navH - 48) / 2)}px`
const mainStyle = `padding-top:${nav.statusBar}px`
const topbarStyle = `height:${nav.navH}px;padding-right:${nav.capsuleW + 12}px`
const bannerStyle = `background-image:url("${svgUri(bloodMoonBanner())}")`

const toast = (title) => uni.showToast({ title, icon: 'none' })
const toProfile = () => uni.navigateTo({ url: '/pages/profile/index' })
const toPlaza = () => uni.navigateTo({ url: '/pages/plaza/index' })
const openMatches = publicMatches.length
const createMatch = () => uni.navigateTo({ url: '/pages/create/index' })

function scanJoin() {
  uni.scanCode({
    success: () => uni.navigateTo({ url: '/pages/room/index' }),
    fail: (err) => {
      if (!/cancel/.test(err && err.errMsg)) toast('当前环境不支持扫码')
    }
  })
}

function joinByLink() {
  uni.showModal({
    title: '加入比赛',
    editable: true,
    placeholderText: '粘贴邀请链接',
    confirmText: '加入',
    success: (res) => {
      if (!res.confirm) return
      if (!res.content) return toast('先粘贴邀请链接')
      uni.navigateTo({ url: '/pages/room/index' })
    }
  })
}
</script>

<style>
.home { min-height: 100vh; background: #181A20; }
.press { opacity: .82; transform: scale(.97); }
.press-soft { opacity: .9; }

/* 服务器栏 */
.rail {
  position: fixed; left: 0; top: 0; bottom: 0; width: 144rpx; z-index: 10;
  padding-bottom: calc(240rpx + env(safe-area-inset-bottom));
  background: #121419; display: flex; flex-direction: column; align-items: center;
}
.logo { position: relative; width: 96rpx; height: 96rpx; border-radius: 32rpx; background: #F3EEE6; }
.logo-pip { position: absolute; width: 17rpx; height: 17rpx; border-radius: 50%; background: #DC0000; }
.rail-sep { width: 64rpx; height: 4rpx; border-radius: 2rpx; background: #2A2D36; margin: 24rpx 0; }
.srv-wrap { position: relative; margin-bottom: 24rpx; }
.srv-ind { position: absolute; left: -24rpx; top: 12rpx; width: 8rpx; height: 72rpx; border-radius: 0 6rpx 6rpx 0; background: #DC0000; }
.srv { position: relative; width: 96rpx; height: 96rpx; border-radius: 32rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.srv-badge {
  position: absolute; right: -10rpx; bottom: -10rpx; width: 40rpx; height: 40rpx; box-sizing: border-box;
  border-radius: 50%; background: #DC0000; border: 6rpx solid #121419;
  display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 600; color: #FFFFFF;
}
.srv-add { background: #2A1216; border: 2rpx dashed #7A2A2E; }

/* 主区域 */
.main { padding-left: 144rpx; padding-bottom: calc(240rpx + env(safe-area-inset-bottom)); }
.topbar { display: flex; align-items: center; padding-left: 28rpx; box-sizing: border-box; }
.srv-name { font-size: 34rpx; font-weight: 600; color: #FFFFFF; margin-right: 8rpx; }
.card { margin: 16rpx 24rpx 28rpx; background: #1F222A; border-radius: 32rpx; }

/* 比赛卡片 */
.match { padding: 36rpx; }
.match-head { display: flex; align-items: flex-end; justify-content: space-between; }
.match-title {
  font-family: "ZZDisplay", "BoardHei", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 68rpx; line-height: 1; letter-spacing: 4rpx; padding-bottom: 20rpx; color: #FFFFFF;
}
.dice-art { position: relative; width: 248rpx; height: 164rpx; flex: none; }
.da-shadow { position: absolute; left: 20rpx; top: 140rpx; width: 216rpx; height: 20rpx; border-radius: 50%; background: #181A20; }
.pawn-base { position: absolute; left: 114rpx; top: 118rpx; width: 56rpx; height: 14rpx; border-radius: 7rpx; background: #A30000; }
.pawn-body {
  position: absolute; left: 126rpx; top: 70rpx; width: 32rpx; height: 48rpx; background: #DC0000;
  -webkit-clip-path: polygon(0 100%, 100% 100%, 75% 0, 25% 0); clip-path: polygon(0 100%, 100% 100%, 75% 0, 25% 0);
}
.pawn-collar { position: absolute; left: 124rpx; top: 62rpx; width: 36rpx; height: 10rpx; border-radius: 5rpx; background: #A30000; }
.pawn-head { position: absolute; left: 124rpx; top: 28rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #DC0000; }
.die { position: absolute; background: #F3EEE6; }
.die-a { left: 28rpx; top: 52rpx; width: 80rpx; height: 80rpx; border-radius: 20rpx; transform: rotate(-14deg); box-shadow: 0 8rpx 0 #BDB4A6; }
.die-b { left: 166rpx; top: 74rpx; width: 60rpx; height: 60rpx; border-radius: 16rpx; transform: rotate(12deg); box-shadow: 0 6rpx 0 #BDB4A6; }
.pip { position: absolute; border-radius: 50%; background: #DC0000; }
.pip-ace { left: 25rpx; top: 25rpx; width: 30rpx; height: 30rpx; }
.pip-s { width: 13rpx; height: 13rpx; }
.match-sub { display: block; margin-top: 20rpx; font-size: 30rpx; font-weight: 500; line-height: 1.5; color: #FFFFFF; }
.match-desc { display: block; margin-top: 12rpx; font-size: 28rpx; line-height: 1.7; color: #9CA3AF; }
.btn-primary {
  margin-top: 56rpx; height: 104rpx; border-radius: 999rpx; background: #DC0000;
  box-shadow: 0 16rpx 48rpx rgba(220, 0, 0, .35);
  display: flex; align-items: center; justify-content: center;
}
.btn-label { margin-left: 12rpx; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
.btn-row { display: flex; margin-top: 24rpx; }
.btn-scan { width: 96rpx; height: 96rpx; flex: none; border-radius: 50%; background: #35383F; display: flex; align-items: center; justify-content: center; }
.btn-invite { flex: 1; margin-left: 20rpx; height: 96rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; justify-content: center; }
.btn-label-sm { margin-left: 12rpx; font-size: 28rpx; font-weight: 500; color: #FFFFFF; }

/* 赛事卡片 */
.event { overflow: hidden; }
.event-banner { position: relative; height: 192rpx; background-color: #1C1117; background-size: cover; background-position: center; }
.event-more {
  position: absolute; top: 20rpx; right: 20rpx; width: 60rpx; height: 60rpx; border-radius: 50%;
  background: rgba(14, 15, 19, .6); border: 1rpx solid rgba(255, 255, 255, .12);
  display: flex; align-items: center; justify-content: center; box-sizing: border-box;
}
.event-body { position: relative; padding: 16rpx 28rpx 28rpx; }
.event-avatar {
  position: absolute; left: 28rpx; top: -60rpx; width: 120rpx; height: 120rpx; box-sizing: border-box;
  border-radius: 50%; background: #F4B740; border: 8rpx solid #1F222A;
  display: flex; align-items: center; justify-content: center;
}
.event-name-row { display: flex; align-items: center; height: 44rpx; padding-left: 140rpx; }
.verified { width: 32rpx; height: 32rpx; flex: none; margin-right: 12rpx; border-radius: 50%; background: #22C55E; display: flex; align-items: center; justify-content: center; }
.event-name { font-size: 30rpx; font-weight: 500; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.event-desc { display: block; margin-top: 24rpx; font-size: 26rpx; line-height: 1.65; color: #9CA3AF; }
.event-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; padding-top: 20rpx; border-top: 1rpx solid #2E313A; }
.meta-left { display: flex; align-items: center; }
.mini-av {
  width: 44rpx; height: 44rpx; box-sizing: border-box; border-radius: 50%; border: 4rpx solid #1F222A;
  display: flex; align-items: center; justify-content: center; font-size: 22rpx;
}
.mini-av-on { margin-left: -12rpx; }
.meta-count { margin-left: 16rpx; font-size: 24rpx; color: #9CA3AF; }
.meta-time { display: flex; align-items: center; }
.meta-time-text { margin-left: 8rpx; font-size: 24rpx; color: #E5E7EB; }

/* 底部用户栏 */
.dock-bar {
  position: fixed; z-index: 20; left: 104rpx; right: 24rpx; bottom: calc(64rpx + env(safe-area-inset-bottom));
  height: 112rpx; box-sizing: border-box; padding: 0 20rpx 0 56rpx;
  background: #1F222A; border: 1rpx solid #2A2D36; border-radius: 32rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.dock-rank { display: flex; align-items: center; }
.dock-rank-text { margin-left: 8rpx; font-size: 24rpx; font-weight: 500; color: #F4B740; }
.dock-name { display: block; margin-top: 4rpx; font-size: 34rpx; font-weight: 500; color: #FFFFFF; }
.dock-right { display: flex; align-items: center; }
.dock-plaza {
  position: relative; height: 72rpx; margin-right: 16rpx; padding: 0 24rpx 0 20rpx; box-sizing: border-box;
  border-radius: 999rpx; background: #2A1216; border: 1rpx solid #5A2228; display: flex; align-items: center;
}
.dock-plaza-t { margin-left: 8rpx; font-size: 26rpx; font-weight: 500; color: #FFFFFF; }
.dock-plaza-n {
  position: absolute; top: -12rpx; right: -10rpx; min-width: 34rpx; height: 34rpx; padding: 0 8rpx; box-sizing: border-box;
  border-radius: 999rpx; background: #DC0000; border: 4rpx solid #1F222A;
  display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 600; color: #FFFFFF;
}
.dock-set { width: 72rpx; height: 72rpx; border-radius: 50%; background: #2A2D36; display: flex; align-items: center; justify-content: center; }
.dock-avatar {
  position: fixed; z-index: 21; left: 16rpx; bottom: calc(64rpx + env(safe-area-inset-bottom));
  width: 130rpx; height: 130rpx; box-sizing: border-box; border-radius: 50%;
  background: #F1E4D3; border: 6rpx solid #121419;
  display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 500; color: #8A1C1C;
}
.dock-online { position: absolute; right: -6rpx; bottom: -6rpx; width: 32rpx; height: 32rpx; box-sizing: border-box; border-radius: 50%; background: #22C55E; border: 6rpx solid #121419; }
</style>
