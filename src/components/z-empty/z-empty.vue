<template>
  <view class="ze" :class="{ 'ze-compact': compact }">
    <view class="ze-art" :style="artStyle"></view>
    <text class="ze-t">{{ title }}</text>
    <text v-if="desc" class="ze-d">{{ desc }}</text>
    <view v-if="action || action2" class="ze-acts">
      <view v-if="action" class="ze-btn" hover-class="ze-press" @tap="emit('action')"><text class="ze-btn-t">{{ action }}</text></view>
      <view v-if="action2" class="ze-btn ze-btn-2" hover-class="ze-press" @tap="emit('action2')"><text class="ze-btn-t">{{ action2 }}</text></view>
    </view>
  </view>
</template>

<script setup>
// 空状态：中间一张主题插画 + 标题、说明和操作。
// table 空牌桌（筛选没有结果）、city 城市夜景里的空牌桌（这个城市还没有公开赛）、search 放大镜（搜不到）、comments 对话气泡（还没有评论）
import { computed } from 'vue'
import { svgUri } from '@/common/svg.js'

const props = defineProps({
  kind: { type: String, default: 'table' },
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
  action: { type: String, default: '' },
  action2: { type: String, default: '' },
  compact: { type: Boolean, default: false }
})
const emit = defineEmits(['action', 'action2'])
const LAMP = `<line x1="260" y1="0" x2="260" y2="58" stroke="#4B5060" stroke-width="2"/><path d="M226 84 L244 58 L276 58 L294 84 Z" fill="#DC0000"/><path d="M228 84 L150 250 L370 250 L292 84 Z" fill="#FFE2A8" opacity=".12"/><ellipse cx="260" cy="86" rx="32" ry="6" fill="#FFF3D1"/>`
const TABLE = `<ellipse cx="260" cy="262" rx="150" ry="40" fill="#000" opacity=".35"/><ellipse cx="260" cy="250" rx="140" ry="40" fill="#3B2416"/><ellipse cx="260" cy="248" rx="124" ry="32" fill="#1F5C3F"/><ellipse cx="260" cy="248" rx="100" ry="22" fill="none" stroke="#2E7A55" stroke-width="2"/>` +
  `<rect x="228" y="236" width="20" height="28" rx="3" fill="#F5F0E6" transform="rotate(-12 238 250)"/><rect x="258" y="234" width="20" height="28" rx="3" fill="#C9302C" transform="rotate(10 268 248)"/>` +
  `<ellipse cx="318" cy="252" rx="14" ry="5" fill="#F4B740"/><ellipse cx="318" cy="248" rx="14" ry="5" fill="#DC0000"/><ellipse cx="318" cy="244" rx="14" ry="5" fill="#F5F0E6"/>` +
  `<rect x="96" y="232" width="34" height="40" rx="10" fill="#2A2530"/><rect x="390" y="232" width="34" height="40" rx="10" fill="#2A2530"/>`
const ART = {
  table: LAMP + TABLE,
  city: `<circle cx="420" cy="54" r="22" fill="#F3EEE6" opacity=".85"/><circle cx="430" cy="48" r="20" fill="#181A20"/>` +
    [[20, 120], [70, 90], [110, 140], [150, 70], [330, 110], [370, 80], [420, 130], [460, 95]].map(([x, h]) => `<rect x="${x}" y="${200 - h}" width="38" height="${h}" fill="#262A34"/><rect x="${x + 8}" y="${210 - h}" width="6" height="6" fill="#FFD27A" opacity=".7"/><rect x="${x + 22}" y="${226 - h}" width="6" height="6" fill="#FFD27A" opacity=".5"/>`).join('') + TABLE,
  search: `<rect x="196" y="96" width="96" height="134" rx="12" fill="#262A34" transform="rotate(-8 244 163)"/><rect x="228" y="88" width="96" height="134" rx="12" fill="#35383F" transform="rotate(6 276 155)"/><text x="276" y="172" font-size="54" font-family="sans-serif" font-weight="800" fill="#6B7280" text-anchor="middle">?</text>` +
    `<circle cx="318" cy="176" r="52" fill="#181A20" fill-opacity=".35" stroke="#E5E7EB" stroke-width="10"/><line x1="356" y1="214" x2="404" y2="262" stroke="#E5E7EB" stroke-width="16" stroke-linecap="round"/><line x1="356" y1="214" x2="404" y2="262" stroke="#DC0000" stroke-width="6" stroke-linecap="round"/>`,
  comments: `<rect x="150" y="90" width="170" height="96" rx="30" fill="#35383F"/><path d="M190 182 L176 214 L222 186 Z" fill="#35383F"/>` + [205, 235, 265].map((x) => `<circle cx="${x}" cy="138" r="8" fill="#9CA3AF"/>`).join('') +
    `<rect x="250" y="160" width="140" height="78" rx="26" fill="#DC0000" opacity=".85"/><path d="M350 234 L366 262 L322 238 Z" fill="#DC0000" opacity=".85"/><path d="M302 190 C302 180 318 178 320 190 C322 178 338 180 338 190 C338 204 320 212 320 216 C320 212 302 204 302 190 Z" fill="#FFFFFF"/>`
}
const artStyle = computed(() => `background-image:url("${svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300">${ART[props.kind] || ART.table}</svg>`)}")`)
</script>

<style>
.ze { padding: 40rpx 48rpx 56rpx; display: flex; flex-direction: column; align-items: center; }
.ze-art { width: 520rpx; height: 300rpx; background-size: contain; background-repeat: no-repeat; background-position: center; }
.ze-compact { padding: 16rpx 32rpx 32rpx; }
.ze-compact .ze-art { width: 400rpx; height: 230rpx; }
.ze-t { margin-top: 20rpx; font-size: 30rpx; font-weight: 600; color: #FFFFFF; text-align: center; }
.ze-d { margin-top: 10rpx; font-size: 24rpx; line-height: 1.6; color: #9CA3AF; text-align: center; }
.ze-acts { margin-top: 28rpx; display: flex; }
.ze-btn { height: 72rpx; padding: 0 36rpx; margin: 0 10rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; }
.ze-btn-2 { background: #35383F; }
.ze-btn-t { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }
.ze-press { opacity: .8; }
</style>
