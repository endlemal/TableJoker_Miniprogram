<template>
  <page-meta :page-style="sheet ? 'overflow:hidden' : ''"></page-meta>
  <view class="page">
    <view class="cbar" :class="{ 'cbar-on': compact }" :style="cbarStyle">
      <view class="cbar-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
      <text class="cbar-t">海报广告</text>
    </view>
    <view class="head" :style="headStyle">
      <view class="head-row" :style="headRowStyle">
        <view class="h-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="h-title">海报广告</text>
      </view>
    </view>

    <!-- 预览：比例默认跟随已绑定的大屏，按真实的停留时间轮播 -->
    <view class="pv">
      <view class="tv" :style="'width:' + (scr.w + 24) + 'rpx'">
        <view class="tv-scr" :style="'width:' + scr.w + 'rpx;height:' + scr.h + 'rpx'">
          <swiper v-if="cur && cur.images.length" :key="cur.id + '-' + cur.fit + '-' + ratio.key" class="pv-sw" circular :autoplay="true" :interval="cur.dwell * 1000" :duration="700" @change="onSwipe">
            <swiper-item v-for="im in cur.images" :key="im.id">
              <z-fit-img :src="srcOf(im, cur.fit)" :mode="cur.fit" :w="wOf(im)" :h="hOf(im)" :scale="centerScale" />
            </swiper-item>
          </swiper>
          <view v-else class="pv-empty"><z-icon name="photo" :size="28" color="#35383F" /><text class="pv-empty-t">还没有海报组，先从相册上传</text></view>
          <block v-if="cur">
            <text class="pv-tag">{{ cur.name }}</text>
            <text class="pv-idx">{{ idx + 1 }}/{{ cur.images.length }}</text>
            <view class="pv-dots"><view v-for="(im, i) in cur.images" :key="im.id" class="pv-dot" :class="{ 'pv-dot-on': i === idx }"></view></view>
          </block>
        </view>
        <view class="tv-stand"></view>
      </view>
      <view v-if="cur" class="pv-note" :class="{ 'pv-note-ok': onTv }">
        <z-icon :name="onTv ? 'shield-check' : 'info-circle'" :size="12" :color="onTv ? '#4CB582' : '#9CA3AF'" />
        <text class="pv-note-t">{{ onTv ? '已按 ' + cur.renderedFor + ' 预渲染，电视上就是这个效果' : '本地预览 · 审核通过后才会在电视上播放' }}</text>
      </view>
    </view>

    <!-- 当前海报组：状态 + 下一步 -->
    <view v-if="cur" class="cur">
      <view class="cur-l">
        <text class="cur-n">{{ cur.name }}</text>
        <view class="pill" :class="'pill-' + cur.status"><text class="pill-t">{{ statusText(cur) }}</text></view>
      </view>
      <view v-if="ctaText" class="cta" :class="'cta-' + cur.status" hover-class="press" @tap="primary"><text class="cta-t">{{ ctaText }}</text></view>
    </view>
    <text v-if="cur && cur.status === 'rejected'" class="cur-reason">{{ cur.reason }}</text>
    <text v-else-if="cur && cur.status === 'reviewing'" class="cur-hint">一般几分钟内出结果，最长约 30 分钟</text>

    <!-- 画面设置：电视比例、铺盖方式、每张停留（默认收起） -->
    <view v-if="cur" class="set">
      <view class="set-h" hover-class="press-soft" @tap="setOpen = !setOpen">
        <z-icon name="aspect-ratio" :size="16" color="#9CA3AF" />
        <text class="set-sum">{{ ratio.label }} · {{ fitOf(cur.fit).name }} · 每张 {{ cur.dwell }} 秒</text>
        <view class="chev" :class="{ 'chev-up': setOpen }"><z-icon name="chevron-down" :size="16" color="#9CA3AF" /></view>
      </view>
      <view class="fold" :class="{ 'fold-on': setOpen }"><view class="fold-in">
        <view class="set-b">
          <text class="set-k">电视比例</text>
          <view class="chips">
            <view class="chip" :class="{ 'chip-on': !cur.tvRatio }" hover-class="press" @tap="setRatio(null)"><text class="chip-t">跟随设备</text></view>
            <view class="chip" :class="{ 'chip-on': !!cur.tvRatio, 'chip-open': ratioOpen }" hover-class="press" :aria-expanded="ratioOpen" @tap="ratioOpen = !ratioOpen"><text class="chip-t">{{ cur.tvRatio ? '其他尺寸 · ' + ratio.name : '其他尺寸' }}</text><view class="chev ps-ratio-chevron" :class="{ 'chev-up': ratioOpen }"><z-icon name="chevron-down" :size="12" color="#9CA3AF" /></view></view>
          </view>
          <view v-if="ratioOpen" class="chips ratio-chips">
            <view v-for="r in ratioOptions" :key="r.key" class="chip ratio-chip" :class="{ 'chip-on': sameRatio(r) }" hover-class="press" @tap="setRatio(r)">
              <text class="ratio-chip-name">{{ r.chip }}</text>
              <text class="ratio-chip-size">{{ r.w }}×{{ r.h }}</text>
            </view>
          </view>
          <text class="set-k">铺盖方式</text>
          <view class="fits">
            <view v-for="f in FITS" :key="f.key" class="fit" :class="{ 'fit-on': cur.fit === f.key }" hover-class="press" @tap="setFit(f.key)">
              <!-- 示意：深色框是屏幕，浅色块是图片 -->
              <view class="fit-dia"><view class="fit-img" :class="'fit-' + f.key"></view></view>
              <view class="fit-main"><text class="fit-n">{{ f.name }}</text><text class="fit-d">{{ f.desc }}</text></view>
            </view>
          </view>
          <text class="set-k">每张停留</text>
          <view class="chips">
            <view v-for="s in DWELLS" :key="s" class="chip" :class="{ 'chip-on': cur.dwell === s }" hover-class="press" @tap="setDwell(s)"><text class="chip-t">{{ s }} 秒</text></view>
          </view>
          <text class="set-tip">只改铺盖方式和停留时间不需要重新审核，电视会按新的设置重新渲染</text>
        </view>
      </view></view>
    </view>

    <!-- 海报组：每一行是一组，点一下就在上面预览 -->
    <view class="sec-h"><text class="sec-t">海报组</text><text class="sec-n">{{ groups.length }} 组 · 每组在电视上轮播</text></view>
    <view v-for="g in groups" :key="g.id" class="grp" :class="{ 'grp-on': cur && g.id === cur.id }" hover-class="press-soft" @tap="select(g)">
      <view class="grp-h">
        <text class="grp-n">{{ g.name }}</text>
        <text class="grp-m">· {{ g.images.length }} 张 · {{ ago(g.updatedAt) }}</text>
        <view class="pill pill-sm" :class="'pill-' + g.status"><text class="pill-t">{{ statusText(g) }}</text></view>
        <view class="grp-more" hover-class="press" @tap.stop="more(g)"><z-icon name="dots" :size="18" color="#9CA3AF" /></view>
      </view>
      <view class="pol-row">
        <view v-for="(im, i) in g.images.slice(0, 4)" :key="im.id" class="pol" :style="polStyle(g, i)">
          <view class="pol-ph"><z-fit-img :src="srcOf(im)" mode="aspectFill" :w="wOf(im)" :h="hOf(im)" bg="#D9D3C8" /></view>
          <view v-if="i === 3 && g.images.length > 4" class="pol-more"><text class="pol-more-t">+{{ g.images.length - 4 }}</text></view>
        </view>
      </view>
    </view>

    <!-- 相册上传：单独一行 -->
    <view class="up" hover-class="press-soft" @tap="upload">
      <view class="pol pol-up">
        <view class="pol-ph pol-ph-up"><z-icon name="photo-plus" :size="28" color="#6B7280" /></view>
        <text class="pol-cap">相册上传</text>
      </view>
      <view class="up-main">
        <text class="up-t">新建海报组</text>
        <text class="up-d">从相册选 1–{{ MAX_IMAGES }} 张图片，组成一个新的海报组</text>
      </view>
    </view>

    <z-pop :show="pop.show" :text="pop.text" :icon="pop.icon" :tone="pop.tone" />

    <!-- 底部弹层：提交审核 -->
    <view v-if="sheet" class="sh" :class="{ 'sh-on': sheetOn }">
      <view class="sh-mask" @tap="closeSheet"></view>
      <view class="sh-panel">
        <view class="sh-grab"></view>
        <view class="sh-x" hover-class="press" @tap="closeSheet"><z-icon name="x" :size="16" color="#9CA3AF" /></view>
        <block v-if="sheet === 'submit'">
          <text class="sh-title">提交审核</text>
          <view class="rows">
            <view class="row row-first"><text class="row-k">海报组</text><text class="row-v">{{ cur.name }}</text></view>
            <view class="row"><text class="row-k">图片</text><text class="row-v">{{ cur.images.length }} 张</text></view>
            <view class="row"><text class="row-k">铺盖方式</text><text class="row-v">{{ fitOf(cur.fit).name }}</text></view>
            <view class="row"><text class="row-k">预渲染分辨率</text><text class="row-v">{{ ratio.w }}×{{ ratio.h }}（{{ ratio.name }}）</text></view>
            <view class="row"><text class="row-k">每张停留</text><text class="row-v">{{ cur.dwell }} 秒</text></view>
          </view>
          <text class="sh-note">审核通过后才会在电视上播放，一般几分钟，最长约 30 分钟。通过后平台会按电视分辨率预渲染，播放更流畅。</text>
          <view class="ack" @tap="ack = !ack">
            <view class="ck" :class="{ 'ck-on': ack }"><z-icon v-if="ack" name="check" :size="12" :stroke="3" color="#FFFFFF" /></view>
            <text class="ack-t">我确认拥有这些图片的使用权，内容不涉及赌博、色情等违法违规信息</text>
          </view>
          <view class="btn" :class="{ 'btn-dis': !ack || busy }" hover-class="press" @tap="doSubmit"><text class="btn-t">{{ busy ? '正在提交…' : '提交审核' }}</text></view>
        </block>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad, onShow, onHide, onUnload, onPageScroll } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZPop from '@/components/z-pop/z-pop.vue'
