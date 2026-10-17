// 主办方认证状态：none 未认证 / pending 审核中 / verified 已认证 / rejected 未通过
// 「主办方模式」就是已认证。演示版存在本地存储，由首页的「认证后模式」开关切换（连点首页左上角的标志 5 次），
// 切换后一直保持，直到再次连点 5 次退出。接后端后改为以接口返回为准。
//
// 以后独属于主办方的页面、功能、组件都以它为准：
// - 页面：在 onLoad 里调用 requireHost()，未认证会被送回平台认证页
// - 组件：用 <z-host-only> 包起来，只在主办方模式下渲染（可以给 fallback 插槽放普通玩家看到的内容）
// - 逻辑：useCertState() 返回会自动更新的状态，模式切换后已经打开的页面也会跟着变
import { ref, onUnmounted } from 'vue'
import { certStatus } from '@/mock/host.js'

const KEY = 'zz_cert_state'
const EVENT = 'cert-state-change'
export const CERT_STATES = ['none', 'pending', 'verified', 'rejected']

export function getCertState() {
  try {
    const v = uni.getStorageSync(KEY)
    if (CERT_STATES.includes(v)) return v
  } catch (e) {}
  return certStatus.state
}

export function setCertState(state) {
  if (!CERT_STATES.includes(state)) return
  try {
    uni.setStorageSync(KEY, state)
  } catch (e) {}
  uni.$emit(EVENT, state)
}

export const isVerified = () => getCertState() === 'verified'

// 认证后模式开关：on 为 true 进入（已认证），false 恢复为普通玩家
export function setHostMode(on) {
  setCertState(on ? 'verified' : 'none')
}

// 组件里用：返回一个 ref，模式切换时自动更新，组件卸载时自动取消监听
export function useCertState() {
  const state = ref(getCertState())
  const sync = (s) => { state.value = s }
  uni.$on(EVENT, sync)
  onUnmounted(() => uni.$off(EVENT, sync))
  return state
}

// 主办方专属页面的守卫：未认证时送回平台认证页，返回 false
export function requireHost() {
  if (isVerified()) return true
  uni.redirectTo({ url: '/pages/host/index' })
  return false
}
