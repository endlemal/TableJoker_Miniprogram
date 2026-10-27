// 广场 · 演示数据：公开赛事、带封面的帖子、海报广告。接后端时按同样字段替换。
import { makeDemoMatch, coverScenes, VENUES } from './data.js'
import { SH_VENUES } from './venues.js'

const DAY = 86400000
const at = (dayOffset, h, m = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}
// 演示的报名玩家：房间的 9 位座位玩家，加上 20 位补充玩家（人数多的比赛用）；超过 29 人时再循环
const MORE_PEOPLE = [['安然', '安', '#E3E9F5', '#2B4A7A'], ['北辰', '北', '#E8E1F3', '#4B2A7A'], ['程橙', '程', '#F6E3D3', '#7A3E12'], ['大卫', '卫', '#DDEFE6', '#1F5A3E'], ['二丫', '丫', '#F5DADF', '#7A1F33'],
  ['飞鱼', '鱼', '#D9ECF2', '#1F5468'], ['高远', '远', '#EDE6D6', '#5A4A1E'], ['海棠', '棠', '#F3DDE8', '#6E1F4B'], ['金石', '石', '#E1E4EA', '#3A4150'], ['柯南', '柯', '#E6EFD9', '#3E5A1E'],
  ['蓝鲸', '鲸', '#DCE6F2', '#1F3E6E'], ['陌上', '陌', '#EFE3D9', '#6E3A1F'], ['南风', '南', '#E3EFE6', '#1F5A33'], ['欧阳', '欧', '#F2E6DC', '#6E441F'], ['青柠', '柠', '#E9F2D9', '#4A5A1E'],
  ['若溪', '溪', '#DDEBF2', '#1F4E68'], ['苏打', '苏', '#F2DDE6', '#6E1F44'], ['唐果', '唐', '#F2E9D9', '#6E531F'], ['小满', '满', '#E6E3F2', '#3A2E6E'], ['夜白', '白', '#E1E1E6', '#33333F']]
  .map(([name, c, bg, fg]) => ({ name, c, bg, fg }))
const people = (n) => { const base = makeDemoMatch().participants.concat(MORE_PEOPLE); return Array.from({ length: n }, (_, i) => base[i % base.length]) }