import ZFitImg from '@/components/z-fit-img/z-fit-img.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { posterImageSrc, posterImageSize } from '@/common/poster-display.js'
import { requireLogin, persistAvatar } from '@/common/auth.js'
import { requireHost } from '@/common/cert.js'
import { listDevices, isOnline } from '@/common/devices.js'
import { FITS, RATIOS, DWELLS, MAX_IMAGES, STATUS_TEXT, ratioName, listGroups, createGroup, updateGroup, submitGroup, deleteGroup } from '@/common/posters.js'

const nav = getNavMetrics()
const cbarStyle = `height:${nav.statusBar + nav.navH}px;padding-top:${nav.statusBar}px`
const headStyle = `padding-top:${nav.statusBar}px`
const headRowStyle = `height:${nav.navH}px;padding-right:${nav.capsuleW}px`
const goBack = () => goBackOrHome()
const toast = (title) => uni.showToast({ title, icon: 'none' })

/* ---------- 提示条 ---------- */
const pop = reactive({ show: false, text: '', icon: 'check', tone: 'red' })
let popTimer = null
function popMsg(text, icon = 'check', tone = 'red') {
  clearTimeout(popTimer)
  Object.assign(pop, { show: true, text, icon, tone })
  popTimer = setTimeout(() => { pop.show = false }, 2600)
}

