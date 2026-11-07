// 主持人共同操作日志：这场比赛所有主持人（发起人和共同主持）做过的操作——谁、什么时候、做了什么。
// 只有主持人能看到；房间里给所有人看的系统消息仍然写「主持人…」，不显示是哪一位。
// 演示存在本机（zz_host_log，每场最多 500 条）；正式环境由服务端记录，主持人在日志页分页查看
const KEY = 'zz_host_log'
const MAX = 500
export const LOG_TYPES = {
  timer: { name: '计时', icon: 'clock' },
  request: { name: '申请', icon: 'user-check' },
  scene: { name: '现场', icon: 'speakerphone' },
  tally: { name: '记分', icon: 'abacus' },
  seats: { name: '座位', icon: 'armchair' }
}
const readAll = () => { try { const v = uni.getStorageSync(KEY); return v && typeof v === 'object' ? v : {} } catch (e) { return {} } }
const writeAll = (all) => { try { uni.setStorageSync(KEY, all) } catch (e) {} }
let seq = 0

// 演示：第一次打开时，先有几条其他主持人（老周、七七）之前的操作
function seeds(now) {
  const zhou = { name: '老周', c: '周', bg: '#3D3550', fg: '#D6CCFF' }
  const qq = { name: '七七', c: '七', bg: '#4A2433', fg: '#F5B5C8' }
  const at = (min) => now - min * 60000
  return [
    { id: 's1', at: at(128), host: zhou, type: 'timer', text: '开始了计时' },
    { id: 's2', at: at(96), host: qq, type: 'scene', text: '更新了公告：二楼洗手间在维修，请用一楼的' },
    { id: 's3', at: at(64), host: zhou, type: 'request', text: '通过了「阿杰」的加入申请' },
    { id: 's4', at: at(41), host: qq, type: 'timer', text: '把计时切到了第 6 级' },
    { id: 's5', at: at(12), host: zhou, type: 'scene', text: '重新抽了座位' }
  ]
}
export function hostLog(matchId) {
  const all = readAll()
  if (!all[matchId]) { all[matchId] = seeds(Date.now()); writeAll(all) }
  return all[matchId].slice().sort((a, b) => b.at - a.at)
}
// 记一条：host 是做这件事的主持人 { name, c, bg, fg }
export function logHost(matchId, host, type, text) {
  const all = readAll()
  const list = all[matchId] || seeds(Date.now())
  list.push({ id: 'l' + Date.now().toString(36) + (seq++), at: Date.now(), host: { name: host.name, c: host.c, bg: host.bg, fg: host.fg }, type, text })
  all[matchId] = list.slice(-MAX)
  writeAll(all)
}
