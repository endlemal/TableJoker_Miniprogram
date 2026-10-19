// 定位：微信模糊定位 getFuzzyLocation（基础库 ≥ 2.25.0）。
// 接口只返回模糊经纬度（约 5km 精度），不返回省市名。
//
// 现阶段：拿到经纬度后直接转成「纬度, 经度」字符串回填城市字段，
// 用于真机验证「点击 → 授权 → 定位 → 回填」整条链路。
// TODO: 接入逆地理编码后，把 fuzzyToLabel 换成返回地级市名（如「深圳市」），
//       建议走后端代理调腾讯位置服务，key 不落地前端。

export const FUZZY_SCOPE = 'scope.userFuzzyLocation'

// 获取模糊位置。成功 resolve({ latitude, longitude })；失败 reject({ code, message })
export function fuzzyLocation() {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    if (typeof uni.getFuzzyLocation !== 'function') {
      reject({ code: 'unsupported', message: '当前微信版本过低，不支持模糊定位' })
      return
    }
    uni.getFuzzyLocation({
      type: 'gcj02',
      success: (res) => {
        if (res && typeof res.latitude === 'number' && typeof res.longitude === 'number') {
          resolve({ latitude: res.latitude, longitude: res.longitude })
        } else {
          reject({ code: 'empty', message: '没有拿到定位结果' })
        }
      },
      fail: (e) => reject({ code: 'fail', message: (e && e.errMsg) || '定位失败', err: e })
    })
    // #endif
    // #ifndef MP-WEIXIN
    reject({ code: 'unsupported', message: '当前环境不支持模糊定位' })
    // #endif
  })
}

// 临时：把定位结果转成写进城市字段的值（真机验证用）
export function fuzzyToLabel(res) {
  // TODO: 逆编码后返回城市名，如 '深圳市'
  const lat = Number(res.latitude || 0).toFixed(4)
  const lng = Number(res.longitude || 0).toFixed(4)
  return `${lat}, ${lng}`
}
