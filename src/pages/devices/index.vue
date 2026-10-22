<template>
  <page-meta :page-style="sheet ? 'overflow:hidden' : ''"></page-meta>
  <view class="page">
    <view class="cbar" :class="{ 'cbar-on': compact }" :style="cbarStyle">
      <view class="cbar-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
      <text class="cbar-t">设备管理</text>
    </view>
    <view class="head" :style="headStyle">
      <view class="head-row" :style="headRowStyle">
        <view class="h-back" hover-class="press" @tap="goBack"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="h-title">设备管理</text>
      </view>
    </view>

    <!-- 概览：绑定了几台、几台在线 -->
    <view class="sum">
      <image class="sum-img" src="/static/workbench/bind.png" mode="aspectFit" />
      <view class="sum-main">
        <text class="sum-t">大屏计时器</text>
        <view class="sum-s">
          <text class="sum-n">已绑定 {{ devices.length }} 台</text>
          <view class="dot dot-on"></view><text class="sum-n sum-on">{{ onlineCount }} 台在线</text>
        </view>
        <text class="sum-hint">电视上打开「桌趣大屏计时器」即可配对</text>
      </view>
      <view class="sum-refresh" :class="{ 'spin': refreshing }" hover-class="press" @tap="refresh"><z-icon name="refresh" :size="16" color="#9CA3AF" /></view>
    </view>

    <!-- 设备列表：条形卡片，封面是电视此刻的画面；点开是屏幕设置（改名、识别、解绑） -->
    <view class="sec-h"><text class="sec-t">我的大屏</text><text class="sec-n">{{ checkedText }}</text></view>
    <view v-if="loaded && !devices.length" class="empty">
      <image class="empty-img" src="/static/workbench/bind.png" mode="aspectFit" />
      <text class="empty-t">还没有绑定大屏</text>
      <text class="empty-d">在电视上安装「桌趣大屏计时器」，用配对码或扫码连接</text>
    </view>
    <view v-for="d in devices" :key="d.id" class="dv" :class="{ 'dv-open': open === d.id }">
      <view class="dv-row">
        <view class="bar" :class="{ 'bar-off': !online(d), 'bar-new': flash === d.id, 'bar-id': idf.id === d.id, 'bar-edit': editing === d.id }" hover-class="bar-press" :hover-stay-time="60" @tap="toggle(d)">
          <!-- 封面：电视此刻的画面，裁切铺满（离线是最后的画面，变灰） -->
          <view class="bar-cv"><z-fit-img :src="covers[d.id].src" mode="aspectFill" :w="covers[d.id].w" :h="covers[d.id].h" :bg="covers[d.id].tint" /></view>
          <!-- 从左往右渐隐的遮罩，让标题和正在显示的内容更清楚 -->
          <view class="bar-mask" :style="maskStyle(d)"></view>
          <view class="bar-ic" :class="online(d) ? 'bar-ic-on' : 'bar-ic-off'">
            <z-icon :name="online(d) ? 'device-tv' : 'device-tv-off'" :size="22" :color="online(d) ? '#4CB582' : '#FF8A8A'" />
          </view>
          <view class="bar-main">
            <!-- 改名：直接在标题处编辑，进入时全选 -->
            <input
              v-if="editing === d.id"
              class="dv-n dv-n-in"
              :value="draft"
              maxlength="12"
              :focus="editFocus"
              :selection-start="sel.s"
              :selection-end="sel.e"
              confirm-type="done"
              :cursor-spacing="120"
              @input="onDraft"
              @confirm="saveName(d)"
              @blur="onEditBlur(d)"
              @tap.stop="noop"
            />
            <text v-else class="dv-n">{{ d.name }}</text>
            <text class="dv-s" :class="{ 'dv-s-edit': editing === d.id, 'dv-s-max': editing === d.id && draft.length >= 12 }">{{ subText(d) }}</text>
          </view>
        </view>
        <view class="edit" :class="{ 'edit-on': editing === d.id }" hover-class="press" @tap="toggleEdit(d)">
          <z-icon :name="editing === d.id ? 'check' : 'pencil'" :size="20" :stroke="2.2" color="#FFFFFF" />
        </view>
      </view>
      <view class="fold" :class="{ 'fold-on': open === d.id }"><view class="fold-in">
        <view class="dv-body">
          <view class="acts">
            <view class="act" :class="{ 'act-dis': !online(d) || idf.id === d.id }" hover-class="press" @tap="identify(d)">
              <z-icon name="focus-2" :size="18" color="#FFFFFF" /><text class="act-t">{{ idf.id === d.id ? '识别中 ' + idf.left + 's' : '识别' }}</text>
            </view>
            <view class="act act-danger" hover-class="press" @tap="unbind(d)">
              <z-icon name="link-off" :size="18" color="#FF6B6B" /><text class="act-t act-t-danger">解绑</text>
            </view>
          </view>
          <text class="dv-info">{{ d.model }}{{ d.resolution ? ' · ' + d.resolution.w + '×' + d.resolution.h : '' }} · {{ d.app }} · {{ d.tvId }} · 绑定于 {{ dateText(d.pairedAt) }}</text>
          <text v-if="!online(d)" class="dv-hint">大屏离线时不能识别；解绑会在它下次联网时生效</text>
        </view>
      </view></view>
    </view>

    <!-- 添加大屏：固定在底部 -->
    <view class="add-dock">
      <view class="add" hover-class="press" @tap="openSheet()">
        <z-icon name="plus" :size="20" :stroke="2.5" color="#FFFFFF" /><text class="add-t">添加大屏</text>
      </view>
    </view>

    <z-pop :show="pop.show" :text="pop.text" :icon="pop.icon" :tone="pop.tone" />
    <!-- 页内扫码弹窗（openScanner 打开） -->
    <SciFiScannerModal />

    <!-- 添加大屏：第 1 步配对（配对码 / 扫码），第 2 步起名 -->
    <view v-if="sheet" class="sh" :class="{ 'sh-on': sheetOn }">
      <view class="sh-mask" @tap="closeSheet"></view>
      <view class="sh-panel">
        <view class="sh-grab"></view>
        <!-- 每一步都能关掉：起名时关掉就不添加这台大屏 -->
        <view class="sh-x" hover-class="press" @tap="closeSheet"><z-icon name="x" :size="16" color="#9CA3AF" /></view>
        <block v-if="step === 'pair'">
          <view class="sh-head"><text class="sh-title">添加大屏</text></view>
          <view class="seg">
            <view class="seg-ind" :style="'transform:translateX(' + mode * 100 + '%)'"></view>
            <view class="seg-i" @tap="setMode(0)"><z-icon name="keyboard" :size="14" :color="mode === 0 ? '#181A20' : '#9CA3AF'" /><text class="seg-t" :class="{ 'seg-t-on': mode === 0 }">输入配对码</text></view>
            <view class="seg-i" @tap="setMode(1)"><z-icon name="qrcode" :size="14" :color="mode === 1 ? '#181A20' : '#9CA3AF'" /><text class="seg-t" :class="{ 'seg-t-on': mode === 1 }">扫码连接</text></view>
          </view>

          <view v-if="mode === 0" class="pane">
            <!-- 示意：配对码在电视首页的位置 -->
            <view class="tvm">
              <view class="tvm-scr">
                <view class="tvm-l"><text class="tvm-k">配对码</text><text class="tvm-pin">{{ pairCodeText }}</text><text class="tvm-app">桌趣大屏计时器</text></view>
                <view class="tvm-qr" :style="qrStyle"></view>
              </view>
              <view class="tvm-stand"></view>
            </view>
            <text class="tip">在电视上打开「桌趣大屏计时器」，首页会显示 6 位配对码</text>
            <view class="pin" :class="{ 'pin-shake': shake }">
              <view v-for="i in 6" :key="i" class="pin-b" :class="{ 'pin-b-on': pinFocus && pin.length === i - 1, 'pin-b-fill': pin.length >= i, 'pin-b-err': !!pinErr }">
                <text class="pin-d">{{ pin[i - 1] || '' }}</text>
              </view>
              <input class="pin-hidden" type="number" maxlength="6" :value="pin" :focus="pinFocus" :cursor-spacing="120" :disabled="busy" @input="onPin" @focus="pinFocus = true" @blur="pinFocus = false" />
            </view>
            <view class="msg" :class="{ 'msg-err': !!pinErr }">
              <view v-if="busy" class="spin-ic"><z-icon name="loader-2" :size="14" color="#9CA3AF" /></view>
              <text class="msg-t">{{ pinErr || (busy ? '正在连接大屏…' : (pinFocus || pin ? '输满 6 位自动连接' : '点击格子输入配对码')) }}</text>
            </view>
          </view>

          <view v-else class="pane">
            <view class="scan">
              <view class="sc sc-tl"></view><view class="sc sc-tr"></view><view class="sc sc-bl"></view><view class="sc sc-br"></view>
              <view class="scan-qr" :style="qrStyle"></view>
              <view class="scan-line"></view>
            </view>
            <text class="tip">扫描电视首页上的二维码，自动完成配对</text>
            <view class="btn" :class="{ 'btn-dis': busy }" hover-class="press" @tap="scan">
              <view v-if="busy" class="spin-ic"><z-icon name="loader-2" :size="16" color="#FFFFFF" /></view>
              <z-icon v-else name="scan" :size="18" color="#FFFFFF" /><text class="btn-t">{{ busy ? '正在连接大屏…' : '开始扫码' }}</text>
            </view>
          </view>
        </block>

        <block v-else-if="step === 'name'">
          <view class="ok"><z-icon name="check" :size="28" :stroke="3" color="#FFFFFF" /></view>
          <text class="sh-title sh-center">连接成功</text>
          <text class="sh-sub">{{ found.model }} · {{ found.app }}</text>
          <text class="nm-k">给这台大屏起个名字</text>
          <input class="nm-in" :value="newName" maxlength="12" placeholder="最多 12 个字" placeholder-class="ph" :cursor-spacing="120" @input="onNewName" />
          <view class="chips">
            <view v-for="c in NAME_CHIPS" :key="c" class="chip" :class="{ 'chip-on': newName === chipName(c), 'chip-used': nameTaken(devices, chipName(c)) }" hover-class="press" @tap="newName = chipName(c)"><text class="chip-t">{{ c }}</text></view>
          </view>
          <text class="nm-tip" :class="{ 'nm-err': newTaken }">{{ newTaken ? '已经有一台大屏叫这个名字了，换一个吧' : '电视上会显示这个名称，之后可以在屏幕设置里修改' }}</text>
          <view class="btn" :class="{ 'btn-dis': !newName.trim() || newTaken || busy }" hover-class="press" @tap="finishAdd"><text class="btn-t">{{ busy ? '正在添加…' : '完成' }}</text></view>
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
import SciFiScannerModal from '@/components/SciFiScannerModal/SciFiScannerModal.vue'
import { openScanner } from '@/common/scanner.js'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { svgUri } from '@/common/svg.js'
import { liveOf, contentCover, contentText } from '@/common/screens.js'
import { listGroups } from '@/common/posters.js'
import ZFitImg from '@/components/z-fit-img/z-fit-img.vue'
import { requireLogin } from '@/common/auth.js'
import { requireHost } from '@/common/cert.js'
import { listDevices, isOnline, parsePairPayload, findByCode, addDevice, renameDevice, unbindDevice, identifyDevice, suggestName, nameTaken } from '@/common/devices.js'
import { NAME_CHIPS, PAIR_CODE } from '@/mock/devices.js'

