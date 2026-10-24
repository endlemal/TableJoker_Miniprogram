// 页内扫码：在当前页面弹出居中的扫码弹窗（components/SciFiScannerModal），不跳转全屏扫码页。
// 用法：
//   1. 页面模板里放一个 <SciFiScannerModal />。一个页面放一个就够了：弹窗里有 <camera>，同一页面只能有一个 camera
//   2. const res = await openScanner({ title, hint, validate, manualText, demo })
//      - res 为 null：用户关掉了弹窗
//      - res.manual 为 true：用户点了「手动输入」那个按钮（manualText 是按钮文字，不传就不显示）
//      - 其余情况：res.result 是扫到的内容，res.type 是码的类型
//   validate(result) 返回 true 表示收下；返回一段文字表示这个码不对，弹窗里提示这段话，继续扫
//   demo：H5 预览没有摄像头，「模拟扫码」时用它当扫到的内容
// 页面里没放弹窗组件时，会退回系统的全屏扫码
import { reactive } from 'vue'

export const scanner = reactive({ open: false, owner: 0, opts: {}, seq: 0 })
let pending = null
let uid = 0
const ids = new WeakMap()
const registered = new Set()

// 每个页面实例一个编号：弹窗只出现在发起扫码的那个页面上
export function pageId() {
  const ps = getCurrentPages()
  const p = ps[ps.length - 1]
  if (!p) return 0
  if (!ids.has(p)) ids.set(p, ++uid)
  return ids.get(p)
}
export const registerScanner = (id) => registered.add(id)
export const unregisterScanner = (id) => registered.delete(id)

export function openScanner(opts = {}) {
  if (pending) finishScan(null)
  const owner = pageId()
  if (!registered.has(owner)) return systemScan(opts)
  return new Promise((resolve) => {
    pending = resolve
    scanner.opts = opts
    scanner.owner = owner
    scanner.seq += 1
    scanner.open = true
  })
}

export function finishScan(value) {
  const r = pending
  pending = null
  scanner.open = false
  if (r) r(value)
}

// 退回系统的全屏扫码（也是弹窗里「相册 / 系统扫码」用的）
export function systemScan(opts = {}) {
  return new Promise((resolve) => {
    uni.scanCode({
      onlyFromCamera: false,
      success: (r) => {
        const v = opts.validate ? opts.validate(r.result, r) : true
        if (v === true) return resolve({ result: r.result, type: r.scanType })
        uni.showToast({ title: typeof v === 'string' ? v : '这个二维码用不了', icon: 'none' })
        resolve(null)
      },
      fail: () => resolve(null)
    })
  })
}

// 比赛二维码：分享落地页链接（带 id）、tj://match/<id>，或房间链接。认不出来返回空字符串
export function parseJoinTarget(text) {
  let s = String(text || '').trim()
  try { s = decodeURIComponent(s) } catch (e) {}
  const m = s.match(/^tj:\/\/match\/([\w-]+)/)
  if (m) return '/pages/invite/index?id=' + m[1]
  const id = s.match(/[?&]id=([\w-]+)/)
  // 小程序页面路径，或者票据二维码上的分享链接（…/s/invite?id=…）
  if ((/pages\/invite\/index/.test(s) || /\/s\/invite\b/.test(s)) && id) return '/pages/invite/index?id=' + id[1]
  if (/pages\/room\/index/.test(s) || /^tjroom:\/\//.test(s)) return '/pages/room/index'
  return ''
}
