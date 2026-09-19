// Metro config.
//
// The easy-utils SDKs are consumed as TypeScript source (their package `main`
// points at `src/index.ts`), and they use ESM `.js` import specifiers that
// resolve to sibling `.ts` files. Metro does not do that mapping on its own,
// so we retry a failed `.js`/`.mjs`/`.cjs` resolve with the TS/TSX extension.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')
const fs = require('fs')

const config = getDefaultConfig(__dirname)

config.resolver.sourceExts = [
  ...new Set([...config.resolver.sourceExts, 'ts', 'tsx']),
]

const defaultResolveRequest = config.resolver.resolveRequest

const NODE_SHIMS = new Set(['http', 'http2', 'https', 'net', 'tls', 'stream', 'zlib'])

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Node built-ins: easy-rpc's main entry re-exports the Node adapter, but RN
  // only ever uses the fetch transport, so resolve them to an empty stub.
  const bare = moduleName.replace(/^node:/, '')
  if (
    moduleName.startsWith('node:') ||
    (NODE_SHIMS.has(bare) && !moduleName.startsWith('.'))
  ) {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/shims/node-empty.js') }
  }
  // Only rewrite relative/absolute specifiers ending in a JS extension.
  if (/^\.{1,2}\//.test(moduleName) || path.isAbsolute(moduleName)) {
    const m = moduleName.match(/^(.*)\.(js|mjs|cjs)$/)
    if (m) {
      const base = m[1]
      const fromDir = path.dirname(context.originModulePath)
      for (const ext of ['ts', 'tsx', 'd.ts']) {
        const candidate = path.resolve(fromDir, `${base}.${ext}`)
        if (fs.existsSync(candidate)) {
          return context.resolveRequest(context, `${base}.${ext}`, platform)
        }
      }
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  )
}

module.exports = config
