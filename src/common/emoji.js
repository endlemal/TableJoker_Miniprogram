// 表情面板的表情（系统自带的 emoji）。不放和钱、赌有关的表情
const RECENT_KEY = 'zz_emoji_recent'
export const EMOJI_CATS = [
  { key: 'recent', icon: '🕘', name: '常用', list: ['😀', '😂', '👍', '👏', '🙏', '🔥', '🎉', '❤️', '😎', '🤔', '😭', '😅', '👌', '💪', '🤝', '😴', '🥳', '😮'] },
  { key: 'face', icon: '😊', name: '表情', list: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '😘', '😋', '😜', '🤪', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '🤗', '🤔', '🤭', '🤫', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😮', '😲', '🥱', '😴'] },
  { key: 'hand', icon: '👋', name: '手势', list: ['👋', '🤚', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪'] },
  { key: 'table', icon: '🃏', name: '牌桌', list: ['🃏', '🎴', '🀄', '🎲', '♠️', '♥️', '♦️', '♣️', '🏆', '🥇', '🥈', '🥉', '⏱️', '⏸️', '▶️', '⏭️', '🔔', '📣', '🍀', '🎯', '👑', '💯', '🔥', '⚡'] },
  { key: 'food', icon: '🍜', name: '吃喝', list: ['☕', '🍵', '🧋', '🥤', '🍺', '🍷', '🍕', '🍔', '🍟', '🌭', '🍜', '🍣', '🍱', '🍰', '🍪', '🍿', '🍫', '🍩', '🍎', '🍉'] },
  { key: 'sign', icon: '❤️', name: '符号', list: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '✨', '⭐', '🌟', '💤', '💢', '❗', '❓', '✅', '❌', '⭕', '🆗', '🔝'] }
]
export function recentEmoji() {
  const v = uni.getStorageSync(RECENT_KEY)
  return Array.isArray(v) ? v : []
}
export function rememberEmoji(e) {
  uni.setStorageSync(RECENT_KEY, [e].concat(recentEmoji().filter((x) => x !== e)).slice(0, 18))
}
// 删掉光标前的一个字。emoji 可能由多个码位组成：修饰符（变体选择符 FE0F、键帽 20E3、肤色）跟着前面的字一起删；
// 零宽连接符 200D 连起来的组合表情（比如一家人）整串删掉
const MOD = /^[\uFE0F\u20E3]$|^[\u{1F3FB}-\u{1F3FF}]$/u
export function deleteBefore(text, cursor) {
  const head = Array.from(text.slice(0, cursor))
  if (!head.length) return { text, cursor }
  let c = head.pop()
  while (c !== undefined && MOD.test(c)) c = head.pop()
  while (head.length && head[head.length - 1] === '\u200D') {
    head.pop()
    c = head.pop()
    while (c !== undefined && MOD.test(c)) c = head.pop()
  }
  const h = head.join('')
  return { text: h + text.slice(cursor), cursor: h.length }
}
export function insertAt(text, cursor, piece) {
  const c = Math.max(0, Math.min(cursor, text.length))
  return { text: text.slice(0, c) + piece + text.slice(c), cursor: c + piece.length }
}
