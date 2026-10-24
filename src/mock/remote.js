// 遥控切屏 · 演示数据
// 主办方拥有的 TV 主题，cover 是主题的封面（大屏效果图，原图在 design/themes/）。房间的主题在创建比赛页设置
export const TV_THEMES = [
  { key: 'flip', name: '翻牌钟', desc: '机械翻片，一秒一变。', cover: '/static/themes/flip.jpg' },
  { key: 'night', name: '经典暗夜', desc: '红黑剧院，决赛现场。', cover: '/static/themes/night.jpg' },
  { key: 'dawn', name: '轻灵晨光', desc: '雪纸、冰面，一道晨光。', cover: '/static/themes/dawn.jpg' },
  { key: 'meridian', name: '子午线', desc: '整场赛程，一圈看完。', cover: '/static/themes/meridian.jpg' }
]
export const ROOM_THEME = 'flip'

// 操作说明
export const HELP = [
  { gesture: 'swipe', title: '左右滑动', text: '在设备画面或空白处滑动，切换大屏' },
  { gesture: 'dial', title: '转动罗盘', text: '选择投放分类，也可点击底部名称' },
  { gesture: 'tap', title: '轻触投放', text: '确认待投放内容，再点中央胶囊按键' },
  { gesture: 'hold', title: '长按休眠', text: '按住 1.4 秒；松手或滑出按键取消' },
  { gesture: 'pick', title: '点开内容详情', text: '选择海报组，或查看当前房间主题' }
]
