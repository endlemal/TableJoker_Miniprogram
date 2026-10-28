<template>
  <view class="page">
    <!-- 顶栏：返回 + 标题（标题只在这里出现一次） -->
    <view class="nav" :style="'padding-top:' + nav.statusBar + 'px'">
      <view class="nav-row" :style="'height:' + nav.navH + 'px;padding-right:' + (nav.capsuleW + 12) + 'px'">
        <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="18" color="#FFFFFF" /></view>
        <text class="nav-title">主办方认证</text>
      </view>
    </view>
    <view :style="'height:' + (nav.statusBar + nav.navH) + 'px'"></view>

    <!-- 审核中：一个状态、一句说明、一份资料摘要 -->
    <view v-if="state === 'pending'" class="body">
      <view class="pd">
        <view class="pd-ic"><z-icon name="hourglass" :size="30" color="#FFC53A" /></view>
        <text class="pd-t">认证审核中</text>
        <text class="pd-s">{{ submittedText }}提交，预计 1 个工作日内完成审核，结果会通过微信服务通知告诉你。</text>
      </view>
      <view v-if="sub" class="pd-card">
        <text class="pd-h">已提交的资料</text>
        <view class="pd-row"><text class="pd-k">主办方名称</text><text class="pd-v">{{ sub.name }}</text></view>
        <view class="pd-row"><text class="pd-k">主体类型</text><text class="pd-v">{{ TYPE_NAME[sub.type] }}</text></view>
        <view class="pd-row"><text class="pd-k">联系方式</text><text class="pd-v">{{ maskPhone(sub.phone) }}</text></view>
        <view class="tiles pd-tiles">
          <view v-for="k in FILE_KEYS" :key="k" class="tile-w">
            <view class="tile"><image v-if="sub.files[k]" class="tile-img" :src="sub.files[k]" mode="aspectFill" /></view>
            <text class="tile-n">{{ SLOTS[k].name }}</text>
          </view>
        </view>
      </view>
      <view class="pd-back" hover-class="press" @tap="goBackOrHome"><text class="pd-back-t">返回</text></view>
    </view>

    <view v-else class="body">
      <!-- 开头：几步完成 + 开放对象，一句话说清楚 -->
      <view class="intro">
        <text class="intro-t">4 步完成认证</text>
        <text class="intro-s">仅限个体工商户、企业等具备资质的单位申请，暂不对个人玩家开放。</text>
      </view>
      <view v-if="state === 'rejected'" class="rj">
        <z-icon name="alert-triangle" :size="18" color="#FF8A8A" />
        <text class="rj-t">上次未通过：{{ rejectReason }}。修改后可以重新提交。</text>
      </view>

      <!-- 四个步骤：当前这一步展开；做完的收起成一行摘要，可以点开修改；后面的只写要准备什么 -->
      <view v-for="(st, i) in STEPS" :id="'step-' + i" :key="st.key" class="st" :class="{ 'st-open': step === i }">
        <view class="st-h" hover-class="press-soft" @tap="openStep(i)">
          <view class="st-no" :class="{ 'st-no-done': secDone[i] && step !== i, 'st-no-cur': step === i }">
            <z-icon v-if="secDone[i] && step !== i" name="check" :size="14" :stroke="3" color="#FFFFFF" />
            <text v-else class="st-no-t">{{ i + 1 }}</text>
          </view>
          <view class="st-main">
            <text class="st-t">{{ st.title }}</text>
            <text v-if="step !== i" class="st-s">{{ secDone[i] ? summaryOf(i) : st.hint }}</text>
          </view>
          <text v-if="secDone[i] && step !== i" class="st-edit">修改</text>
        </view>

        <view v-if="step === i" class="st-body">
          <!-- ① 主体信息：字段名在上，输入框在下 -->
          <block v-if="i === 0">
            <view class="f">
              <text class="f-k">主办方名称</text>
              <input v-model="form.name" class="f-in" maxlength="20" placeholder="例如：夜航棋牌俱乐部" placeholder-class="ph" />
              <text class="f-tip">建议和门头招牌一致，2 到 20 个字</text>
            </view>
            <view class="f">
              <text class="f-k">主体类型</text>
              <view class="opts">
                <view v-for="t in TYPES" :key="t.key" class="opt" :class="{ 'opt-on': form.type === t.key }" hover-class="press" @tap="form.type = t.key">
                  <text class="opt-t">{{ t.name }}</text>
                  <text class="opt-s">{{ t.desc }}</text>
                </view>
              </view>
            </view>
            <view class="f">
              <text class="f-k">联系方式</text>
              <input v-model="form.phone" class="f-in" type="number" maxlength="11" placeholder="负责人的手机号" placeholder-class="ph" />
              <text v-if="form.phone && !phoneOk" class="f-err">请输入 11 位手机号</text>
            </view>
            <view class="av-row" hover-class="press-soft" @tap="tapFile('avatar')">
              <view class="av"><image v-if="form.avatar" class="av-img" :src="form.avatar" mode="aspectFill" /><z-icon v-else name="camera" :size="18" color="#C9CDD4" /></view>
              <view class="av-main"><text class="av-k">{{ form.avatar ? '头像已上传' : '上传头像' }}</text><text class="av-s">展示在主页和比赛卡片上，建议用店铺标志</text></view>
              <z-icon name="chevron-right" :size="16" color="#A9AEB8" />
            </view>
          </block>

          <!-- ② 资质证件 / ③ 场地照片：每组三张，缩略图一样大；点已上传的可以查看大图、重新上传或删除 -->
          <block v-else-if="i === 1 || i === 2">
            <text class="b-s">{{ i === 1 ? '法定代表人（经营者）的身份证正反面和营业执照，四个角完整、文字清晰。' : '室内照片 2 张，再加 1 张能看清招牌的门头照。' }}</text>
            <view class="tiles">
              <view v-for="k in GROUPS[i]" :key="k" class="tile-w" hover-class="press" @tap="tapFile(k)">
                <view class="tile">
                  <image v-if="form.files[k]" class="tile-img" :src="form.files[k]" mode="aspectFill" />
                  <view v-else class="tile-ph"><z-icon name="camera-plus" :size="22" color="#C9CDD4" /></view>
                </view>
                <view class="tile-n-row"><z-icon v-if="form.files[k]" name="circle-check" :size="13" color="#4CB582" /><text class="tile-n">{{ SLOTS[k].name }}</text></view>
              </view>
            </view>
            <view v-if="i === 1" class="safe"><z-icon name="lock" :size="14" color="#A9AEB8" /><text class="safe-t">证件只用于认证审核，平台加密保存，不会公开</text></view>
          </block>

          <!-- ④ 人脸识别、费用、认证规则 -->
          <block v-else>
            <view class="face">
              <z-icon :name="form.faceOk ? 'circle-check' : 'face-id'" :size="28" :color="form.faceOk ? '#4CB582' : '#FFFFFF'" />
              <view class="face-main">
                <text class="face-t">{{ form.faceOk ? '人脸识别已通过' : '由法定代表人本人完成' }}</text>
                <text class="face-s">{{ form.faceOk ? '和身份证上的本人一致' : '对着手机完成，大约 10 秒' }}</text>
              </view>
            </view>
            <text class="fee-line">提交后支付认证费用 50 元（微信支付）。</text>
            <view class="agree" @tap="agreed = !agreed">
              <view class="ck" :class="{ 'ck-on': agreed }"><z-icon v-if="agreed" name="check" :size="12" :stroke="3.4" color="#181A20" /></view>
              <text class="agree-t">我已阅读并同意</text><text class="agree-a" @tap.stop="rulesOpen = true">《认证规则》</text>
            </view>
          </block>
        </view>
      </view>
      <view class="pad"></view>
    </view>

    <!-- 底部：现在在第几步、还差什么，以及下一步的操作 -->
    <view v-if="state !== 'pending'" class="bar">
      <view class="bar-l">
        <text class="bar-t">第 {{ step + 1 }} 步，共 4 步</text>
        <text class="bar-s">{{ barHint }}</text>
      </view>
      <view class="bar-btn" :class="{ 'bar-btn-off': !action.enabled }" hover-class="press" @tap="runAction"><text class="bar-btn-t">{{ action.text }}</text></view>
    </view>

    <!-- 人脸识别（演示）：取景框、固定位置的动作提示、进度 -->
    <view v-if="face.open" class="fv">
      <text class="fv-title">人脸识别</text>
      <view class="fv-frame" :class="{ 'fv-ok': face.phase === 'ok' }">
        <view class="fv-cam"><z-icon v-if="face.phase !== 'ok'" name="user" :size="120" :stroke="1" color="#3A3F4B" /><z-icon v-else name="check" :size="72" :stroke="2.4" color="#4CB582" /></view>
      </view>
      <text class="fv-tip">{{ PHASE_TEXT[face.phase] }}</text>
      <view class="fv-bar"><view class="fv-bar-f" :class="{ 'fv-bar-ok': face.phase === 'ok' }" :style="'width:' + face.pct + '%'"></view></view>
      <text class="fv-s">请在光线充足的地方，由法定代表人本人完成</text>
      <view v-if="face.phase !== 'ok'" class="fv-cancel" hover-class="press" @tap="cancelFace"><text class="fv-cancel-t">取消</text></view>
      <text class="fv-demo">演示：正式版调用微信实名核身</text>
    </view>

    <!-- 认证规则 -->
    <view v-if="rulesOpen" class="rs">
      <view class="rs-mask" @tap="rulesOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="rs-sheet">
        <view class="rs-head"><text class="rs-title">认证规则</text><view class="rs-x" hover-class="press" @tap="rulesOpen = false"><z-icon name="x" :size="16" color="#C9CDD4" /></view></view>
        <scroll-view scroll-y class="rs-body">
          <view v-for="(sec, i) in rules" :key="i" class="rs-sec">
            <text class="rs-t">{{ sec.title }}</text>
            <text v-if="sec.text" class="rs-p">{{ sec.text }}</text>
            <view v-for="(it, k) in sec.items || []" :key="k" class="rs-li"><text class="rs-dot">·</text><text class="rs-p">{{ it }}</text></view>
          </view>
        </scroll-view>
        <view class="rs-ok" hover-class="press" @tap="agreeRules"><text class="rs-ok-t">我已阅读并同意</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 主办方认证申请：玩家在「成为主办方」页点「立即认证」进入。分 4 步：主体信息、资质证件、场地照片、人脸识别；
