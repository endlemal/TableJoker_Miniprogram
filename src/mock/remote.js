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
  { icon: 'hand-move', title: '在空白处左右滑动', text: '在设备画面和罗盘以外的区域左右滑动，或点画面上方的左右箭头切换设备。两侧边缘保留手机返回手势；画面始终显示设备当前内容，切换设备会保留待投放选择。' },
  { icon: 'arrows-exchange', title: '拖动罗盘或点选图标', text: '青蓝刻度和银色指示针对齐时选中分类；左右拖动罗盘，或点击刻度内侧的分类图标、底部分类名称。中央玻璃胶囊按键显示当前分类，待投放摘要会说明即将发送的内容和目标大屏。' },
  { icon: 'hand-finger', title: '点击玻璃胶囊按键投放', text: '轻触投放图标发送指令；显示「已切换」表示设备状态已经确认，失败时可重试未完成的大屏。「休眠」需要长按 1.4 秒，松手或滑出按键就取消。' },
  { icon: 'photo', title: '轮播海报', text: '罗盘选中「轮播海报」后，点上方的海报组详情打开口袋文件夹，左下角是海报组名称，点一个就选中并收起；点空白处保持原来的选择。只有审核通过的海报组才能投放。' },
  { icon: 'palette', title: 'TV 主题', text: '罗盘选中「房间主题」后，点上方的主题详情浏览主题；房间的主题要在创建比赛页设置，遥控切屏投放的是房间当前的主题。' },
  { icon: 'filter', title: '筛选和大屏列表', text: '筛选按大屏正在显示的内容挑出要切换的大屏，再点一次或点别处收起；列表里点任意一台就切过去，也可以一键选中全部大屏一起投放。' }
]
