<template>
  <view v-if="shown" class="sfs-sc" :class="{ 'sfs-sc-on': on }" @touchmove.stop.prevent="noop">
    <view class="sfs-sc-mask" @tap="close(null)"></view>
    <view class="sfs-sc-card">
      <view class="sfs-sc-head">
        <view class="sfs-sc-head-l">
          <text class="sfs-sc-title">{{ opts.title || '扫一扫' }}</text>
          <text class="sfs-sc-hint">{{ opts.hint || '把二维码放进框内，会自动识别' }}</text>
        </view>
        <view class="sfs-sc-x" hover-class="sfs-press" @tap="close(null)"><z-icon name="x" :size="16" color="#9CA3AF" /></view>
      </view>

      <!-- 取景框：实时画面 + 科幻 HUD -->
      <view class="sfs-vf" :class="'sfs-vf-' + state">
        <!-- #ifdef MP-WEIXIN -->
        <camera
          v-if="useCamera"
          class="sfs-vf-cam"
          mode="scanCode"
          device-position="back"
          :flash="torch ? 'torch' : 'off'"
          @scancode="onScan"
          @initdone="onInit"
          @error="onCamError"
          @stop="onCamStop"
        />
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="sfs-vf-sim"><view class="sfs-vf-sim-qr" :style="simQr"></view></view>
        <!-- #endif -->

        <view class="sfs-hud">
          <view class="sfs-hud-grid"></view>
          <view class="sfs-hud-c sfs-hud-tl"></view><view class="sfs-hud-c sfs-hud-tr"></view><view class="sfs-hud-c sfs-hud-bl"></view><view class="sfs-hud-c sfs-hud-br"></view>
          <view v-if="state === 'scan'" class="sfs-hud-laser"><view class="sfs-hud-trail"></view></view>
          <view class="sfs-hud-cross"></view>
          <text class="sfs-hud-t sfs-hud-t-tl">SCAN · QR</text>
          <view class="sfs-hud-live"><view class="sfs-hud-live-dot"></view><text class="sfs-hud-t">LIVE</text></view>
          <text class="sfs-hud-t sfs-hud-t-bl">TJ · VISION</text>
          <text class="sfs-hud-t sfs-hud-t-br">{{ torch ? 'TORCH' : 'AUTO' }}</text>
        </view>

        <!-- 状态层 -->
        <view v-if="state === 'init'" class="sfs-vf-layer">
          <view class="sfs-vf-spin"><z-icon name="loader-2" :size="22" :stroke="2.5" color="#F2F2EE" /></view>
          <text class="sfs-vf-t">正在打开摄像头…</text>
        </view>
        <view v-if="state === 'ok'" class="sfs-vf-layer sfs-vf-layer-ok">
          <view class="sfs-ok-ring"><z-icon name="check" :size="30" :stroke="3" color="#FFFFFF" /></view>
          <text class="sfs-vf-t">已识别</text>
        </view>
        <view v-if="state === 'denied' || state === 'error'" class="sfs-vf-layer sfs-vf-layer-solid">
          <z-icon name="camera-off" :size="30" color="#9CA3AF" />
          <text class="sfs-vf-t">{{ state === 'denied' ? '没有摄像头权限' : '摄像头打不开' }}</text>
          <text class="sfs-vf-d">{{ state === 'denied' ? '开启后就能在这里直接扫码' : '可以先用系统扫码' }}</text>
          <view v-if="state === 'denied'" class="sfs-vf-btn" hover-class="sfs-press" @tap="openSetting"><text class="sfs-vf-btn-t">去设置开启</text></view>
          <view v-else class="sfs-vf-btn" hover-class="sfs-press" @tap="useSystem"><text class="sfs-vf-btn-t">使用系统扫码</text></view>
        </view>
        <view v-if="warn" class="sfs-vf-note"><view class="sfs-vf-warn"><z-icon name="alert-circle" :size="13" color="#FFFFFF" /><text class="sfs-vf-warn-t">{{ warn }}</text></view></view>
        <view v-else-if="slowTip && state === 'scan'" class="sfs-vf-note"><view class="sfs-vf-tip"><text class="sfs-vf-tip-t">扫不出来？靠近一点，或者打开手电筒</text></view></view>
      </view>

      <!-- 工具：手电筒 / 手动输入 / 相册或系统扫码 -->
      <view class="sfs-tools">
        <view class="sfs-tool" :class="{ 'sfs-tool-on': torch, 'sfs-tool-dis': !canTorch }" hover-class="sfs-press" @tap="toggleTorch">
          <view class="sfs-tool-ic"><z-icon :name="torch ? 'bulb' : 'bulb-off'" :size="20" :color="torch ? '#181A20' : '#F2F2EE'" /></view>
          <text class="sfs-tool-t">手电筒</text>
        </view>
        <view v-if="opts.manualText" class="sfs-tool" hover-class="sfs-press" @tap="close({ manual: true })">
          <view class="sfs-tool-ic"><z-icon name="keyboard" :size="20" color="#F2F2EE" /></view>
          <text class="sfs-tool-t">{{ opts.manualText }}</text>
        </view>
        <view class="sfs-tool" hover-class="sfs-press" @tap="useSystem">
          <view class="sfs-tool-ic"><z-icon name="photo-scan" :size="20" color="#F2F2EE" /></view>
          <text class="sfs-tool-t">相册 / 系统扫码</text>
        </view>
      </view>

      <!-- #ifndef MP-WEIXIN -->
      <!-- H5 预览没有摄像头：模拟扫到一个码 -->
      <view class="sfs-sim">
        <view class="sfs-sim-b" hover-class="sfs-press" @tap="simulate(true)"><text class="sfs-sim-t">模拟扫到正确的码</text></view>
        <view class="sfs-sim-b" hover-class="sfs-press" @tap="simulate(false)"><text class="sfs-sim-t">模拟无效码</text></view>
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup>
// 全局悬浮扫码弹窗：在当前页面居中弹出，内嵌 <camera mode="scanCode"> 实时画面，不跳转全屏。
// 不直接用 props 控制，而是由 src/common/scanner.js 的 openScanner() 打开（返回 Promise），用法见那个文件开头
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { scanner, pageId, registerScanner, unregisterScanner, finishScan, systemScan } from '@/common/scanner.js'
import { svgUri } from '@/common/svg.js'

