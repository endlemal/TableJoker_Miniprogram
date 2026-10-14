// 演示数据。接入后端时，按同样的字段结构替换即可。

export const me = {
  id: 'u5',
  nickname: '骰子先生',
  char: '骰',
  rank: '黄金 III',
  online: true,
  stats: { joined: 86, created: 12, wallet: 268 }
}

// 首页 · 服务器栏
export const servers = [
  { id: 's1', name: '周五桌游夜', icon: 'dice', bg: '#3A1C1F', fg: '#F2A7A7' },
  { id: 's2', name: '象棋茶馆', icon: 'chess-knight', bg: '#1E2A38', fg: '#9CC3F0' },
  { id: 's3', name: '狼人杀之夜', icon: 'moon-stars', bg: '#28233F', fg: '#B8ADF5', unread: 3 },
  { id: 's4', name: '卡牌对战', icon: 'cards', bg: '#17302A', fg: '#8FD3B6' }
]

// 首页 · 赛事卡片
export const featuredEvent = {
  name: '周末狼人杀锦标赛',
  verified: true,
  desc: '12 人标准局，预言家、女巫、猎人、守卫各一。冠军赢取赛季积分与限定头像框。',
  signed: 9,
  capacity: 12,
  time: '周六 20:00',
  members: [
    { c: '林', bg: '#3B4A6B', fg: '#C9D6FF' },
    { c: 'Q', bg: '#4A2E1F', fg: '#F2C9A0' },
    { c: '阿', bg: '#2E4A3B', fg: '#A8E0C2' }
  ]
}

