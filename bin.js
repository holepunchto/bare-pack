#!/usr/bin/env node
const path = require('path')
const { pathToFileURL } = require('url')
const { command, flag, arg, summary } = require('paparam')
const pkg = require('./package')
const fs = require('./fs')
const pack = require('.')

const cmd = command(
  'pack',
  summary(pkg.description),
  flag('--resolver <module>', 'The module resolver to use'),
  flag('--base <path>', 'The base path of the module graph'),
  flag('--out|-o <path>', 'The output path of the bundle'),
  arg('<entry>', 'The entry point of the module graph'),
  async (cmd) => {
    const { resolver = 'bare-module-traverse/resolve/bare', base = '.', out } = cmd.flags
    const { entry } = cmd.args

    const resolve = require(require.resolve(resolver, { paths: [path.resolve('.'), __dirname] }))

    const bundle = await pack(pathToFileURL(entry), { resolve }, fs.readModule, fs.listPrefix)

    const buffer = bundle.unmount(pathToFileURL(base)).toBuffer()

    if (out) {
      await fs.writeFile(pathToFileURL(out), buffer)
    } else {
      await fs.write(1, buffer)
    }
  }
)

cmd.parse()
