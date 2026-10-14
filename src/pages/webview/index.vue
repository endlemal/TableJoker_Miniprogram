<template>
  <web-view v-if="url" :src="url" />
</template>

<script setup>
// 海报广告里的网页链接。小程序里打开外部网页，需要先在微信公众平台配置「业务域名」
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const url = ref('')
onLoad((q) => {
  url.value = decodeURIComponent((q && q.url) || '')
  if (q && q.title) uni.setNavigationBarTitle({ title: decodeURIComponent(q.title) })
})
</script>
