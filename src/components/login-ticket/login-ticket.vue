<template>
  <view class="ticket" :class="{ 'ticket--leaving': leaving }">
    <view class="ticket__main">
      <view class="ticket__paper ticket__paper--main" aria-hidden="true"></view>

      <view class="ticket__content">
        <view class="ticket__header">
          <view class="ticket__brand">
            <view class="ticket__logo" aria-hidden="true"></view>
            <text class="ticket__brand-title">Sign-In Ticket</text>
          </view>
          <button class="ticket__notice" hover-class="ticket__press" @tap="emit('intro')">
            <text class="ticket__notice-text">须知</text>
          </button>
        </view>

        <view class="ticket__welcome">
          <text class="ticket__welcome-text">欢迎来到</text>
          <text class="ticket__welcome-name ticket__gradient">桌趣</text>
        </view>
        <text class="ticket__title ticket__gradient">TABLEJOKER</text>
        <text class="ticket__description">聚会、玩桌游，或者参与比赛，点击下方开始吧！</text>

        <view class="ticket__profile">
          <view class="ticket__profile-row ticket__profile-row--primary">
            <view class="ticket__avatar-field" :class="{ 'ticket__field--missing': missing.avatar }">
              <view class="ticket__field-label" aria-hidden="true">
                <text class="ticket__label-line">微信</text>
                <text class="ticket__label-line">头像</text>
              </view>
              <button
                class="ticket__avatar-button"
                :class="{ 'ticket__avatar-button--selected': profile.avatarUrl }"
                :open-type="avatarOpenType"
                :aria-label="profile.avatarUrl ? '更换微信头像' : '获取微信头像'"
                hover-class="ticket__press"
                @tap="onAvatarTap"
                @chooseavatar="emit('choose-avatar', $event)"
              >
                <image v-if="profile.avatarUrl" class="ticket__avatar-image" :src="profile.avatarUrl" mode="aspectFill" />
                <view v-else class="ticket__avatar-placeholder" aria-hidden="true"></view>
              </button>
            </view>

            <view class="ticket__field ticket__field--date">
              <view class="ticket__field-label">
                <text class="ticket__label-line">加入</text>
                <text class="ticket__label-line">时间</text>
              </view>
              <text class="ticket__date">{{ joinDate }}</text>
            </view>
          </view>

          <view class="ticket__profile-row">
            <view class="ticket__field" :class="{ 'ticket__field--missing': missing.nickname }">
              <view class="ticket__field-label" aria-hidden="true">
                <text class="ticket__label-line">微信</text>
                <text class="ticket__label-line">昵称</text>
              </view>
              <view class="ticket__control" :class="{ 'ticket__control--complete': profile.nickname }">
                <input
                  class="ticket__input"
                  type="nickname"
                  :value="profile.nickname"
                  placeholder="点击获取"
                  placeholder-style="font-family:TicketSans,sans-serif;font-size:26rpx;font-weight:500;color:#7E899C;"
                  aria-label="微信昵称"
                  maxlength="16"
                  @input="emit('nickname-input', $event)"
                  @blur="emit('nickname-input', $event)"
                  @nicknamereview="emit('nickname-review', $event)"
                />
              </view>
            </view>

            <view class="ticket__field ticket__field--city" :class="{ 'ticket__field--missing': missing.city }">
              <view class="ticket__field-label" aria-hidden="true">
                <text class="ticket__label-line">所在</text>
                <text class="ticket__label-line">城市</text>
              </view>
              <view class="ticket__city-picker" aria-label="所在城市" @tap="emit('city-tap')">
                <view class="ticket__control ticket__city" :class="{ 'ticket__control--complete': profile.city }">
                  <text class="ticket__city-value" :class="{ 'ticket__placeholder': !profile.city && !locating }">{{ cityLabel }}</text>
                  <view v-if="locating" class="ticket__city-loading" aria-hidden="true"></view>
                  <view v-else class="ticket__location" aria-hidden="true"></view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="ticket__stub">
      <view class="ticket__paper ticket__paper--stub" aria-hidden="true"></view>
      <view class="ticket__perforation" aria-hidden="true"></view>
      <view class="ticket__seat">
        <text class="ticket__seat-label">SEAT</text>
        <text class="ticket__seat-number">{{ seat }}</text>
      </view>
      <button
        class="ticket__login"
        :class="{ 'ticket__login--ready': canLogin, 'ticket__login--busy': busy }"
        :disabled="busy"
        hover-class="ticket__press"
        @tap="emit('login')"
      >
        <view v-if="busy" class="ticket__spinner"><z-icon name="loader-2" :size="16" :stroke="2.5" color="#FFFFFF" /></view>
        <text class="ticket__login-text">{{ busy ? '登录中' : '登录' }}</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import { shortRegion } from '@/common/regions.js'