/* ---------- 图片：示意图（封面插画）或真实上传的图片 ---------- */
// 示意图按 3 倍尺寸算原始像素（接近真实海报的大小），「居中裁剪不缩放」才有参考意义
// 「拉伸到四个角」时示意图要加 preserveAspectRatio="none"：SVG 默认保持自己的比例，不加的话拉不开（真实照片用 image 组件，不受影响）
const srcOf = posterImageSrc
const wOf = (im) => posterImageSize(im).w
const hOf = (im) => posterImageSize(im).h

/* ---------- 数据 ---------- */
const groups = ref([])
const devices = ref([])
const curId = ref('')
const cur = computed(() => groups.value.find((g) => g.id === curId.value) || groups.value[0] || null)
const onTv = computed(() => !!cur.value && (cur.value.status === 'approved' || cur.value.status === 'live'))
const idx = ref(0)
const onSwipe = (e) => { idx.value = (e && e.detail && e.detail.current) || 0 }
const fitOf = (k) => FITS.find((f) => f.key === k) || FITS[1]
const statusText = (g) => (g.status === 'live' ? `播放中 · ${(g.liveOn || []).length} 台` : STATUS_TEXT[g.status] || '')
const CTA = { draft: '提交审核', reviewing: '审核中…', rejected: '修改后重新提交' }
const ctaText = computed(() => (cur.value ? CTA[cur.value.status] : ''))
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return m + ' 分钟前'
  if (m < 1440) return Math.round(m / 60) + ' 小时前'
  return Math.round(m / 1440) + ' 天前'
}
async function refresh() {
  const { list, changed } = await listGroups()
  groups.value = list
  changed.forEach((g) => {
    if (g.status === 'approved') popMsg(`「${g.name}」已通过审核，已按 ${g.renderedFor} 预渲染`, 'shield-check')
    if (g.status === 'rejected') popMsg(`「${g.name}」没有通过审核`, 'alert-triangle', 'gray')
  })
}
function select(g) {
  if (cur.value && g.id === cur.value.id) return
  curId.value = g.id
  idx.value = 0
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
}

