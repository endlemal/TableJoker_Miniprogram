// 广场 · 演示数据：公开赛事、带封面的帖子、海报广告。接后端时按同样字段替换。
import { makeDemoMatch, coverScenes, VENUES } from './data.js'

const DAY = 86400000
const at = (dayOffset, h, m = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}
const people = (n) => makeDemoMatch().participants.concat(makeDemoMatch().participants).slice(0, n)

// 公开赛事：字段与分享落地页一致，点进去直接展示对应的比赛
const variant = (over) => ({ ...makeDemoMatch(), ...over })
export const publicMatches = [
  makeDemoMatch(),
  variant({ id: 'pm-night', name: '血月深夜赛', cover: 'blood', location: VENUES.night, startAt: at(4, 22), cap: 18, participants: people(8), intro: '十点开局的深夜场，节奏快，盲注每级 15 分钟。' }),
  variant({ id: 'pm-newbie', name: '新手德扑体验局', cover: 'snow', location: VENUES.cedar, startAt: at(5, 14), cap: 18, participants: people(4), intro: '第一次玩德扑也能来，开局前会把规则讲一遍。' }),
  variant({ id: 'pm-fog', name: '雾港深筹赛', cover: 'fog', location: VENUES.harbor, startAt: at(4, 19, 30), cap: 27, participants: people(18).concat(people(3)), intro: '深筹慢节奏，适合想多打几手的朋友。' }),
  variant({ id: 'pm-jungle', name: '丛林猎手挑战赛', cover: 'jungle', location: VENUES.jungle, startAt: at(6, 20), cap: 18, participants: people(6), autoApprove: false, intro: '邀请制挑战赛，报名后由主持人审核。' })
]
// 主办方自己办的比赛（工作台「我的比赛」和房间列表）
export const hostMatches = [
  variant({ id: 'hm-deep', name: '周五深筹码大师赛', cover: 'fog', startAt: Date.now() - 95 * 60000, liveLevel: 3, cap: 27, participants: people(18), intro: '深筹慢节奏，盲注每级 25 分钟，适合想多打几手的朋友。' }),
  variant({ id: 'hm-hunter', name: '周末猎人锦标赛', cover: 'jungle', startAt: at(6, 20), cap: 18, participants: people(12), autoApprove: false, intro: '邀请制锦标赛，报名后由主办方审核。' }),
  variant({ id: 'hm-newbie', name: '周日新手体验局', cover: 'snow', startAt: at(7, 14), cap: 18, participants: people(5), intro: '第一次玩也能来，开局前会把规则讲一遍。' })
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