const nav = getNavMetrics()
const cbarStyle = `height:${nav.statusBar + nav.navH}px;padding-top:${nav.statusBar}px`
const headStyle = `padding-top:${nav.statusBar}px`
const headRowStyle = `height:${nav.navH}px;padding-right:${nav.capsuleW}px`
const toast = (title) => uni.showToast({ title, icon: 'none' })
const goBack = () => goBackOrHome()
// 示意电视上显示的配对码（和演示环境的有效配对码保持一致）
const pairCodeText = PAIR_CODE.slice(0, 3) + ' ' + PAIR_CODE.slice(3)

/* ---------- 提示条 ---------- */
const pop = reactive({ show: false, text: '', icon: 'check', tone: 'red' })
let popTimer = null
function popMsg(text, icon = 'check', tone = 'red') {
  clearTimeout(popTimer)
  Object.assign(pop, { show: true, text, icon, tone })
  popTimer = setTimeout(() => { pop.show = false }, 2400)
}

/* ---------- 设备列表 ---------- */
const devices = ref([])
const posterGroups = ref([])
const loaded = ref(false)
const open = ref('')
const flash = ref('')
const tick = ref(0) // 每 15 秒刷新一次「几分钟前」之类的文字
const refreshing = ref(false)
const checkedAt = ref(0)
const noop = () => {}
const online = (d) => (tick.value, isOnline(d))
const onlineCount = computed(() => devices.value.filter(online).length)
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return m + ' 分钟前'
  if (m < 1440) return Math.round(m / 60) + ' 小时前'
  const days = Math.round(m / 1440)
  if (days < 7) return days + ' 天前'
  return '大约 ' + Math.round(days / 7) + ' 周前'
}
const checkedText = computed(() => (tick.value, checkedAt.value ? ago(checkedAt.value) + '检查' : ''))
const dateText = (t) => { const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` }
async function load() {
  const [list, posters] = await Promise.all([listDevices(), listGroups()])
  devices.value = list
  posterGroups.value = posters.list
  checkedAt.value = Date.now()
  loaded.value = true
}
async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  await load()
  setTimeout(() => { refreshing.value = false }, 400)
}
function toggle(d) {
  if (editing.value) return
  open.value = open.value === d.id ? '' : d.id
}

/* ---------- 封面：电视此刻的画面 ---------- */
// 内容、封面、文字说明都来自 src/common/screens.js（遥控切屏也用它）：离线时用最后显示的画面，变灰
const covers = computed(() => {
  const map = {}
  devices.value.forEach((d) => {
    const on = online(d)
    const c = contentCover(on ? liveOf(d, posterGroups.value) : { cat: '' }, posterGroups.value, d.id, d.coverScene)
    map[d.id] = on ? c : { ...c, tint: '#24272F' }
  })
  return map
})
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
const maskStyle = (d) => {
  const t = covers.value[d.id].tint
  return `background:linear-gradient(90deg, ${t} 0%, ${t} 30%, ${hexA(t, 0.82)} 50%, ${hexA(t, 0.25)} 76%, ${hexA(t, 0)} 94%)`
}
// 标题下面那一行：在线显示正在播放的内容，离线显示最后在线时间；改名、识别时显示提示
function subText(d) {
  if (editing.value === d.id) return `最多 12 个字 · ${draft.value.length}/12`
  if (idf.id === d.id) return `电视上正在显示名称 · ${idf.left}s`
  if (!online(d)) return ago(d.lastSeen) + '在线'
  return contentText(liveOf(d, posterGroups.value), posterGroups.value) || d.showingText || '空闲'
}

/* ---------- 识别：电视浮现名称几秒 ---------- */
const idf = reactive({ id: '', left: 0 })
let idfTimer = null
async function identify(d) {
  if (idf.id === d.id) return
  if (!online(d)) return toast('大屏离线，暂时不能识别')
  try {
    const { seconds } = await identifyDevice(d.id)
    clearInterval(idfTimer)
    idf.id = d.id
    idf.left = seconds
    idfTimer = setInterval(() => {
      idf.left -= 1
      if (idf.left <= 0) { clearInterval(idfTimer); idf.id = '' }
    }, 1000)
    popMsg(`「${d.name}」已在电视上显示名称`, 'focus-2')
  } catch (e) {
    toast('大屏离线，暂时不能识别')
  }
}

/* ---------- 解绑：电视回到计时器初始页 ---------- */
function unbind(d) {
  uni.showModal({
    title: `解绑「${d.name}」？`,
    content: isOnline(d) ? '解绑后，这台电视会回到大屏计时器的初始页，需要重新配对才能使用。' : '这台大屏现在离线，解绑会在它下次联网时生效，之后需要重新配对才能使用。',
    confirmText: '解绑',
    cancelText: '取消',
    confirmColor: '#DC0000',
    success: async ({ confirm }) => {
      if (!confirm) return
      await unbindDevice(d.id)
      if (open.value === d.id) open.value = ''
      if (editing.value === d.id) editing.value = ''
      await load()
      popMsg('已解绑，电视已回到计时器初始页', 'link-off', 'gray')
    }
  })
}

/* ---------- 改名：直接在条形卡片的标题处编辑 ---------- */
const editing = ref('')
const draft = ref('')
const editFocus = ref(false)
// 进入编辑时全选标题；只在开始时设一次，不跟着输入变化，否则每打一个字都会重新全选
const sel = reactive({ s: -1, e: -1 })
let saving = false
let retry = false // 点 ✓ 时名字不合格：留在编辑状态让用户改，失去焦点时不要恢复原名
function toggleEdit(d) {
  if (editing.value === d.id) return saveName(d)
  editing.value = d.id
  draft.value = d.name
  sel.s = 0
  sel.e = d.name.length
  editFocus.value = false
  setTimeout(() => { editFocus.value = true }, 60)
  // 全选只在第一次聚焦时生效；之后重新聚焦保留用户已经输入的内容
  setTimeout(() => { sel.s = -1; sel.e = -1 }, 400)
}
function refocus() {
  editFocus.value = false
  setTimeout(() => { editFocus.value = true }, 60)
}
function onDraft(e) { draft.value = String((e && e.detail && e.detail.value) || '').slice(0, 12) }
function checkName(d) {
  const name = draft.value.trim()
  if (!name) return '名称不能为空'
  if (name !== d.name && nameTaken(devices.value, name, d.id)) return `已经有一台大屏叫「${name}」了`
  return ''
}
async function saveName(d) {
  if (saving || editing.value !== d.id) return
  const err = checkName(d)
  if (err) {
    retry = true
    toast(err)
    return refocus()
  }
  saving = true
  editFocus.value = false
  const name = draft.value.trim()
  if (name !== d.name) {
    await renameDevice(d.id, name)
    await load()
    popMsg('已改名，电视上会同步显示')
  }
  editing.value = ''
  sel.s = -1
  sel.e = -1
  saving = false
}
// 键盘收起：名字有效就保存，否则恢复原来的名字（稍等一下，让点 ✓ 按钮的保存先执行）
function onEditBlur(d) {
  setTimeout(() => {
    if (editing.value !== d.id || saving) return
    if (retry) { retry = false; return }
    const err = checkName(d)
    if (err) {
      editing.value = ''
      editFocus.value = false
      return toast(err + '，已恢复原名')
    }
    saveName(d)
  }, 160)
}

/* ---------- 添加大屏 ---------- */
const sheet = ref(false)
const sheetOn = ref(false)
const step = ref('pair')
const mode = ref(0)
const pin = ref('')
const pinFocus = ref(false)
const pinErr = ref('')
const shake = ref(false)
const busy = ref(false)
const found = ref(null)
const newName = ref('')
const chipName = (c) => (/屏$/.test(c) ? c : c + '大屏')
const newTaken = computed(() => !!newName.value.trim() && nameTaken(devices.value, newName.value))
function openSheet(code) {
  step.value = 'pair'
  mode.value = 0
  pin.value = ''
  pinErr.value = ''
  found.value = null
  busy.value = false
  sheet.value = true
  setTimeout(() => {
    sheetOn.value = true
    if (code) {
      pin.value = code
      connect(code)
    }
  }, 40)
}
function closeSheet() {
  pinFocus.value = false
  sheetOn.value = false
  setTimeout(() => { sheet.value = false }, 320)
}
function setMode(i) {
  if (busy.value) return
  mode.value = i
  pinErr.value = ''
  pinFocus.value = false
}
function onPin(e) {
  const v = String((e && e.detail && e.detail.value) || '').replace(/\D/g, '').slice(0, 6)
  pin.value = v
  pinErr.value = ''
  if (v.length === 6) connect(v)
}
async function connect(code) {
  if (busy.value) return
  busy.value = true
  pinFocus.value = false
  try {
    found.value = await findByCode(code)
    newName.value = suggestName(devices.value)
    step.value = 'name'
  } catch (e) {
    pinErr.value = e && e.message === 'exists' ? '这台大屏已经在你的设备列表里' : '没有找到这台大屏，请核对配对码'
    pin.value = ''
    shake.value = false
    setTimeout(() => { shake.value = true }, 20)
    setTimeout(() => { shake.value = false }, 540)
  }
  busy.value = false
}
// 页内扫码弹窗（不跳转全屏）：只收下大屏计时器的二维码；「输入配对码」切回配对码输入
async function scan() {
  if (busy.value) return
  const res = await openScanner({
    title: '扫码连接大屏',
    hint: '对准电视首页上的二维码',
    validate: (t) => (parsePairPayload(t) ? true : '这不是大屏计时器的二维码'),
    manualText: '输入配对码',
    demo: 'tjtv://pair?code=' + PAIR_CODE
  })
  if (!res) return
  if (res.manual) return setMode(0)
  connect(parsePairPayload(res.result))
}
function onNewName(e) { newName.value = String((e && e.detail && e.detail.value) || '') }
async function finishAdd() {
  const name = newName.value.trim()
  if (!name || newTaken.value || busy.value) return
  busy.value = true
  try {
    const d = await addDevice(found.value, name)
    closeSheet()
    await load()
    flash.value = d.id
    setTimeout(() => { flash.value = '' }, 1600)
    popMsg(`已添加「${name}」，电视上会显示这个名称`)
  } catch (e) {
    toast('添加没有成功，请再试一次')
  }
  busy.value = false
}

// 示意用的二维码图案（不是真实二维码）：三个定位角 + 随机模块
const qrStyle = (() => {
  const N = 21
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const finder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
  let rects = ''
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.52) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`
  const eye = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#F2F2EE"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${N + 2}" height="${N + 2}" viewBox="-1 -1 ${N + 2} ${N + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${N + 2}" height="${N + 2}" fill="#F2F2EE"/><g fill="#181A20">${rects}${eye(0, 0)}${eye(N - 7, 0)}${eye(0, N - 7)}</g></svg>`
  return `background-image:url("${svgUri(svg)}")`
})()