/* ---------- 电视比例：默认跟随已绑定的大屏 ---------- */
const ratioOptions = computed(() => {
  const seen = new Set()
  const fromDevices = []
  devices.value.forEach((d) => {
    if (!d.resolution) return
    const sig = d.resolution.w + 'x' + d.resolution.h
    if (seen.has(sig)) return
    seen.add(sig)
    const name = ratioName(d.resolution.w, d.resolution.h)
    fromDevices.push({ key: 'dev:' + d.id, device: true, w: d.resolution.w, h: d.resolution.h, name, chip: `${d.name} ${name}`, label: `${name} · ${d.resolution.w}×${d.resolution.h} · 按「${d.name}」` })
  })
  const common = RATIOS.map((r) => ({ key: r.key, w: r.w, h: r.h, name: r.key, chip: `${r.key} ${r.note}`, label: `${r.key} · ${r.w}×${r.h}` }))
  return fromDevices.concat(common)
})
const ratio = computed(() => {
  const list = ratioOptions.value
  const saved = cur.value && cur.value.tvRatio
  if (saved) {
    const hit = list.find((r) => r.key === saved.key && r.w === saved.w && r.h === saved.h)
    if (hit) return hit
    const name = ratioName(saved.w, saved.h)
    return { ...saved, name, label: `${name} · ${saved.w}×${saved.h}` }
  }
  // 默认：第一台在线大屏的分辨率；没有就用第一台；都没有用 16:9
  const online = devices.value.find((d) => d.resolution && isOnline(d))
  const first = online || devices.value.find((d) => d.resolution)
  return (first && list.find((r) => r.key === 'dev:' + first.id)) || list.find((r) => r.key === '16:9')
})
// 预览屏幕尺寸（rpx）：横屏占满宽度，竖屏限制高度
const scr = computed(() => {
  const r = ratio.value.w / ratio.value.h
  const maxW = 646
  const maxH = 560
  return maxW / r <= maxH ? { w: maxW, h: Math.round(maxW / r) } : { w: Math.round(maxH * r), h: maxH }
})
const centerScale = computed(() => uni.upx2px(scr.value.w) / ratio.value.w)

/* ---------- 画面设置 ---------- */
const setOpen = ref(false)
const ratioOpen = ref(false)
async function patchCur(patch) {
  const g = await updateGroup(cur.value.id, patch)
  const i = groups.value.findIndex((x) => x.id === g.id)
  if (i >= 0) groups.value.splice(i, 1, g)
}
const setFit = (k) => { if (cur.value.fit !== k) patchCur({ fit: k }) }
const setDwell = (s) => { if (cur.value.dwell !== s) patchCur({ dwell: s }) }
const sameRatio = (r) => {
  const saved = cur.value && cur.value.tvRatio
  return !!saved && saved.key === r.key && saved.w === r.w && saved.h === r.h
}
async function setRatio(r) {
  ratioOpen.value = false
  if (!cur.value) return
  try {
    await patchCur({ tvRatio: r ? { key: r.key, w: r.w, h: r.h } : null })
  } catch (e) {
    toast('尺寸没有保存成功，请重试')
  }
}

/* ---------- 海报组的照片排布：轻微旋转、互相压一点 ---------- */
const TILT = [-5, 3, -2, 4, -3]
const LIFT = [0, -8, 6, -4]
const polStyle = (g, i) => {
  const seed = g.id.length + i
  return `transform:translateY(${LIFT[i % 4]}rpx) rotate(${TILT[(seed + i) % TILT.length]}deg);z-index:${i + 1}`
}

