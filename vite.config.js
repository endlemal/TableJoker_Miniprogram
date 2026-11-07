import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import weixinSubpackageModules from './tools/weixin-subpackage-modules.mjs'

export default defineConfig({
  plugins: [
    uni(),
    weixinSubpackageModules(),
  ],
})
