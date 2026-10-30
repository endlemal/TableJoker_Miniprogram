<template>
  <view class="cp">
    <!-- 顶部：返回 + 标题 -->
    <view class="nav" :style="navStyle">
      <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="20" color="#F3EEE6" /></view>
      <text class="nav-title">房间弹幕列表</text>
    </view>

    <!-- 完整的消息记录：头像、昵称、时间、正文；和房间页的气泡弹幕是同一份数据 -->
    <scroll-view scroll-y class="list" :scroll-into-view="anchor" :scroll-with-animation="smooth" @scroll="onScroll">
      <view v-for="m in chat.list" :id="'m' + m.id" :key="m.id" class="cm" :class="{ 'cm-sys': m.kind === 'system' }">
        <block v-if="m.kind === 'system'">
          <view class="cm-pin"><z-icon name="pin" :size="16" color="#A9AEB8" /></view>
          <view class="cm-main"><text class="cm-sys-t">{{ m.text }}</text><text class="cm-time cm-time-sys">{{ hhmm(m.at) }}</text></view>
        </block>
        <block v-else>
          <view class="cm-av" :style="'background:' + m.from.bg + ';color:' + m.from.fg"><text>{{ m.from.c }}</text></view>
          <view class="cm-main">
            <view class="cm-top"><text class="cm-n" :class="{ 'cm-n-me': m.mine }">{{ m.from.name }}</text><text class="cm-time">{{ hhmm(m.at) }}</text><text v-if="m.sending" class="cm-sending">发送中…</text></view>
            <text v-if="m.kind === 'text'" class="cm-text">{{ m.text }}</text>
            <image v-else class="cm-img" :src="m.src" mode="aspectFill" @tap="preview(m.src)" />
          </view>
        </block>
      </view>
      <view id="m-end" class="list-end"></view>
    </scroll-view>

    <!-- 看历史消息时来了新消息：不打断，点提示回到底部 -->
    <view v-if="newCount" class="new" :style="'bottom:' + newBottom + 'px'" hover-class="press" @tap="toBottom(true)">
      <text class="new-t">{{ newCount }} 条新消息</text><z-icon name="chevron-down" :size="14" color="#FFFFFF" />
    </view>

    <view class="bottom" :style="bottomStyle">
      <z-room-input
        v-model="draft"
        :panel="panel"
        :failed="failed"
        :focus-key="focusKey"
        :cursor="cursor"
        placeholder="给房间发消息"
        @send="send"
        @more="moreActions"
        @emoji="toggleEmoji"
        @kb="onKb"
        @focus="panel = 'none'"
        @cursor="cursor = $event"
      />
      <z-emoji-panel v-if="panel === 'emoji'" @pick="pickEmoji" @del="delEmoji" />
    </view>
  </view>
</template>

<script setup>
// 房间弹幕列表：房间里所有消息的完整记录（房间页的气泡弹幕只显示最近几条）。在这里或房间页发的消息都同步。
// 看历史消息时来了新消息不会被拉到底部，点「新消息」提示回到底部
import { ref, computed, watch, nextTick, getCurrentInstance } from 'vue'
import { onReady, onShow, onUnload } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZRoomInput from '@/components/z-room-input/z-room-input.vue'
import ZEmojiPanel from '@/components/z-emoji-panel/z-emoji-panel.vue'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { chat, sendText, sendImage, startDemoFeed, stopDemoFeed } from '@/common/room-chat.js'
import { insertAt, deleteBefore } from '@/common/emoji.js'