// 公开赛事：字段与分享落地页一致，点进去直接展示对应的比赛
const variant = (over) => ({ ...makeDemoMatch(), ...over })
// 创建者：主办方（认证主办方创建，带 V 标识，可以有标签、规程）或玩家（普通用户自己约的局）
const HOST_NIGHT = { name: '夜航棋牌俱乐部', char: '夜', bg: '#2A2140', fg: '#C9B8FF', role: 'host' }
const HOST_FOG = { name: '雾港桌游会所', char: '雾', bg: '#1E3550', fg: '#BFD8F2', role: 'host' }
const PLAYER_SEN = { name: '阿森', char: '森', bg: '#E4E9D8', fg: '#3E5A1E', role: 'player' }
const PLAYER_KE = { name: '可乐', char: '可', bg: '#F3E6CF', fg: '#6B4A12', role: 'player' }
const HOST_BUND = { name: '外滩扑克会所', char: '滩', bg: '#3A1C1F', fg: '#F2A7A7', role: 'host' }
const HOST_JINGAN = { name: '静安牌局俱乐部', char: '静', bg: '#24404A', fg: '#A6DDEB', role: 'host' }
export const publicMatches = [
  { ...makeDemoMatch(), creatorRole: 'player', creator: PLAYER_SEN },
  variant({ id: 'pm-night', creatorRole: 'host', creator: HOST_NIGHT, name: '血月深夜赛', cover: 'blood', location: VENUES.night, startAt: at(4, 22), cap: 18, participants: people(8), intro: '十点开局的深夜场，节奏快，盲注每级 15 分钟。',
    tags: ['快速赛', '夜场常规赛'],
    rules: [{ level: 1, title: '赛制说明', body: '锦标赛制，起始筹码 20000，每级 15 分钟。' }, { level: 2, title: '截止报名', body: '第 6 级开始后截止报名。' }] }),
  variant({ id: 'pm-newbie', creatorRole: 'player', creator: PLAYER_KE, name: '新手德扑体验局', cover: 'snow', location: VENUES.cedar, startAt: at(5, 14), cap: 18, participants: people(4), intro: '第一次玩德扑也能来，开局前会把规则讲一遍。' }),
  variant({ id: 'pm-fog', creatorRole: 'host', creator: HOST_FOG, name: '雾港深筹赛', cover: 'fog', location: VENUES.harbor, startAt: at(4, 19, 30), cap: 27, participants: people(24), intro: '深筹慢节奏，适合想多打几手的朋友。',
    tags: ['深筹赛'] }),
  variant({ id: 'pm-jungle', creatorRole: 'player', creator: PLAYER_SEN, name: '丛林猎手挑战赛', cover: 'jungle', location: VENUES.jungle, startAt: at(6, 20), cap: 18, participants: people(6), autoApprove: false, intro: '邀请制挑战赛，报名后由主持人审核。' }),
  // 上海的公开赛（城市切换演示）
  variant({ id: 'pm-bund', creatorRole: 'host', creator: HOST_BUND, name: '外滩江景锦标赛', cover: 'iceberg', location: SH_VENUES.bund, startAt: at(1, 20), cap: 27, participants: people(23),
    tags: ['深筹赛'], blindRows: [{ t: 'L', sb: 100, bb: 200, ante: 0, min: 25 }, { t: 'L', sb: 200, bb: 400, ante: 50, min: 25 }, { t: 'B', min: 15 }, { t: 'L', sb: 300, bb: 600, ante: 75, min: 25 }] }),
  variant({ id: 'pm-jingan', creatorRole: 'host', creator: HOST_JINGAN, name: '静安新手快速赛', cover: 'clocktower', location: SH_VENUES.jingan, startAt: at(0, 21), cap: 18, participants: people(6),
    tags: ['快速赛'], blindRows: [{ t: 'L', sb: 50, bb: 100, ante: 0, min: 10 }, { t: 'L', sb: 100, bb: 200, ante: 25, min: 10 }, { t: 'C', min: 0 }, { t: 'L', sb: 200, bb: 400, ante: 50, min: 10 }] })
]
// 主办方自己办的比赛（工作台「我的比赛」和房间列表）。mine 表示演示里当前账号就是主办方，比赛邀请页显示主办方视图
export const hostMatches = [
  variant({ id: 'hm-deep', mine: true, creatorRole: 'host', roomCode: '518302', name: '周五深筹码大师赛', cover: 'fog', startAt: Date.now() - 95 * 60000, liveLevel: 3, cap: 27, participants: people(18), intro: '深筹慢节奏，盲注每级 25 分钟，适合想多打几手的朋友。' }),
  variant({ id: 'hm-hunter', mine: true, creatorRole: 'host', roomCode: '736941', name: '周末猎人锦标赛', cover: 'jungle', startAt: at(6, 20), cap: 18, participants: people(12), autoApprove: false, intro: '邀请制锦标赛，报名后由主办方审核。' }),
  variant({ id: 'hm-newbie', mine: true, creatorRole: 'host', roomCode: '204815', name: '周日新手体验局', cover: 'snow', startAt: at(7, 14), cap: 18, participants: people(5), intro: '第一次玩也能来，开局前会把规则讲一遍。' })
]
export const findPublicMatch = (id) => publicMatches.find((m) => m.id === id) || hostMatches.find((m) => m.id === id) || null

const AUTHORS = {
  lu: { name: '小鹿', c: '鹿', bg: '#2E4A3B', fg: '#A8E0C2' },
  zhou: { name: '老周', c: '周', bg: '#3D3550', fg: '#D6CCFF' },
  qq: { name: '七七', c: '七', bg: '#4A2433', fg: '#F5B5C8' },
  xiong: { name: '大熊', c: '熊', bg: '#3F3A2A', fg: '#E6D3A3' },
  jie: { name: '阿杰', c: '杰', bg: '#2A3550', fg: '#B5C7F2' },
  momo: { name: 'Momo', c: 'M', bg: '#24404A', fg: '#A6DDEB' },
  lin: { name: '阿林', c: '林', bg: '#3B4A6B', fg: '#C9D6FF' },
  q: { name: 'Q仔', c: 'Q', bg: '#4A2E1F', fg: '#F2C9A0' }
}

// 帖子：cover 是插画封面的 key（post 系列或环境场景），ratio = 宽 / 高
const post = (id, title, cover, ratio, author, likes, comments, minutesAgo, body, matchId) =>
  ({ kind: 'post', id, title, cover, ratio, author: AUTHORS[author], likes, comments, at: Date.now() - minutesAgo * 60000, body, matchId })
