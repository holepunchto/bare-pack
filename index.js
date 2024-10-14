const Bundle = require('bare-bundle')
const traverse = require('bare-module-traverse')

module.exports = async function pack (entry, opts, readModule) {
  if (typeof opts === 'function') {
    readModule = opts
    opts = {}
  }

  const files = new Map()

  readModule = collectModules(files, readModule)

  const bundle = new Bundle()

  const addons = new Set()
  const assets = new Set()

  for await (const { url, imports } of traverse(entry, opts, readModule)) {
    bundle.write(url.href, files.get(url.href), { main: url.href === entry.href, imports })

    for (const resolved of Object.values(imports)) {
      if (typeof resolved === 'object' && resolved !== null) {
        if ('addon' in resolved) addons.add(resolved.addon)
        if ('asset' in resolved) assets.add(resolved.asset)
      }
    }
  }

  bundle.addons = [...addons]
  bundle.assets = [...assets]

  return bundle
}

function collectModules (files, readModule) {
  return async function (url) {
    if (files.has(url.href)) return files.get(url.href)

    let contents = await readModule(url)

    if (contents) {
      if (typeof contents === 'string') contents = Buffer.from(contents)

      files.set(url.href, contents)
    }

    return contents
  }
}
