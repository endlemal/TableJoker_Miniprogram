// 主办方专属的创建比赛配置 · 演示数据：TV 显示的信息维度、比赛标签
// 普通用户和主办方的上限不同：方案存档 5 / 12 个，介绍 300 / 1000 字
export const SLOTS = { user: 5, host: 12 }
export const INTRO_MAX = { user: 300, host: 1000 }

// 大屏计时器上显示哪些信息。fixed 的是计时器的核心，一直显示
// （不放奖金、奖池一类和金钱有关的信息，避免审核风险）
export const TV_DIMS = [
  { key: 'level', name: '当前级别', fixed: true },
  { key: 'clock', name: '级别倒计时', fixed: true },
  { key: 'blinds', name: '盲注 / 前注', fixed: true },
  { key: 'next', name: '下一级别' },
  { key: 'players', name: '剩余人数' },
  { key: 'avg', name: '平均筹码' },
  { key: 'break', name: '休息倒计时' },
  { key: 'checkin', name: '签到人数' },
  { key: 'poster', name: '海报轮播' }
]
export const DEFAULT_DIMS = ['level', 'clock', 'blinds', 'next', 'players', 'avg']

// 比赛标签：2 个预设 + 自定义，最多 6 个，每个最多 6 个字。自定义标签要审核（见 src/common/tags.js）
export const TAG_PRESETS = ['深筹赛', '快速赛']
export const MAX_TAGS = 6
export const TAG_MAX_LEN = 6
