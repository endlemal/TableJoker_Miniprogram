// 比赛标签：预设标签直接通过；自定义标签提交后要审核，通过后才公开显示（比赛邀请页、广场）。
// 标签存成 { text, preset, at }：at 是提交审核的时间。审核状态按时间算出来，各页面看到的一致
import { BANNED } from './moderation.js'
import { TAG_PRESETS } from '../mock/pro.js'

// 演示：提交 5 秒后审核完成；正式环境由服务端回写审核结果
export const TAG_REVIEW_MS = 5000
const OK_CHARS = /^[\u4e00-\u9fa5A-Za-z0-9·]+$/

// 本地检查：返回不通过的原因，没问题返回空字符串
export function tagProblem(text) {
  if (!OK_CHARS.test(text)) return '只能用中文、字母和数字'
  if (BANNED.test(text)) return '含有不允许的词语'
  return ''
}
// 旧数据里的标签是字符串：预设的按预设处理，其余按已审核通过处理
export const tagOf = (t) => (typeof t === 'string' ? { text: t, preset: TAG_PRESETS.includes(t), at: 0 } : t)
export const newTag = (text) => ({ text, preset: TAG_PRESETS.includes(text), at: Date.now() })
// approved 已通过 · pending 审核中 · rejected 未通过
export function tagStatus(t, now = Date.now()) {
  const tag = tagOf(t)
  if (tag.preset) return 'approved'
  if (tagProblem(tag.text)) return 'rejected'
  return now - (tag.at || 0) >= TAG_REVIEW_MS ? 'approved' : 'pending'
}
// 公开显示的标签：只有审核通过的
export const publicTags = (tags, now = Date.now()) => (tags || []).map(tagOf).filter((t) => tagStatus(t, now) === 'approved').map((t) => t.text)
