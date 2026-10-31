<template>
  <view class="cp">
    <!-- 顶部：返回 + 标题 -->
    <view class="nav" :style="navStyle">
      <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="20" color="#F3EEE6" /></view>
      <text class="nav-title">房间弹幕列表</text>
    </view>

    <!-- 完整的消息记录：头像、昵称、时间、正文；和房间页的气泡弹幕是同一份数据 -->
    <scroll-view scroll-y class="list" :scroll-into-view="anchor" :scroll-with-animation="smooth" @scroll="onScroll">
      <view v-for="m in rows" :id="'m' + m.id" :key="m.id" class="cm" :class="{ 'cm-sys': m.kind === 'system', 'cm-msg': m.kind !== 'system', 'cm-grouped': m.grouped, 'cm-act': actOn === m.id }" @tap="tapMsg(m)">
        <block v-if="m.kind === 'system'">
          <view class="cm-pin"><z-icon name="pin" :size="16" color="#A9AEB8" /></view>
          <view class="cm-main"><text class="cm-sys-t">{{ m.text }}</text><text class="cm-time cm-time-sys">{{ hhmm(m.at) }}</text></view>
        </block>
        <block v-else>
          <!-- 回复：上面一行引用原消息，点了跳到原消息 -->
          <view v-if="m.reply" class="rp" @tap.stop="jumpTo(m.reply.id)">
            <view class="rp-line"></view><text class="rp-n">@{{ m.reply.name }}</text><text class="rp-t">{{ m.reply.text }}</text>
          </view>
          <view class="cm-body">
            <!-- 同一个人连续发的：不重复头像和名字，左边空着（点开时显示时间） -->
            <view v-if="m.grouped" class="cm-gut"><text v-if="actOn === m.id" class="cm-gut-t">{{ hhmm(m.at) }}</text></view>
            <view v-else class="cm-av" :style="'background:' + m.from.bg + ';color:' + m.from.fg"><text>{{ m.from.c }}</text></view>
            <view class="cm-main">
              <view v-if="!m.grouped" class="cm-top"><text class="cm-n" :class="{ 'cm-n-me': m.mine }">{{ m.from.name }}</text><text class="cm-time">{{ hhmm(m.at) }}</text><text v-if="m.sending" class="cm-sending">发送中…</text></view>
              <text v-if="m.kind === 'text'" class="cm-text">{{ m.text }}</text>
              <image v-else class="cm-img" :src="m.src" mode="aspectFill" @tap.stop="preview(m.src)" />
              <!-- 反应：表情和人数，自己点过的描边；点了加上或取消 -->
              <view v-if="reactionsOf(m).length" class="rx">
                <view v-for="r in reactionsOf(m)" :key="r.e" class="rx-i" :class="{ 'rx-mine': r.mine }" @tap.stop="toggleReaction(m.id, r.e)"><text class="rx-e">{{ r.e }}</text><text class="rx-n">{{ r.n }}</text></view>
              </view>
            </view>
          </view>
          <!-- 点一条消息：喜欢、表情、回复 -->
          <view v-if="actOn === m.id" class="mt" @tap.stop="noop">
            <view class="mt-b" :class="{ 'mt-b-on': likedByMe(m) }" hover-class="press" @tap.stop="like(m)"><text class="mt-e">❤️</text></view>
            <view class="mt-b" hover-class="press" @tap.stop="openReact(m)"><z-icon name="mood-smile" :size="20" color="#E5E2DB" /></view>
            <view class="mt-b" hover-class="press" @tap.stop="startReply(m)"><z-icon name="arrow-back-up" :size="20" color="#E5E2DB" /></view>
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
      <!-- 正在回复谁 -->
      <view v-if="replyTo" class="rb">
        <z-icon name="arrow-back-up" :size="16" color="#A9AEB8" />
        <text class="rb-t">回复 <text class="rb-n">{{ replyTo.from.name }}</text>：{{ replyTo.text }}</text>
        <view class="rb-x" hover-class="press" @tap="replyTo = null"><z-icon name="x" :size="14" color="#C9CDD4" /></view>
      </view>
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
    <!-- 给消息加表情反应 -->
    <view v-if="reactTo" class="rs" @touchmove.stop.prevent="noop">
      <view class="rs-mask" @tap="reactTo = null"></view>
      <view class="rs-panel"><text class="rs-t">给这条消息加个表情</text><z-emoji-panel @pick="reactPick" @del="reactTo = null" /></view>
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
import { chat, sendText, sendImage, startDemoFeed, stopDemoFeed, toggleReaction, ME } from '@/common/room-chat.js'
import { insertAt, deleteBefore } from '@/common/emoji.js'

