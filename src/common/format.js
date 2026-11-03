// 各页面、组件共用的小工具：数字加千分位、补零、时:分、轻提示（原来在十几个文件里各写了一遍）
export const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
export const pad2 = (n) => (n < 10 ? '0' : '') + n
export const hhmm = (t) => { const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
export const toast = (title) => uni.showToast({ title, icon: 'none' })
