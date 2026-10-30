<template>
  <!-- 直播间式气泡弹幕：靠左，最新的在最下面，越早的越淡 -->
  <view class="dmk">
    <view v-for="(m, i) in shown" :key="m.id" class="dmk-i" :style="'opacity:' + fadeOf(i)" @tap="emit('open')">
      <view v-if="m.kind === 'system'" class="dmk-av dmk-sys"><z-icon name="pin" :size="13" color="#C9CDD4" /></view>
      <view v-else class="dmk-av" :style="'background:' + m.from.bg + ';color:' + m.from.fg"><text class="dmk-c">{{ m.from.c }}</text></view>
      <view class="dmk-b" :class="{ 'dmk-b-sys': m.kind === 'system' }">
        <text class="dmk-t"><text v-if="m.kind !== 'system'" class="dmk-n">{{ m.from.name }}：</text>{{ m.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
// 只负责主界面的展示：显示最近几条，较早的逐渐变淡；完整的消息记录在「房间弹幕列表」页
import { computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'

const props = defineProps({ list: { type: Array, default: () => [] }, max: { type: Number, default: 5 } })
const emit = defineEmits(['open'])
const shown = computed(() => props.list.slice(-props.max))
// 从最新往前：1、0.82、0.62、0.42、0.25
const FADE = [1, 0.82, 0.62, 0.42, 0.25]
const fadeOf = (i) => FADE[Math.min(FADE.length - 1, shown.value.length - 1 - i)]
</script>

<style>
.dmk { display: flex; flex-direction: column; align-items: flex-start; }
.dmk-i { max-width: 82%; margin-top: 8px; display: flex; align-items: flex-start; transition: opacity 260ms ease; animation: dmk-in 260ms cubic-bezier(.2, .8, .2, 1); }
@keyframes dmk-in { from { transform: translateY(14px); opacity: 0; } to { transform: none; } }
.dmk-av { width: 28px; height: 28px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.dmk-c { font-size: 12px; font-weight: 600; }
.dmk-sys { background: #33363E; }
.dmk-b { margin-left: 8px; padding: 5px 12px; border-radius: 16px; background: rgba(24, 26, 32, .72); border: 1px solid rgba(243, 238, 230, .28); }
.dmk-t { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dmk-b-sys { border-color: rgba(201, 205, 212, .2); }
.dmk-n { font-size: 14px; line-height: 20px; color: #C9CDD4; }
.dmk-t { font-size: 14px; line-height: 20px; color: #F3EEE6; word-break: break-all; }
.dmk-b-sys .dmk-t { color: #C9CDD4; }
</style>