/* ---------- 相册上传 ---------- */
async function upload() {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: MAX_IMAGES,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
    success: async (res) => {
      uni.showLoading({ title: '正在处理图片' })
      const images = []
      for (const f of res.tempFiles || []) {
        const info = await new Promise((resolve) => uni.getImageInfo({ src: f.tempFilePath, success: resolve, fail: () => resolve({ width: 1920, height: 1080 }) }))
        // 演示：存成本地文件；正式环境在提交审核时上传到服务器
        const src = await persistAvatar(f.tempFilePath)
        images.push({ id: 'p' + Date.now() + images.length, src, w: info.width, h: info.height })
      }
      uni.hideLoading()
      if (images.length) addGroup(images)
    }
  })
  // #endif
  // #ifndef MP-WEIXIN
  toast('预览环境：用示例图片代替相册')
  const pool = ['blood', 'wild', 'snow', 'storm', 'clocktower', 'jungle']
  const sizes = ['wide', 'portrait', 'square']
  const start = groups.value.length
  addGroup([0, 1, 2].map((i) => ({ id: 'p' + Date.now() + i, scene: pool[(start + i) % pool.length], size: sizes[i % sizes.length] })))
  // #endif
}
async function addGroup(images) {
  const g = await createGroup(images)
  await refresh()
  curId.value = g.id
  idx.value = 0
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
  popMsg('已新建海报组，预览没问题就提交审核吧', 'photo-plus')
}

/* ---------- 下一步、更多操作 ---------- */
function primary() {
  const g = cur.value
  if (!g) return
  if (g.status === 'draft') return openSheet('submit')
  if (g.status === 'rejected') return rename(g, true)
  toast('正在审核，请稍候')
}
const MORE = {
  draft: ['提交审核', '重命名', '删除'],
  reviewing: ['删除'],
  approved: ['重命名', '删除'],
  live: ['重命名', '删除'],
  rejected: ['修改后重新提交', '删除']
}
function more(g) {
  const items = MORE[g.status] || ['删除']
  uni.showActionSheet({
    itemList: items,
    success: ({ tapIndex }) => {
      curId.value = g.id
      const act = items[tapIndex]
      if (act === '提交审核') openSheet('submit')
      else if (act === '重命名') rename(g, false)
      else if (act === '修改后重新提交') rename(g, true)
      else if (act === '删除') remove(g)
    }
  })
}
function rename(g, thenSubmit) {
  uni.showModal({
    title: thenSubmit ? '修改后重新提交' : '重命名',
    editable: true,
    content: g.name,
    placeholderText: '海报组名称',
    cancelText: '取消',
    confirmText: thenSubmit ? '下一步' : '保存',
    success: async ({ confirm, content }) => {
      if (!confirm) return
      const name = String(content || '').trim()
      if (!name) return toast('名称不能为空')
      try {
        await patchCur({ name })
        if (thenSubmit) openSheet('submit')
      } catch (e) {
        toast(e && e.message === 'banned' ? '名称里不能出现涉赌字样' : '没有保存成功')
      }
    }
  })
}
function remove(g) {
  uni.showModal({
    title: `删除「${g.name}」？`,
    content: g.status === 'live' ? '删除后，正在播放它的大屏会停止播放这组海报。' : '删除后不能恢复。',
    confirmText: '删除',
    cancelText: '取消',
    confirmColor: '#DC0000',
    success: async ({ confirm }) => {
      if (!confirm) return
      await deleteGroup(g.id)
      if (curId.value === g.id) curId.value = ''
      await refresh()
      popMsg('已删除', 'trash', 'gray')
    }
  })
}

/* ---------- 底部弹层 ---------- */
const sheet = ref('')
const sheetOn = ref(false)
const busy = ref(false)
const ack = ref(false)
function openSheet(kind) {
  ack.value = false
  busy.value = false
  sheet.value = kind
  setTimeout(() => { sheetOn.value = true }, 30)
}
function closeSheet() {
  sheetOn.value = false
  setTimeout(() => { sheet.value = '' }, 320)
}
async function doSubmit() {
  if (!ack.value || busy.value) return
  busy.value = true
  await submitGroup(cur.value.id, `${ratio.value.w}×${ratio.value.h}`)
  await refresh()
  closeSheet()
  popMsg('已提交审核，结果出来会通知你', 'shield-check')
}
/* ---------- 紧凑标题栏 ---------- */
const compact = ref(false)
onPageScroll(({ scrollTop }) => {
  const on = scrollTop > 60
  if (on !== compact.value) compact.value = on
})

/* ---------- 页面 ---------- */
let poll = null
onLoad(() => {
  if (!requireLogin() || !requireHost()) return
})
onShow(async () => {
  devices.value = await listDevices()
  await refresh()
  // 有海报组在审核中时，每 2 秒看一次结果（正式环境用订阅消息或长连接推送）
  clearInterval(poll)
  poll = setInterval(() => { if (groups.value.some((g) => g.status === 'reviewing')) refresh() }, 2000)
})
onHide(() => clearInterval(poll))
onUnload(() => clearInterval(poll))
</script>

