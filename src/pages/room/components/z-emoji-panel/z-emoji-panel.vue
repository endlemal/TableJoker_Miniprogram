<template>
  <view class="ep">
    <view class="ep-grab"></view>
    <text class="ep-t">{{ curCat.name }}</text>
    <scroll-view scroll-y class="ep-grid-w">
      <view class="ep-grid"><text v-for="e in list" :key="e" class="ep-e" hover-class="ep-press" @tap="pick(e)">{{ e }}</text></view>
    </scroll-view>
    <!-- 底部：分类和删除 -->
    <view class="ep-nav">
      <view v-for="c in EMOJI_CATS" :key="c.key" class="ep-cat" :class="{ 'ep-cat-on': cat === c.key }" @tap="cat = c.key"><text class="ep-cat-t">{{ c.icon }}</text></view>
      <view class="ep-del" hover-class="ep-press" @tap="emit('del')"><z-icon name="backspace" :size="22" color="#C9CDD4" /></view>
    </view>
  </view>
</template>

<script setup>
// 表情面板：上面是表情网格，下面是分类和删除；「常用」里先放最近用过的
import { ref, computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { EMOJI_CATS, recentEmoji, rememberEmoji } from '@/common/emoji.js'

const emit = defineEmits(['pick', 'del'])
const cat = ref('recent')
const recent = ref(recentEmoji())
const curCat = computed(() => EMOJI_CATS.find((c) => c.key === cat.value))
const list = computed(() => (cat.value === 'recent' ? [...new Set(recent.value.concat(curCat.value.list))].slice(0, 32) : curCat.value.list))
function pick(e) {
  rememberEmoji(e)
  recent.value = recentEmoji()
  emit('pick', e)
}
</script>

<style>
.ep { height: 300px; padding-bottom: env(safe-area-inset-bottom); box-sizing: content-box; background: #2C2F36; border-radius: 16px 16px 0 0; display: flex; flex-direction: column; animation: ep-in 240ms cubic-bezier(.2, .8, .2, 1); }
@keyframes ep-in { from { transform: translateY(24px); opacity: .4; } to { transform: none; opacity: 1; } }
.ep-grab { width: 36px; height: 4px; margin: 8px auto 0; border-radius: 2px; background: #4B4F58; }
.ep-t { padding: 8px 16px 4px; font-size: 13px; color: #A9AEB8; }
.ep-grid-w { flex: 1; min-height: 0; }
.ep-grid { padding: 0 8px; display: flex; flex-wrap: wrap; }
.ep-e { width: 12.5%; height: 44px; line-height: 44px; text-align: center; font-size: 28px; }
.ep-nav { height: 52px; padding: 0 8px; border-top: 1px solid #383C45; display: flex; align-items: center; }
.ep-cat { width: 44px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.ep-cat-on { background: #3A3E48; }
.ep-cat-t { font-size: 22px; }
.ep-del { margin-left: auto; width: 52px; height: 40px; border-radius: 10px; background: #3A3E48; display: flex; align-items: center; justify-content: center; }
.ep-press { opacity: .6; }
</style>
