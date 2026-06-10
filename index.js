const Semaphore = require('promaphore')
const Bundle = require('bare-bundle')
const traverse = require('bare-module-traverse')
const preset = require('./lib/preset')

module.exports = async function pack(entry, opts, readModule, listPrefix, writeFile) {
  if (typeof opts === 'function') {
    writeFile = listPrefix
    listPrefix = readModule
    readModule = opts
    opts = {}
  }

  if (!listPrefix) listPrefix = defaultListPrefix(readModule)
  if (!writeFile) writeFile = defaultWriteFile

  opts = withPreset(opts)

  let {
    concurrency = 0,
    base = null,
    offload = false,
    builtinProtocol = 'builtin:',
    linkedProtocol = 'linked:',
    deferredProtocol = 'deferred:'
  } = opts

  if (base !== null) base = new URL(base)

  const offloadAddons = offload === true || (offload && offload.addons === true)
  const offloadAssets = offload === true || (offload && offload.assets === true)

  const semaphore = concurrency > 0 ? new Semaphore(concurrency) : null

  let bundle = new Bundle()

  const addons = new Set()
  const assets = new Set()
  const dependencies = []

  await collect(
    traverse.module(entry, await readModule(entry), null, { addons, assets }, new Set(), opts)
  )

  const rewrites = new Map()

  await Promise.all(dependencies.map(process))

  const main = traverse.alias(entry, opts)

  for (const { url, source, imports } of dependencies) {
    if (shouldOffload(url.href)) continue

    bundle.write(url.href, source, {
      main: url.href === main.href,
      imports
    })
  }

  bundle.addons = [...addons].filter((href) => !shouldOffload(href)).sort()
  bundle.assets = [...assets].filter((href) => !shouldOffload(href)).sort()

  if (base !== null) bundle = bundle.unmount(base)

  if (rewrites.size > 0) {
    const resolutions = {}

    for (const [key, value] of Object.entries(bundle.resolutions)) {
      resolutions[key] = rewriteImportsMap(value, rewrites)
    }

    bundle.resolutions = resolutions
  }

  return bundle

  function shouldOffload(href) {
    if (href.startsWith(builtinProtocol)) return false
    if (href.startsWith(linkedProtocol)) return false
    if (href.startsWith(deferredProtocol)) return false

    return (offloadAddons && addons.has(href)) || (offloadAssets && assets.has(href))
  }

  function postUnmountPath(url) {
    if (
      base === null ||
      url.protocol !== base.protocol ||
      url.host !== base.host ||
      url.port !== base.port
    ) {
      return url.href
    }

    let basePath = base.pathname

    if (!basePath.endsWith('/')) basePath += '/'

    if (!url.pathname.startsWith(basePath)) return url.href

    return '/' + url.pathname.slice(basePath.length)
  }

  async function process({ url, source }) {
    if (!shouldOffload(url.href)) return

    if (semaphore !== null) await semaphore.wait()

    const target = await writeFile(url, source)

    let key = postUnmountPath(url)
    let value = null

    if (target) value = String(target)
    else if (base !== null) value = '/..' + key

    if (value !== null) {
      rewrites.set(key, value)

      for (;;) {
        key = key.substring(0, key.lastIndexOf('/'))

        if (isTerminator(key)) break

        value = value.substring(0, value.lastIndexOf('/'))

        if (isTerminator(value)) break

        rewrites.set(key, value)
      }
    }

    if (semaphore !== null) semaphore.signal()
  }

  async function collect(generator) {
    if (semaphore !== null) await semaphore.wait()

    const queue = []

    let next = generator.next()

    while (next.done !== true) {
      const value = next.value

      if (value.module) {
        next = generator.next(await readModule(value.module))
      } else if (value.prefix) {
        const result = []

        for await (const url of listPrefix(value.prefix)) {
          result.push(url)
        }

        next = generator.next(result)
      } else {
        if (value.children) {
          queue.push(value.children)
        } else {
          dependencies.push(value.dependency)
        }

        next = generator.next()
      }
    }

    if (semaphore !== null) semaphore.signal()

    await Promise.all(queue.map(collect))
  }
}

function withPreset(opts = {}) {
  if (opts.preset) {
    if (opts.preset in preset === false) {
      throw new Error(`Unknown preset '${opts.preset}'`)
    }

    opts = Object.assign({}, opts, preset[opts.preset])
  }

  return opts
}

function defaultListPrefix(readModule) {
  return async function* listPrefix(prefix) {
    if ((await readModule(prefix)) !== null) {
      yield prefix
    }
  }
}

function defaultWriteFile() {
  return null
}

function isTerminator(input) {
  return input === '' || input.endsWith('/') || input.endsWith(':')
}

function rewriteImportsMap(imports, rewrites) {
  if (rewrites.size === 0 || typeof imports !== 'object' || imports === null) return null

  return transformImportsMap(imports, (value) => rewrites.get(value) || value)
}

function transformImportsMap(value, fn) {
  const imports = {}

  for (const entry of Object.entries(value)) {
    const condition = entry[0]

    imports[condition] = transformImportsMapEntry(entry[1], fn)
  }

  return imports
}

function transformImportsMapEntry(value, fn) {
  if (typeof value === 'string') return fn(value)

  return transformImportsMap(value, fn)
}
