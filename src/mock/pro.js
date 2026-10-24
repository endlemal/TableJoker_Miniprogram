// 主办方专业赛制拓展 · 演示数据：TV 显示的信息维度、比赛标签、规程段落模板、工作台预设（盲注结构、赛事配置方案）
// 普通用户和主办方的上限不同：方案存档 5 / 12 个，介绍 300 / 1000 字
import { VENUES } from './data.js'

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

// 比赛标签：预设 + 自定义，最多 6 个，每个最多 6 个字
export const TAG_PRESETS = ['深筹赛', '快速赛', '周末常规赛', '免费体验赛', '新手友好', '积分赛', '邀请赛', '决赛桌']
export const MAX_TAGS = 6
export const TAG_MAX_LEN = 6

// 规程段落模板：一键插入，再按实际情况改
export const RULE_SNIPPETS = [
  { key: 'format', level: 1, title: '赛制说明', body: '锦标赛制，起始筹码 20000，每级 20 分钟，按盲注结构逐级上涨。' },
  { key: 'reentry', level: 1, title: '重进（Re-entry）规则', body: '截止报名前可以重进 1 次，重进后领取起始筹码重新入座。' },
  { key: 'cutoff', level: 2, title: '截止报名级别', body: '第 7 级开始后截止报名和重进。' },
  { key: 'venue', level: 2, title: '线下场地指引', body: '到店后在前台签到领取座位卡，开赛前 15 分钟入座。' }
]

// 工作台预设 · 盲注结构模板（一键调用；也可以另存到自己的方案存档里再改）
const L = (sb, ante, min) => ({ t: 'L', sb, bb: sb * 2, ante, min })
const ladder = [100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000]
function build(count, min, start, breaks, cutAfter) {
  const rows = []
  ladder.slice(start, start + count).forEach((sb, i) => {
    rows.push(L(sb, i >= 2 ? sb / 2 : 0, min))
    if (i + 1 === cutAfter) rows.push({ t: 'C' })
    if (breaks.includes(i + 1)) rows.push({ t: 'B', min: 15 })
  })
  return rows
}
export const BLIND_PRESETS = [
  { id: 'p-deep', name: '标准深筹', desc: '20 级 · 每级 20 分钟', preset: true, rows: build(20, 20, 0, [6, 12], 8) },
  { id: 'p-turbo', name: '涡轮快速', desc: '15 级 · 每级 12 分钟', preset: true, rows: build(15, 12, 0, [8], 6) },
  { id: 'p-hyper', name: '超快速', desc: '12 级 · 每级 8 分钟', preset: true, rows: build(12, 8, 2, [], 4) }
]

// 工作台预设 · 赛事配置方案（整场设置，含专业配置；不含日期）
const rulesOf = (...keys) => keys.map((k, i) => ({ ...RULE_SNIPPETS.find((r) => r.key === k), id: 'p' + i }))
export const MATCH_PRESETS = [
  {
    id: 'mp-friday', name: '周五常规赛', preset: true,
    data: {
      cover: 'fog', name: '周五常规赛', blindId: 'p-deep', hour: 19, minute: 30, cap: 27, isPublic: true, autoApprove: true, location: VENUES.north,
      intro: '每周五晚的常规赛，欢迎老朋友和新朋友。', tags: ['深筹赛', '周末常规赛'],
      tvTheme: { key: 'flip', dims: DEFAULT_DIMS.slice() }, rules: rulesOf('format', 'reentry', 'cutoff')
    }
  },
  {
    id: 'mp-deep', name: '周末深筹赛', preset: true,
    data: {
      cover: 'abyss', name: '周末深筹赛', blindId: 'p-deep', hour: 14, minute: 0, cap: 36, isPublic: true, autoApprove: false, location: VENUES.north,
      intro: '慢节奏深筹赛，适合想打长局的玩家。', tags: ['深筹赛', '积分赛'],
      tvTheme: { key: 'night', dims: DEFAULT_DIMS.concat(['break']) }, rules: rulesOf('format', 'reentry', 'cutoff', 'venue')
    }
  },
  {
    id: 'mp-free', name: '免费体验赛', preset: true,
    data: {
      cover: 'snow', name: '免费体验赛', blindId: 'p-hyper', hour: 20, minute: 0, cap: 18, isPublic: true, autoApprove: true, location: VENUES.north,
      intro: '新手友好的体验局，现场有荷官讲解规则。', tags: ['免费体验赛', '新手友好', '快速赛'],
      tvTheme: { key: 'dawn', dims: ['level', 'clock', 'blinds', 'next', 'checkin'] }, rules: rulesOf('format', 'venue')
    }
  }
]