// 只展开当前这一步，底部写着在第几步、还差什么和下一步的操作。认证费用 50 元，提交时支付。
// 目前只对个体工商户、企业等具备资质的单位开放，不对个人玩家开放。
// 演示：资料存在本机（草稿随时保存）；人脸识别和支付是模拟的，正式环境分别调用微信实名核身和微信支付，资料在提交时上传到服务器
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { getCertState, setCertState } from '@/common/cert.js'
import { STATE_INFO, rules } from '@/mock/host.js'

const nav = getNavMetrics()
const noop = () => {}
const FEE = 50
const DRAFT_KEY = 'zz_certify_draft'
const SUB_KEY = 'zz_certify_submission'
const TYPES = [{ key: 'individual', name: '个体工商户', desc: '持个体工商户营业执照' }, { key: 'company', name: '企业', desc: '有限公司等企业主体' }]
const TYPE_NAME = { individual: '个体工商户', company: '企业' }
const SLOTS = {
  idFront: { name: '身份证人像面' },
  idBack: { name: '身份证国徽面' },
  license: { name: '营业执照' },
  indoor1: { name: '室内照片 1' },
  indoor2: { name: '室内照片 2' },
  storefront: { name: '门头照' }
}
const FILE_KEYS = Object.keys(SLOTS)
const GROUPS = { 1: ['idFront', 'idBack', 'license'], 2: ['indoor1', 'indoor2', 'storefront'] }
const STEPS = [
  { key: 'base', title: '主体信息', hint: '名称、主体类型、联系方式和头像' },
  { key: 'docs', title: '资质证件', hint: '法人身份证正反面和营业执照' },
  { key: 'venue', title: '场地照片', hint: '室内照片 2 张和门头照' },
  { key: 'face', title: '人脸识别并提交', hint: '法定代表人本人完成，然后提交' }
]
const emptyForm = () => ({ name: '', type: '', avatar: '', phone: '', files: Object.fromEntries(FILE_KEYS.map((k) => [k, ''])), faceOk: false })

