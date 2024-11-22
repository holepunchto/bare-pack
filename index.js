const Semaphore = require('promaphore')
const Bundle = require('bare-bundle')
const traverse = require('bare-module-traverse')

module.exports = async function pack(entry, opts, readModule, listPrefix) {
  if (typeof opts === 'function') {
    listPrefix = readModule
    readModule = opts
    opts = {}
  }

  if (typeof listPrefix !== 'function') {
    listPrefix = defaultListPrefix
  }

  const { concurrency = 1 } = opts

  const semaphore = concurrency > 0 ? new Semaphore(concurrency) : null

  const bundle = new Bundle()

  const addons = []
  const assets = []

  await process(
    traverse.module(
      entry,
      await readModule(entry),
      { addons, assets },
      new Set(),
      opts
    )
  )

  bundle.addons = addons.map((url) => url.href)
  bundle.assets = assets.map((url) => url.href)

  return bundle

  async function process(generator) {
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
          const { url, source, imports } = value.dependency

          bundle.write(url.href, source, {
            main: url.href === entry.href,
            imports
          })
        }

        next = generator.next()
      }
    }

    if (semaphore !== null) semaphore.signal()

    await Promise.all(queue.map(process))
  }
}

function* defaultListPrefix() {}
