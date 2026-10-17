<template>
  <block v-if="host"><slot /></block>
  <block v-else><slot name="fallback" /></block>
</template>

<script setup>
// 只在主办方模式（已认证）下渲染默认插槽；普通玩家看到 fallback 插槽（可以不传）
// 用法：<z-host-only><view>主办方才有的东西</view><template #fallback>普通玩家看到的</template></z-host-only>
import { computed } from 'vue'
import { useCertState } from '@/common/cert.js'

defineOptions({ options: { virtualHost: true } })
const state = useCertState()
const host = computed(() => state.value === 'verified')
</script>
