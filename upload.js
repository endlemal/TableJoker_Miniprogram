const ci = require('miniprogram-ci');
const path = require('path');

// 1. 初始化项目信息
const project = new ci.Project({
  appid: 'wx504147cdaf2620d3',
  type: 'miniProgram',
  projectPath: path.resolve(__dirname, './dist/dev/mp-weixin'), 
  privateKeyPath: path.resolve(__dirname, './private.wx504147cdaf2620d3.key'),
  ignores: ['node_modules/**/*'],
});

// 2. 执行上传
async function runUpload() {
  try {
    const uploadResult = await ci.upload({
      project,
      version: '1.0.1', // 体验版版本号
      desc: 'CI 自动上传体验版', // 版本描述
      setting: {
        es6: true,        // 对应开发工具的 ES6 转 ES5
        es7: true,        // 对应增强编译
        minify: true,     // 上传时压缩代码
        autoPrefixWXSS: true, // 上传时样式自动补全
      },
      robot: 1, // CI 机器人编号 (1-30)，方便区分上传来源
      onProgressUpdate: (res) => {
        console.log(`上传进度: ${res._status}`);
      },
    });

    console.log('✅ 上传成功！', uploadResult);
  } catch (error) {
    console.error('❌ 上传失败：', error);
    process.exit(1);
  }
}

runUpload();