/* ---------- 紧凑标题栏 ---------- */
const compact = ref(false)
onPageScroll(({ scrollTop }) => {
  const on = scrollTop > 60
  if (on !== compact.value) compact.value = on
})

/* ---------- 页面 ---------- */
let tickTimer = null
onLoad((q) => {
  // 主办方专属页面；也支持电视二维码直接打开：?code=123456 或小程序码的 scene
  if (!requireLogin() || !requireHost()) return
  const code = parsePairPayload((q && (q.code ? 'code=' + q.code : q.scene)) || '')
  load().then(() => { if (code) openSheet(code) })
})
onShow(() => {
  clearInterval(tickTimer)
  tickTimer = setInterval(() => { tick.value += 1 }, 15000)
})
onHide(() => clearInterval(tickTimer))
onUnload(() => { clearInterval(tickTimer); clearInterval(idfTimer) })
</script>

<style>
.page { position: relative; min-height: 100vh; background: #181A20; padding-bottom: calc(220rpx + env(safe-area-inset-bottom)); }
.press { opacity: .8; transform: scale(.96); }
.press-soft { opacity: .85; }
.ph { font-size: 26rpx; color: #4B5060; }
.dot { width: 12rpx; height: 12rpx; flex: none; border-radius: 50%; }
.dot-on { background: #4CB582; box-shadow: 0 0 0 0 rgba(76, 181, 130, .6); animation: live 1.8s ease-out infinite; }
.dot-off { background: #4B5060; }
@keyframes live { 0% { box-shadow: 0 0 0 0 rgba(76, 181, 130, .55); } 100% { box-shadow: 0 0 0 12rpx rgba(76, 181, 130, 0); } }

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

/* 概览 */
.sum { margin: 28rpx 40rpx 0; padding: 28rpx 28rpx 28rpx 20rpx; border-radius: 32rpx; background: #1F222A; display: flex; align-items: center; }
.sum-img { width: 120rpx; height: 104rpx; flex: none; }
.sum-main { flex: 1; min-width: 0; margin-left: 20rpx; }
.sum-t { display: block; font-size: 32rpx; font-weight: 700; color: #FFFFFF; }
.sum-s { margin-top: 10rpx; display: flex; align-items: center; }
.sum-n { font-size: 24rpx; color: #CBD5E1; }
.sum-s .dot { margin: 0 10rpx 0 22rpx; }
.sum-on { color: #4CB582; }
.sum-hint { display: block; margin-top: 8rpx; font-size: 20rpx; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sum-refresh { width: 72rpx; height: 72rpx; flex: none; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 列表 */
.sec-h { margin: 56rpx 40rpx 24rpx; display: flex; align-items: baseline; justify-content: space-between; }
.sec-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 38rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.sec-n { font-size: 22rpx; color: #6B7280; }
.empty { margin: 0 40rpx; padding: 48rpx 40rpx; border-radius: 32rpx; background: #1F222A; display: flex; flex-direction: column; align-items: center; }
.empty-img { width: 120rpx; height: 104rpx; }
.empty-t { margin-top: 20rpx; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.empty-d { margin-top: 10rpx; font-size: 24rpx; line-height: 1.6; color: #9CA3AF; text-align: center; }
.dv { margin: 0 32rpx 24rpx; }
.dv-row { display: flex; align-items: center; }

/* 条形卡片：封面在右侧裁切铺满，左侧渐隐遮罩托住文字 */
.bar {
  position: relative; flex: 1; min-width: 0; height: 120rpx; box-sizing: border-box; padding-left: 16rpx; border-radius: 999rpx; overflow: hidden;
  display: flex; align-items: center; background: #1F222A; box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .1), 0 12rpx 28rpx rgba(0, 0, 0, .35);
  transition: box-shadow .3s ease, transform .2s ease;
}
.bar-press { transform: scale(.985); }
.bar-cv { position: absolute; left: 28%; top: 0; right: 0; bottom: 0; }
.bar-off .bar-cv { filter: grayscale(1) brightness(.6); opacity: .75; }
.bar-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
.bar-ic { position: relative; width: 88rpx; height: 88rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.bar-ic-on { background: rgba(12, 32, 22, .7); box-shadow: inset 0 0 0 3rpx #4CB582; }
.bar-ic-off { background: rgba(36, 14, 16, .7); box-shadow: inset 0 0 0 3rpx rgba(255, 107, 107, .6); }
.bar-main { position: relative; flex: 1; min-width: 0; margin: 0 28rpx 0 22rpx; }
.dv-n { display: block; height: 44rpx; line-height: 44rpx; font-size: 32rpx; font-weight: 700; color: #FFFFFF; text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, .45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dv-n-in { min-height: 44rpx; padding: 0; border-bottom: 2rpx dashed rgba(255, 255, 255, .55); }
.dv-s { display: block; margin-top: 6rpx; font-size: 22rpx; color: rgba(242, 242, 238, .78); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dv-s-edit { color: #FFC53A; }
.dv-s-max { color: #FF6B6B; }
.bar-off .dv-s { color: rgba(203, 213, 225, .62); }
/* 识别中：红色呼吸光；刚添加：绿色高亮；改名中：白色描边 */
.bar-id { animation: id-glow 1s ease-in-out infinite; }
@keyframes id-glow { 0%, 100% { box-shadow: inset 0 0 0 3rpx #DC0000, 0 0 0 0 rgba(220, 0, 0, 0); } 50% { box-shadow: inset 0 0 0 3rpx #FF4D4D, 0 0 36rpx rgba(220, 0, 0, .6); } }
.bar-new { animation: new-glow 1.6s ease; }
@keyframes new-glow { 0%, 40% { box-shadow: inset 0 0 0 3rpx #4CB582, 0 0 30rpx rgba(76, 181, 130, .5); } }
.bar-edit { box-shadow: inset 0 0 0 3rpx rgba(255, 255, 255, .55), 0 12rpx 28rpx rgba(0, 0, 0, .35); }

/* 改名按钮：展开时从右侧出现，条形卡片同时变短 */
.edit {
  width: 0; height: 120rpx; margin-left: 0; flex: none; border-radius: 60rpx; overflow: hidden; background: #262A34;
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .12); display: flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(.6); transition: width .32s cubic-bezier(.2, .8, .2, 1), margin-left .32s cubic-bezier(.2, .8, .2, 1), opacity .25s ease, transform .32s cubic-bezier(.34, 1.4, .64, 1);
}
.dv-open .edit { width: 120rpx; margin-left: 20rpx; opacity: 1; transform: scale(1); }
.edit-on { background: #DC0000; box-shadow: 0 10rpx 24rpx rgba(220, 0, 0, .35); }

.chev { display: flex; transition: transform .3s ease; }
.fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s ease; }
.fold-on { grid-template-rows: 1fr; }
.fold-in { min-height: 0; overflow: hidden; }
.dv-body { padding: 24rpx 24rpx 12rpx; }
.acts { display: flex; }
.act { flex: 1; height: 96rpx; margin: 0 12rpx; border-radius: 999rpx; background: #1F222A; box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .06); display: flex; align-items: center; justify-content: center; }
.act-dis { opacity: .4; }
.act-danger { background: #3A1418; box-shadow: none; }
.act-t { margin-left: 12rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.act-t-danger { color: #FF6B6B; }
.dv-info { display: block; margin-top: 22rpx; padding: 0 16rpx; font-size: 20rpx; line-height: 1.6; color: #4B5060; }
.dv-hint { display: block; margin-top: 6rpx; padding: 0 16rpx; font-size: 20rpx; color: #FFC53A; }

/* 添加大屏：固定在底部 */
.add-dock { position: fixed; z-index: 20; left: 0; right: 0; bottom: 0; padding: 28rpx 40rpx calc(28rpx + env(safe-area-inset-bottom)); background: linear-gradient(180deg, rgba(24, 26, 32, 0), #181A20 38%); }
.add { height: 100rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; box-shadow: 0 14rpx 32rpx rgba(220, 0, 0, .35); }
.add-t { margin-left: 12rpx; font-size: 32rpx; font-weight: 700; color: #FFFFFF; }

/* 添加大屏弹层 */
.sh { position: fixed; z-index: 100; left: 0; top: 0; right: 0; bottom: 0; }
.sh-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); opacity: 0; transition: opacity .3s ease; }
.sh-on .sh-mask { opacity: 1; }
.sh-panel {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 16rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); border-radius: 40rpx 40rpx 0 0;
  background: #1F222A; transform: translateY(100%); transition: transform .38s cubic-bezier(.2, .8, .2, 1);
}
.sh-on .sh-panel { transform: translateY(0); }
.sh-grab { width: 72rpx; height: 8rpx; margin: 0 auto 20rpx; border-radius: 4rpx; background: #35383F; }
.sh-head { display: flex; align-items: center; justify-content: space-between; }
.sh-title { display: block; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.sh-center { text-align: center; }
.sh-x { position: absolute; z-index: 2; right: 40rpx; top: 40rpx; width: 56rpx; height: 56rpx; border-radius: 50%; background: #2A2D36; display: flex; align-items: center; justify-content: center; }
.sh-head { min-height: 56rpx; }
.sh-sub { display: block; margin-top: 8rpx; text-align: center; font-size: 22rpx; color: #9CA3AF; }
.seg { position: relative; margin-top: 24rpx; display: flex; padding: 6rpx; border-radius: 999rpx; background: #181A20; }
.seg-ind { position: absolute; left: 6rpx; top: 6rpx; width: calc((100% - 12rpx) / 2); height: 64rpx; border-radius: 999rpx; background: #F2F2EE; transition: transform .42s cubic-bezier(.34, 1.36, .64, 1); }
.seg-i { position: relative; flex: 1; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.seg-t { margin-left: 8rpx; font-size: 24rpx; color: #9CA3AF; transition: color .25s ease; }
.seg-t-on { color: #181A20; font-weight: 600; }
.pane { margin-top: 28rpx; display: flex; flex-direction: column; align-items: center; }
.tip { margin-top: 20rpx; font-size: 22rpx; color: #9CA3AF; text-align: center; }

/* 示意电视 */
.tvm { display: flex; flex-direction: column; align-items: center; }
.tvm-scr { width: 440rpx; height: 248rpx; box-sizing: border-box; padding: 0 30rpx; border-radius: 18rpx; border: 6rpx solid #2F333D; background: radial-gradient(circle at 30% 20%, #262A34, #0E0F14); display: flex; align-items: center; justify-content: space-between; }
.tvm-l { display: flex; flex-direction: column; }
.tvm-k { font-size: 18rpx; color: #6B7280; }
.tvm-pin { margin-top: 4rpx; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 52rpx; line-height: 1; letter-spacing: 2rpx; color: #F2F2EE; }
.tvm-app { margin-top: 12rpx; font-size: 16rpx; color: #4B5060; }
.tvm-qr { width: 132rpx; height: 132rpx; border-radius: 8rpx; background-size: 100% 100%; box-shadow: 0 0 0 4rpx rgba(255, 255, 255, .08); }
.tvm-stand { width: 120rpx; height: 14rpx; margin-top: 4rpx; border-radius: 0 0 10rpx 10rpx; background: #2F333D; }

/* 6 位配对码 */
.pin { position: relative; margin-top: 28rpx; display: flex; }
.pin-shake { animation: shake .5s ease; }
@keyframes shake { 15%, 55% { transform: translateX(-14rpx); } 35%, 75% { transform: translateX(14rpx); } }
.pin-b { width: 88rpx; height: 104rpx; margin: 0 8rpx; box-sizing: border-box; border-radius: 20rpx; background: #181A20; border: 3rpx solid #2A2D36; display: flex; align-items: center; justify-content: center; transition: border-color .2s ease; }
.pin-b-fill { border-color: #4B5060; }
.pin-b-on { border-color: #F2F2EE; }
.pin-b-on::after { content: ''; width: 4rpx; height: 44rpx; background: #F2F2EE; animation: caret 1s steps(1) infinite; }
@keyframes caret { 50% { opacity: 0; } }
.pin-b-err { border-color: #DC0000; }
.pin-d { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 52rpx; color: #FFFFFF; }
.pin-hidden { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; color: transparent; }
.msg { margin-top: 20rpx; height: 36rpx; display: flex; align-items: center; }
.msg-t { font-size: 22rpx; color: #6B7280; }
.msg-err .msg-t { color: #FF6B6B; }
.spin-ic { margin-right: 8rpx; display: flex; animation: spin .9s linear infinite; }

/* 扫码 */
.scan { position: relative; width: 300rpx; height: 300rpx; display: flex; align-items: center; justify-content: center; }
.sc { position: absolute; width: 56rpx; height: 56rpx; border-color: #DC0000; border-style: solid; border-width: 0; }
.sc-tl { left: 0; top: 0; border-left-width: 6rpx; border-top-width: 6rpx; border-top-left-radius: 20rpx; }
.sc-tr { right: 0; top: 0; border-right-width: 6rpx; border-top-width: 6rpx; border-top-right-radius: 20rpx; }
.sc-bl { left: 0; bottom: 0; border-left-width: 6rpx; border-bottom-width: 6rpx; border-bottom-left-radius: 20rpx; }
.sc-br { right: 0; bottom: 0; border-right-width: 6rpx; border-bottom-width: 6rpx; border-bottom-right-radius: 20rpx; }
.scan-qr { width: 200rpx; height: 200rpx; border-radius: 12rpx; background-size: 100% 100%; opacity: .85; }
.scan-line { position: absolute; left: 24rpx; right: 24rpx; top: 30rpx; height: 4rpx; border-radius: 2rpx; background: linear-gradient(90deg, transparent, #FF4D4D, transparent); box-shadow: 0 0 16rpx rgba(255, 77, 77, .8); animation: scan 2.2s ease-in-out infinite; }
@keyframes scan { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(236rpx); } }

/* 按钮、起名 */
.btn { margin-top: 32rpx; width: 100%; height: 92rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 28rpx rgba(220, 0, 0, .3); }
.btn-dis { background: #3A3B46; box-shadow: none; }
.btn-t { margin-left: 10rpx; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.ok { width: 96rpx; height: 96rpx; margin: 12rpx auto 20rpx; border-radius: 50%; background: #4CB582; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 12rpx rgba(76, 181, 130, .15); animation: ok .45s cubic-bezier(.34, 1.56, .64, 1); }
@keyframes ok { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.nm-k { display: block; margin-top: 36rpx; font-size: 24rpx; color: #CBD5E1; }
.nm-in { margin-top: 14rpx; height: 92rpx; padding: 0 24rpx; border-radius: 20rpx; background: #181A20; border: 2rpx solid #2A2D36; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.chips { margin-top: 18rpx; display: flex; flex-wrap: wrap; }
.chip { margin: 0 14rpx 14rpx 0; padding: 0 24rpx; height: 56rpx; border-radius: 999rpx; background: #262A34; display: flex; align-items: center; border: 2rpx solid transparent; }
.chip-on { border-color: #DC0000; background: rgba(220, 0, 0, .12); }
.chip-t { font-size: 24rpx; color: #E5E7EB; }
.nm-tip { display: block; margin-top: 4rpx; font-size: 22rpx; color: #6B7280; }
.nm-err { color: #FF6B6B; }
.chip-used { opacity: .4; }
.dv-err { display: block; margin-top: 12rpx; font-size: 22rpx; color: #FF6B6B; }

@media (prefers-reduced-motion: reduce) {
  .dot-on, .spin, .spin-ic, .scan-line, .pin-b-on::after, .bar-id, .bar-new { animation: none; }
  .fold, .chev, .sh-panel, .sh-mask, .seg-ind, .cbar, .bar, .edit { transition: none; }
}
</style>
