<template>
  <view v-if="ready" class="lg">
    <!-- 背景图：缓慢推近；上下压暗，让入场券更突出 -->
    <view class="lg-bg" :style="bgStyle"></view>
    <view class="lg-shade"></view>

    <view class="lg-stage" :style="stageStyle">
      <view class="lg-ticket" :class="{ 'lg-ticket--entered': entered, 'lg-ticket--shaking': shaking }">
        <login-ticket
          :profile="form"
          :missing="miss"
          :join-date="joinDate"
          :seat="pass.seat"
          :busy="busy"
          :leaving="leaving"
          :locating="locating"
          @choose-avatar="onChooseAvatar"
          @demo-avatar="pickDemoAvatar"
          @nickname-input="onNick"
          @nickname-review="onReview"
          @city-tap="onCityTap"
          @login="onLoginTap"
          @intro="openIntro"
        />

        <!-- 协议附在券下方，不参与券体的垂直居中计算 -->
        <view class="lg-legal">
          <text class="lg-legal-t">登录即表示你已阅读并同意</text>
          <text class="lg-link" @tap="openDoc('terms')">《用户协议》</text>
          <text class="lg-legal-t">和</text>
          <text class="lg-link" @tap="openPrivacy">《隐私保护指引》</text>
        </view>
      </view>
    </view>

    <!-- 弹窗：确认登录 / 平台介绍 / 协议 -->
    <view v-if="modal" class="md" :class="{ 'md-on': modalOn }">
      <view class="md-mask" @tap="closeModal"></view>
      <view class="md-card">
        <block v-if="modal === 'confirm'">
          <view class="md-ic"><z-icon name="user-check" :size="22" color="#FF6B6B" /></view>
          <text class="md-title md-center">确认登录</text>
          <text class="md-text">我们会用你的微信头像、昵称和所在城市创建桌趣账号，在比赛、座位表和排行里展示。请阅读并同意<text class="md-link" @tap="openDoc('terms')">《用户协议》</text>和<text class="md-link" @tap="openPrivacy">《隐私保护指引》</text>。</text>
          <view class="md-actions">
            <view class="md-btn md-ghost" hover-class="press" @tap="closeModal"><text class="md-btn-t">不同意</text></view>
            <!-- 小程序里，这个按钮同时记录用户对微信隐私保护指引的同意 -->
            <button class="md-btn md-main" open-type="agreePrivacyAuthorization" hover-class="press" @agreeprivacyauthorization="noop" @tap="confirmLogin">
              <text class="md-btn-t">同意并登录</text>
            </button>
          </view>
        </block>
        <block v-else-if="doc">
          <view class="md-head">
            <text class="md-title">{{ doc.title }}</text>
            <view class="md-x" hover-class="press" @tap="closeModal"><z-icon name="x" :size="16" color="#94A3B8" /></view>
          </view>
          <scroll-view scroll-y class="md-body">
            <text v-if="doc.lead" class="md-lead">{{ doc.lead }}</text>
            <view v-for="s in doc.sections || []" :key="s.title" class="md-sec">
              <view class="md-sec-ic"><z-icon :name="s.icon" :size="16" color="#FF6B6B" /></view>
              <view class="md-sec-main"><text class="md-sec-t">{{ s.title }}</text><text class="md-sec-d">{{ s.text }}</text></view>
            </view>
            <text v-for="(p, i) in doc.paras || []" :key="i" class="md-p">{{ p }}</text>
            <view v-if="doc.promise" class="md-promise"><z-icon name="shield" :size="14" color="#FF6B6B" /><text class="md-promise-t">{{ doc.promise }}</text></view>
          </scroll-view>
        </block>
      </view>
    </view>

    <!-- 定位失败兜底：单列省份选择器 -->
    <z-province-picker
      v-model="pickerShow"
      :value="form.city"
      :can-retry="pickerRetry"
      @change="onProvinceChange"
      @retry-locate="onRetryLocate"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad, onResize } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import LoginTicket from '@/components/login-ticket/login-ticket.vue'