const state = ref(getCertState())
const sub = ref(uni.getStorageSync(SUB_KEY) || null)
const form = reactive(emptyForm())
const agreed = ref(false)
const rulesOpen = ref(false)
const step = ref(0)
const rejectReason = String(STATE_INFO.rejected.statusLine || '').replace(/^原因：/, '')

/* ---------- 完成度：11 项资料，分成 4 步 ---------- */
const phoneOk = computed(() => /^1[3-9]\d{9}$/.test(form.phone))
const ITEMS = [
  { sec: 0, name: '主办方名称', ok: () => form.name.trim().length >= 2 },
  { sec: 0, name: '主体类型', ok: () => !!form.type },
  { sec: 0, name: '联系方式', ok: () => phoneOk.value },
  { sec: 0, name: '头像', ok: () => !!form.avatar },
  ...FILE_KEYS.map((k) => ({ sec: GROUPS[1].includes(k) ? 1 : 2, name: SLOTS[k].name, ok: () => !!form.files[k] })),
  { sec: 3, name: '人脸识别', ok: () => form.faceOk }
]
const missing = computed(() => ITEMS.filter((it) => !it.ok()))
const missingIn = (i) => missing.value.filter((it) => it.sec === i).map((it) => it.name)
const secDone = computed(() => STEPS.map((_, i) => !missingIn(i).length))
const ready = computed(() => !missing.value.length && agreed.value)
const maskPhone = (s) => String(s || '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
function summaryOf(i) {
  if (i === 0) return [form.name, TYPE_NAME[form.type], maskPhone(form.phone)].filter(Boolean).join(' · ')
  if (i === 1) return '身份证正反面、营业执照已上传'
  if (i === 2) return '室内照片 2 张、门头照已上传'
  return '人脸识别已通过'
}

onLoad(() => {
  // 先用草稿；上次没通过时用上次提交的资料
  const draft = uni.getStorageSync(DRAFT_KEY)
  const base = draft && typeof draft === 'object' ? draft : state.value === 'rejected' && sub.value ? sub.value : null
  if (base) Object.assign(form, emptyForm(), base, { files: { ...emptyForm().files, ...(base.files || {}) } })
  // 打开第一个没做完的步骤；都做完了就停在最后一步
  const first = secDone.value.findIndex((d) => !d)
  step.value = first < 0 ? 3 : first
})
// 草稿随时保存，离开页面再回来不用重填
watch(form, () => { if (state.value !== 'pending') uni.setStorageSync(DRAFT_KEY, JSON.parse(JSON.stringify(form))) }, { deep: true })

function openStep(i) {
  step.value = i
  nextTick(() => setTimeout(() => uni.pageScrollTo({ selector: '#step-' + i, offsetTop: -(nav.statusBar + nav.navH + 8), duration: 260 }), 30))
}

/* ---------- 底部的操作：下一步 → 开始人脸识别 → 提交认证 ---------- */
const action = computed(() => {
  if (step.value < 3) return { text: '下一步', enabled: secDone.value[step.value] }
  if (!form.faceOk) return { text: '开始人脸识别', enabled: !!(form.files.idFront && form.files.idBack) }
  return { text: '提交认证', enabled: ready.value }
})
const barHint = computed(() => {
  const i = step.value
  if (i < 3) return missingIn(i).length ? '还差：' + missingIn(i).join('、') : '这一步已完成'
  if (!form.faceOk) return form.files.idFront && form.files.idBack ? '最后一步：人脸识别' : '先在第 2 步上传身份证正反面'
  const others = missing.value.map((it) => it.name)
  if (others.length) return '还差：' + others.slice(0, 2).join('、') + (others.length > 2 ? ' 等' : '')
  return agreed.value ? '资料已齐全，可以提交' : '请先同意认证规则'
})
const toast = (title) => uni.showToast({ title, icon: 'none' })
function runAction() {
  const i = step.value
  if (i < 3) {
    if (!secDone.value[i]) return toast('还差：' + missingIn(i).join('、'))
    const next = secDone.value.findIndex((d, k) => k > i && !d)
    return openStep(next < 0 ? 3 : next)
  }
  if (!form.faceOk) {
    if (!form.files.idFront || !form.files.idBack) { toast('请先上传法人身份证正反面'); return openStep(1) }
    return startFace()
  }
  submit()
}

/* ---------- 照片：空的直接选；已上传的可以查看大图、重新上传或删除 ---------- */
const srcOf = (k) => (k === 'avatar' ? form.avatar : form.files[k])
function setFile(k, path) {
  if (k === 'avatar') form.avatar = path
  else form.files[k] = path
}
function pick(k) {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'], success: (r) => { const f = r.tempFiles && r.tempFiles[0]; if (f) setFile(k, f.tempFilePath) } })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseImage({ count: 1, sizeType: ['compressed'], success: (r) => { if (r.tempFilePaths && r.tempFilePaths[0]) setFile(k, r.tempFilePaths[0]) } })
  // #endif
}
function tapFile(k) {
  const src = srcOf(k)
  if (!src) return pick(k)
  uni.showActionSheet({
    itemList: ['查看大图', '重新上传', '删除'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) uni.previewImage({ urls: [src], current: src })
      else if (tapIndex === 1) pick(k)
      else setFile(k, '')
    }
  })
}

