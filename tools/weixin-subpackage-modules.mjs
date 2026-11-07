import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { normalizePath } from 'vite'

// uni-app names local JS chunks after their source paths. Resolve these
// imports under the consuming subpackage so the compiler emits them there.
const packageModules = new Set([
  'common/blind-notes.js',
  'common/charts.js',
  'common/chips.js',
  'common/devices.js',
  'common/emoji.js',
  'common/heat.js',
  'common/host-art.js',
  'common/host-invite.js',
  'common/location.js',
  'common/poster-display.js',
  'common/posters.js',
  'common/qr.js',
  'common/regions.js',
  'common/room-chat.js',
  'common/room-ranking.js',
  'common/roster.js',
  'common/screens.js',
  'common/share-canvas.js',
  'common/share-card.js',
  'common/tally-labels.js',
  'common/tally-room.js',
  'common/tally.js',
  'common/vendor/qrcode.js',
  'mock/devices.js',
  'mock/login.js',
  'mock/posters.js',
  'mock/remote.js',
  'mock/workbench.js',
])

export default function weixinSubpackageModules() {
  const copies = new Map()
  let inputDir
  let roots

  function scopedId(file, importer) {
    if (!importer) return
    const root = copies.get(importer)?.root || roots.find(prefix => importer.startsWith(prefix))
    const name = normalizePath(relative(inputDir, file))
    if (!root || !packageModules.has(name)) return

    // Shared modules use constants or storage for shared data.
    // Room state is imported only by the room subpackage.
    const id = `${root}scoped/${name}`
    copies.set(id, { file, root })
    return id
  }

  return {
    name: 'weixin-subpackage-modules',
    enforce: 'pre',
    apply: () => process.env.UNI_PLATFORM === 'mp-weixin',
    config: {
      order: 'post',
      handler() {
        inputDir = normalizePath(process.env.UNI_INPUT_DIR)
        // uni-app resolves @ imports in its own alias hook, before resolveId.
        return {
          resolve: {
            alias: [...packageModules].map(name => ({
              find: `@/${name}`,
              replacement: `${inputDir}/${name}`,
              customResolver: (file, importer) => scopedId(file, importer) || file,
            })),
          },
        }
      },
    },
    configResolved(config) {
      const output = config.build.rollupOptions.output
      const originalChunks = output.manualChunks
      // The home page uses the demo flag. Keep the shared config with the
      // app vendor so release minification cannot leave an empty JS chunk.
      output.manualChunks = (id, context) => id === `${inputDir}/common/config.js`
        ? 'common/vendor'
        : originalChunks(id, context)
    },
    buildStart() {
      const pages = JSON.parse(readFileSync(resolve(inputDir, 'pages.json'), 'utf8'))
      roots = (pages.subPackages ?? []).map(({ root }) => `${inputDir}/${root}/`)
    },
    resolveId(source, importer) {
      if (!importer) return
      const copy = copies.get(importer)
      const originalImporter = copy?.file || importer.split('?')[0]
      const file = source.startsWith('.') ? resolve(dirname(originalImporter), source) : source
      if (!isAbsolute(file)) return
      const id = scopedId(file, importer)
      if (id) return id

      // Relative imports in a scoped module still resolve from its source.
      if (copy && source.startsWith('.')) return this.resolve(file, originalImporter, { skipSelf: true })
    },
    load(id) {
      const copy = copies.get(id)
      if (!copy) return
      this.addWatchFile(copy.file)
      return readFileSync(copy.file, 'utf8')
    },
  }
}
