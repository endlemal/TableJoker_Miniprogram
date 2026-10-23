// 海报广告和遥控预览共用同一套原图尺寸、铺盖方式与电视分辨率。
import { svgUri } from './svg.js'
import { coverArt, COVER_SIZES } from './cover-art.js'

const MODES = ['center', 'aspectFill', 'aspectFit', 'scaleToFill']
const srcCache = {}
export const posterFit = (group) => MODES.includes(group && group.fit) ? group.fit : 'aspectFill'
export function posterImageSize(image) {
  if (image.src) return { w: Number(image.w) || 1920, h: Number(image.h) || 1080 }
  const size = COVER_SIZES[image.size] || COVER_SIZES.wide
  return { w: size.w * 3, h: size.h * 3 }
}
export function posterImageSrc(image, mode) {
  if (image.src) return image.src
  const stretch = mode === 'scaleToFill'
  const key = `${image.scene}/${image.size || 'wide'}/${stretch}`
  if (!srcCache[key]) {
    const svg = coverArt(image.scene, image.size || 'wide')
    srcCache[key] = svgUri(stretch ? svg.replace('<svg ', '<svg preserveAspectRatio="none" ') : svg)
  }
  return srcCache[key]
}
export function screenResolution(resolution) {
  const w = Number(resolution && resolution.w)
  const h = Number(resolution && resolution.h)
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { w, h } : { w: 3840, h: 2160 }
}
export const posterResolution = (group, deviceResolution) => screenResolution((group && group.tvRatio) || deviceResolution)
export function fitScreen(resolution, maxW, maxH) {
  const { w, h } = screenResolution(resolution)
  const scale = Math.min(maxW / w, maxH / h)
  return { w: w * scale, h: h * scale }
}