import ZProvincePicker from '@/components/z-province-picker/z-province-picker.vue'
import { getNavMetrics } from '@/common/nav.js'
import { coverStyle, svgUri } from '@/common/svg.js'
import { isLoggedIn, login, getPass, persistAvatar, getProfile } from '@/common/auth.js'
import { fuzzyLocation, fuzzyToLabel } from '@/common/location.js'
import { intro, terms, privacySummary } from '@/mock/login.js'

// 上下留出相同空间：避开胶囊并容纳协议，让券体中心对齐屏幕中心；短屏可自然滚动。
const stageInset = ref(0)
const stageStyle = computed(() => `padding-top:${stageInset.value}px;padding-bottom:${stageInset.value}px`)
function updateStageInset() {
  const nav = getNavMetrics()
  stageInset.value = Math.max(nav.statusBar + nav.navH + 12, nav.winW * 144 / 750)
}
updateStageInset()
onResize(updateStageInset)
// 背景图：竖版的「钟楼」插画（星空和亮灯的屋顶刚好框住入场券；想要暖色可以换成 'wild' 荒野）。
// 换成照片时，把 .lg-bg 换成 <image mode="aspectFill">（小程序的样式里不能引用本地图片）
const bgStyle = coverStyle('clocktower', 'story')
const noop = () => {}
const toast = (title) => uni.showToast({ title, icon: 'none' })

/* ---------- 入场券 ---------- */
const ready = ref(false)
const entered = ref(false)
const leaving = ref(false)
const busy = ref(false)
const shaking = ref(false)
const form = reactive({ avatarUrl: '', nickname: '', city: '' })
const miss = reactive({ avatar: false, nickname: false, city: false })
const locating = ref(false)
const pickerShow = ref(false)
const pickerRetry = ref(false)
const pass = getPass()
const canLogin = computed(() => !!(form.avatarUrl && form.nickname && form.city))
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const joinDate = (() => {
  const d = new Date()
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
})()

