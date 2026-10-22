// 设备管理 · 演示数据：已经绑定的大屏（电视上装的「桌趣大屏计时器」）
const HOUR = 3600 * 1000
const DAY = 24 * HOUR

export function seedDevices(now = Date.now()) {
  return [
    { id: 'd1', tvId: 'TV-7F3A', name: '1 号桌大屏', model: '小米电视 ES55', resolution: { w: 3840, h: 2160 }, app: '大屏计时器 v1.2.0', pairedAt: now - 6 * DAY, lastSeen: now, alive: true, showing: 'timer', showingText: '周五深筹码大师赛 · 计时器', coverScene: 'fog' },
    { id: 'd2', tvId: 'TV-21C8', name: '前台大屏', model: '海信 E5K 65', resolution: { w: 1920, h: 1080 }, app: '大屏计时器 v1.2.0', pairedAt: now - 12 * DAY, lastSeen: now, alive: true, showing: 'poster', showingText: '海报轮播', coverScene: 'clocktower' },
    { id: 'd4', tvId: 'TV-4C1E', name: '决赛桌大屏', model: '创维 A5D 65', resolution: { w: 3840, h: 2160 }, app: '大屏计时器 v1.2.0', pairedAt: now - 2 * DAY, lastSeen: now, alive: true, showing: 'checkin', showingText: '签到墙 · 周五深筹码大师赛', coverScene: 'jungle' },
    { id: 'd3', tvId: 'TV-9B04', name: '2 号桌大屏', model: 'TCL T7H 55', resolution: { w: 3840, h: 2160 }, app: '大屏计时器 v1.1.4', pairedAt: now - 20 * DAY, lastSeen: now - 3 * HOUR, alive: false, showing: '', showingText: '', coverScene: 'snow' }
  ]
}

// 配对成功后识别出的电视型号（正式环境由电视上的计时器软件上报）
export const TV_MODELS = ['小米电视 ES55', '海信 E5K 65', 'TCL T7H 55', '创维 A5D 65', '华为智慧屏 SE 55']

// 演示环境唯一能配对成功的配对码；其余 6 位数字都模拟「找不到这台大屏」
export const PAIR_CODE = '123456'

// 起名时的快捷选项，选中后会补成「xx大屏」
export const NAME_CHIPS = ['1 号桌', '2 号桌', '3 号桌', '决赛桌', '前台']