/* ---------- 人脸识别（演示）：先对准取景框，再眨眼，进度走完后通过 ---------- */
const PHASE_TEXT = { align: '请把脸放进取景框', blink: '请缓慢眨眼', ok: '识别成功' }
const face = reactive({ open: false, phase: 'align', pct: 0 })
let faceTimer = null
function stopFace() { clearInterval(faceTimer); faceTimer = null }
function startFace() {
  Object.assign(face, { open: true, phase: 'align', pct: 0 })
  const t0 = Date.now()
  stopFace()
  faceTimer = setInterval(() => {
    const t = Date.now() - t0
    face.pct = Math.min(100, Math.round((t / 2600) * 100))
    if (t > 900 && face.phase === 'align') face.phase = 'blink'
    if (t >= 2600) {
      stopFace()
      face.phase = 'ok'
      setTimeout(() => { face.open = false; form.faceOk = true }, 900)
    }
  }, 60)
}
function cancelFace() {
  stopFace()
  face.open = false
}
onUnload(stopFace)

/* ---------- 提交：支付认证费用（演示），提交后进入审核 ---------- */
const agreeRules = () => { agreed.value = true; rulesOpen.value = false }
function submit() {
  if (missing.value.length) {
    const first = missing.value[0]
    toast('还差：' + first.name)
    return openStep(first.sec)
  }
  if (!agreed.value) return toast('请先阅读并同意认证规则')
  uni.showModal({
    title: '支付认证费用',
    content: `¥${FEE}.00 · 主办方认证审核（演示，不会真的扣款）`,
    confirmText: '确认支付',
    confirmColor: '#DC0000',
    success: ({ confirm }) => {
      if (!confirm) return
      uni.showLoading({ title: '正在提交' })
      setTimeout(() => {
        uni.hideLoading()
        const data = { ...JSON.parse(JSON.stringify(form)), at: Date.now() }
        uni.setStorageSync(SUB_KEY, data)
        uni.removeStorageSync(DRAFT_KEY)
        sub.value = data
        setCertState('pending')
        state.value = 'pending'
        uni.pageScrollTo({ scrollTop: 0, duration: 0 })
      }, 900)
    }
  })
}
const p2 = (n) => String(n).padStart(2, '0')
const submittedText = computed(() => {
  if (!sub.value || !sub.value.at) return ''
  const d = new Date(sub.value.at)
  return `${p2(d.getMonth() + 1)}/${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())} `
})
</script>

