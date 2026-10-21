// 海报广告 · 演示数据：三组海报，分别处在播放中、审核中、未通过三种状态
// 图片用封面插画代替（scene + size），真实上传的图片是 { src, w, h }
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const art = (scene, size) => ({ id: scene + '-' + size, scene, size })

export function seedGroups(now = Date.now()) {
  return [
    {
      id: 'g1', name: '周五深筹码大师赛', status: 'live', liveOn: ['d1', 'd2'], renderedFor: '3840×2160',
      fit: 'aspectFill', dwell: 8, updatedAt: now - DAY,
      images: [art('fog', 'wide'), art('clocktower', 'wide'), art('blood', 'wide'), art('moonwood', 'wide'), art('iceberg', 'wide')]
    },
    {
      id: 'g2', name: '周末猎人锦标赛', status: 'reviewing', reviewEndsAt: now + 20 * 1000,
      fit: 'aspectFit', dwell: 8, updatedAt: now - 2 * HOUR,
      images: [art('jungle', 'portrait'), art('wild', 'share'), art('storm', 'square')]
    },
    {
      id: 'g3', name: '新春现金赛', status: 'rejected', reason: '名称里出现了涉赌字样「现金」，修改后重新提交',
      fit: 'aspectFill', dwell: 5, updatedAt: now - 3 * DAY,
      images: [art('snow', 'wide'), art('abyss', 'square')]
    }
  ]
}
