<template>
  <view v-if="alive" class="pp" :class="{ 'pp-on': on }">
    <view class="pp-mask" @tap="close"></view>
    <view class="pp-card">
      <view class="pp-head">
        <text class="pp-title">选择省份</text>
        <view class="pp-x" hover-class="pp-press" @tap="close"><z-icon name="x" :size="16" color="#94A3B8" /></view>
      </view>

      <view v-if="canRetry" class="pp-retry" hover-class="pp-press" @tap="emit('retry-locate')">
        <z-icon name="map-pin" :size="15" color="#FF6B6B" />
        <text class="pp-retry-t">定位失败，点这里重新定位</text>
      </view>

      <scroll-view scroll-y class="pp-list" :scroll-into-view="scrollId">
        <view
          v-for="(p, i) in provinces"
          :id="'pp-' + i"
          :key="p"
          class="pp-item"
          :class="{ 'pp-item--on': value === p }"
          hover-class="pp-press"
          @tap="pick(p)"
        >
          <text class="pp-item-t">{{ shortRegion(p) }}</text>
          <z-icon v-if="value === p" name="check" :size="16" :stroke="2.5" color="#FF6B6B" />
        </view>
        <view class="pp-safe"></view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
// 省份选择器：定位失败时的兜底。只到省级别，单个滚动列表。
// 由父组件 v-model 控制显示；change 返回完整省份名（如「广东省」）。
import { ref, computed, watch } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { provinces, shortRegion } from '@/common/regions.js'

defineOptions({ options: { virtualHost: true } })

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  value: { type: String, default: '' },
  canRetry: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change', 'retry-locate'])

const alive = ref(false)
const on = ref(false)
let timer = null

watch(() => props.modelValue, (v) => {
  clearTimeout(timer)
  if (v) {
    alive.value = true
    timer = setTimeout(() => { on.value = true }, 20)
  } else {
    on.value = false
    timer = setTimeout(() => { alive.value = false }, 260)
  }
})

const scrollId = computed(() => {
  const i = provinces.indexOf(props.value)
  return i >= 0 ? 'pp-' + i : ''
})

function close() {
  emit('update:modelValue', false)
}
function pick(name) {
  emit('change', name)
}
</script>

<style scoped>
.pp { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 400; }
.pp-mask {
  position: absolute; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(6, 6, 10, .62); backdrop-filter: blur(6px);
  opacity: 0; transition: opacity .26s ease;
}
.pp-on .pp-mask { opacity: 1; }

.pp-card {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; box-sizing: border-box;
  padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  border-radius: 40rpx 40rpx 0 0;
  background: #1E1F26;
  border-top: 1rpx solid rgba(255, 255, 255, .08);
  box-shadow: 0 -20rpx 60rpx rgba(0, 0, 0, .5);
  opacity: 0; transform: translateY(60%);
  transition: opacity .26s ease, transform .34s cubic-bezier(.34, 1.3, .64, 1);
}
.pp-on .pp-card { opacity: 1; transform: translateY(0); }

.pp-head { display: flex; align-items: center; justify-content: space-between; }
.pp-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 36rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.pp-x { width: 56rpx; height: 56rpx; border-radius: 50%; background: #2A2B35; display: flex; align-items: center; justify-content: center; }

.pp-retry {
  display: flex; align-items: center; margin-top: 24rpx;
  padding: 18rpx 22rpx; border-radius: 20rpx;
  background: rgba(220, 0, 0, .08); border: 1rpx solid rgba(220, 0, 0, .25);
}
.pp-retry-t { margin-left: 12rpx; font-size: 24rpx; line-height: 1.6; color: #FCA5A5; }

.pp-list { height: 48vh; margin-top: 20rpx; -webkit-overflow-scrolling: touch; }
.pp-item {
  display: flex; align-items: center; justify-content: space-between;
  height: 96rpx; padding: 0 20rpx; box-sizing: border-box; border-radius: 20rpx;
}
.pp-item--on { background: rgba(220, 0, 0, .1); }
.pp-item-t { font-size: 30rpx; color: #CBD5E1; }
.pp-item--on .pp-item-t { color: #FFFFFF; font-weight: 600; }
.pp-press { opacity: .8; transform: scale(.98); }
.pp-safe { height: 20rpx; }

@media (prefers-reduced-motion: reduce) {
  .pp-mask, .pp-card { transition: none; }
}
</style>
