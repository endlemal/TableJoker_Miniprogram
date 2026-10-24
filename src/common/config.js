// 订阅消息模板 ID：在微信公众平台「订阅消息」里申请「报名审核结果通知」后填入。
// 留空时跳过订阅授权，报名流程照常进行。
export const SUBSCRIBE_TMPL_ID = ''
// 报名成功后一次申请的订阅消息（一次最多 3 个模板）：开赛前 15 分钟提醒、报名审核通过、桌号座位分配。
// 在公众平台「订阅消息」里选好模板后填入；留空的不申请，全部留空时只做演示
export const SUBSCRIBE_TMPLS = { start: '', approved: '', seat: '' }

// 平台认证：官网认证入口（示例地址）。上线前换成正式地址，并在公众平台「开发管理 → 开发设置 → 业务域名」里配置
export const CERTIFY_WEB = {
  apply: 'https://example.com/host/certify',
  progress: 'https://example.com/host/certify/progress',
  manage: 'https://example.com/host/certify/manage'
}
// 个人主体的小程序不能使用 web-view；改成 false 后，按钮会复制链接，提示用户在浏览器打开
export const WEBVIEW_ENABLED = true