const instance = getCurrentInstance()
const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW + 8}px`
const pad2 = (n) => (n < 10 ? '0' : '') + n
const hhmm = (t) => { const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
const toast = (title) => uni.showToast({ title, icon: 'none' })
const noop = () => {}

/* ---------- 合并：同一个人 5 分钟内连续发的消息只显示一次头像和名字（回复会重新显示） ---------- */
const GROUP_MS = 5 * 60000
const rows = computed(() => chat.list.map((m, i) => {
  const prev = chat.list[i - 1]
  const grouped = !!(prev && m.kind !== 'system' && prev.kind !== 'system' && !m.reply && prev.from.name === m.from.name && m.at - prev.at < GROUP_MS)
  return { ...m, grouped }
}))
/* ---------- 点一条消息：喜欢、表情反应、回复 ---------- */
const actOn = ref(0)
const replyTo = ref(null)
const reactTo = ref(null)
function tapMsg(m) {
  if (m.kind === 'system') { actOn.value = 0; return }
  actOn.value = actOn.value === m.id ? 0 : m.id
}
const reactionsOf = (m) => Object.entries(m.reactions || {}).map(([e, who]) => ({ e, n: who.length, mine: who.includes(ME.name) }))
const likedByMe = (m) => ((m.reactions || {})['❤️'] || []).includes(ME.name)
function like(m) { toggleReaction(m.id, '❤️'); actOn.value = 0 }
function openReact(m) { reactTo.value = m; actOn.value = 0 }
function reactPick(e) { if (reactTo.value) toggleReaction(reactTo.value.id, e); reactTo.value = null }
function startReply(m) {
  replyTo.value = m
  actOn.value = 0
  panel.value = 'none'
  focusKey.value += 1
}
function jumpTo(id) {
  smooth.value = true
  anchor.value = ''
  nextTick(() => { anchor.value = 'm' + id })
}

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
  const r = replyTo.value
  const ok = await sendText(text, r ? { id: r.id, name: r.from.name, text: r.kind === 'image' ? '[图片]' : r.text } : null)
  if (ok) { draft.value = ''; cursor.value = 0; replyTo.value = null } else { nextTick(() => { failed.value = true }); toast('发送失败，点右边的按钮重试') }
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
.cm { position: relative; }
.cm-grouped { padding-top: 1px; }
.cm-act { background: #22252B; }
.cm-body { flex: 1; min-width: 0; display: flex; align-items: flex-start; }
.cm-gut { width: 40px; flex: none; padding-top: 3px; display: flex; justify-content: center; }
.cm-gut-t { font-size: 10px; color: #A9AEB8; }
.cm-msg { flex-direction: column; align-items: stretch; }
.rp { margin: 0 0 4px 18px; display: flex; align-items: center; min-width: 0; }
.rp-line { width: 22px; height: 10px; margin-right: 6px; flex: none; border-left: 2px solid #4B4F58; border-top: 2px solid #4B4F58; border-top-left-radius: 6px; transform: translateY(5px); }
.rp-n { flex: none; font-size: 13px; color: #8EA1FF; }
.rp-t { margin-left: 6px; flex: 1; min-width: 0; font-size: 13px; color: #A9AEB8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rx { margin-top: 6px; display: flex; flex-wrap: wrap; }
.rx-i { height: 28px; margin: 0 6px 6px 0; padding: 0 8px; border-radius: 8px; background: #2C2F36; box-shadow: inset 0 0 0 1px transparent; display: flex; align-items: center; }
.rx-mine { background: rgba(88, 101, 242, .18); box-shadow: inset 0 0 0 1px #5865F2; }
.rx-e { font-size: 15px; }
.rx-n { margin-left: 4px; font-size: 13px; font-weight: 600; color: #E5E2DB; }
.mt { position: absolute; right: 12px; top: 2px; z-index: 5; height: 40px; padding: 0 4px; border-radius: 10px; background: #2C2F36; box-shadow: 0 6px 16px rgba(0, 0, 0, .4); display: flex; align-items: center; animation: mt-in 180ms ease-out; }
@keyframes mt-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.mt-b { width: 44px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.mt-b-on { background: rgba(255, 107, 107, .18); }
.mt-e { font-size: 18px; }
.rb { height: 40px; margin: 0 12px; padding: 0 8px 0 12px; border-radius: 12px 12px 0 0; background: #24272E; display: flex; align-items: center; }
.rb-t { margin-left: 8px; flex: 1; min-width: 0; font-size: 13px; color: #A9AEB8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rb-n { color: #F3EEE6; font-weight: 600; }
.rb-x { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.rs { position: fixed; z-index: 300; left: 0; top: 0; right: 0; bottom: 0; }
.rs-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .5); }
.rs-panel { position: absolute; left: 0; right: 0; bottom: 0; }
.rs-t { display: block; padding: 0 16px 8px; font-size: 13px; color: #C9CDD4; }
.new { position: absolute; left: 50%; transform: translateX(-50%); height: 36px; padding: 0 16px; border-radius: 18px; background: #5865F2; box-shadow: 0 6px 16px rgba(0, 0, 0, .35); display: flex; align-items: center; animation: new-in 220ms ease-out; }
@keyframes new-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
.new-t { margin-right: 4px; font-size: 14px; font-weight: 600; color: #FFFFFF; }
.bottom { flex: none; background: #1B1D22; transition: padding-bottom 200ms ease; }
</style>