<style>
/* 文字：正文 #FFFFFF，次要 #C9CDD4，辅助 #A9AEB8（都不低于 24rpx）；圆角统一 16rpx；红色只用在底部的主按钮 */
.page { min-height: 100vh; background: #181A20; }
.nav { position: fixed; z-index: 30; left: 0; right: 0; top: 0; background: #181A20; }
.nav-row { padding-left: 24rpx; display: flex; align-items: center; box-sizing: border-box; }
.nav-back { width: 64rpx; height: 64rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.nav-title { margin-left: 20rpx; font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
.body { padding: 0 40rpx; }
.intro { padding: 24rpx 0 8rpx; }
.intro-t { display: block; font-size: 40rpx; font-weight: 700; color: #FFFFFF; }
.intro-s { display: block; margin-top: 12rpx; font-size: 28rpx; line-height: 1.6; color: #C9CDD4; }
.rj { margin-top: 24rpx; padding: 22rpx 24rpx; border-radius: 16rpx; background: rgba(220, 0, 0, .12); display: flex; align-items: flex-start; }
.rj-t { margin-left: 12rpx; flex: 1; font-size: 27rpx; line-height: 1.6; color: #FFB3B3; }
/* 步骤：没有外框，靠间距和分隔线分组 */
.st { margin-top: 16rpx; border-top: 1rpx solid #2A2D35; }
.st-h { padding: 32rpx 0; display: flex; align-items: center; }
.st-no { width: 52rpx; height: 52rpx; flex: none; border-radius: 50%; box-sizing: border-box; border: 2rpx solid #4B5060; display: flex; align-items: center; justify-content: center; }
.st-no-t { font-size: 26rpx; font-weight: 700; color: #C9CDD4; }
.st-no-cur { border-color: #FFFFFF; background: #FFFFFF; }
.st-no-cur .st-no-t { color: #181A20; }
.st-no-done { border-color: #4CB582; background: #4CB582; }
.st-main { flex: 1; min-width: 0; margin-left: 24rpx; display: flex; flex-direction: column; }
.st-t { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
.st-s { margin-top: 6rpx; font-size: 26rpx; color: #A9AEB8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-edit { margin-left: 16rpx; font-size: 27rpx; color: #C9CDD4; }
.st-body { padding: 0 0 40rpx 76rpx; }
/* 字段：标题在上，输入框在下 */
.f { margin-bottom: 36rpx; }
.f-k { display: block; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.f-in { margin-top: 14rpx; height: 92rpx; padding: 0 24rpx; border-radius: 16rpx; background: #262A34; font-size: 30rpx; color: #FFFFFF; }
.ph { color: #8A909C; }
.f-tip { display: block; margin-top: 10rpx; font-size: 24rpx; color: #A9AEB8; }
.f-err { display: block; margin-top: 10rpx; font-size: 24rpx; color: #FF8A8A; }
.opts { margin-top: 14rpx; display: flex; justify-content: space-between; }
.opt { width: calc(50% - 8rpx); box-sizing: border-box; padding: 20rpx 22rpx; border-radius: 16rpx; background: #262A34; box-shadow: inset 0 0 0 2rpx transparent; display: flex; flex-direction: column; }
.opt-on { box-shadow: inset 0 0 0 3rpx #FFFFFF; background: #2E323D; }
.opt-t { font-size: 29rpx; font-weight: 600; color: #FFFFFF; }
.opt-s { margin-top: 4rpx; font-size: 24rpx; color: #A9AEB8; }
.av-row { padding: 16rpx 0; display: flex; align-items: center; }
.av { width: 80rpx; height: 80rpx; flex: none; border-radius: 50%; overflow: hidden; background: #262A34; display: flex; align-items: center; justify-content: center; }
.av-img { width: 100%; height: 100%; }
.av-main { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; display: flex; flex-direction: column; }
.av-k { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.av-s { margin-top: 4rpx; font-size: 24rpx; color: #A9AEB8; }
/* 上传：三张一组，缩略图一样大 */
.b-s { display: block; font-size: 27rpx; line-height: 1.6; color: #C9CDD4; }
.tiles { margin-top: 24rpx; display: flex; justify-content: space-between; }
.tile-w { width: 31%; }
.tile { width: 100%; height: 150rpx; border-radius: 16rpx; overflow: hidden; background: #262A34; }
.tile-img { width: 100%; height: 100%; }
.tile-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.tile-n-row { margin-top: 10rpx; display: flex; align-items: center; }
.tile-n { margin-left: 4rpx; font-size: 24rpx; color: #E5E7EB; white-space: nowrap; }
.safe { margin-top: 24rpx; display: flex; align-items: center; }
.safe-t { margin-left: 8rpx; font-size: 24rpx; color: #A9AEB8; }
.face { padding: 24rpx; border-radius: 16rpx; background: #262A34; display: flex; align-items: center; }
.face-main { margin-left: 20rpx; display: flex; flex-direction: column; }
.face-t { font-size: 29rpx; font-weight: 600; color: #FFFFFF; }
.face-s { margin-top: 4rpx; font-size: 25rpx; color: #C9CDD4; }
.fee-line { display: block; margin-top: 28rpx; font-size: 27rpx; color: #C9CDD4; }
.agree { margin-top: 24rpx; display: flex; align-items: center; }
.ck { width: 38rpx; height: 38rpx; box-sizing: border-box; border-radius: 10rpx; border: 3rpx solid #8A909C; display: flex; align-items: center; justify-content: center; }
.ck-on { border-color: #FFFFFF; background: #FFFFFF; }
.agree-t { margin-left: 14rpx; font-size: 27rpx; color: #C9CDD4; }
.agree-a { font-size: 27rpx; color: #FFFFFF; text-decoration: underline; }
.pad { height: calc(220rpx + env(safe-area-inset-bottom)); }
/* 底部：进度和下一步 */
.bar { position: fixed; z-index: 40; left: 0; right: 0; bottom: 0; padding: 20rpx 40rpx calc(20rpx + env(safe-area-inset-bottom)); background: #181A20; border-top: 1rpx solid #2A2D35; display: flex; align-items: center; }
.bar-l { flex: 1; min-width: 0; margin-right: 20rpx; display: flex; flex-direction: column; }
.bar-t { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.bar-s { margin-top: 4rpx; font-size: 25rpx; color: #C9CDD4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-btn { height: 92rpx; padding: 0 44rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; }
.bar-btn-off { background: #35383F; }
.bar-btn-off .bar-btn-t { color: #A9AEB8; }
.bar-btn-t { font-size: 30rpx; font-weight: 700; color: #FFFFFF; white-space: nowrap; }
/* 审核中 */
.pd { margin-top: 24rpx; padding: 48rpx 32rpx; border-radius: 16rpx; background: #1F222A; display: flex; flex-direction: column; align-items: center; }
.pd-ic { width: 112rpx; height: 112rpx; border-radius: 50%; background: rgba(255, 197, 58, .12); display: flex; align-items: center; justify-content: center; }
.pd-t { margin-top: 24rpx; font-size: 38rpx; font-weight: 700; color: #FFFFFF; }
.pd-s { margin-top: 12rpx; font-size: 27rpx; line-height: 1.6; color: #C9CDD4; text-align: center; }
.pd-card { margin-top: 24rpx; padding: 28rpx 32rpx; border-radius: 16rpx; background: #1F222A; }
.pd-h { display: block; font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.pd-row { padding: 20rpx 0; display: flex; justify-content: space-between; border-bottom: 1rpx solid #2A2D35; }
.pd-k { font-size: 27rpx; color: #C9CDD4; }
.pd-v { font-size: 27rpx; color: #FFFFFF; }
.pd-tiles { flex-wrap: wrap; }
.pd-tiles .tile-w { margin-bottom: 20rpx; }
.pd-tiles .tile { height: 130rpx; }
.pd-back { margin: 40rpx 0 60rpx; height: 92rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; justify-content: center; }
.pd-back-t { font-size: 29rpx; font-weight: 600; color: #FFFFFF; }
/* 人脸识别：取景框、固定位置的提示、进度 */
.fv { position: fixed; z-index: 300; left: 0; top: 0; right: 0; bottom: 0; background: #0B0C10; display: flex; flex-direction: column; align-items: center; }
.fv-title { margin-top: 220rpx; font-size: 34rpx; font-weight: 600; color: #FFFFFF; }
.fv-frame { margin-top: 56rpx; width: 460rpx; height: 560rpx; border-radius: 50%; padding: 10rpx; box-sizing: border-box; box-shadow: 0 0 0 4rpx rgba(255, 255, 255, .55), 0 0 60rpx rgba(255, 255, 255, .12); transition: box-shadow .3s ease; }
.fv-ok { box-shadow: 0 0 0 4rpx #4CB582, 0 0 60rpx rgba(76, 181, 130, .35); }
.fv-cam { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(ellipse at 50% 40%, #2A2F3A 0%, #15181F 70%); display: flex; align-items: center; justify-content: center; }
.fv-tip { margin-top: 64rpx; font-size: 36rpx; font-weight: 600; color: #FFFFFF; }
.fv-bar { margin-top: 28rpx; width: 360rpx; height: 8rpx; border-radius: 4rpx; background: #2A2D35; overflow: hidden; }
.fv-bar-f { height: 100%; border-radius: 4rpx; background: #FFFFFF; transition: width .1s linear; }
.fv-bar-ok { background: #4CB582; }
.fv-s { margin-top: 28rpx; font-size: 27rpx; color: #C9CDD4; }
.fv-cancel { margin-top: 64rpx; height: 80rpx; padding: 0 64rpx; border-radius: 999rpx; background: #262A34; display: flex; align-items: center; }
.fv-cancel-t { font-size: 28rpx; color: #FFFFFF; }
.fv-demo { position: absolute; left: 0; right: 0; bottom: calc(48rpx + env(safe-area-inset-bottom)); text-align: center; font-size: 24rpx; color: #A9AEB8; }
/* 认证规则 */
.rs { position: fixed; z-index: 200; left: 0; top: 0; right: 0; bottom: 0; }
.rs-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); }
.rs-sheet { position: absolute; left: 0; right: 0; bottom: 0; max-height: 80vh; padding: 32rpx 40rpx calc(24rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: #262A34; border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; }
.rs-head { display: flex; align-items: center; justify-content: space-between; }
.rs-title { font-size: 34rpx; font-weight: 700; color: #FFFFFF; }
.rs-x { width: 56rpx; height: 56rpx; border-radius: 50%; background: #35383F; display: flex; align-items: center; justify-content: center; }
.rs-body { flex: 1; min-height: 0; max-height: 56vh; margin-top: 12rpx; }
.rs-sec { margin-top: 24rpx; }
.rs-t { display: block; font-size: 29rpx; font-weight: 700; color: #FFFFFF; }
.rs-p { display: block; margin-top: 8rpx; font-size: 27rpx; line-height: 1.7; color: #C9CDD4; }
.rs-li { display: flex; }
.rs-dot { margin: 8rpx 10rpx 0 0; font-size: 27rpx; color: #C9CDD4; }
.rs-ok { margin-top: 24rpx; height: 92rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.rs-ok-t { font-size: 29rpx; font-weight: 600; color: #FFFFFF; }
.press { opacity: .75; }
.press-soft { background: rgba(255, 255, 255, .03); }
</style>
