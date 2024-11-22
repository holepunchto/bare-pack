#!/usr/bin/env node
const path = require('path')
const { pathToFileURL } = require('url')
const { command, flag, arg, summary } = require('paparam')
const { resolve } = require('bare-module-traverse')
const id = require('bare-bundle-id')
const pkg = require('./package')
const fs = require('./lib/fs')
const pack = require('.')

const cmd = command(
  pkg.name,
  summary(pkg.description),
  arg('<entry>', 'The entry point of the module graph'),
  flag('--version|-v', 'Print the current version'),
  flag('--out|-o <path>', 'The output path of the bundle'),
  flag('--builtins <path>', 'A list of builtin modules'),
  flag('--linked', 'Resolve linked: addons instead of file: prebuilds'),
  flag('--format|-f <name>', 'The bundle format to use'),
  flag('--encoding|-e <name>', 'The encoding to use for text bundle formats'),
  flag('--platform|-p <name>', 'The operating system platform to bundle for'),
  flag('--arch|-a <name>', 'The operating system architecture to bundle for'),
  flag('--simulator', 'Bundle for a simulator'),
  async (cmd) => {
    const { entry } = cmd.args
    const {
      version,
      out,
      builtins,
      linked,
      format = defaultFormat(out),
      encoding = 'utf8',
      platform,
      arch,
      simulator
    } = cmd.flags

    if (version) return console.log(`v${pkg.version}`)

    let bundle = await pack(
      pathToFileURL(entry),
      {
        platform,
        arch,
        simulator,
        resolve: resolve.bare,
        builtins: builtins ? require(path.resolve(builtins)) : [],
        linked
      },
      fs.readModule,
      fs.listPrefix
    )

    bundle = bundle.unmount(pathToFileURL('.'))

    bundle.id = id(bundle).toString('hex')

    let data = bundle.toBuffer()

    switch (format) {
      case 'bundle':
        break
      case 'bundle.cjs':
        data = `module.exports = ${JSON.stringify(data.toString(encoding))}\n`
        break
      case 'bundle.mjs':
        data = `export default ${JSON.stringify(data.toString(encoding))}\n`
        break
      case 'bundle.json':
        data = JSON.stringify(data.toString(encoding)) + '\n'
        break
      default:
        throw new Error(`Unknown format '${format}'`)
    }

    if (out) {
      const url = pathToFileURL(out)

      await fs.makeDir(new URL('.', url))
      await fs.writeFile(url, data)
    } else {
      await fs.write(1, data)
    }
  }
)

cmd.parse()

function defaultFormat(out) {
  if (typeof out !== 'string') return 'bundle'
  if (out.endsWith('.bundle.js') || out.endsWith('.bundle.cjs'))
    return 'bundle.cjs'
  if (out.endsWith('.bundle.mjs')) return 'bundle.mjs'
  if (out.endsWith('.bundle.json')) return 'bundle.json'
  return 'bundle'
}