const instance = getCurrentInstance()
const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW + 8}px`
const pad2 = (n) => (n < 10 ? '0' : '') + n
const hhmm = (t) => { const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
const toast = (title) => uni.showToast({ title, icon: 'none' })

/* ---------- 滚动：在底部时跟着新消息走；在看历史时只累计「新消息」 ---------- */
const anchor = ref('')
const smooth = ref(false)
const atBottom = ref(true)
const newCount = ref(0)
let viewH = 0
function toBottom(animated) {
  smooth.value = !!animated
  anchor.value = ''
  nextTick(() => { anchor.value = 'm-end' })
  newCount.value = 0
  atBottom.value = true
}
function onScroll(e) {
  const d = e.detail
  if (!viewH) return
  atBottom.value = d.scrollHeight - d.scrollTop - viewH < 60
  if (atBottom.value) newCount.value = 0
}
onReady(() => {
  uni.createSelectorQuery().in(instance.proxy).select('.list').boundingClientRect((r) => { viewH = (r && r.height) || 0 }).exec()
  toBottom(false)
})
watch(() => chat.list.length, (n, o) => {
  if (n <= o) return
  const last = chat.list[n - 1]
  if (atBottom.value || (last && last.mine)) toBottom(true)
  else newCount.value += n - o
})

/* ---------- 输入：和房间页同样的输入栏、表情面板和键盘切换 ---------- */
const draft = ref('')
const cursor = ref(-1)
const failed = ref(false)
const focusKey = ref(0)
const panel = ref('none')
const kb = ref(0)
const bottomStyle = computed(() => (kb.value > 0 ? `padding-bottom:${kb.value}px` : panel.value === 'emoji' ? '' : 'padding-bottom:env(safe-area-inset-bottom)'))
const newBottom = computed(() => (kb.value || 0) + (panel.value === 'emoji' ? 300 : 0) + 76)
watch(draft, () => { if (failed.value) failed.value = false })
async function send() {
  const text = draft.value.trim()
  if (!text) return
  failed.value = false
  const ok = await sendText(text)
  if (ok) { draft.value = ''; cursor.value = 0 } else { nextTick(() => { failed.value = true }); toast('发送失败，点右边的按钮重试') }
}
function onKb(h) { kb.value = h; if (h) panel.value = 'none' }
const cursorPos = () => (cursor.value >= 0 && cursor.value <= draft.value.length ? cursor.value : draft.value.length)
function toggleEmoji() {
  if (panel.value === 'emoji') { panel.value = 'none'; focusKey.value += 1; return }
  uni.hideKeyboard()
  kb.value = 0
  panel.value = 'emoji'
}
function pickEmoji(e) { const r = insertAt(draft.value, cursorPos(), e); draft.value = r.text; cursor.value = r.cursor }
function delEmoji() { const r = deleteBefore(draft.value, cursorPos()); draft.value = r.text; cursor.value = r.cursor }
// 「更多」：这里只有发图片（主持人、玩法、记分在房间页的抽屉里）
function moreActions() {
  uni.hideKeyboard()
  panel.value = 'none'
  uni.showActionSheet({
    itemList: ['从相册选图片', '拍照'],
    success: ({ tapIndex }) => {
      const src = tapIndex === 0 ? 'album' : 'camera'
      const done = (path) => { if (path) sendImage(path) }
      // #ifdef MP-WEIXIN
      uni.chooseMedia({ count: 1, mediaType: ['image'], sourceType: [src], sizeType: ['compressed'], success: (r) => done(r.tempFiles && r.tempFiles[0] && r.tempFiles[0].tempFilePath) })
      // #endif
      // #ifndef MP-WEIXIN
      uni.chooseImage({ count: 1, sourceType: [src], success: (r) => done(r.tempFilePaths && r.tempFilePaths[0]) })
      // #endif
    }
  })
}
const preview = (src) => uni.previewImage({ urls: [src], current: src })
// 演示：在这一页时，其他人的消息也会继续进来（房间页被盖住时停了）；回到房间页时交还给房间页
onShow(() => startDemoFeed('chat'))
onUnload(() => stopDemoFeed('chat'))
</script>

<style>
.cp { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #1B1D22; }
.press { opacity: .8; }
.nav { flex: none; padding-left: 12px; box-sizing: border-box; display: flex; align-items: center; border-bottom: 1px solid #24272D; }
.nav-back { width: 44px; height: 44px; flex: none; border-radius: 50%; background: #2C2F36; display: flex; align-items: center; justify-content: center; }
.nav-title { margin-left: 12px; font-size: 18px; font-weight: 700; color: #F3EEE6; }
.list { flex: 1; min-height: 0; }
.cm { padding: 8px 16px; display: flex; align-items: flex-start; }
.cm-av { width: 40px; height: 40px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; }
.cm-main { flex: 1; min-width: 0; margin-left: 12px; display: flex; flex-direction: column; }
.cm-top { display: flex; align-items: baseline; }
.cm-n { font-size: 15px; font-weight: 700; color: #F3EEE6; }
.cm-n-me { color: #8EA1FF; }
.cm-time { margin-left: 8px; font-size: 12px; color: #A9AEB8; }
.cm-sending { margin-left: 8px; font-size: 12px; color: #A9AEB8; }
.cm-text { margin-top: 2px; font-size: 16px; line-height: 1.5; color: #E5E2DB; word-break: break-all; white-space: pre-wrap; }
.cm-img { margin-top: 6px; width: 180px; height: 135px; border-radius: 12px; background: #2C2F36; }
.cm-sys { padding-top: 6px; padding-bottom: 6px; }
.cm-pin { width: 40px; flex: none; display: flex; justify-content: center; padding-top: 2px; }
.cm-sys-t { font-size: 14px; line-height: 1.5; color: #C9CDD4; }
.cm-time-sys { margin-left: 0; margin-top: 2px; }
.list-end { height: 16px; }
.new { position: absolute; left: 50%; transform: translateX(-50%); height: 36px; padding: 0 16px; border-radius: 18px; background: #5865F2; box-shadow: 0 6px 16px rgba(0, 0, 0, .35); display: flex; align-items: center; animation: new-in 220ms ease-out; }
@keyframes new-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
.new-t { margin-right: 4px; font-size: 14px; font-weight: 600; color: #FFFFFF; }
.bottom { flex: none; background: #1B1D22; transition: padding-bottom 200ms ease; }
</style>
