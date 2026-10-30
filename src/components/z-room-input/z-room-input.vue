<template>
  <view class="ri">
    <view class="ri-box">
      <view class="ri-ic" hover-class="ri-press" @tap="emit('more')"><z-icon :name="panel === 'more' ? 'x' : 'plus'" :size="22" color="#C9CDD4" /></view>
      <input
        class="ri-in"
        :value="modelValue"
        :focus="focusing"
        :cursor="cursor"
        :adjust-position="false"
        confirm-type="send"
        :confirm-hold="true"
        maxlength="200"
        :placeholder="placeholder"
        placeholder-class="ri-ph"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @confirm="emit('send')"
        @keyboardheightchange="onKb"
      />
      <view class="ri-ic" hover-class="ri-press" @tap="emit('emoji')"><z-icon :name="panel === 'emoji' ? 'keyboard' : 'mood-smile'" :size="22" color="#C9CDD4" /></view>
    </view>
    <!-- 发送：有内容才出现，从右侧平滑展开；发送失败时变成重试 -->
    <view class="ri-send" :class="{ 'ri-send-on': canSend, 'ri-send-fail': failed }" hover-class="ri-press" @tap="emit('send')">
      <z-icon :name="failed ? 'refresh' : 'send'" :size="20" color="#FFFFFF" />
    </view>
  </view>
</template>

<script setup>
// 消息输入栏：左边「更多」，中间输入，右边表情 / 键盘切换；有内容时右侧出现发送按钮。
// 房间页和「房间弹幕列表」页共用。键盘高度通过 kb 事件告诉页面，由页面把输入栏顶在键盘上面
import { ref, computed, watch } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '给房间发消息' },
  panel: { type: String, default: 'none' }, // none / emoji / more
  failed: { type: Boolean, default: false },
  focusKey: { type: Number, default: 0 }, // 页面加一，就唤起键盘
  cursor: { type: Number, default: -1 }
})
const emit = defineEmits(['update:modelValue', 'send', 'more', 'emoji', 'kb', 'focus', 'cursor'])
const canSend = computed(() => props.modelValue.trim().length > 0)
const focusing = ref(false)
watch(() => props.focusKey, () => {
  focusing.value = false
  setTimeout(() => { focusing.value = true }, 30)
})
function onInput(e) {
  emit('update:modelValue', e.detail.value)
  if (typeof e.detail.cursor === 'number') emit('cursor', e.detail.cursor)
}
function onFocus() { emit('focus') }
function onBlur(e) {
  focusing.value = false
  if (e && e.detail && typeof e.detail.cursor === 'number') emit('cursor', e.detail.cursor)
}
const onKb = (e) => emit('kb', (e && e.detail && e.detail.height) || 0)
</script>

<style>
.ri { padding: 8px 12px; display: flex; align-items: center; }
.ri-box { flex: 1; min-width: 0; height: 48px; padding: 0 4px; border-radius: 24px; background: #2C2F36; display: flex; align-items: center; }
.ri-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; }
.ri-in { flex: 1; min-width: 0; height: 44px; font-size: 16px; color: #F3EEE6; }
.ri-ph { color: #8E929B; }
.ri-send { width: 0; height: 44px; margin-left: 0; flex: none; overflow: hidden; border-radius: 14px; background: #5865F2; opacity: 0; transform: scale(.6); display: flex; align-items: center; justify-content: center;
  transition: width 240ms cubic-bezier(.2, .8, .2, 1), margin-left 240ms cubic-bezier(.2, .8, .2, 1), opacity 200ms ease, transform 240ms cubic-bezier(.2, .8, .2, 1); }
.ri-send-on { width: 44px; margin-left: 8px; opacity: 1; transform: none; }
.ri-send-fail { background: #D9534F; }
.ri-press { opacity: .7; }
</style>
