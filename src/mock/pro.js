// 主办方专属的创建比赛配置 · 演示数据：方案存档和介绍的上限、比赛标签
// 普通用户和主办方的上限不同：方案存档 5 / 12 个，介绍 300 / 1000 字
export const SLOTS = { user: 5, host: 12 }
export const INTRO_MAX = { user: 300, host: 1000 }

// 比赛标签：2 个预设 + 自定义，最多 6 个，每个最多 6 个字。自定义标签要审核（见 src/common/tags.js）
export const TAG_PRESETS = ['深筹赛', '快速赛']
export const MAX_TAGS = 6
export const TAG_MAX_LEN = 6
