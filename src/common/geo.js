// 位置和城市：距离（公里）、当前城市、用户的大致位置（广场的赛事和主办方用）。
// 用户位置用模糊定位（getFuzzyLocation，精度约 1 公里，已在 manifest 声明），算距离足够，不需要精确定位
import { CITIES } from '../mock/venues.js'

const KEY = 'zz_city'
const R = 6371
const rad = (d) => (d * Math.PI) / 180
export function distanceKm(a, b) {
  if (!a || !b) return null
  const dLat = rad(b.latitude - a.latitude)
  const dLng = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const fmtKm = (km) => (km == null ? '' : km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`)
export const cityOf = (name) => CITIES.find((c) => c.name === name) || null
// 资料里的城市（「上海市」）换成城市列表里的名字（「上海」）
export const normCity = (s) => String(s || '').replace(/市$/, '')

// 当前城市：资料里的城市（在支持的城市里），没有就是北京。广场不再提供切换城市（其他城市的内容用搜索找）。
// 上一版切换城市时存下的选择会被清掉，免得停在某个城市回不来
export function currentCity() {
  if (uni.getStorageSync(KEY)) uni.removeStorageSync(KEY)
  const prof = uni.getStorageSync('zz_profile')
  const mine = normCity(prof && prof.city)
  return cityOf(mine) ? mine : CITIES[0].name
}
// 用户的大致位置：小程序里用模糊定位，拿不到（拒绝授权、H5）就返回 null；同一次打开只问一次
let posCache
export function userPosition() {
  if (posCache !== undefined) return Promise.resolve(posCache)
  return new Promise((resolve) => {
    const done = (p) => { posCache = p; resolve(p) }
    // #ifdef MP-WEIXIN
    if (typeof uni.getFuzzyLocation === 'function') {
      uni.getFuzzyLocation({ type: 'wgs84', success: (r) => done({ latitude: r.latitude, longitude: r.longitude }), fail: () => done(null) })
      return
    }
    // #endif
    done(null)
  })
}
// 算距离的起点：人就在这个城市就从自己的位置算，否则从城市中心算
export function originFor(cityName, pos) {
  const city = cityOf(cityName) || CITIES[0]
  if (pos && distanceKm(pos, city.center) < 80) return { ...pos, mine: true }
  return { ...city.center, mine: false }
}
// 比赛地点在哪个城市：地点带了 city 就用它，否则从地址开头取（「北京市…」→ 北京）
export function cityOfLocation(loc) {
  if (!loc) return ''
  if (loc.city) return normCity(loc.city)
  const m = String(loc.address || '').match(/^(.{2,3}?)市/)
  return m ? m[1] : ''
}
