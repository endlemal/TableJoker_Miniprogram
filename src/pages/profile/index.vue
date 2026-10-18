<template>
  <view class="profile">
    <view class="cover" :style="coverStyle"></view>
    <view class="back" :style="backStyle" hover-class="press" @tap="goBackOrHome">
      <z-icon name="arrow-left" :size="20" color="#FFFFFF" />
    </view>

    <view class="sheet">
      <!-- 三项数据，位于头像右侧 -->
      <view class="stats">
        <view class="stat">
          <text class="stat-k">参与了</text>
          <view class="stat-v"><text class="stat-num">{{ me.stats.joined }}</text><text class="stat-unit">场</text></view>
        </view>
        <view class="stat stat-sep">
          <text class="stat-k">创建了</text>
          <view class="stat-v"><text class="stat-num">{{ me.stats.created }}</text><text class="stat-unit">场</text></view>
        </view>
        <view class="stat stat-sep" hover-class="press-soft" @tap="toast('钱包待接入')">
          <text class="stat-k">钱包</text>
          <view class="stat-v"><text class="stat-unit stat-unit-pre">¥</text><text class="stat-num">{{ me.stats.wallet }}</text></view>
        </view>
      </view>

      <!-- 标签 -->
      <view class="tabs">
        <view v-for="(t, i) in tabs" :key="t" class="tab" :class="{ 'tab-on': tab === i }" @tap="tab = i">
          <text>{{ t }}</text>
        </view>
      </view>

      <block v-if="tab === 0">
        <!-- 最近活跃 -->
        <view class="sec-head">
          <text class="sec-title">最近活跃</text>
          <view class="legend">
            <text class="legend-t">少</text>
            <view class="dot d1 legend-dot"></view>
            <view class="dot d2 legend-dot"></view>
            <view class="dot d3 legend-dot"></view>
            <view class="dot d4 legend-dot"></view>
            <text class="legend-t legend-gap">多</text>
            <view class="dot dx legend-peak"></view>
            <text class="legend-t">高峰</text>
          </view>
        </view>
        <view class="punch">
          <view class="punch-row">
            <view class="punch-label"></view>
            <view v-for="d in activity.days" :key="'h' + d" class="punch-cell">
              <text v-if="activity.dayLabels[d]" class="punch-day">{{ activity.dayLabels[d] }}</text>
            </view>
          </view>
          <view v-for="row in activity.rows" :key="row.label" class="punch-row">
            <text class="punch-label">{{ row.label }}</text>
            <view v-for="(v, i) in row.v" :key="i" class="punch-cell">
              <view class="dot" :class="'d' + v"></view>
            </view>
          </view>
        </view>

        <!-- 勋章 -->
        <view class="sec-head sec-head-badge">
          <text class="sec-title">勋章</text>
          <view class="sec-more" hover-class="press-soft" @tap="toast('全部勋章待接入')">
            <text class="sec-more-t">已点亮 {{ earned }}/{{ badgeTotal }}</text>
            <z-icon name="chevron-right" :size="14" color="#9CA3AF" />
          </view>
        </view>
        <view class="hive">
          <view v-for="(h, i) in hexes" :key="i" class="hx" :style="h.outer" @tap="h.name && toast(h.name)">
            <view class="hx-in" :style="h.inner">
              <z-icon v-if="h.icon" :name="h.icon" :size="21" :color="h.iconColor" />
            </view>
          </view>
        </view>
      </block>

      <view v-else class="empty">
        <z-icon :name="tab === 1 ? 'chart-bar' : 'settings'" :size="28" color="#6B7280" />
        <text class="empty-t">{{ tab === 1 ? '战绩' : '我的配置' }}页面待接入</text>
      </view>
    </view>

    <!-- 头像和昵称压在封面与内容面板的交界处 -->
    <view class="avatar">
      <image v-if="who.avatarUrl" class="avatar-img" :src="who.avatarUrl" mode="aspectFill" />
      <text v-else>{{ who.char }}</text>
      <view v-if="me.online" class="avatar-online"></view>
    </view>
    <view class="name-row">
      <text class="nickname">{{ who.nickname }}</text>
      <view class="rank"><z-icon name="diamond" :size="13" color="#F4B740" /><text class="rank-t">{{ me.rank }}</text></view>
    </view>

    <!-- 底部悬浮导航：凹槽 + 选中球，图标在球里，文字在球外 -->
    <z-tabbar :items="navItems" :active="navActive" @change="onNav" />
  </view>