export const plazaPosts = [
  post('p1', '第一次打锦标赛，我学到的五件事', 'chess', 3 / 4, 'lu', 128, 23, 42, [
    '上周第一次报了周五的锦标赛，从第 1 级坐到第 9 级才出局，比想象中久。',
    '最大的收获是别急着全下。前几级盲注小，多看几圈，记住谁喜欢加注、谁只打大牌。',
    '另外，休息时间记得喝水，第 4 级以后脑子真的会累。'
  ]),
  post('p2', '周五锦标赛复盘：最后一手 A K', 'cards', 1, 'zhou', 256, 41, 120, [
    '决赛桌剩三个人，我在大盲拿到 A K，翻牌 A 7 2，转牌一张 K。',
    '对面一直跟注没有加注，河牌我选择了下注三分之二底池，被跟注，对方是 A 7。',
    '复盘时大家觉得转牌就该加大下注，给听牌的人更高的价格。'
  ], 'demo'),
  post('p3', '狼人杀新手怎么跳预言家', 'moonwood', 4 / 3, 'qq', 94, 17, 260, [
    '跳预言家最怕两件事：查验信息说不清，和被真预言家对跳时慌了。',
    '建议第一晚就想好要报的查验和理由，发言时先说结论，再说为什么。'
  ]),
  post('p4', '自制骰子收纳盒，成本 30 元', 'dice', 4 / 5, 'xiong', 312, 58, 380, [
    '用椴木板激光切割，内衬贴绒布，一格放一套骰子，盖子用磁吸。',
    '图纸放在评论区，需要的可以自取。'
  ]),
  post('p5', '记分牌颜色怎么分，才不会算错', 'chips', 3 / 4, 'jie', 76, 9, 520, [
    '我们局里的规则：白 25、红 100、金 500、黑 1000，颜色从浅到深面值越来越大。',
    '清小码的时候按颜色收，先换整，再把零头抽签决定。'
  ]),
  post('p6', '周末组局：城北桌游吧还有空位', 'meeple', 1, 'momo', 45, 12, 640, [
    '周六下午两点开始，四到六人，玩得比较轻松，新手友好。',
    '想来的在评论区报个名，我统一订位。'
  ]),
  post('p7', '雪夜里的深筹赛', 'snow', 4 / 3, 'lin', 88, 6, 900, [
    '下雪那天只来了八个人，干脆开成一桌深筹，从晚上七点打到凌晨一点。',
    '慢节奏真的很适合聊天，下次还想这么打。'
  ]),
  post('p8', '盲注结构怎么定：20 分钟一级够不够', 'clocktower', 3 / 4, 'q', 133, 37, 1300, [
    '我们试过 15、20、30 分钟三种，20 分钟一级大概六到七小时能打完 27 人。',
    '新手多的局建议前四级放慢，后面再加速。'
  ])
]

