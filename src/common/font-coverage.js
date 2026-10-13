// 由 tools/build_fonts.py 生成：ZZDisplay 子集包含的字
export const ZZ_DISPLAY_CHARS = '比赛骰子先生创建周五德扑锦标赛0123456789'
export const fitsDisplay = (text) => !!text && [...String(text)].every((ch) => ch === " " || ZZ_DISPLAY_CHARS.includes(ch))
