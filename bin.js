#!/usr/bin/env node
const path = require('path')
const { pathToFileURL } = require('url')
const { command, flag, arg, summary } = require('paparam')
const { resolve } = require('bare-module-traverse')
const pkg = require('./package')
const fs = require('./fs')
const pack = require('.')

const cmd = command(
  'pack',
  summary(pkg.description),
  arg('<entry>', 'The entry point of the module graph'),
  flag('--out|-o <path>', 'The output path of the bundle'),
  flag('--builtins <path>', 'A list of builtin modules'),
  flag('--linked', 'Resolve linked: addons instead of file: prebuilds'),
  flag('--platform|-p <name>', 'The operating system platform to bundle for'),
  flag('--arch|-a <name>', 'The operating system architecture to bundle for'),
  flag('--simulator', 'Bundle for a simulator'),
  async (cmd) => {
    const { entry } = cmd.args
    const { out, builtins, linked, platform, arch, simulator } = cmd.flags

    let bundle = await pack(pathToFileURL(entry), {
      platform,
      arch,
      simulator,
      resolve: resolve.bare,
      builtins: builtins ? require(path.resolve(builtins)) : [],
      linked
    }, fs.readModule, fs.listPrefix)

    bundle = bundle.unmount(pathToFileURL('.'))

    const buffer = bundle.toBuffer()

    if (out) {
      await fs.writeFile(pathToFileURL(out), buffer)
    } else {
      await fs.write(1, buffer)
    }
  }
)

cmd.parse()
