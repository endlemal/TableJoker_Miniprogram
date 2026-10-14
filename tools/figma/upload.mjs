// 把本地 SVG/图片按顺序 POST 到 Figma MCP `upload_assets` 返回的上传地址，输出「文件 → 节点 id」对照表
// 用法：node tools/figma/upload.mjs <urls.txt> <文件...>  > result.json
//   urls.txt：每行一个 submitUrl（upload_assets 返回的顺序），行数必须和文件数相同
//   文件名（去掉扩展名）会成为 Figma 里的图层名
// 说明：上传地址只能用一次、10 分钟后过期；upload_assets 一次最多给 60 个地址，超过就分批
import fs from 'node:fs'
import path from 'node:path'

const [urlFile, ...files] = process.argv.slice(2)
const urls = fs.readFileSync(urlFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
if (urls.length !== files.length) {
  console.error(`地址 ${urls.length} 个，文件 ${files.length} 个，数量不一致`)
  process.exit(1)
}

const TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }
const result = []
let failed = 0
for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const form = new FormData()
  form.append('file', new Blob([fs.readFileSync(file)], { type: TYPES[path.extname(file).toLowerCase()] }), path.basename(file))
  const res = await fetch(urls[i], { method: 'POST', body: form })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.success) failed++
  result.push({ file: path.basename(file), nodeId: body.placedOnNodeId || null, ok: !!body.success, error: body.success ? undefined : body })
  console.error(`${body.success ? 'ok  ' : 'FAIL'} ${path.basename(file)} ${body.placedOnNodeId || ''}`)
}
console.log(JSON.stringify(result, null, 2))
if (failed) process.exit(1)