// 个人主页 · 最近活跃（0 到 4 表示活跃程度，'x' 表示高峰）
export const activity = {
  days: 15,
  dayLabels: { 5: '5日', 10: '10日', 15: '15日' },
  rows: [
    { label: '0点', v: [2, 3, 1, 0, 2, 0, 0, 0, 0, 2, 3, 0, 0, 1, 0] },
    { label: '4点', v: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: '8点', v: [0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
    { label: '12点', v: [1, 2, 2, 3, 1, 0, 0, 0, 1, 3, 2, 0, 1, 1, 0] },
    { label: '16点', v: [2, 3, 4, 3, 2, 2, 1, 0, 1, 4, 3, 1, 0, 2, 1] },
    { label: '20点', v: [3, 4, 4, 4, 3, 3, 2, 2, 2, 'x', 3, 2, 2, 3, 2] }
  ]
}

// 个人主页 · 勋章分类色，与首页服务器图标的分类色一致
export const badgeTone = {
  gold: { rim: '#F4B740', fill: '#3A2C10', icon: '#F4B740' },
  indigo: { rim: '#4C4380', fill: '#28233F', icon: '#B8ADF5' },
  slate: { rim: '#3A5470', fill: '#1E2A38', icon: '#9CC3F0' },
  green: { rim: '#2E5A4D', fill: '#17302A', icon: '#8FD3B6' },
  red: { rim: '#6E2A30', fill: '#3A1C1F', icon: '#F2A7A7' },
  locked: { rim: '#23262E', fill: '#181A20', icon: '' }
}

// 蜂巢布局：偶数行 6 格、奇数行 5 格；null 表示未点亮
export const badgeRows = [
  [null, null, { name: '棋局新秀', icon: 'chess-knight', tone: 'slate' }, { name: '锦标赛冠军', icon: 'trophy', tone: 'gold' }, null, null],
  [null, { name: '牌桌常客', icon: 'cards', tone: 'green' }, { name: '预言家', icon: 'eye', tone: 'indigo' }, { name: '女巫', icon: 'flask', tone: 'indigo' }, null],
  [null, { name: '组局达人', icon: 'users-group', tone: 'red' }, { name: '月度榜首', icon: 'crown', tone: 'gold' }, { name: '猎人', icon: 'target', tone: 'indigo' }, { name: '守卫', icon: 'shield', tone: 'indigo' }, null],
  [null, { name: '幸运骰手', icon: 'dice', tone: 'green' }, { name: '七日连开', icon: 'flame', tone: 'red' }, null, null]
]
export const badgeTotal = 36

// 房间 · 德州扑克锦标赛（线下进行，app 只负责计时、盲注、公告和玩法组件）
const L = (sb, bb, ante) => ({ type: 'level', sb, bb, ante, dur: 20 * 60 })
const B = (min, note) => ({ type: 'break', dur: min * 60, note })

export const room = {
  name: '周五德扑锦标赛',
  pinyin: 'Zhouwu Depu Jinbiaosai',
  type: '锦标赛',
  table: 2,
  tables: 3,
  structure: [
    L(50, 100, 0), L(100, 200, 25), L(150, 300, 25), L(200, 400, 50), B(15, '清小码'),
    L(300, 600, 75), L(400, 800, 100), L(500, 1000, 100), B(15, '复活截止'),
    L(600, 1200, 200), L(800, 1600, 200), L(1000, 2000, 300), L(1200, 2400, 400), B(15, '清小码'),
    L(1500, 3000, 500), L(2000, 4000, 500), L(2500, 5000, 1000), L(3000, 6000, 1000), B(10, ''),
    L(4000, 8000, 1000), L(5000, 10000, 2000), L(6000, 12000, 2000), L(8000, 16000, 2000), L(10000, 20000, 3000)
  ],
  startIndex: 6, // 第 6 级
  remainingSec: 12 * 60 + 34,
  seats: [
    { no: 1, name: '阿林', c: '林', bg: '#3B4A6B', fg: '#C9D6FF' },
    { no: 2, name: 'Q仔', c: 'Q', bg: '#4A2E1F', fg: '#F2C9A0' },
    { no: 3, name: '小鹿', c: '鹿', bg: '#2E4A3B', fg: '#A8E0C2' },
    { no: 4, name: '大熊', c: '熊', bg: '#3F3A2A', fg: '#E6D3A3' },
    { no: 5, name: '骰子先生', c: '骰', bg: '#F1E4D3', fg: '#8A1C1C', me: true },
    { no: 6, name: '阿杰', c: '杰', bg: '#2A3550', fg: '#B5C7F2' },
    { no: 7, name: 'Momo', c: 'M', bg: '#24404A', fg: '#A6DDEB' },
    { no: 8, name: '七七', c: '七', bg: '#4A2433', fg: '#F5B5C8' },
    { no: 9, name: '老周', c: '周', bg: '#3D3550', fg: '#D6CCFF' }
  ],
  chat: [
    { id: 1, seat: 1, text: '这手牌太烂，先弃了', minutesAgo: 4 },
    { id: 2, seat: 8, text: '休息的时候点奶茶吗？我请', minutesAgo: 3 },
    { id: 3, seat: 9, text: 'Q仔快点，盲注要涨了', minutesAgo: 1 }
  ],
  notice: '第 7 级结束后休息 15 分钟，复活同时截止'
}

// 创建比赛页 · 封面场景（名称 + 暗喻）
export const coverScenes = [
  { key: 'blood', name: '血夜', line: '月亮升起时，谁都可能是狼' },
  { key: 'wild', name: '荒野', line: '走到最后的人，才看得见日落' },
  { key: 'jungle', name: '丛林', line: '最安静的那一个，往往最危险' },
  { key: 'snow', name: '雪原', line: '雪地上的脚印，会出卖每一步' },
  { key: 'fog', name: '迷雾', line: '雾散之前，没人知道底牌' }
]

// 创建比赛页 · 盲注方案（t: L 级别 / B 休息 / C 截止买入），最多 5 个
const R = (sb, bb, ante, min = 20) => ({ t: 'L', sb, bb, ante, min })
const BRK = (min) => ({ t: 'B', min })
const CUT = () => ({ t: 'C' })
export const blindSchemeSeeds = [
  {
    id: 'b1', name: '方案一',
    rows: [R(50, 100, 0), R(100, 200, 25), R(150, 300, 25), R(200, 400, 50), BRK(15), R(300, 600, 75), R(400, 800, 100), R(500, 1000, 100), CUT(), BRK(15),
      R(600, 1200, 200), R(800, 1600, 200), R(1000, 2000, 300), R(1200, 2400, 400), BRK(15), R(1500, 3000, 500), R(2000, 4000, 500), R(2500, 5000, 1000), R(3000, 6000, 1000), BRK(10),
      R(4000, 8000, 1000), R(5000, 10000, 2000), R(6000, 12000, 2000), R(8000, 16000, 2000), R(10000, 20000, 3000)]
  },
  {
    id: 'b2', name: '方案二',
    rows: [R(100, 200, 0, 15), R(200, 400, 0, 15), R(300, 600, 50, 15), R(400, 800, 100, 15), BRK(10), R(500, 1000, 100, 15), R(600, 1200, 200, 15), R(800, 1600, 200, 15), CUT(),
      R(1000, 2000, 300, 15), R(1500, 3000, 500, 15), BRK(10), R(2000, 4000, 500, 15), R(3000, 6000, 1000, 15), R(4000, 8000, 1000, 15), R(5000, 10000, 2000, 15), R(6000, 12000, 2000, 15), R(8000, 16000, 3000, 15)]
  }
]

// 创建比赛页 · 共同主持（status: joined 已加入 / pending 待接受）
export const coHostSeeds = [
  { id: 'u9', name: '老周', c: '周', bg: '#3D3550', fg: '#D6CCFF', status: 'joined' },
  { id: 'u8', name: '七七', c: '七', bg: '#4A2433', fg: '#F5B5C8', status: 'joined' },
  { id: 'u7', name: 'Momo', c: 'M', bg: '#24404A', fg: '#A6DDEB', status: 'pending' }
]

// 地点（演示用；正式使用时来自 uni.chooseLocation 的返回值）
export const VENUES = {
  north: { name: '城北桌游吧', address: '北京市海淀区学院路 37 号 2 层', latitude: 39.9918, longitude: 116.3537 },
  cedar: { name: '雪松桌游空间', address: '北京市东城区东四北大街 107 号', latitude: 39.9375, longitude: 116.417 },
  night: { name: '夜航棋牌俱乐部', address: '北京市朝阳区工体北路 8 号院 3 号楼', latitude: 39.934, longitude: 116.4466 },
  harbor: { name: '雾港会所', address: '北京市西城区西直门南小街 11 号', latitude: 39.9387, longitude: 116.3555 },
  jungle: { name: '丛林桌游馆', address: '北京市丰台区丽泽路 18 号', latitude: 39.866, longitude: 116.311 }
}

// 创建比赛页 · 默认草稿
export const createDraft = {
  cover: 'wild',
  name: '周五德扑锦标赛',
  hour: 19,
  minute: 0,
  cap: 27,
  intro: '每周五晚的常规赛，第 7 级结束后休息 15 分钟，复活同时截止。新朋友也欢迎来。',
  isPublic: true,
  autoApprove: true,
  location: VENUES.north
}

// 创建比赛页 · 比赛方案（整场比赛的设置模板，不含日期），最多 5 个
export const matchTemplateSeeds = [
  {
    id: 't1', name: '周五常规赛',
    data: { cover: 'fog', name: '周五德扑锦标赛', blindId: 'b1', hour: 19, minute: 0, cap: 27, intro: '每周五晚的常规赛，第 7 级结束后休息 15 分钟，复活同时截止。新朋友也欢迎来。', isPublic: true, autoApprove: true, location: VENUES.north },
    hosts: [coHostSeeds[0], coHostSeeds[1]]
  },
  {
    id: 't2', name: '深筹练习赛',
    data: { cover: 'snow', name: '周日深筹练习赛', blindId: 'b2', hour: 14, minute: 0, cap: 18, intro: '慢节奏练习局，适合新手熟悉盲注结构。', isPublic: false, autoApprove: false, location: VENUES.cedar },
    hosts: []
  }
]

// 分享落地页 · 演示用比赛（链接里没有 id 或找不到时使用）
const person = (p) => ({ name: p.name, c: p.c, bg: p.bg, fg: p.fg })
export function makeDemoMatch() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7))
  start.setHours(19, 0, 0, 0)
  const meP = { name: me.nickname, c: me.char, bg: '#F1E4D3', fg: '#8A1C1C' }
  return {
    id: 'demo',
    server: '周五桌游夜',
    cover: 'wild',
    coverImage: '',
    name: '周五德扑锦标赛',
    blindName: blindSchemeSeeds[0].name,
    blindRows: JSON.parse(JSON.stringify(blindSchemeSeeds[0].rows)),
    startAt: start.getTime(),
    cap: 27,
    intro: createDraft.intro,
    isPublic: true,
    autoApprove: true,
    location: VENUES.north,
    inviter: meP,
    hosts: [{ ...meP, role: 'owner' }, { ...person(coHostSeeds[0]), role: 'cohost' }, { ...person(coHostSeeds[1]), role: 'cohost' }],
    participants: room.seats.map(person)
  }
}
