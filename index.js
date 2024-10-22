const Bundle = require('bare-bundle')
const traverse = require('bare-module-traverse')

module.exports = async function pack (entry, opts, readModule, listPrefix) {
  if (typeof opts === 'function') {
    listPrefix = readModule
    readModule = opts
    opts = {}
  }

  if (typeof listPrefix !== 'function') {
    listPrefix = defaultListPrefix
  }

  const bundle = new Bundle()

  const generator = traverse.module(entry, await readModule(entry), { addons: [], assets: [] }, new Set(), opts)

  let next = generator.next()

  while (next.done !== true) {
    const value = next.value

    if (value.module) {
      next = generator.next(await readModule(value.module))
    } else if (value.prefix) {
      next = generator.next(await listPrefix(value.prefix))
    } else {
      next = generator.next()

      const { url, source, imports } = value.dependency

      bundle.write(url.href, source, { main: url.href === entry.href, imports })
    }
  }

  bundle.addons = next.value.addons.map((url) => url.href)
  bundle.assets = next.value.assets.map((url) => url.href)

  return bundle
}

function defaultListPrefix () {
  return []
}
