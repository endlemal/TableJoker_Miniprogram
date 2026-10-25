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
// 认证俱乐部：场馆、营业时间、牌桌数和环境图（photos 是插画的种类：hall 大厅、bar 吧台、lounge 休息区、vip 包间）
const club = (id, name, venue, char, bg, fg, tone, extra) => ({ id, name, city: venue.city, venue, char, bg, fg, tone, certified: true, ...extra })
export const CLUBS = [
  club('c-night', '夜航棋牌俱乐部', VENUES.night, '夜', '#2A2140', '#C9B8FF', '#6B4FD8', { hours: '14:00 – 02:00', tables: 6, since: 2019, photos: ['hall', 'bar', 'vip'], intro: '工体旁的老牌俱乐部，夜场常规赛每周三、周五开。' }),
  club('c-fog', '雾港桌游会所', VENUES.harbor, '雾', '#1E3550', '#BFD8F2', '#3D7BFF', { hours: '13:00 – 24:00', tables: 4, since: 2021, photos: ['lounge', 'hall', 'bar'], intro: '安静的深筹码会所，适合打长局。' }),
  club('c-north', '城北桌游吧', VENUES.north, '北', '#2E2A1E', '#F0D9A0', '#C9A24A', { hours: '12:00 – 23:00', tables: 5, since: 2018, photos: ['hall', 'lounge'], intro: '学院路上的桌游吧，周五狼人杀和德扑都有。' }),
  club('c-jungle', '丛林桌游馆', VENUES.jungle, '丛', '#1C3326', '#A8E0C2', '#2E9E6A', { hours: '15:00 – 01:00', tables: 3, since: 2022, photos: ['bar', 'hall'], intro: '丽泽的新馆，周末有挑战赛。' }),
  club('c-bund', '外滩扑克会所', SH_VENUES.bund, '滩', '#3A1C1F', '#F2A7A7', '#DC0000', { hours: '16:00 – 03:00', tables: 8, since: 2017, photos: ['vip', 'hall', 'bar'], intro: '外滩边的扑克会所，江景包间可以约私局。' }),
  club('c-jingan', '静安牌局俱乐部', SH_VENUES.jingan, '静', '#24404A', '#A6DDEB', '#2BB3C0', { hours: '14:00 – 24:00', tables: 4, since: 2020, photos: ['lounge', 'hall'], intro: '商场里的俱乐部，新手友好。' }),
  club('c-pearl', '珠江夜航俱乐部', GZ_VENUES.pearl, '珠', '#2A2140', '#C9B8FF', '#6B4FD8', { hours: '15:00 – 02:00', tables: 5, since: 2023, photos: ['hall', 'bar'], intro: '珠江新城的俱乐部，近期还没有公开赛。' })
]
export const findClub = (id) => CLUBS.find((c) => c.id === id) || null
// 场馆名对应的俱乐部（比赛的地点是哪家俱乐部）
export const clubOfVenue = (venue) => (venue ? CLUBS.find((c) => c.venue.name === venue.name) || null : null)