</template>

<script setup>
import { tabItems, tapTab } from '@/common/tabs.js'
import { useProfile } from '@/common/auth.js'
import { useCertState } from '@/common/cert.js'
import { ref, computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZTabbar from '@/components/z-tabbar/z-tabbar.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { svgUri, diceFacesPattern } from '@/common/svg.js'
import { me, activity, badgeRows, badgeTone, badgeTotal } from '@/mock/data.js'

const nav = getNavMetrics()
const tabs = ['主页', '战绩', '我的配置']
const tab = ref(0)

const coverStyle = `background-image:url("${svgUri(diceFacesPattern())}")`
const backStyle = `top:${nav.statusBar + Math.max(0, (nav.navH - 40) / 2)}px`

// 蜂巢坐标：勋章 96×110rpx，横向间距 108rpx，行距 92rpx，奇数行错开半格
const hexes = []
let earned = 0
badgeRows.forEach((row, r) => {
  const left0 = r % 2 === 0 ? 25 : 79
  row.forEach((b, c) => {
    const tone = badgeTone[b ? b.tone : 'locked']
    if (b) earned++
    hexes.push({
      name: b ? b.name : '',
      icon: b ? b.icon : '',
      iconColor: tone.icon,
      outer: `left:${left0 + c * 108}rpx;top:${24 + r * 92}rpx;background:${tone.rim}`,
      inner: `background:${tone.fill}`
    })
  })
})

const toast = (title) => uni.showToast({ title, icon: 'none' })

// 底部导航：第四个入口随认证状态变化（认证后模式切换时自动更新）
const who = useProfile()
const certState = useCertState()
const navItems = computed(() => tabItems(certState.value))
const navActive = ref(0)
function onNav(i) {
  tapTab(navItems.value, i, 'me', (k) => { navActive.value = k })
}
</script>

<style>
/* 用 padding 而不是 .sheet 的 margin-top，避免外边距穿透父元素把封面、头像一起推下去 */
.profile { position: relative; min-height: 100vh; box-sizing: border-box; padding-top: 328rpx; background: #181A20; }
.press { opacity: .82; transform: scale(.97); }
.press-soft { opacity: .85; }

.cover { position: absolute; left: 0; top: 0; right: 0; height: 400rpx; background-color: #1A1418; background-size: 160rpx 160rpx; }
.back {
  position: fixed; z-index: 30; left: 32rpx; width: 80rpx; height: 80rpx; box-sizing: border-box; border-radius: 50%;
  background: rgba(14, 15, 19, .6); border: 1rpx solid rgba(255, 255, 255, .12);
  display: flex; align-items: center; justify-content: center;
}

.sheet {
  position: relative; z-index: 1; min-height: calc(100vh - 328rpx);
  padding: 20rpx 32rpx calc(300rpx + env(safe-area-inset-bottom)); box-sizing: border-box;
  background: #181A20; border-radius: 56rpx 56rpx 0 0;
}

.stats { margin-left: 212rpx; height: 92rpx; display: flex; }
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.stat-sep { border-left: 1rpx solid #2E313A; }
.stat-k { font-size: 24rpx; color: #9CA3AF; }
.stat-v { margin-top: 8rpx; display: flex; align-items: baseline; }
.stat-num { font-size: 40rpx; font-weight: 600; line-height: 1.1; color: #FFFFFF; }
.stat-unit { margin-left: 4rpx; font-size: 24rpx; color: #9CA3AF; }
.stat-unit-pre { margin-left: 0; margin-right: 4rpx; }

.tabs { margin-top: 28rpx; height: 80rpx; box-sizing: border-box; padding: 8rpx; border-radius: 999rpx; background: #1F222A; display: flex; }
.tab { flex: 1; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #9CA3AF; }
.tab-on { background: #35383F; color: #FFFFFF; font-weight: 500; }

.sec-head { margin-top: 36rpx; height: 40rpx; display: flex; align-items: center; justify-content: space-between; }
.sec-head-badge { margin-top: 40rpx; }
.sec-title { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }
.legend { display: flex; align-items: center; }
.legend-t { font-size: 22rpx; color: #6B7280; }
.legend-dot { margin-left: 8rpx; }
.legend-gap { margin-left: 8rpx; }
.legend-peak { margin: 0 8rpx 0 16rpx; }
.sec-more { display: flex; align-items: center; }
.sec-more-t { margin-right: 4rpx; font-size: 24rpx; color: #9CA3AF; }

.punch { margin-top: 16rpx; }
.punch-row { display: flex; align-items: center; height: 32rpx; margin-bottom: 6rpx; }
.punch-label { width: 60rpx; flex: none; font-size: 22rpx; color: #6B7280; white-space: nowrap; }
.punch-cell { flex: 1; display: flex; align-items: center; justify-content: center; height: 32rpx; overflow: visible; }
.punch-day { font-size: 22rpx; color: #6B7280; white-space: nowrap; }
.dot { flex: none; border-radius: 50%; }
.d0 { width: 6rpx; height: 6rpx; background: #2C2F38; }
.d1 { width: 10rpx; height: 10rpx; background: #5C574F; }
.d2 { width: 14rpx; height: 14rpx; background: #9A9285; }
.d3 { width: 20rpx; height: 20rpx; background: #D6CEC0; }
.d4 { width: 26rpx; height: 26rpx; background: #F3EEE6; }
.dx { width: 26rpx; height: 26rpx; background: #DC0000; }

.hive { position: relative; margin-top: 16rpx; height: 434rpx; border-radius: 32rpx; background: #121419; overflow: hidden; }
.hx {
  position: absolute; width: 96rpx; height: 110rpx;
  -webkit-clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.hx-in {
  position: absolute; left: 4rpx; top: 4rpx; right: 4rpx; bottom: 4rpx;
  -webkit-clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  display: flex; align-items: center; justify-content: center;
}

.empty { margin-top: 120rpx; display: flex; flex-direction: column; align-items: center; }
.empty-t { margin-top: 16rpx; font-size: 26rpx; color: #6B7280; }

.avatar {
  position: absolute; z-index: 2; left: 40rpx; top: 240rpx; width: 176rpx; height: 176rpx; box-sizing: border-box;
  border-radius: 50%; background: #F1E4D3; border: 8rpx solid #181A20;
  display: flex; align-items: center; justify-content: center; font-size: 68rpx; font-weight: 500; color: #8A1C1C;
}
.avatar-online { position: absolute; right: 4rpx; bottom: 4rpx; width: 40rpx; height: 40rpx; box-sizing: border-box; border-radius: 50%; background: #22C55E; border: 8rpx solid #181A20; }
.name-row { position: absolute; z-index: 2; left: 244rpx; top: 244rpx; height: 68rpx; display: flex; align-items: center; }
.nickname {
  font-family: "ZZDisplay", "BoardHei", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 52rpx; line-height: 1; letter-spacing: 2rpx; color: #FFFFFF;
}
.rank { margin-left: 16rpx; padding: 6rpx 16rpx; border-radius: 999rpx; background: #3A2C10; display: flex; align-items: center; }
.rank-t { margin-left: 6rpx; font-size: 24rpx; font-weight: 500; color: #F4B740; }

.avatar-img { width: 100%; height: 100%; border-radius: 50%; display: block; }
</style>