const noop = () => {}
const myId = ref(0)
onMounted(() => {
  myId.value = pageId()
  registerScanner(myId.value)
})
onUnmounted(() => {
  unregisterScanner(myId.value)
  clearTimers()
})

const opts = computed(() => scanner.opts || {})
const shown = ref(false)
const on = ref(false)
// init 打开摄像头中 / scan 扫码中 / ok 已识别 / denied 没有权限 / error 摄像头出错
const state = ref('init')
const useCamera = ref(false)
const torch = ref(false)
const warn = ref('')
const slowTip = ref(false)
const canTorch = computed(() => state.value === 'scan')
let done = false
let lastBad = ''
let lastBadAt = 0
let timers = []
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t }
function clearTimers() { timers.forEach(clearTimeout); timers = [] }

/* ---------- 打开 ---------- */
watch(() => scanner.seq, () => {
  if (scanner.open && scanner.owner === myId.value) start()
})
function start() {
  clearTimers()
  done = false
  warn.value = ''
  slowTip.value = false
  torch.value = false
  state.value = 'init'
  useCamera.value = false
  shown.value = true
  later(() => { on.value = true }, 20)
  // #ifdef MP-WEIXIN
  // 以前拒绝过摄像头权限：直接显示「去设置开启」，不去挂载一个打不开的 camera
  uni.getSetting({
    success: (res) => {
      if (res.authSetting && res.authSetting['scope.camera'] === false) return (state.value = 'denied')
      later(mountCamera, 300) // 等弹窗进场动画结束再挂载原生 camera
    },
    fail: () => later(mountCamera, 300)
  })
  // #endif
  // #ifndef MP-WEIXIN
  later(() => { state.value = 'scan'; armSlowTip() }, 500)
  // #endif
}
function mountCamera() {
  state.value = 'init'
  useCamera.value = true
}
function armSlowTip() {
  later(() => { if (state.value === 'scan' && !done) slowTip.value = true }, 12000)
}

