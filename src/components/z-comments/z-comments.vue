<template>
  <view v-if="show" class="zc">
    <view class="zc-mask" @tap="emit('close')" @touchmove.stop.prevent="noop"></view>
    <view class="zc-sheet">
      <view class="zc-grab"></view>
      <view class="zc-head">
        <text class="zc-title">评论 {{ list.length }}</text>
        <view class="zc-x" hover-class="zc-press" @tap="emit('close')"><z-icon name="x" :size="16" color="#E5E7EB" /></view>
      </view>
      <scroll-view scroll-y class="zc-list" :scroll-into-view="lastId" :scroll-with-animation="true">
        <view v-for="c in list" :id="'zc-' + c.id" :key="c.id" class="zc-row">
          <view class="zc-av" :style="'background:' + c.author.bg + ';color:' + c.author.fg"><text>{{ c.author.c }}</text></view>
          <view class="zc-main">
            <view class="zc-top">
              <text class="zc-n">{{ c.author.name }}</text>
              <text v-if="c.mine" class="zc-tag">我</text>
              <text v-else-if="isAuthor(c)" class="zc-tag zc-tag-a">作者</text>
              <text class="zc-time">{{ ago(c.at) }}</text>
            </view>
            <text class="zc-text">{{ c.text }}</text>
          </view>
          <view class="zc-like" hover-class="zc-press" @tap="like(c)">
            <z-icon :name="likedMap[c.id] ? 'suit-heart' : 'heart'" :size="15" :color="likedMap[c.id] ? '#FF4D4D' : '#6B7280'" />
            <text class="zc-like-n" :class="{ 'zc-like-on': likedMap[c.id] }">{{ c.likes + (likedMap[c.id] ? 1 : 0) }}</text>
          </view>
        </view>
        <z-empty v-if="!list.length" kind="comments" compact title="还没有评论" desc="来说第一句吧" />
      </scroll-view>
      <view class="zc-bar">
        <input v-model="text" class="zc-in" :maxlength="COMMENT_MAX" confirm-type="send" :adjust-position="true" :cursor-spacing="20" placeholder="说点什么…" placeholder-class="zc-ph" @confirm="send" />
        <view class="zc-send" :class="{ 'zc-send-on': text.trim() }" hover-class="zc-press" @tap="send"><text class="zc-send-t">发送</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 评论抽屉：官方完赛战报、俱乐部动态和玩家帖子都能评论、给评论点赞。发出的评论先做本地检查（空、超长、违禁词），
// 正式环境由服务端存储并做内容安全检查。发表后 emit('count', 新的评论数)
import { ref, reactive, watch } from 'vue'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZEmpty from '@/components/z-empty/z-empty.vue'
import { commentsOf, addComment, isCommentLiked, toggleCommentLike, COMMENT_MAX } from '@/common/comments.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  postId: { type: String, default: '' },
  postAuthor: { type: String, default: '' },
  me: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['close', 'count'])
const noop = () => {}
const list = ref([])
const text = ref('')
const lastId = ref('')
const likedMap = reactive({})
function load() {
  list.value = commentsOf(props.postId)
  list.value.forEach((c) => { likedMap[c.id] = isCommentLiked(c.id) })
}
watch(() => [props.show, props.postId], ([v]) => { if (v) { text.value = ''; load() } }, { immediate: true })
const isAuthor = (c) => props.postAuthor && c.author && c.author.name === props.postAuthor
function ago(t) {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000))
  return m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.round(m / 60)} 小时前` : `${Math.round(m / 1440)} 天前`
}
function like(c) { likedMap[c.id] = toggleCommentLike(c.id) }
function send() {
  const r = addComment(props.postId, text.value, props.me)
  if (r.error) return uni.showToast({ title: r.error, icon: 'none' })
  text.value = ''
  load()
  lastId.value = 'zc-' + r.comment.id
  emit('count', list.value.length)
}
</script>

<style>
.zc { position: fixed; z-index: 260; left: 0; top: 0; right: 0; bottom: 0; }
.zc-mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .55); }
.zc-sheet { position: absolute; left: 0; right: 0; bottom: 0; height: 72vh; padding-top: 12rpx; background: #262A34; border-radius: 40rpx 40rpx 0 0; display: flex; flex-direction: column; animation: zc-up .22s ease-out; }
@keyframes zc-up { from { transform: translateY(100%); } to { transform: none; } }
.zc-grab { width: 64rpx; height: 8rpx; margin: 0 auto 12rpx; border-radius: 4rpx; background: #4B5060; }
.zc-head { height: 72rpx; padding: 0 32rpx; display: flex; align-items: center; justify-content: space-between; }
.zc-title { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.zc-x { width: 56rpx; height: 56rpx; border-radius: 50%; background: #35383F; display: flex; align-items: center; justify-content: center; }
.zc-list { flex: 1; min-height: 0; }
.zc-row { padding: 20rpx 32rpx; display: flex; align-items: flex-start; }
.zc-av { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; }
.zc-main { flex: 1; min-width: 0; margin: 0 16rpx 0 18rpx; }
.zc-top { display: flex; align-items: center; }
.zc-n { font-size: 24rpx; color: #C9CDD4; }
.zc-tag { margin-left: 10rpx; padding: 0 10rpx; border-radius: 8rpx; background: rgba(220, 0, 0, .2); font-size: 18rpx; color: #FF8A8A; }
.zc-tag-a { background: rgba(244, 183, 64, .18); color: #F4B740; }
.zc-time { margin-left: 12rpx; font-size: 20rpx; color: #6B7280; }
.zc-text { display: block; margin-top: 8rpx; font-size: 28rpx; line-height: 1.55; color: #FFFFFF; word-break: break-all; }
.zc-like { width: 64rpx; padding-top: 6rpx; display: flex; flex-direction: column; align-items: center; }
.zc-like-n { margin-top: 2rpx; font-size: 20rpx; color: #6B7280; }
.zc-like-on { color: #FF4D4D; }
.zc-bar { padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); border-top: 1rpx solid #35383F; display: flex; align-items: center; }
.zc-in { flex: 1; min-width: 0; height: 72rpx; padding: 0 28rpx; border-radius: 999rpx; background: #1F222A; font-size: 27rpx; color: #FFFFFF; }
.zc-ph { color: #6B7280; }
.zc-send { margin-left: 16rpx; height: 72rpx; padding: 0 28rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; }
.zc-send-on { background: #DC0000; }
.zc-send-t { font-size: 26rpx; font-weight: 600; color: #FFFFFF; }
.zc-press { opacity: .75; }
</style>
