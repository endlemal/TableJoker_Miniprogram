// 广场帖子（官方战报、俱乐部动态、玩家帖子）的评论和评论点赞。
// 演示：种子评论 + 本机新发的评论；正式环境由服务端存储，发评论前做内容安全检查（msgSecCheck）
import { seedComments } from '../mock/plaza.js'
import { BANNED } from './moderation.js'

const KEY = 'zz_comments'
const LIKE_KEY = 'zz_comment_likes'
const load = (k) => { const v = uni.getStorageSync(k); return v && typeof v === 'object' ? v : {} }
export const COMMENT_MAX = 200

// 一条帖子的评论：按时间先后
export function commentsOf(postId) {
  const base = String(postId).replace(/-\d+$/, '')
  const mine = load(KEY)[postId] || []
  return (seedComments[base] || []).concat(mine).sort((a, b) => a.at - b.at)
}
// 发评论：去掉首尾空白，不能为空、不能超长、不能有违禁词
export function addComment(postId, text, author) {
  const t = String(text || '').trim()
  if (!t) return { error: '先写点什么' }
  if (t.length > COMMENT_MAX) return { error: `评论最多 ${COMMENT_MAX} 字` }
  if (BANNED.test(t)) return { error: '评论里有不能发布的内容' }
  const all = load(KEY)
  const c = { id: 'cm-' + Date.now().toString(36), author, text: t, likes: 0, at: Date.now(), mine: true }
  all[postId] = (all[postId] || []).concat([c])
  uni.setStorageSync(KEY, all)
  return { comment: c }
}
export const isCommentLiked = (id) => !!load(LIKE_KEY)[id]
export function toggleCommentLike(id) {
  const all = load(LIKE_KEY)
  if (all[id]) delete all[id]
  else all[id] = 1
  uni.setStorageSync(LIKE_KEY, all)
  return !!all[id]
}
