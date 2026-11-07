const { existsSync, readFileSync, statSync } = require('node:fs')
const { resolve } = require('node:path')
const { parseArgs } = require('node:util')
const { appid } = require('./project.config.json')

async function runUpload() {
  const { values } = parseArgs({
    options: {
      version: { type: 'string' },
      desc: { type: 'string' },
      robot: { type: 'string' },
      'from-build': { type: 'boolean' },
      'for-trial': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
    },
  })
  const [date, time] = new Date().toISOString().replace(/[-:]/g, '').split('T')
  const version = (values.version ?? `${date.slice(2)}.${time.slice(0, 6)}`).trim()
  const forTrial = values['for-trial']
  const desc = values.desc ?? `CI 上传${forTrial ? '待设为体验版的开发版本' : '开发版'} ${version}`
  const robot = Number(values.robot ?? (forTrial ? 2 : 1))
  if (!version) throw new Error('请填写上传版本号')
  if (!Number.isInteger(robot) || robot < 1 || robot > 30) {
    throw new Error('机器人编号必须是 1 到 30 的整数')
  }

  const outputDir = values['from-build']
    ? process.env.UNI_OUTPUT_DIR || 'dist/build/mp-weixin'
    : 'dist/dev/mp-weixin'
  const projectPath = resolve(__dirname, outputDir)
  const projectConfig = resolve(projectPath, 'project.config.json')
  if (!existsSync(resolve(projectPath, 'app.json')) || !existsSync(projectConfig)) {
    throw new Error(`微信小程序构建产物不完整：${projectPath}`)
  }
  if (JSON.parse(readFileSync(projectConfig, 'utf8')).appid !== appid) {
    throw new Error('构建产物的 AppID 与项目配置不一致')
  }

  const privateKeyPath = resolve(__dirname, process.env.WECHAT_CI_PRIVATE_KEY_PATH || `private.${appid}.key`)
  if (!statSync(privateKeyPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error('找不到微信代码上传密钥，请设置 WECHAT_CI_PRIVATE_KEY_PATH')
  }

  console.log(`开发版 ${version} · 机器人 ${robot} · ${projectPath}`)
  console.log(`上传备注：${desc}`)
  if (values['dry-run']) {
    console.log('本地检查通过，未上传')
    return
  }

  const ci = require('miniprogram-ci')
  const project = new ci.Project({
    appid,
    type: 'miniProgram',
    projectPath,
    privateKeyPath,
    ignores: ['node_modules/**/*'],
  })
  const result = await ci.upload({
    project,
    version,
    desc,
    robot,
    setting: { es6: true, es7: true, minify: true, autoPrefixWXSS: true },
  })
  console.log('开发版上传成功', result.subPackageInfo || '')
  if (forTrial) {
    console.log(`请到微信公众平台的「版本管理 → 开发版本」找到机器人 ${robot} 上传的 ${version}，点击「设为体验版」。`)
  }
}

runUpload().catch(error => {
  console.error('开发版上传失败', error.message)
  process.exitCode = 1
})