defineOptions({ options: { virtualHost: true } })

const props = defineProps({
  profile: { type: Object, required: true },
  missing: { type: Object, required: true },
  joinDate: { type: String, required: true },
  seat: { type: [String, Number], required: true },
  busy: { type: Boolean, default: false },
  leaving: { type: Boolean, default: false },
  locating: { type: Boolean, default: false },
})

const emit = defineEmits([
  'choose-avatar', 'demo-avatar', 'nickname-input', 'nickname-review',
  'city-tap', 'login', 'intro',
])

const canLogin = computed(() => !!(props.profile.avatarUrl && props.profile.nickname && props.profile.city))
const cityLabel = computed(() => {
  if (props.locating) return '定位中…'
  return props.profile.city ? shortRegion(props.profile.city) : '点击定位'
})

let avatarOpenType = ''
// #ifdef MP-WEIXIN
avatarOpenType = 'chooseAvatar'
// #endif

function onAvatarTap() {
  // #ifndef MP-WEIXIN
  emit('demo-avatar')
  // #endif
}
</script>

<style scoped>
@import './fonts.css';

/* Figma 51:164，375px 画布；设计尺寸统一乘 2 转为 rpx。 */
.ticket {
  --ticket-text: #F8FAFC;
  --ticket-label: #A7B0BF;
  --ticket-placeholder: #7E899C;
  --ticket-accent: #FF4D4D;
  position: relative;
  width: 640rpx;
  color: var(--ticket-text);
  font-family: "TicketSans", "PingFang SC", "Microsoft YaHei", sans-serif;
  filter: drop-shadow(0 30rpx 25rpx rgba(0, 0, 0, .55));
}

.ticket__main {
  position: relative;
  height: 701.5rpx;
  padding: 40rpx 40rpx 32rpx;
  box-sizing: border-box;
  transition: transform .5s ease .18s, opacity .5s ease .18s;
}