// 海报广告：link.type = page（小程序内页面）/ web（网页，需在公众平台配置业务域名）/ miniprogram（其他小程序）
// 官方完赛战报和俱乐部动态：也是帖子，type 区分（report 战报、club 俱乐部动态）
const OFFICIAL = { name: '桌趣官方', c: '桌', bg: '#DC0000', fg: '#FFFFFF', official: true }
const CLUB_NIGHT = { name: '夜航棋牌俱乐部', c: '夜', bg: '#2A2140', fg: '#C9B8FF', club: 'c-night' }
export const plazaReports = [
  { kind: 'post', type: 'report', id: 'r1', title: '血月深夜赛 · 完赛战报', cover: 'blood', ratio: 4 / 5, author: OFFICIAL, likes: 342, comments: 3, at: Date.now() - 5 * 3600000,
    body: ['18 位玩家打满 14 级，用时 4 小时 12 分。最后一手 A♥K♥ 对 Q♣Q♦，河牌一张 K 定了冠军。', '感谢夜航棋牌俱乐部提供场地。下一场血月深夜赛下周三开报名。'],
    report: { players: 18, levels: 14, duration: '4 小时 12 分', top: [{ rank: 1, name: '阿杰', c: '杰', bg: '#2A3550', fg: '#B5C7F2', note: '冠军 · 赛季积分 +120' }, { rank: 2, name: 'Momo', c: 'M', bg: '#24404A', fg: '#A6DDEB', note: '亚军 · 赛季积分 +80' }, { rank: 3, name: '大熊', c: '熊', bg: '#3F3A2A', fg: '#E6D3A3', note: '季军 · 赛季积分 +50' }] } },
  { kind: 'post', type: 'report', id: 'r2', title: '雾港深筹赛 · 完赛战报', cover: 'fog', ratio: 1, author: OFFICIAL, likes: 156, comments: 1, at: Date.now() - 30 * 3600000,
    body: ['27 人报名，24 人到场。深筹码结构打了 19 级，决赛桌持续了将近两个小时。'],
    report: { players: 24, levels: 19, duration: '6 小时 05 分', top: [{ rank: 1, name: '七七', c: '七', bg: '#4A2433', fg: '#F5B5C8', note: '冠军 · 赛季积分 +150' }, { rank: 2, name: '阿林', c: '林', bg: '#3B4A6B', fg: '#C9D6FF', note: '亚军 · 赛季积分 +100' }, { rank: 3, name: 'Q仔', c: 'Q', bg: '#4A2E1F', fg: '#F2C9A0', note: '季军 · 赛季积分 +60' }] } },
  { kind: 'post', type: 'club', id: 'k1', title: '本周三起夜场加开一桌', cover: 'moonwood', ratio: 3 / 4, author: CLUB_NIGHT, likes: 88, comments: 2, at: Date.now() - 9 * 3600000,
    body: ['报名的人越来越多，周三、周五的夜场常规赛各加开一桌，最多 27 人。', '新桌周三、周五晚上 7 点开，欢迎老朋友带新朋友来。'] }
]
// 评论种子（演示）：正式环境从服务端拉取
export const seedComments = {
  r1: [
    { id: 'cm1', author: AUTHORS.lin, text: '河牌那张 K 我在场边都喊出来了', likes: 24, at: Date.now() - 4 * 3600000 },
    { id: 'cm2', author: AUTHORS.q, text: '阿杰这周状态太好了，恭喜！', likes: 11, at: Date.now() - 3 * 3600000 },
    { id: 'cm3', author: AUTHORS.momo, text: '下次一定拿回冠军', likes: 30, at: Date.now() - 2 * 3600000 }
  ],
  r2: [{ id: 'cm4', author: AUTHORS.zhou, text: '深筹码打着就是舒服，节奏慢但很过瘾', likes: 8, at: Date.now() - 20 * 3600000 }],
  k1: [
    { id: 'cm5', author: AUTHORS.xiong, text: '终于不用排队了', likes: 6, at: Date.now() - 8 * 3600000 },
    { id: 'cm6', author: AUTHORS.jie, text: 'Mia 发牌超稳，推荐', likes: 9, at: Date.now() - 7 * 3600000 }
  ],
  p1: [{ id: 'cm7', author: AUTHORS.qq, text: '第四条太真实了，第 4 级以后真的会累', likes: 5, at: Date.now() - 30 * 60000 }]
}

export const plazaAds = [
  { kind: 'ad', id: 'ad1', theme: 'festival', title: '城市桌游节', sub: '10/24 至 10/25，城市展览馆', cta: '去看看', link: { type: 'web', url: 'https://example.com/boardgame-festival', title: '城市桌游节' } },
  { kind: 'ad', id: 'ad2', theme: 'camp', title: '新手训练营', sub: '零基础也能上桌，周日下午开课', cta: '免费报名', link: { type: 'page', url: '/pages/invite/index?id=pm-newbie' } },
  { kind: 'ad', id: 'ad3', theme: 'shop', title: '周边小店', sub: '定制记分牌、骰子和牌桌布', cta: '进入小程序', link: { type: 'miniprogram', appId: 'wx0000000000000000', path: 'pages/index/index' } }
]

// 下拉加载更多：在已有帖子的基础上换标题生成（演示用）
const EXTRA = ['桌布选绒面还是胶面', '新手局如何控制节奏', '复活规则到底怎么定', '一个人也能练的读牌法', '主办方怎么排座位最公平', '记录一次七小时的锦标赛']
export function morePosts(page) {
  return plazaPosts.slice(0, 6).map((p, i) => ({
    ...p,
    id: `${p.id}-${page}`,
    title: EXTRA[(i + page) % EXTRA.length],
    likes: Math.round(p.likes * (0.4 + ((i * 7 + page * 3) % 10) / 10)),
    at: p.at - page * DAY
  }))
}

export const sceneLine = (key) => coverScenes.find((c) => c.key === key) || coverScenes[0]
