#!/usr/bin/env node
const { pathToFileURL, fileURLToPath } = require('url')
const { command, flag, arg, summary } = require('paparam')
const { resolve } = require('bare-module-traverse')
const pkg = require('./package')
const fs = require('./fs')
const pack = require('.')

const cmd = command(
  'pack',
  summary(pkg.description),
  flag('--resolver <name>', 'The module resolver to use'),
  flag('--base <path>', 'The base path of the module graph'),
  arg('<entry>', 'The entry point of the module graph'),
  async (cmd) => {
    const { resolver = 'default', base = '.' } = cmd.flags
    const { entry } = cmd.args

    const bundle = await pack(pathToFileURL(entry), { resolve: resolve[resolver] }, readModule, listPrefix)

    await fs.write(1, bundle.unmount(pathToFileURL(base)).toBuffer())
  }
)

cmd.parse()

async function readModule (url) {
  return fs.readFile(url)
}

async function * listPrefix (url) {
  if (url.pathname[url.pathname.length - 1] !== '/') url.pathname += '/'

  for await (const entry of await fs.openDir(url)) {
    if (entry.isDirectory()) {
      yield * listPrefix(new URL(entry.name, url))
    } else {
      yield new URL(entry.name, url)
    }
  }
}
