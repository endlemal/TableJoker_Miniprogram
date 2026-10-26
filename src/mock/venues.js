// 城市和认证俱乐部场馆 · 演示数据（城市切换、附近俱乐部地图、全局搜索都用这里）。接后端时按同样字段替换
import { VENUES } from './data.js'

// 城市中心：没有定位、或者看的不是自己所在的城市时，距离从城市中心算
export const CITIES = [
  { name: '北京', center: { latitude: 39.9087, longitude: 116.3975 } },
  { name: '上海', center: { latitude: 31.2304, longitude: 121.4737 } },
  { name: '广州', center: { latitude: 23.1291, longitude: 113.2644 } },
  { name: '深圳', center: { latitude: 22.5431, longitude: 114.0579 } },
  { name: '杭州', center: { latitude: 30.2741, longitude: 120.1551 } },
  { name: '成都', center: { latitude: 30.5728, longitude: 104.0668 } }
]
export const SH_VENUES = {
  bund: { name: '外滩扑克会所', address: '上海市黄浦区中山东一路 18 号 5 层', latitude: 31.2397, longitude: 121.4905, city: '上海' },
  jingan: { name: '静安牌局俱乐部', address: '上海市静安区南京西路 1266 号恒隆广场 3 层', latitude: 31.2296, longitude: 121.4537, city: '上海' }
}
const GZ_VENUES = {
  pearl: { name: '珠江夜航俱乐部', address: '广州市天河区花城大道 85 号高德置地 2 层', latitude: 23.1192, longitude: 113.3277, city: '广州' }
}
// 点评的作者（演示）
const R = {
  lin: { name: '阿林', c: '林', bg: '#3B4A6B', fg: '#C9D6FF' }, q: { name: 'Q仔', c: 'Q', bg: '#4A2E1F', fg: '#F2C9A0' },
  momo: { name: 'Momo', c: 'M', bg: '#24404A', fg: '#A6DDEB' }, xiong: { name: '大熊', c: '熊', bg: '#3F3A2A', fg: '#E6D3A3' },
  jie: { name: '阿杰', c: '杰', bg: '#2A3550', fg: '#B5C7F2' }, lu: { name: '小鹿', c: '鹿', bg: '#2E4A3B', fg: '#A8E0C2' },
  zhou: { name: '老周', c: '周', bg: '#3D3550', fg: '#D6CCFF' }, qq: { name: '七七', c: '七', bg: '#4A2433', fg: '#F5B5C8' }
}
const DAY = 86400000
const review = (id, author, stars, text, daysAgo) => ({ id, author: R[author], stars, text, at: Date.now() - daysAgo * DAY })
// 认证俱乐部（主办方的店铺）：场馆、营业时间、牌桌数、入驻日期、环境图（photos 是插画的种类：hall 大厅、bar 吧台、lounge 休息区、vip 包间）、
// 点评和自己的频道。ratio 是瀑布流里封面的宽高比
const club = (id, name, venue, char, bg, fg, tone, extra) => {
  const reviews = extra.reviews || []
  // 评分和点评数：演示里按点评的星级算平均分，点评数在此基础上放大（真实数据由服务端给）
  const rating = reviews.length ? Math.round((reviews.reduce((a, r) => a + r.stars, 0) / reviews.length) * 10) / 10 : 0
  return { id, name, city: venue.city, venue, char, bg, fg, tone, certified: true, rating, reviewCount: reviews.length ? reviews.length * 23 + (id.length % 7) : 0,
    channel: { id: 'ch-' + id, name, icon: 'cards', bg, fg, club: id }, ...extra, reviews }
}
export const CLUBS = [
  club('c-night', '夜航棋牌俱乐部', VENUES.night, '夜', '#2A2140', '#C9B8FF', '#6B4FD8', { hours: '14:00 – 02:00', tables: 6, since: 2019, joinedAt: '2023-03-18', area: '朝阳区', ratio: 3 / 4, photos: ['hall', 'bar', 'vip'], intro: '工体旁的老牌俱乐部，夜场常规赛每周三、周五开。',
    reviews: [review('rv1', 'jie', 5, '荷官发牌又快又稳，夜场氛围很好，周五人多要早点报名。', 3), review('rv2', 'momo', 5, '包间很安静，适合约朋友打私局。', 9), review('rv3', 'xiong', 4, '饮品种类多，就是周末停车有点难。', 16)] }),
  club('c-fog', '雾港桌游会所', VENUES.harbor, '雾', '#1E3550', '#BFD8F2', '#3D7BFF', { hours: '13:00 – 24:00', tables: 4, since: 2021, joinedAt: '2023-08-02', area: '西城区', ratio: 1, photos: ['lounge', 'hall', 'bar'], intro: '安静的深筹码会所，适合打长局。',
    reviews: [review('rv4', 'qq', 5, '深筹码结构打得很舒服，决赛桌体验一流。', 2), review('rv5', 'lin', 4, '环境安静，椅子坐久了也不累。', 12)] }),
  club('c-north', '城北桌游吧', VENUES.north, '北', '#2E2A1E', '#F0D9A0', '#C9A24A', { hours: '12:00 – 23:00', tables: 5, since: 2018, joinedAt: '2022-11-20', area: '海淀区', ratio: 4 / 5, photos: ['hall', 'lounge'], intro: '学院路上的桌游吧，周五狼人杀和德扑都有。',
    reviews: [review('rv6', 'lu', 5, '学生友好，新手局老板会耐心讲规则。', 5), review('rv7', 'q', 4, '狼人杀和德扑都能玩，周五晚上很热闹。', 20)] }),
  club('c-jungle', '丛林桌游馆', VENUES.jungle, '丛', '#1C3326', '#A8E0C2', '#2E9E6A', { hours: '15:00 – 01:00', tables: 3, since: 2022, joinedAt: '2024-04-09', area: '丰台区', ratio: 3 / 4, photos: ['bar', 'hall'], intro: '丽泽的新馆，周末有挑战赛。',
    reviews: [review('rv8', 'zhou', 4, '新店装修不错，挑战赛的奖品很用心。', 7)] }),
  club('c-bund', '外滩扑克会所', SH_VENUES.bund, '滩', '#3A1C1F', '#F2A7A7', '#DC0000', { hours: '16:00 – 03:00', tables: 8, since: 2017, joinedAt: '2023-01-06', area: '黄浦区', ratio: 3 / 4, photos: ['vip', 'hall', 'bar'], intro: '外滩边的扑克会所，江景包间可以约私局。',
    reviews: [review('rv9', 'momo', 5, '江景包间太值了，锦标赛组织得很专业。', 4), review('rv10', 'jie', 5, '荷官和服务都很到位。', 11), review('rv11', 'lin', 4, '价格偏高，但体验对得起。', 25)] }),
  club('c-jingan', '静安牌局俱乐部', SH_VENUES.jingan, '静', '#24404A', '#A6DDEB', '#2BB3C0', { hours: '14:00 – 24:00', tables: 4, since: 2020, joinedAt: '2024-02-14', area: '静安区', ratio: 1, photos: ['lounge', 'hall'], intro: '商场里的俱乐部，新手友好。',
    reviews: [review('rv12', 'lu', 5, '快速赛节奏很适合下班后来一局。', 6)] }),
  club('c-pearl', '珠江夜航俱乐部', GZ_VENUES.pearl, '珠', '#2A2140', '#C9B8FF', '#6B4FD8', { hours: '15:00 – 02:00', tables: 5, since: 2023, joinedAt: '2024-06-30', area: '天河区', ratio: 4 / 5, photos: ['hall', 'bar'], intro: '珠江新城的俱乐部，近期还没有公开赛。', reviews: [] })
]
export const findClub = (id) => CLUBS.find((c) => c.id === id) || null
export const clubOfChannel = (channelId) => CLUBS.find((c) => c.channel.id === channelId) || null
// 场馆名对应的俱乐部（比赛的地点是哪家俱乐部）
export const clubOfVenue = (venue) => (venue ? CLUBS.find((c) => c.venue.name === venue.name) || null : null)