/* ---------- 摄像头事件 ---------- */
function onInit() {
  if (state.value !== 'init') return
  state.value = 'scan'
  armSlowTip()
}
function onCamError(e) {
  const msg = String((e && e.detail && e.detail.errMsg) || '')
  useCamera.value = false
  state.value = /auth|deny|authorize/i.test(msg) ? 'denied' : 'error'
}
function onCamStop() {
  if (shown.value && !done && state.value === 'scan') state.value = 'error'
}
function onScan(e) {
  accept((e && e.detail) || {})
}

/* ---------- 识别结果 ---------- */
function accept(res) {
  if (done) return
  const text = String(res.result || '')
  const fn = opts.value.validate
  const v = fn ? fn(text, res) : true
  if (v === true) {
    done = true
    warn.value = ''
    state.value = 'ok'
    try { uni.vibrateShort({ type: 'medium' }) } catch (err) {}
    later(() => close({ result: text, type: res.type || res.scanType || '' }), 560)
    return
  }
  // 同一个错误的码连续扫到时，不重复提示
  if (text === lastBad && Date.now() - lastBadAt < 1800) return
  lastBad = text
  lastBadAt = Date.now()
  warn.value = typeof v === 'string' ? v : '这个二维码用不了'
  later(() => { warn.value = '' }, 2000)
}

/* ---------- 工具 ---------- */
function toggleTorch() {
  if (!canTorch.value) return
  torch.value = !torch.value
}
// 系统扫码（也能从相册选图）：先卸下弹窗里的 camera，避免两边同时占用摄像头
function useSystem() {
  const keep = useCamera.value
  useCamera.value = false
  systemScan({}).then((r) => {
    if (r) return accept({ result: r.result, type: r.type })
    if (keep && shown.value && !done) mountCamera()
  })
}
function openSetting() {
  uni.openSetting({
    success: (res) => {
      if (res.authSetting && res.authSetting['scope.camera']) mountCamera()
    }
  })
}

/* ---------- 关闭 ---------- */
function close(value) {
  if (!shown.value) return
  clearTimers()
  useCamera.value = false // 先卸下 camera，再播放退场动画
  on.value = false
  setTimeout(() => {
    shown.value = false
    finishScan(value)
  }, 260)
}

/* ---------- H5 预览 ---------- */
function simulate(ok) {
  if (state.value !== 'scan') return
  accept({ result: ok ? String(opts.value.demo || 'demo') : 'https://example.com/not-ours', type: 'QR_CODE' })
}
// 示意画面里的二维码图案（不是真实二维码）
const simQr = (() => {
  const N = 21
  let seed = 11
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const finder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
  let rects = ''
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.5) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`
  const eye = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#E9E6DF"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${N + 4}" height="${N + 4}" viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#E9E6DF"/><g fill="#1A1B20">${rects}${eye(0, 0)}${eye(N - 7, 0)}${eye(0, N - 7)}</g></svg>`
  return `background-image:url("${svgUri(svg)}")`
})()
</script>

<style>
/* 类名都带 sfs- 前缀：页面的样式会作用到组件上（H5 全局、小程序 apply-shared），不加前缀容易和页面里的同名类冲突。
   风格同全站：暗底 #181A20 / 卡片 #1F222A，品牌红 #DC0000；HUD 网格参考登录券的透视网格 */
