<template>
  <view v-if="ready" class="lg">
    <!-- 背景图：缓慢推近；上下压暗，让入场券更突出 -->
    <view class="lg-bg" :style="bgStyle"></view>
    <view class="lg-shade"></view>

    <view class="lg-stage" :style="stageStyle">
      <view class="tk-wrap" :class="{ 'tk-in': entered, 'tk-leave': leaving, 'tk-shake': shaking }">
        <view class="tk" :class="{ 'tk-ready': canLogin }">
          <!-- 主券：标题、四项信息 -->
          <view class="tk-main">
            <view class="tk-grid"></view>
            <view class="tk-content">
              <view class="tk-head">
                <view class="tk-logo">
                  <z-icon name="stack-2" :size="20" :stroke="2.4" color="#FF4D4D" />
                  <text class="tk-logo-t">TABLEJOKER</text>
                </view>
                <view class="tk-head-r">
                  <text class="tk-type">PLAYER PASS</text>
                  <!-- 平台介绍 -->
                  <view class="tk-book" hover-class="press" @tap="openIntro"><z-icon name="book" :size="15" color="#F8FAFC" /></view>
                </view>
              </view>

              <text class="tk-title">欢迎来到</text>
              <text class="tk-title">桌趣</text>
              <text class="tk-title-en">TABLEJOKER</text>
              <text class="tk-sub">聚会、玩桌游，或者参与比赛，点击下方开始吧！</text>

              <view class="tk-details">
                <!-- 头像：只能由用户点按钮选择 -->
                <view class="tk-item" :class="{ 'tk-ok': !!form.avatarUrl, 'tk-miss': miss.avatar }">
                  <view class="tk-label"><text class="tk-label-t">获取你的微信头像</text><z-icon v-if="form.avatarUrl" name="check" :size="11" :stroke="3" color="#FF6B6B" /></view>
                  <!-- #ifdef MP-WEIXIN -->
                  <button class="tk-av-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
                    <view class="tk-av" :class="{ 'tk-av-on': form.avatarUrl }">
                      <image v-if="form.avatarUrl" class="tk-av-img" :src="form.avatarUrl" mode="aspectFill" />
                      <z-icon v-else name="camera" :size="16" color="#94A3B8" />
                    </view>
                    <text class="tk-av-t">{{ form.avatarUrl ? '换一张' : '点击获取' }}</text>
                  </button>
                  <!-- #endif -->
                  <!-- #ifndef MP-WEIXIN -->
                  <view class="tk-av-btn" @tap="pickDemoAvatar">
                    <view class="tk-av" :class="{ 'tk-av-on': form.avatarUrl }">
                      <image v-if="form.avatarUrl" class="tk-av-img" :src="form.avatarUrl" mode="aspectFill" />
                      <z-icon v-else name="camera" :size="16" color="#94A3B8" />
                    </view>
                    <text class="tk-av-t">{{ form.avatarUrl ? '换一张' : '点击获取' }}</text>
                  </view>
                  <!-- #endif -->
                </view>

                <!-- 加入时间：自动填 -->
                <view class="tk-item tk-ok">
                  <view class="tk-label"><text class="tk-label-t">加入时间</text></view>
                  <text class="tk-value">{{ joinDate }}</text>
                </view>

                <!-- 昵称：聚焦时键盘上方会出现微信昵称，点一下就填好 -->
                <view class="tk-item" :class="{ 'tk-ok': !!form.nickname, 'tk-miss': miss.nickname }">
                  <view class="tk-label"><text class="tk-label-t">微信昵称</text><z-icon v-if="form.nickname" name="check" :size="11" :stroke="3" color="#FF6B6B" /></view>
                  <input
                    class="tk-input"
                    type="nickname"
                    :value="form.nickname"
                    placeholder="点击填写"
                    placeholder-class="tk-ph"
                    maxlength="16"
                    @input="onNick"
                    @blur="onNick"
                    @nicknamereview="onReview"
                  />
                </view>

                <!-- 城市：微信自带的地区选择器，选到城市一级，不需要定位权限 -->
                <view class="tk-item" :class="{ 'tk-ok': !!form.city, 'tk-miss': miss.city }">
                  <view class="tk-label"><text class="tk-label-t">所在城市</text><z-icon v-if="form.city" name="check" :size="11" :stroke="3" color="#FF6B6B" /></view>
                  <!-- #ifdef MP-WEIXIN -->
                  <picker mode="region" level="city" :value="region" @change="onRegion">
                    <view class="tk-pick">
                      <text :class="form.city ? 'tk-value' : 'tk-ph-t'">{{ form.city ? shortCity(form.city) : '点击选择' }}</text>
                      <z-icon name="map-pin" :size="13" color="#94A3B8" />
                    </view>
                  </picker>
                  <!-- #endif -->
                  <!-- #ifndef MP-WEIXIN -->
                  <view class="tk-pick" @tap="pickDemoCity">
                    <text :class="form.city ? 'tk-value' : 'tk-ph-t'">{{ form.city ? shortCity(form.city) : '点击选择' }}</text>
                    <z-icon name="map-pin" :size="13" color="#94A3B8" />
                  </view>
                  <!-- #endif -->
                </view>
              </view>
            </view>
            <view class="tk-perf"><view class="tk-perf-line"></view></view>
          </view>

          <!-- 存根：登录按钮、券号、座位号（占位，以后是城市里的第几位玩家） -->
          <view class="tk-stub">
            <view class="tk-stub-l">
              <view class="tk-login" :class="{ 'tk-login-on': canLogin, 'tk-login-busy': busy }" hover-class="tk-login-press" @tap="onLoginTap">
                <view v-if="busy" class="tk-spin"><z-icon name="loader-2" :size="16" :stroke="2.5" color="#FFFFFF" /></view>
                <text class="tk-login-t">{{ busy ? '登录中' : '登录' }}</text>
              </view>
              <text class="tk-code" :class="{ 'tk-code-hint': !!hint }">{{ hint || pass.code }}</text>
            </view>
            <view class="tk-admit">
              <text class="tk-admit-t">SEAT</text>
              <text class="tk-admit-n">{{ pass.seat }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 入场券下方：协议小字 -->
      <view class="lg-legal">
        <text class="lg-legal-t">登录即表示你已阅读并同意</text>
        <text class="lg-link" @tap="openDoc('terms')">《用户协议》</text>
        <text class="lg-legal-t">和</text>
        <text class="lg-link" @tap="openPrivacy">《隐私保护指引》</text>
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
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { getNavMetrics } from '@/common/nav.js'
import { coverStyle, svgUri } from '@/common/svg.js'
import { isLoggedIn, login, getPass, persistAvatar } from '@/common/auth.js'
import { intro, terms, privacySummary, demoCities } from '@/mock/login.js'

const nav = getNavMetrics()
const stageStyle = `padding-top:${nav.statusBar + nav.navH + 8}px`
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
const hint = ref('')
const form = reactive({ avatarUrl: '', nickname: '', city: '' })
const miss = reactive({ avatar: false, nickname: false, city: false })
const region = ref([])
const pass = getPass()
const canLogin = computed(() => !!(form.avatarUrl && form.nickname && form.city))
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const joinDate = (() => {
  const d = new Date()
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
})()
const shortCity = (c) => String(c).replace(/市$/, '')

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
function onRegion(e) {
  const v = (e && e.detail && e.detail.value) || []
  region.value = v
  form.city = v[1] || v[0] || ''
  if (form.city) miss.city = false
}
function pickDemoCity() {
  uni.showActionSheet({ itemList: demoCities.map(shortCity), success: ({ tapIndex }) => { form.city = demoCities[tapIndex]; miss.city = false } })
}

/* ---------- 登录 ---------- */
let hintTimer = null
function onLoginTap() {
  if (busy.value) return
  if (!canLogin.value) {
    miss.avatar = !form.avatarUrl
    miss.nickname = !form.nickname
    miss.city = !form.city
    hint.value = '还差：' + [miss.avatar && '头像', miss.nickname && '昵称', miss.city && '城市'].filter(Boolean).join('、')
    shaking.value = false
    setTimeout(() => { shaking.value = true }, 20)
    setTimeout(() => { shaking.value = false }, 560)
    clearTimeout(hintTimer)
    hintTimer = setTimeout(() => { hint.value = '' }, 2400)
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
  ready.value = true
  setTimeout(() => { entered.value = true }, 60)
})
</script>

<style>
/* 强调色和全站一致用品牌红；想换回参考稿的紫色，把 #DC0000 / #FF4D4D / #FF6B6B 换成 #7C3AED / #A78BFA 即可 */
.lg { position: relative; min-height: 100vh; background: #0E0F14; overflow: hidden; }
.press { opacity: .8; transform: scale(.96); }

/* 背景 */
.lg-bg { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background-size: cover; background-position: center; filter: saturate(1.2) brightness(1.12); animation: kenburns 26s ease-in-out infinite alternate; }
@keyframes kenburns { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.14) translate(-2%, -2%); } }
.lg-shade { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(10, 10, 14, .22) 0%, rgba(10, 10, 14, 0) 34%, rgba(10, 10, 14, .2) 62%, rgba(10, 10, 14, .78) 100%); }
.lg-stage { position: relative; z-index: 1; min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; perspective: 1600rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }

/* 入场：从下方翻起来；没填完点登录时左右晃 */
.tk-wrap { width: 640rpx; opacity: 0; transform: translateY(140rpx) rotateX(55deg); transition: transform .9s cubic-bezier(.23, 1, .32, 1), opacity .6s ease; }
.tk-in { opacity: 1; transform: translateY(0) rotateX(0); }
.tk-shake { animation: tk-shake .5s ease; }
@keyframes tk-shake { 15%, 55% { transform: translateX(-14rpx); } 35%, 75% { transform: translateX(14rpx); } }

/* 券体：缓慢浮动的 3D 倾斜，阴影跟着缺口走 */
.tk { position: relative; transform-style: preserve-3d; animation: tk-float 7s ease-in-out infinite; filter: drop-shadow(0 30rpx 50rpx rgba(0, 0, 0, .65)); color: #F8FAFC; }
@keyframes tk-float { 0%, 100% { transform: rotateX(4deg) rotateY(-6deg); } 50% { transform: rotateX(-2deg) rotateY(5deg) translateY(-8rpx); } }
/* 定时扫过的一道光 */
.tk::after {
  content: ''; position: absolute; left: 0; top: 0; right: 0; bottom: 0; z-index: 10; border-radius: 32rpx; pointer-events: none;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, .1) 45%, rgba(255, 255, 255, .26) 50%, rgba(255, 255, 255, .1) 55%, transparent 60%);
  background-size: 250% 250%; background-position: 100% 100%; animation: tk-shine 6s ease-in-out infinite;
}
@keyframes tk-shine { 0%, 72% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }

/* 主券：底部两个缺口 */
.tk-main {
  position: relative; overflow: hidden; padding: 44rpx 44rpx 60rpx; border-radius: 32rpx 32rpx 0 0;
  background:
    radial-gradient(circle at bottom left, transparent 20rpx, #1E1F26 21rpx) bottom left / 51% 100% no-repeat,
    radial-gradient(circle at bottom right, transparent 20rpx, #1E1F26 21rpx) bottom right / 51% 100% no-repeat;
}
/* 透视网格，缓慢向下滚动 */
.tk-grid {
  position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none; opacity: .6;
  background-image: linear-gradient(rgba(220, 0, 0, .14) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 0, 0, .14) 1px, transparent 1px);
  background-size: 40rpx 40rpx; transform: perspective(500px) rotateX(20deg) scale(1.5); animation: tk-grid 20s linear infinite;
}
@keyframes tk-grid { from { background-position: 0 0; } to { background-position: 0 80rpx; } }
.tk-content { position: relative; z-index: 1; display: flex; flex-direction: column; }
.tk-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40rpx; }
.tk-logo { display: flex; align-items: center; animation: tk-logo 3s ease-in-out infinite alternate; }
@keyframes tk-logo { from { filter: drop-shadow(0 0 2px rgba(220, 0, 0, .6)); } to { filter: drop-shadow(0 0 10px rgba(220, 0, 0, .9)) brightness(1.15); } }
.tk-logo-t { margin-left: 10rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 34rpx; letter-spacing: 1rpx; color: #FFFFFF; }
.tk-head-r { display: flex; align-items: center; }
.tk-type { padding: 6rpx 16rpx; border: 2rpx solid #DC0000; border-radius: 999rpx; font-size: 18rpx; font-weight: 700; letter-spacing: 4rpx; color: #FF4D4D; }
.tk-book {
  margin-left: 14rpx; width: 56rpx; height: 56rpx; box-sizing: border-box; border-radius: 50%;
  background: rgba(255, 255, 255, .06); border: 1rpx solid rgba(255, 255, 255, .14); display: flex; align-items: center; justify-content: center;
}
.tk-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 64rpx; line-height: 1.12; letter-spacing: 4rpx; color: #FFFFFF; }
.tk-title-en { margin-top: 4rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 88rpx; line-height: 1; letter-spacing: 2rpx; color: #FFD1D1; text-shadow: 0 0 24rpx rgba(220, 0, 0, .35); }
.tk-sub { margin-top: 16rpx; font-size: 24rpx; line-height: 1.6; color: #94A3B8; }

/* 四项信息 */
.tk-details { margin-top: 44rpx; display: flex; flex-wrap: wrap; justify-content: space-between; }
.tk-item { width: 48%; margin-bottom: 32rpx; display: flex; flex-direction: column; }
.tk-label { display: flex; align-items: center; height: 30rpx; }
.tk-label-t { margin-right: 6rpx; font-size: 20rpx; letter-spacing: 1rpx; color: #94A3B8; transition: color .25s ease; }
.tk-ok .tk-label-t { color: #CBD5E1; }
.tk-miss .tk-label-t { color: #FF6B6B; animation: tk-blink .9s ease 2; }
@keyframes tk-blink { 50% { opacity: .35; } }
.tk-value { margin-top: 10rpx; font-size: 30rpx; font-weight: 700; color: #F8FAFC; }
.tk-av-btn {
  margin: 10rpx 0 0; padding: 0; background: transparent; border: none; border-radius: 0; line-height: normal;
  display: flex; align-items: center; text-align: left; overflow: visible;
}
.tk-av-btn::after { border: none; }
.tk-av {
  width: 72rpx; height: 72rpx; flex: none; box-sizing: border-box; border-radius: 50%; overflow: hidden;
  background: rgba(255, 255, 255, .06); border: 3rpx dashed rgba(148, 163, 184, .7); display: flex; align-items: center; justify-content: center;
}
.tk-av-on { border: 4rpx solid #DC0000; box-shadow: 0 0 20rpx rgba(220, 0, 0, .45); animation: tk-pop .45s cubic-bezier(.34, 1.56, .64, 1); }
@keyframes tk-pop { from { transform: scale(.6); } to { transform: scale(1); } }
.tk-av-img { width: 100%; height: 100%; display: block; }
.tk-av-t { margin-left: 14rpx; font-size: 24rpx; color: #CBD5E1; }
.tk-input { margin-top: 10rpx; height: 52rpx; font-size: 30rpx; font-weight: 700; color: #F8FAFC; border-bottom: 1rpx solid rgba(255, 255, 255, .16); }
.tk-ok .tk-input { border-bottom-color: transparent; }
.tk-ph { font-size: 26rpx; font-weight: 400; color: #64748B; }
.tk-pick { margin-top: 10rpx; height: 52rpx; display: flex; align-items: center; justify-content: space-between; border-bottom: 1rpx solid rgba(255, 255, 255, .16); }
.tk-ok .tk-pick { border-bottom-color: transparent; }
.tk-pick .tk-value { margin-top: 0; }
.tk-ph-t { font-size: 26rpx; color: #64748B; }

/* 打孔线 */
.tk-perf { position: absolute; z-index: 2; left: 0; right: 0; bottom: 0; height: 2rpx; transform: translateY(50%); display: flex; }
.tk-perf-line { flex: 1; margin: 0 40rpx; border-top: 2rpx dashed rgba(255, 255, 255, .22); }

/* 存根：顶部两个缺口 */
.tk-stub {
  position: relative; padding: 40rpx 44rpx 44rpx; border-radius: 0 0 32rpx 32rpx; display: flex; align-items: center; justify-content: space-between;
  background:
    radial-gradient(circle at top left, transparent 20rpx, #2A2B35 21rpx) top left / 51% 100% no-repeat,
    radial-gradient(circle at top right, transparent 20rpx, #2A2B35 21rpx) top right / 51% 100% no-repeat;
  transition: transform .45s cubic-bezier(.34, 1.3, .64, 1), opacity .45s ease;
}
.tk-stub-l { display: flex; flex-direction: column; }
.tk-login {
  position: relative; width: 300rpx; height: 88rpx; border-radius: 18rpx; overflow: hidden; background: #3A3B46;
  display: flex; align-items: center; justify-content: center; transition: background .35s ease, box-shadow .35s ease;
}
.tk-login-t { font-size: 32rpx; font-weight: 600; letter-spacing: 6rpx; color: #8B90A0; transition: color .35s ease; }
/* 三项都填好：按钮亮起来 */
.tk-login-on { background: #DC0000; animation: tk-light .6s ease-out, tk-glow 2.4s ease-in-out .6s infinite; }
.tk-login-on .tk-login-t { color: #FFFFFF; }
.tk-login-on::after {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 60%;
  background: linear-gradient(100deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, .35), rgba(255, 255, 255, 0)); animation: tk-sweep 2.4s ease-in-out infinite;
}
@keyframes tk-light { 0% { box-shadow: 0 0 0 0 rgba(220, 0, 0, .8); transform: scale(.96); } 60% { box-shadow: 0 0 0 18rpx rgba(220, 0, 0, 0); transform: scale(1.03); } 100% { transform: scale(1); } }
@keyframes tk-glow { 0%, 100% { box-shadow: 0 10rpx 28rpx rgba(220, 0, 0, .35); } 50% { box-shadow: 0 10rpx 44rpx rgba(220, 0, 0, .7); } }
@keyframes tk-sweep { from { transform: translateX(-120%); } to { transform: translateX(220%); } }
.tk-login-press { transform: scale(.97); }
.tk-login-busy { opacity: .85; }
.tk-spin { margin-right: 10rpx; display: flex; animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.tk-code { margin-top: 18rpx; font-family: Menlo, monospace; font-size: 20rpx; letter-spacing: 4rpx; color: #94A3B8; }
.tk-code-hint { font-family: inherit; letter-spacing: 1rpx; color: #FF6B6B; }
.tk-admit { display: flex; flex-direction: column; align-items: flex-end; }
.tk-admit-t { font-size: 20rpx; letter-spacing: 6rpx; color: #94A3B8; }
.tk-admit-n { font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 112rpx; line-height: 1; color: #FF3B30; text-shadow: 0 0 30rpx rgba(220, 0, 0, .55); }

/* 检票：存根撕下，主券淡出 */
.tk-main { transition: transform .5s ease .18s, opacity .5s ease .18s; }
.tk-leave .tk-stub { transform: translateY(70rpx) rotate(7deg); opacity: 0; }
.tk-leave .tk-main { transform: translateY(-24rpx) scale(1.02); opacity: 0; }

/* 协议小字 */
.lg-legal { margin-top: 36rpx; width: 620rpx; display: flex; flex-wrap: wrap; justify-content: center; }
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
  .lg-bg, .tk, .tk::after, .tk-grid, .tk-logo, .tk-login-on, .tk-login-on::after, .tk-shake, .tk-av-on, .tk-miss .tk-label-t { animation: none; }
  .tk-wrap, .tk-stub, .tk-main, .md-card, .md-mask { transition: none; }
}
</style>
