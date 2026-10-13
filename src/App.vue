<script>
export default {
  onLaunch() {}
}
</script>

<style>
@import './styles/fonts.css';

/* 主题色板：首页、个人主页沿用暗色主题；房间页的翻牌钟区域使用参考文件的站牌色板 */
page {
  --bg: #181A20;
  --surface: #1F222A;
  --elevated: #262A34;
  --muted: #35383F;
  --rail: #121419;
  --primary: #DC0000;
  --primary-pressed: #B80000;
  --primary-light: #FF4D4D;
  --primary-tint: rgba(220, 0, 0, 0.12);
  --primary-glow: rgba(220, 0, 0, 0.35);
  --text: #FFFFFF;
  --text-2: #9CA3AF;
  --text-3: #6B7280;
  --gold: #F4B740;
  --ivory: #F3EEE6;
  --board-black: #050505;
  --board-white: #F2F2EE;
  --print: #8F8F8A;
  --rule: #262626;
  --enamel: #1C4E9D;
  --go: #3FCF84;
  --warn: #FFC53A;
  --stop: #FF5646;
  --led-red: #FF3B30;
  --led-amber: #FFB22E;

  background: #181A20;
  color: #FFFFFF;
  font-family: "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  font-size: 28rpx;
  -webkit-font-smoothing: antialiased;
}
</style>
