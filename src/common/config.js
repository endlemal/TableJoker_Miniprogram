// 订阅消息模板 ID：在微信公众平台「订阅消息」里申请「报名审核结果通知」后填入。
// 留空时跳过订阅授权，报名流程照常进行。
export const SUBSCRIBE_TMPL_ID = ''
// 报名成功后一次申请的订阅消息（一次最多 3 个模板）：开赛前 15 分钟提醒、报名审核通过、桌号座位分配。
// 在公众平台「订阅消息」里选好模板后填入；留空的不申请，全部留空时只做演示
export const SUBSCRIBE_TMPLS = { start: '', approved: '', seat: '' }

// 票据上的二维码：用微信「扫一扫」直接打开比赛邀请页。上线前在公众平台「开发管理 → 开发设置 →
// 扫普通链接二维码打开小程序」添加规则：二维码规则填 SHARE_LINK_BASE，功能页面填 pages/invite/index，
// 并把校验文件放到这个域名下。比赛邀请页会从 onLoad 的 q 参数里取出比赛 id。正式环境也可以改用服务端生成的小程序码
export const SHARE_LINK_BASE = 'https://tablejoker.example.com/s/'
export const shareLinkOf = (id) => `${SHARE_LINK_BASE}invite?id=${encodeURIComponent(id)}`

// 演示开关：true 时启用演示用的功能，上线前改成 false 统一关闭。包括：
//   房间：长按 Timer 跳到本级最后 15 秒、?role=player 预览玩家视角、模拟其他人发消息
//   记分工具：开局时的演示牌桌和机器人、机器人出分和收分、演示主持人自动指定赢家
//   首页：连点左上角标志 5 次切换主办方模式；成为主办方页：?state= 预览各个认证状态
// 关掉以后，这些数据和动作要由服务端提供（WebSocket 推送牌桌状态和消息，主持人在自己的手机上指定赢家）
export const DEMO_MODE = true