<style>
.page { position: relative; min-height: 100vh; background: #181A20; padding-bottom: calc(80rpx + env(safe-area-inset-bottom)); }
.press { opacity: .8; transform: scale(.96); }
.press-soft { opacity: .85; }

/* 标题 */
.cbar {
  position: fixed; z-index: 30; left: 0; right: 0; top: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  background: #181A20; opacity: 0; transform: translateY(-12rpx); transition: opacity .25s ease, transform .3s ease; pointer-events: none;
}
.cbar-on { opacity: 1; transform: translateY(0); pointer-events: auto; }
.cbar-back { position: absolute; left: 24rpx; bottom: 12rpx; width: 64rpx; height: 64rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.cbar-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; color: #FFFFFF; }
.head { padding: 0 40rpx; }
.head-row { display: flex; align-items: center; box-sizing: border-box; }
.h-back { width: 64rpx; height: 64rpx; flex: none; margin-right: 20rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.h-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 56rpx; line-height: 1; letter-spacing: 4rpx; color: #FFFFFF; }

/* 预览：一台电视 */
.pv { margin-top: 28rpx; display: flex; flex-direction: column; align-items: center; }
.tv { display: flex; flex-direction: column; align-items: center; transition: width .35s ease; }
.tv-scr {
  position: relative; box-sizing: content-box; overflow: hidden; border: 12rpx solid #0B0C10; border-radius: 20rpx; background: #000000;
  box-shadow: 0 0 0 2rpx #2A2D36, 0 30rpx 60rpx rgba(0, 0, 0, .5); transition: width .35s ease, height .35s ease;
}
.pv-sw { width: 100%; height: 100%; }
.pv-empty { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pv-empty-t { margin-top: 12rpx; font-size: 22rpx; color: #4B5060; }
.pv-tag { position: absolute; left: 16rpx; top: 14rpx; max-width: 60%; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .6); font-size: 20rpx; color: #F2F2EE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pv-idx { position: absolute; right: 16rpx; top: 14rpx; padding: 4rpx 12rpx; border-radius: 999rpx; background: rgba(10, 10, 12, .6); font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 20rpx; color: #F2F2EE; }
.pv-dots { position: absolute; left: 0; right: 0; bottom: 14rpx; display: flex; justify-content: center; }
.pv-dot { width: 10rpx; height: 10rpx; margin: 0 5rpx; border-radius: 5rpx; background: rgba(242, 242, 238, .4); transition: width .3s ease, background .3s ease; }
.pv-dot-on { width: 28rpx; background: #F2F2EE; }
.tv-stand { width: 140rpx; height: 14rpx; margin-top: 2rpx; border-radius: 0 0 12rpx 12rpx; background: #2A2D36; }
.pv-note { margin-top: 16rpx; display: flex; align-items: center; }
.pv-note-t { margin-left: 8rpx; font-size: 20rpx; color: #9CA3AF; }
.pv-note-ok .pv-note-t { color: #4CB582; }

/* 当前海报组 */
.cur { margin: 28rpx 40rpx 0; display: flex; align-items: center; }
.cur-l { flex: 1; min-width: 0; display: flex; align-items: center; }
.cur-n { font-size: 30rpx; font-weight: 600; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pill { flex: none; margin-left: 14rpx; height: 40rpx; padding: 0 14rpx; border-radius: 999rpx; display: flex; align-items: center; }
.pill-sm { height: 34rpx; padding: 0 12rpx; }
.pill-t { font-size: 20rpx; font-weight: 600; }
.pill-draft { background: #2A2D36; }
.pill-draft .pill-t { color: #9CA3AF; }
.pill-reviewing { background: rgba(255, 197, 58, .16); }
.pill-reviewing .pill-t { color: #FFC53A; }
.pill-approved, .pill-live { background: rgba(76, 181, 130, .16); }
.pill-approved .pill-t, .pill-live .pill-t { color: #4CB582; }
.pill-rejected { background: rgba(220, 0, 0, .16); }
.pill-rejected .pill-t { color: #FF6B6B; }
.cta { flex: none; margin-left: 16rpx; height: 64rpx; padding: 0 28rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; box-shadow: 0 10rpx 24rpx rgba(220, 0, 0, .3); }
.cta-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.cta-reviewing { background: #2A2D36; box-shadow: none; }
.cta-reviewing .cta-t { color: #FFC53A; }
.cur-reason { display: block; margin: 12rpx 40rpx 0; font-size: 22rpx; color: #FF6B6B; }
.cur-hint { display: block; margin: 12rpx 40rpx 0; font-size: 22rpx; color: #6B7280; }

/* 画面设置 */
.set { margin: 24rpx 40rpx 0; border-radius: 24rpx; background: #1F222A; }
.set-h { display: flex; align-items: center; height: 88rpx; padding: 0 24rpx; }
.set-sum { flex: 1; min-width: 0; margin-left: 12rpx; font-size: 24rpx; color: #CBD5E1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chev { display: flex; transition: transform .3s ease; }
.chev-up { transform: rotate(180deg); }
.fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s ease; }
.fold-on { grid-template-rows: 1fr; }
.fold-in { min-height: 0; overflow: hidden; }
.set-b { padding: 0 24rpx 24rpx; border-top: 1rpx solid #2A2D36; }
.set-k { display: block; margin-top: 22rpx; font-size: 22rpx; color: #6B7280; }
.chips { margin-top: 14rpx; display: flex; flex-wrap: wrap; }
.chip { margin: 0 12rpx 12rpx 0; height: 56rpx; padding: 0 20rpx; border-radius: 999rpx; background: #262A34; border: 2rpx solid transparent; display: flex; align-items: center; }
.chip-on { border-color: #DC0000; background: rgba(220, 0, 0, .12); }
.chip-open { border-color: rgba(220, 0, 0, .45); }
.chip-t { margin-left: 6rpx; font-size: 22rpx; color: #E5E7EB; }
.ps-ratio-chevron { margin-left: 10rpx; }
.ratio-chips { margin-top: 8rpx; animation: ratio-chips-in .18s ease; }
.ratio-chip { height: auto; min-height: 66rpx; padding: 8rpx 20rpx; flex-direction: column; align-items: flex-start; background: #181A20; }
.ratio-chip-name { font-size: 22rpx; line-height: 30rpx; color: #E5E7EB; }
.ratio-chip-size { margin-top: 2rpx; font-size: 18rpx; line-height: 24rpx; color: #9CA3AF; }
.ratio-chip.chip-on .ratio-chip-name { color: #FFFFFF; }
.ratio-chip.chip-on .ratio-chip-size { color: #FFB4B4; }
@keyframes ratio-chips-in { from { opacity: 0; transform: translateY(-6rpx); } to { opacity: 1; transform: none; } }
.fits { margin-top: 14rpx; display: flex; flex-wrap: wrap; justify-content: space-between; }
.fit { width: 49%; box-sizing: border-box; margin-bottom: 12rpx; padding: 16rpx; border-radius: 18rpx; background: #181A20; border: 2rpx solid transparent; display: flex; align-items: center; }
.fit-on { border-color: #DC0000; background: rgba(220, 0, 0, .08); }
.fit-dia { position: relative; width: 72rpx; height: 44rpx; flex: none; border-radius: 6rpx; background: #0B0C10; box-shadow: 0 0 0 2rpx #35383F; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.fit-img { background: linear-gradient(135deg, #F3EEE6, #C9B79C); }
.fit-center { width: 30rpx; height: 38rpx; }
.fit-aspectFill { width: 72rpx; height: 88rpx; }
.fit-aspectFit { width: 34rpx; height: 44rpx; }
.fit-scaleToFill { width: 72rpx; height: 44rpx; }
.fit-main { flex: 1; min-width: 0; margin-left: 14rpx; display: flex; flex-direction: column; }
.fit-n { font-size: 22rpx; font-weight: 600; color: #F2F2EE; }
.fit-d { margin-top: 4rpx; font-size: 18rpx; line-height: 1.4; color: #6B7280; }
.set-tip { display: block; margin-top: 10rpx; font-size: 20rpx; color: #4B5060; }

/* 海报组 */
.sec-h { margin: 56rpx 40rpx 8rpx; display: flex; align-items: baseline; justify-content: space-between; }
.sec-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 38rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.sec-n { font-size: 22rpx; color: #6B7280; }
.grp { margin: 0 24rpx; padding: 24rpx 16rpx 32rpx; border-radius: 28rpx; transition: background .3s ease; }
.grp-on { background: #1F222A; }
.grp-h { display: flex; align-items: center; padding: 0 8rpx; }
.grp-n { font-size: 28rpx; font-weight: 600; color: #FFFFFF; white-space: nowrap; }
.grp-on .grp-n { color: #FF6B6B; }
.grp-m { flex: 1; min-width: 0; margin-left: 8rpx; font-size: 22rpx; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.grp-more { width: 56rpx; height: 56rpx; margin-left: 8rpx; flex: none; display: flex; align-items: center; justify-content: center; }
.pol-row { margin-top: 18rpx; padding-left: 12rpx; display: flex; align-items: flex-start; }
.pol { position: relative; width: 168rpx; flex: none; box-sizing: border-box; padding: 10rpx 10rpx 34rpx; margin-right: -18rpx; border-radius: 6rpx; background: #F3EEE6; box-shadow: 0 10rpx 22rpx rgba(0, 0, 0, .45); }
.pol-ph { width: 148rpx; height: 156rpx; overflow: hidden; border-radius: 2rpx; }
.pol-more { position: absolute; left: 10rpx; top: 10rpx; width: 148rpx; height: 156rpx; background: rgba(10, 10, 12, .55); display: flex; align-items: center; justify-content: center; }
.pol-more-t { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 40rpx; color: #FFFFFF; }

/* 相册上传：单独一行 */
.up { margin: 8rpx 24rpx 0; padding: 24rpx 28rpx 32rpx; display: flex; align-items: center; border-radius: 28rpx; }
.pol-up { margin-right: 0; transform: rotate(-3deg); background: #262A34; box-shadow: none; border: 2rpx dashed #4B5060; }
.pol-ph-up { background: #1F222A; display: flex; align-items: center; justify-content: center; }
.pol-cap { position: absolute; left: 0; right: 0; bottom: 4rpx; text-align: center; font-size: 20rpx; color: #9CA3AF; }
.up-main { flex: 1; min-width: 0; margin-left: 32rpx; display: flex; flex-direction: column; }
.up-t { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.up-d { margin-top: 8rpx; font-size: 22rpx; line-height: 1.6; color: #9CA3AF; }

/* 底部弹层 */
.sh { position: fixed; z-index: 100; left: 0; top: 0; right: 0; bottom: 0; }
.sh-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); opacity: 0; transition: opacity .3s ease; }
.sh-on .sh-mask { opacity: 1; }
.sh-panel {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 16rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); border-radius: 40rpx 40rpx 0 0;
  background: #1F222A; transform: translateY(100%); transition: transform .38s cubic-bezier(.2, .8, .2, 1);
}
.sh-on .sh-panel { transform: translateY(0); }
.sh-grab { width: 72rpx; height: 8rpx; margin: 0 auto 20rpx; border-radius: 4rpx; background: #35383F; }
.sh-x { position: absolute; z-index: 2; right: 40rpx; top: 40rpx; width: 56rpx; height: 56rpx; border-radius: 50%; background: #2A2D36; display: flex; align-items: center; justify-content: center; }
.sh-title { display: block; min-height: 56rpx; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.rows { margin-top: 20rpx; padding: 8rpx 24rpx; border-radius: 20rpx; background: #181A20; }
.row { display: flex; align-items: center; justify-content: space-between; height: 64rpx; border-top: 1rpx solid #24272F; }
.row-first { border-top: none; }
.row-k { font-size: 24rpx; color: #6B7280; }
.row-v { font-size: 24rpx; color: #F2F2EE; }
.sh-note { display: block; margin-top: 20rpx; font-size: 22rpx; line-height: 1.7; color: #9CA3AF; }
.ack { margin-top: 20rpx; display: flex; align-items: flex-start; }
.ck { width: 36rpx; height: 36rpx; flex: none; margin-top: 2rpx; box-sizing: border-box; border-radius: 10rpx; border: 3rpx solid #4B5060; display: flex; align-items: center; justify-content: center; }
.ck-on { border-color: #DC0000; background: #DC0000; }
.ack-t { flex: 1; margin-left: 14rpx; font-size: 22rpx; line-height: 1.6; color: #CBD5E1; }
.btn { margin-top: 28rpx; height: 92rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 28rpx rgba(220, 0, 0, .3); }
.btn-dis { background: #3A3B46; box-shadow: none; }
.btn-t { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

@media (prefers-reduced-motion: reduce) {
  .cbar, .tv, .tv-scr, .fold, .chev, .sh-panel, .sh-mask, .pv-dot, .grp { transition: none; }
}
</style>
