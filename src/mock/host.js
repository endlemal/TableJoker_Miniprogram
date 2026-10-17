// 平台认证页 · 演示数据。文案都是草稿，正式上线前请按平台规则定稿；状态和指标以后由后端下发。

// 当前账号的认证状态：none 未认证 / pending 审核中 / verified 已认证 / rejected 未通过
export const certStatus = { state: 'none' }

// title：面板开头的大标题；statusLine：标题下的一行状态；step：认证流程里当前走到的那一步
export const STATE_INFO = {
  none: { label: '未认证', title: '点亮认证标识', statusLine: '当前状态：未认证', cta: '立即认证', ctaIcon: 'rosette-discount-check', link: 'apply', step: 0 },
  pending: { label: '审核中', title: '认证审核中', statusLine: '10/13 14:20 提交，预计 1 个工作日内完成审核', cta: '查看进度', ctaIcon: 'hourglass', link: 'progress', step: 2 },
  verified: { label: '已认证', title: '认证标识已点亮', statusLine: '个人主办方，认证有效期至 2027/10/14', cta: '进入工作台', ctaIcon: 'layout-dashboard', link: 'workbench', step: 3 },
  rejected: { label: '未通过', title: '认证未通过', statusLine: '原因：营业执照照片不清晰，请重新拍摄后上传', cta: '重新认证', ctaIcon: 'refresh', link: 'apply', step: 2 }
}

// 每项权益都带「认证前 → 认证后」，原来的对比表合并进来了
export const benefits = [
  { key: 'badge', icon: 'rosette-discount-check', name: '认证标识', title: '专属认证标识', desc: '你的头像右下角会加上认证标识，主页和赛事卡片上都看得到，玩家一眼认出正规主办方。', before: '普通账号', after: '认证主办方', visual: 'avatar' },
  { key: 'exposure', icon: 'eye', name: '展示机会', title: '更多展示机会', desc: '公开赛优先进入广场「正在报名」，也有机会上首页推荐。', before: '基础主页', after: '认证主页' },
  { key: 'pro', icon: 'sparkles', name: '高级能力', title: '高级能力解锁', desc: '赛事、设备和个性化三类功能特权全部开放，详见下方「功能特权」。', before: '仅基础能力', after: '高级运营能力' },
  { key: 'data', icon: 'chart-dots', name: '数据中心', title: '数据中心', desc: '报名转化、到场率、回头玩家等 12 项数据，看清每场比赛办得怎么样。', before: '无数据中心', after: '数据中心' },
  { key: 'service', icon: 'headset', name: '专属客服', title: '专属客服', desc: '专属通道，工作日 2 小时内响应，比赛当天也能及时找到人。', before: '普通客服通道', after: '专属客服通道' }
]

// 功能特权：认证后解锁。三组颜色取自首屏海报：台呢绿、筹码蓝、橘猫橙
export const privileges = [
  {
    key: 'event', title: '赛事配置', icon: 'trophy', color: '#4CB582', tint: 'rgba(76, 181, 130, .14)',
    items: [
      { key: 'tables', name: '台桌管理', icon: 'layout-grid', desc: '按桌分配座位，随时合桌、拆桌，多桌比赛在一屏里掌握。' },
      { key: 'dealers', name: '荷官管理', icon: 'id-badge-2', desc: '给每张台桌指派荷官，记录换班，比赛当天不乱。' },
      { key: 'settle', name: '结算管理', icon: 'receipt', desc: '比赛结束后自动汇总名次和积分，颁奖记录一目了然。' }
    ]
  },
  {
    key: 'device', title: '设备配置', icon: 'device-desktop', color: '#7896DA', tint: 'rgba(120, 150, 218, .14)',
    items: [
      { key: 'remote', name: '遥控切屏', icon: 'device-remote', desc: '用手机遥控大屏，在计时、座位和排名之间切换。' },
      { key: 'bind', name: '设备绑定', icon: 'devices', desc: '扫码绑定大屏、计时器等设备，开赛前一键检查是否在线。' },
      { key: 'poster', name: '海报广告', icon: 'photo', desc: '在大屏和比赛页投放你的海报，休息时间自动轮播。' }
    ]
  },
  {
    key: 'style', title: '个性化配置', icon: 'sparkles', color: '#E39B4F', tint: 'rgba(227, 155, 79, .14)',
    items: [
      { key: 'medal', name: '周边勋章', icon: 'medal', desc: '为比赛定制专属勋章，玩家可以收藏和展示。' },
      { key: 'theme', name: '大屏主题', icon: 'palette', desc: '更换大屏的配色、背景和字体，贴合你的场馆风格。' },
      { key: 'award', name: '颁奖动画', icon: 'confetti', desc: '决出名次时，在大屏上播放颁奖动画。' },
      { key: 'legend', name: '筹码图例', icon: 'poker-chip', desc: '自定义记分牌的颜色和面值说明，开局前大家一看就懂。' }
    ]
  }
]

// 指标必须来自真实统计；这里是示例值
export const metrics = [
  { value: 35, decimals: 0, unit: '%', label: '认证账号曝光中位数提升' },
  { value: 1.2, decimals: 1, unit: '天', label: '平均审核时长' },
  { value: 12, decimals: 0, unit: '项', label: '认证后可查看数据指标' }
]
export const metricsNote = '示例数据：统计近 90 天，截至 2026 年 9 月'

export const steps = [
  { title: '准备资料', desc: '个人主办方准备身份证；桌游店、俱乐部等组织再准备营业执照或场馆证明。' },
  { title: '提交申请', desc: '在官网认证页填写资料并上传，大约需要 5 分钟。' },
  { title: '平台审核', desc: '平均 1.2 天，结果会通过微信服务通知告诉你。' },
  { title: '认证生效', desc: '认证标识立即点亮，高级能力和数据中心同步开放。' }
]

export const faqs = [
  { q: '哪些账号可以申请？', a: '已完成微信实名的个人主办方，以及桌游店、俱乐部、赛事机构等组织都可以申请。近 90 天内组织过比赛的账号，审核会更快。' },
  { q: '需要准备什么资料？', a: '个人主办方：身份证正反面和常用手机号。组织：营业执照或场馆经营证明、负责人身份证，以及 1 到 3 张场馆照片。' },
  { q: '审核需要多久？', a: '通常 1 个工作日内完成，平均 1.2 天；高峰期可能延长到 3 个工作日。审核结果会通过微信服务通知发给你。' },
  { q: '认证会过期吗？', a: '认证有效期 1 年。到期前 30 天会提醒你续期，续期时只需确认资料有没有变化，一般当天就能完成。' },
  { q: '审核失败怎么办？', a: '页面会显示没通过的原因。按提示修改资料后可以重新提交，次数不限；如果对结果有疑问，可以联系客服复核。' }
]

export const rules = [
  { title: '认证说明', text: '平台认证用来确认主办方的真实身份和组织能力。认证通过后，账号会获得认证标识，并开放更多展示机会和运营能力。' },
  { title: '申请条件', items: ['已完成微信实名认证', '近 90 天内没有违规记录', '以组织身份申请的，需要具备合法的经营资质'] },
  { title: '认证标识使用规范', items: ['认证标识只代表平台确认了主办方的身份，不代表平台为比赛结果或奖品提供担保', '不得把认证标识用于平台以外的宣传', '主体信息发生变化时，需要在 30 天内更新资料'] },
  { title: '违规处理', items: ['比赛不得涉及任何形式的赌博，不得把积分或筹码兑换成现金，一经发现立即撤销认证', '发布虚假比赛信息、冒用他人资料的，撤销认证，180 天内不能再次申请'] }
]