function onChooseAvatar(e) {
  const url = e && e.detail && e.detail.avatarUrl
  if (!url) return
  form.avatarUrl = url
  miss.avatar = false
  // 临时文件存成本地文件后再替换一次（地址变了，图片不变）
  persistAvatar(url).then((saved) => { if (saved !== url) form.avatarUrl = saved })
}
// H5 预览没有微信头像，用一张示例头像代替
const DEMO = ['#DC0000', '#2F6B52', '#3B5E8C', '#8A6A34']
let demoIdx = 0
function pickDemoAvatar() {
  const bg = DEMO[demoIdx++ % DEMO.length]
  const pips = [[42, 42], [78, 42], [42, 78], [78, 78]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#F3EEE6"/>`).join('')
  form.avatarUrl = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="${bg}"/>${pips}</svg>`)
  miss.avatar = false
}
function onNick(e) {
  const v = String((e && e.detail && e.detail.value) || '').trim()
  form.nickname = v
  if (v) miss.nickname = false
}
// 微信会异步检查昵称，不通过时清空并提示
function onReview(e) {
  if (e && e.detail && e.detail.pass === false) {
    form.nickname = ''
    toast('这个昵称没通过检查，换一个吧')
  }
}

/* ---------- 城市定位 ---------- */
// 点击城市字段：直接定位；成功回填（现阶段是经纬度，TODO 逆编码换城市名），失败弹省份选择器
function onCityTap() {
  if (locating.value) return
  locateCity()
}

function locateCity() {
  locating.value = true
  fuzzyLocation().then((res) => {
    form.city = fuzzyToLabel(res)
    miss.city = false
    toast('定位成功：' + form.city)
    locating.value = false
  }).catch(() => {
    locating.value = false
    openProvincePicker(true)
  })
}

// 老用户进页面静默定位：成功刷新城市，失败保留原值不打扰
function silentLocate() {
  // #ifdef MP-WEIXIN
  fuzzyLocation().then((res) => {
    form.city = fuzzyToLabel(res)
    miss.city = false
  }).catch(() => {})
  // #endif
}

function openProvincePicker(retry) {
  pickerRetry.value = !!retry
  pickerShow.value = true
}
function onProvinceChange(name) {
  form.city = name
  miss.city = false
  pickerShow.value = false
}
function onRetryLocate() {
  pickerShow.value = false
  locateCity()
}

/* ---------- 登录 ---------- */
function onLoginTap() {
  if (busy.value) return
  if (!canLogin.value) {
    miss.avatar = !form.avatarUrl
    miss.nickname = !form.nickname
    miss.city = !form.city
    toast('还差：' + [miss.avatar && '头像', miss.nickname && '昵称', miss.city && '城市'].filter(Boolean).join('、'))
    shaking.value = false
    setTimeout(() => { shaking.value = true }, 20)
    setTimeout(() => { shaking.value = false }, 560)
    return
  }
  openModal('confirm')
}
let redirect = ''
async function confirmLogin() {
  closeModal(true)
  busy.value = true
  try {
    await login({ avatarUrl: form.avatarUrl, nickname: form.nickname, city: form.city })
    // 检票：存根沿着打孔线撕下，主券淡出，然后进入首页
    leaving.value = true
    setTimeout(() => uni.reLaunch({ url: redirect || '/pages/home/index?welcome=1' }), 720)
  } catch (e) {
    busy.value = false
    toast('登录没有成功，请再试一次')
  }
}

/* ---------- 弹窗 ---------- */
const modal = ref('')
const modalOn = ref(false)
const doc = ref(null)
let back = ''
function openModal(kind, d) {
  if (modal.value && modal.value !== kind) back = modal.value // 从确认弹窗点开协议，关掉协议回到确认弹窗
  modal.value = kind
  doc.value = d || null
  modalOn.value = false
  setTimeout(() => { modalOn.value = true }, 20)
}
function closeModal(all) {
  if (back && all !== true) {
    modal.value = back
    back = ''
    doc.value = null
    return
  }
  back = ''
  modalOn.value = false
  setTimeout(() => { modal.value = ''; doc.value = null }, 260)
}
const openIntro = () => openModal('doc', intro)
const openDoc = (k) => openModal('doc', k === 'terms' ? terms : privacySummary)
function openPrivacy() {
  // #ifdef MP-WEIXIN
  // 小程序里打开微信官方的隐私保护指引页面
  if (typeof wx !== 'undefined' && wx.openPrivacyContract) return wx.openPrivacyContract({ fail: () => openDoc('privacy') })
  // #endif
  openDoc('privacy')
}

/* ---------- 页面 ---------- */
onLoad((q) => {
  redirect = q && q.redirect ? decodeURIComponent(q.redirect) : ''
  // 已经登录：直接进入（不渲染入场券，避免闪一下）
  if (isLoggedIn()) return uni.reLaunch({ url: redirect || '/pages/home/index' })
  // 登录过（本地有城市）：先回填缓存，再静默定位刷新；失败保留原值不打扰
  const saved = getProfile()
  if (saved && saved.city) {
    form.city = saved.city
    silentLocate()
  }
  ready.value = true
  setTimeout(() => { entered.value = true }, 60)
})
</script>

<style>
.lg { position: relative; min-height: 100vh; background: #0E0F14; overflow: hidden; }
.press { opacity: .8; transform: scale(.96); }

/* 背景 */
.lg-bg { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background-size: cover; background-position: center; filter: saturate(1.2) brightness(1.12); animation: kenburns 26s ease-in-out infinite alternate; }
@keyframes kenburns { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.14) translate(-2%, -2%); } }
.lg-shade { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(10, 10, 14, .22) 0%, rgba(10, 10, 14, 0) 34%, rgba(10, 10, 14, .2) 62%, rgba(10, 10, 14, .78) 100%); }
.lg-stage { position: relative; z-index: 1; min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; perspective: 1600rpx; }

/* 入场：从下方翻起来；没填完点登录时左右晃 */
.lg-ticket { position: relative; width: 640rpx; flex: none; opacity: 0; transform: translateY(140rpx) rotateX(55deg); transition: transform .9s cubic-bezier(.23, 1, .32, 1), opacity .6s ease; }
.lg-ticket--entered { opacity: 1; transform: translateY(0) rotateX(0); }
.lg-ticket--shaking { animation: login-ticket-shake .5s ease; }
@keyframes login-ticket-shake { 15%, 55% { transform: translateX(-14rpx); } 35%, 75% { transform: translateX(14rpx); } }

/* 协议小字 */
.lg-legal { position: absolute; left: 0; right: 0; top: 100%; margin-top: 32rpx; padding: 0 8rpx; display: flex; flex-wrap: wrap; justify-content: center; }
.lg-legal-t { font-size: 22rpx; line-height: 1.8; color: rgba(229, 231, 235, .72); }
.lg-link { font-size: 22rpx; line-height: 1.8; color: #FF8A8A; }

/* 弹窗 */
.md { position: fixed; z-index: 200; left: 0; top: 0; right: 0; bottom: 0; }
.md-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(6, 6, 10, .62); backdrop-filter: blur(6px); opacity: 0; transition: opacity .26s ease; }
.md-on .md-mask { opacity: 1; }
.md-card {
  position: absolute; left: 50%; top: 50%; width: 620rpx; box-sizing: border-box; padding: 40rpx 36rpx 32rpx; border-radius: 32rpx;
  background: #1E1F26; border: 1rpx solid rgba(255, 255, 255, .08); box-shadow: 0 30rpx 80rpx rgba(0, 0, 0, .6);
  opacity: 0; transform: translate(-50%, -46%) scale(.94); transition: opacity .26s ease, transform .34s cubic-bezier(.34, 1.4, .64, 1);
}
.md-on .md-card { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.md-ic { width: 88rpx; height: 88rpx; margin: 0 auto 20rpx; border-radius: 50%; background: rgba(220, 0, 0, .14); display: flex; align-items: center; justify-content: center; }
.md-title { display: block; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 40rpx; letter-spacing: 2rpx; color: #FFFFFF; }
.md-center { text-align: center; }
.md-text { display: block; margin-top: 20rpx; font-size: 26rpx; line-height: 1.75; color: #CBD5E1; }
.md-link { color: #FF8A8A; }
.md-actions { margin-top: 36rpx; display: flex; }
.md-btn { flex: 1; height: 84rpx; margin: 0; padding: 0; border-radius: 999rpx; line-height: normal; display: flex; align-items: center; justify-content: center; }
.md-btn::after { border: none; }
.md-ghost { background: #2A2B35; }
.md-main { margin-left: 20rpx; background: #DC0000; box-shadow: 0 10rpx 28rpx rgba(220, 0, 0, .35); }
.md-btn-t { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.md-ghost .md-btn-t { color: #CBD5E1; }
.md-head { display: flex; align-items: center; justify-content: space-between; }
.md-x { width: 56rpx; height: 56rpx; border-radius: 50%; background: #2A2B35; display: flex; align-items: center; justify-content: center; }
.md-body { max-height: 62vh; margin-top: 20rpx; }
.md-lead { display: block; font-size: 26rpx; line-height: 1.75; color: #CBD5E1; }
.md-sec { display: flex; margin-top: 24rpx; }
.md-sec-ic { width: 56rpx; height: 56rpx; flex: none; border-radius: 18rpx; background: rgba(220, 0, 0, .12); display: flex; align-items: center; justify-content: center; }
.md-sec-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; }
.md-sec-t { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.md-sec-d { margin-top: 4rpx; font-size: 24rpx; line-height: 1.6; color: #94A3B8; }
.md-p { display: block; margin-top: 18rpx; font-size: 26rpx; line-height: 1.75; color: #CBD5E1; }
.md-promise { margin-top: 28rpx; padding: 20rpx 22rpx; border-radius: 20rpx; background: rgba(220, 0, 0, .08); border: 1rpx solid rgba(220, 0, 0, .25); display: flex; }
.md-promise-t { flex: 1; margin-left: 12rpx; font-size: 22rpx; line-height: 1.7; color: #FCA5A5; }

@media (prefers-reduced-motion: reduce) {
  .lg-bg, .lg-ticket--shaking { animation: none; }
  .lg-ticket, .md-card, .md-mask { transition: none; }
}
</style>
