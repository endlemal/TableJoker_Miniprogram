// 由 tools/build_fonts.py 生成：ZZDisplay 子集包含的字
export const ZZ_DISPLAY_CHARS = '比赛骰子先生创建周五德扑锦标赛广场城市桌游节新手训练营周边小店血月深夜赛体验局雾港深筹丛林猎手挑战狼人杀点亮认证标识平台审核中已未通过核心权益功能特权价值清晰可见流程常见问题赛事配置设备个性化主办方工作台待我的服务0123456789'
export const fitsDisplay = (text) => !!text && [...String(text)].every((ch) => ch === " " || ZZ_DISPLAY_CHARS.includes(ch))