.sfs-sc { position: fixed; z-index: 900; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; }
.sfs-press { opacity: .8; transform: scale(.96); }
.sfs-sc-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(6, 6, 10, .74); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); opacity: 0; transition: opacity .26s ease; }
.sfs-sc-on .sfs-sc-mask { opacity: 1; }
.sfs-sc-card {
  position: relative; width: 640rpx; box-sizing: border-box; padding: 32rpx 32rpx 28rpx; border-radius: 40rpx; background: #1F222A;
  border: 1rpx solid rgba(255, 255, 255, .08); box-shadow: 0 30rpx 80rpx rgba(0, 0, 0, .6);
  opacity: 0; transform: translateY(24rpx) scale(.92); transition: opacity .26s ease, transform .36s cubic-bezier(.34, 1.4, .64, 1);
}
.sfs-sc-on .sfs-sc-card { opacity: 1; transform: translateY(0) scale(1); }
.sfs-sc-head { display: flex; align-items: flex-start; justify-content: space-between; }
.sfs-sc-head-l { flex: 1; min-width: 0; margin-right: 16rpx; }
.sfs-sc-title { display: block; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 38rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.sfs-sc-hint { display: block; margin-top: 8rpx; font-size: 22rpx; color: #9CA3AF; }
.sfs-sc-x { width: 56rpx; height: 56rpx; flex: none; border-radius: 50%; background: #2A2D36; display: flex; align-items: center; justify-content: center; }

/* 取景框 */
.sfs-vf { position: relative; margin-top: 24rpx; width: 576rpx; height: 576rpx; border-radius: 32rpx; overflow: hidden; background: #0B0C10; box-shadow: inset 0 0 0 2rpx #2A2D36; }
.sfs-vf-cam { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.sfs-vf-sim { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 35% 30%, #3A3530 0%, #1E1D20 45%, #0D0E12 100%); }
.sfs-vf-sim-qr { width: 250rpx; height: 250rpx; border-radius: 10rpx; background-size: 100% 100%; transform: rotate(-6deg) perspective(600px) rotateX(10deg); box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, .55); filter: brightness(.88) contrast(1.05); }

/* HUD */
.sfs-hud { position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none; }
.sfs-hud-grid {
  position: absolute; left: 0; top: 0; right: 0; bottom: 0; opacity: .32;
  background-image: linear-gradient(rgba(220, 0, 0, .3) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 0, 0, .3) 1px, transparent 1px);
  background-size: 48rpx 48rpx; transform: perspective(500px) rotateX(18deg) scale(1.5); transform-origin: center bottom; animation: grid 16s linear infinite;
}
@keyframes grid { from { background-position: 0 0; } to { background-position: 0 96rpx; } }
.sfs-hud-c { position: absolute; width: 80rpx; height: 80rpx; border: 0 solid #FF3B30; filter: drop-shadow(0 0 8rpx rgba(255, 59, 48, .8)); transition: border-color .25s ease; animation: breathe 2.4s ease-in-out infinite; }
.sfs-hud-tl { left: 56rpx; top: 56rpx; border-left-width: 6rpx; border-top-width: 6rpx; border-top-left-radius: 22rpx; }
.sfs-hud-tr { right: 56rpx; top: 56rpx; border-right-width: 6rpx; border-top-width: 6rpx; border-top-right-radius: 22rpx; }
.sfs-hud-bl { left: 56rpx; bottom: 56rpx; border-left-width: 6rpx; border-bottom-width: 6rpx; border-bottom-left-radius: 22rpx; }
.sfs-hud-br { right: 56rpx; bottom: 56rpx; border-right-width: 6rpx; border-bottom-width: 6rpx; border-bottom-right-radius: 22rpx; }
@keyframes breathe { 50% { transform: scale(.94); } }
.sfs-vf-ok .sfs-hud-c { border-color: #4CB582; filter: drop-shadow(0 0 10rpx rgba(76, 181, 130, .9)); animation: none; }
.sfs-hud-laser { position: absolute; left: 64rpx; right: 64rpx; top: 70rpx; height: 4rpx; border-radius: 2rpx; background: linear-gradient(90deg, transparent, #FF4D4D 20%, #FFD1D1 50%, #FF4D4D 80%, transparent); box-shadow: 0 0 18rpx rgba(255, 77, 77, .9); animation: laser 2.4s cubic-bezier(.45, 0, .55, 1) infinite; }
.sfs-hud-trail { position: absolute; left: 0; right: 0; bottom: 4rpx; height: 120rpx; background: linear-gradient(180deg, rgba(220, 0, 0, 0), rgba(220, 0, 0, .16)); }
@keyframes laser { 0% { transform: translateY(0); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateY(436rpx); opacity: 0; } }
.sfs-hud-cross { position: absolute; left: 50%; top: 50%; width: 28rpx; height: 28rpx; margin: -14rpx 0 0 -14rpx; opacity: .45;
  background: linear-gradient(#F2F2EE, #F2F2EE) center / 2rpx 100% no-repeat, linear-gradient(#F2F2EE, #F2F2EE) center / 100% 2rpx no-repeat; }
.sfs-hud-t { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 700; font-size: 18rpx; letter-spacing: 3rpx; color: rgba(242, 242, 238, .6); }
.sfs-hud-t-tl { position: absolute; left: 24rpx; top: 20rpx; }
.sfs-hud-t-bl { position: absolute; left: 24rpx; bottom: 18rpx; }
.sfs-hud-t-br { position: absolute; right: 24rpx; bottom: 18rpx; }
.sfs-hud-live { position: absolute; right: 24rpx; top: 18rpx; display: flex; align-items: center; }
.sfs-hud-live-dot { width: 10rpx; height: 10rpx; margin-right: 8rpx; border-radius: 50%; background: #FF3B30; box-shadow: 0 0 8rpx #FF3B30; animation: blink 1.2s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* 状态层 */
.sfs-vf-layer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(11, 12, 16, .55); }
.sfs-vf-layer-solid { background: #111216; }
.sfs-vf-layer-ok { background: rgba(76, 181, 130, .14); animation: ok-flash .5s ease; }
@keyframes ok-flash { from { background: rgba(76, 181, 130, .45); } to { background: rgba(76, 181, 130, .14); } }
.sfs-ok-ring { width: 104rpx; height: 104rpx; border-radius: 50%; background: #4CB582; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 14rpx rgba(76, 181, 130, .22), 0 0 40rpx rgba(76, 181, 130, .6); animation: ok-pop .45s cubic-bezier(.34, 1.56, .64, 1); }
@keyframes ok-pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.sfs-vf-spin { display: flex; animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.sfs-vf-t { margin-top: 16rpx; font-size: 26rpx; font-weight: 600; color: #F2F2EE; }
.sfs-vf-d { margin-top: 8rpx; font-size: 22rpx; color: #9CA3AF; }
.sfs-vf-btn { margin-top: 24rpx; height: 68rpx; padding: 0 32rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; }
.sfs-vf-btn-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.sfs-vf-note { position: absolute; left: 24rpx; right: 24rpx; bottom: 64rpx; display: flex; justify-content: center; }
.sfs-vf-warn { padding: 10rpx 22rpx; border-radius: 999rpx; background: rgba(220, 0, 0, .88); display: flex; align-items: center; animation: warn .3s ease; }
@keyframes warn { from { opacity: 0; transform: translateY(12rpx); } to { opacity: 1; transform: translateY(0); } }
.sfs-vf-warn-t { margin-left: 8rpx; font-size: 22rpx; color: #FFFFFF; }
.sfs-vf-tip { padding: 10rpx 22rpx; border-radius: 999rpx; background: rgba(255, 197, 58, .9); }
.sfs-vf-tip-t { font-size: 22rpx; color: #181A20; }

/* 工具 */
.sfs-tools { margin-top: 28rpx; display: flex; justify-content: space-around; }
.sfs-tool { display: flex; flex-direction: column; align-items: center; min-width: 140rpx; }
.sfs-tool-ic { width: 88rpx; height: 88rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; transition: background .2s ease; }
.sfs-tool-on .sfs-tool-ic { background: #FFC53A; box-shadow: 0 0 24rpx rgba(255, 197, 58, .45); }
.sfs-tool-dis { opacity: .4; }
.sfs-tool-t { margin-top: 10rpx; font-size: 22rpx; color: #CBD5E1; }
.sfs-sim { margin-top: 24rpx; display: flex; justify-content: center; }
.sfs-sim-b { margin: 0 8rpx; height: 56rpx; padding: 0 20rpx; border-radius: 999rpx; border: 1rpx dashed #4B5060; display: flex; align-items: center; }
.sfs-sim-t { font-size: 20rpx; color: #9CA3AF; }

@media (prefers-reduced-motion: reduce) {
  .sfs-hud-grid, .sfs-hud-c, .sfs-hud-laser, .sfs-hud-live-dot, .sfs-vf-spin, .sfs-ok-ring, .sfs-vf-layer-ok, .sfs-vf-warn { animation: none; }
  .sfs-sc-mask, .sfs-sc-card { transition: none; }
}
</style>
