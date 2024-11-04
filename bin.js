#!/usr/bin/env node
const { pathToFileURL } = require('url')
const { command, flag, arg, summary } = require('paparam')
const { resolve } = require('bare-module-traverse')
const pkg = require('./package')
const fs = require('./fs')
const pack = require('.')

const cmd = command(
  'pack',
  summary(pkg.description),
  flag('--platform|-p <name>', 'The operating system platform to bundle for'),
  flag('--arch|-a <name>', 'The operating system architecture to bundle for'),
  flag('--simulator', 'Bundle for a simulator'),
  flag('--out|-o <path>', 'The output path of the bundle'),
  arg('<entry>', 'The entry point of the module graph'),
  async (cmd) => {
    const { entry } = cmd.args
    const { out, platform, arch, simulator } = cmd.flags

    let bundle = await pack(pathToFileURL(entry), {
      platform,
      arch,
      simulator,
      resolve: resolve.bare
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