.ticket__paper { position: absolute; pointer-events: none; background-repeat: no-repeat; }
.ticket__paper--main {
  left: -20.16rpx;
  top: -9.8rpx;
  width: 681.312rpx;
  height: 721.1rpx;
  background-image: url('../../static/login/ticket-main.svg');
  background-size: 681.312rpx 721.1rpx;
}
.ticket__content { position: relative; z-index: 1; }
.ticket__header { display: flex; height: 64rpx; align-items: center; justify-content: space-between; }
.ticket__brand { display: flex; height: 64rpx; align-items: center; }
.ticket__logo { width: 40rpx; height: 40rpx; flex: none; background: url('../../static/login/ticket-logo.svg') center / 40rpx 40rpx no-repeat; }
.ticket__brand-title { margin-left: 12rpx; font-family: "TicketDisplay", sans-serif; font-size: 36rpx; line-height: 48rpx; letter-spacing: -.5rpx; color: #FFFFFF; }
.ticket__notice {
  display: flex;
  width: 118rpx;
  height: 36rpx;
  margin: 0;
  padding: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 2rpx solid var(--ticket-accent);
  border-radius: 20rpx;
  background: rgba(30, 31, 38, .24);
  backdrop-filter: blur(5.1rpx);
  line-height: normal;
}
.ticket__notice::after, .ticket__avatar-button::after, .ticket__login::after { border: none; }
.ticket__notice-text { font-family: "TicketSans", sans-serif; font-size: 20rpx; font-weight: 900; line-height: 30rpx; letter-spacing: -.5rpx; color: var(--ticket-accent); }

.ticket__welcome { display: flex; align-items: center; height: 72.5rpx; margin-top: 32rpx; white-space: nowrap; }
.ticket__welcome-text { font-family: "TicketDisplay", sans-serif; font-size: 58rpx; line-height: 72.5rpx; letter-spacing: 1rpx; color: #FFFFFF; }
.ticket__welcome-name { margin-left: 16rpx; font-size: 60rpx; font-weight: 900; line-height: 72.5rpx; letter-spacing: 1rpx; }
.ticket__gradient { color: #FFBBBB; background-image: linear-gradient(-86.6285deg, #FFBBBB 39.187%, #FFFAFA 86.395%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.ticket__title { display: block; height: 68.2rpx; margin-top: 12rpx; font-family: "TicketEnglish", sans-serif; font-size: 62rpx; font-weight: 900; line-height: 68.2rpx; letter-spacing: -.5rpx; background-image: linear-gradient(-73.6476deg, #FFBBBB 39.187%, #FFFAFA 86.395%); }
.ticket__description { display: block; height: 40.8rpx; margin-top: 18rpx; font-size: 24rpx; font-weight: 500; line-height: 40.8rpx; color: var(--ticket-label); white-space: nowrap; }

/* 两行资料使用固定标签列与弹性内容列，避免设计稿中超宽实例的裁切。 */
.ticket__profile { margin-top: 36rpx; height: 286rpx; }
.ticket__profile-row { display: flex; align-items: flex-start; margin-top: 28rpx; }
.ticket__profile-row--primary { height: 138rpx; margin-top: 0; }
.ticket__field, .ticket__avatar-field { display: flex; width: 268rpx; min-width: 0; box-sizing: border-box; }
.ticket__field { padding: 5rpx 0 0 6rpx; }
.ticket__field--date, .ticket__field--city { width: 282rpx; margin-left: 14rpx; }
.ticket__field-label { display: flex; flex: none; flex-direction: column; width: 40rpx; font-size: 20rpx; font-weight: 400; line-height: 30rpx; letter-spacing: .5rpx; white-space: nowrap; color: var(--ticket-label); transition: color .25s ease; }
.ticket__label-line { display: block; white-space: nowrap; }
.ticket__avatar-field .ticket__field-label { margin-top: 5rpx; }
.ticket__field--missing .ticket__field-label { color: #FF6B6B; animation: ticket-blink .9s ease 2; }
.ticket__avatar-button {
  display: flex;
  flex: none;
  width: 128rpx;
  height: 128rpx;
  margin: .5rpx 0 0 32rpx;
  padding: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 3rpx dashed rgba(148, 163, 184, .7);
  border-radius: 64rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, .06);
  line-height: normal;
}
.ticket__avatar-button--selected { border: 4rpx solid #DC0000; }
.ticket__avatar-image { display: block; width: 128rpx; height: 128rpx; flex: none; }
.ticket__avatar-placeholder { width: 112.9908rpx; height: 50.8294rpx; flex: none; background: url('../../static/login/ticket-avatar.svg') center / 112.9908rpx 50.8294rpx no-repeat; }
.ticket__date { flex: 1; min-width: 0; height: 52rpx; margin: 5rpx 0 0 16rpx; font-family: "TicketDisplay", sans-serif; font-size: 48rpx; line-height: 52rpx; white-space: nowrap; }
.ticket__control { position: relative; flex: 1; min-width: 0; height: 52rpx; margin: 5rpx 0 0 16rpx; box-sizing: border-box; border-bottom: 1rpx solid rgba(255, 255, 255, .45); }
.ticket__control--complete { border-bottom-color: transparent; }
.ticket__input { width: 100%; height: 51rpx; padding-left: 20rpx; box-sizing: border-box; font-family: "TicketSans", "PingFang SC", sans-serif; font-size: 26rpx; font-weight: 500; line-height: 51rpx; color: var(--ticket-text); }
.ticket__placeholder { font-family: "TicketSans", "PingFang SC", sans-serif; font-size: 26rpx; font-weight: 500; color: var(--ticket-placeholder); }
.ticket__city-picker { flex: 1; min-width: 0; }
.ticket__city { display: flex; align-items: center; padding-left: 20rpx; }
.ticket__city-value { flex: 1; min-width: 0; overflow: hidden; font-size: 26rpx; line-height: 51rpx; text-overflow: ellipsis; white-space: nowrap; }
.ticket__location { flex: none; width: 26rpx; height: 26rpx; background: url('../../static/login/ticket-location.svg') center / 26rpx 26rpx no-repeat; }
.ticket__city-loading { flex: none; width: 24rpx; height: 24rpx; box-sizing: border-box; border: 3rpx solid rgba(255, 255, 255, .25); border-top-color: #FF6B6B; border-radius: 50%; animation: ticket-spin .9s linear infinite; }

.ticket__stub { position: relative; display: flex; height: 196rpx; padding: 32rpx 40rpx 36rpx; align-items: center; justify-content: space-between; box-sizing: border-box; transition: transform .45s cubic-bezier(.34, 1.3, .64, 1), opacity .45s ease; }
.ticket__paper--stub { left: 0; top: 0; width: 640rpx; height: 196rpx; background: url('../../static/login/ticket-stub.svg') center / 640rpx 196rpx no-repeat; }
.ticket__perforation { position: absolute; top: 0; left: 40rpx; width: 560rpx; height: 2rpx; background: url('../../static/login/ticket-perforation.svg') center / 560rpx 2rpx no-repeat; }
.ticket__seat { position: relative; display: flex; width: 140rpx; height: 128rpx; flex-direction: column; }
.ticket__seat-label { height: 28rpx; font-size: 20rpx; font-weight: 900; line-height: 28rpx; letter-spacing: 5rpx; color: var(--ticket-label); }
.ticket__seat-number { height: 100rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-size: 100rpx; font-weight: 800; line-height: 100rpx; color: #FF3B30; }
.ticket__login { position: relative; display: flex; width: 300rpx; height: 96rpx; margin: 0; padding: 0; flex: none; align-items: center; justify-content: center; border-radius: 20rpx; background: #3A3B46; line-height: normal; transition: background .25s ease, box-shadow .25s ease; }
.ticket__login-text { font-size: 34rpx; font-weight: 900; line-height: 48rpx; letter-spacing: 6rpx; color: #8B90A0; }
.ticket__login--ready { background: #DC0000; box-shadow: 0 10rpx 28rpx rgba(220, 0, 0, .35); }
.ticket__login--ready .ticket__login-text { color: #FFFFFF; }
.ticket__login--busy { opacity: .85; }
.ticket__spinner { display: flex; margin-right: 10rpx; animation: ticket-spin .9s linear infinite; }
.ticket__press { opacity: .8; transform: scale(.97); }

.ticket--leaving .ticket__main { transform: translateY(-24rpx) scale(1.02); opacity: 0; }
.ticket--leaving .ticket__stub { transform: translateY(70rpx) rotate(7deg); opacity: 0; }
@keyframes ticket-blink { 50% { opacity: .35; } }
@keyframes ticket-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ticket__main, .ticket__stub { transition: none; }
  .ticket__spinner, .ticket__city-loading, .ticket__field--missing .ticket__field-label { animation: none; }
}
</style>
