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
  flag('--base <path>', 'The base path of the bundle'),
  flag('--out|-o <path>', 'The output path of the bundle'),
  flag('--builtins <path>', 'A list of builtin modules'),
  flag('--imports <path>', 'A map of global import overrides'),
  flag('--defer <specifier>', 'A module specifier to defer resolution of').multiple(),
  flag('--linked', 'Resolve linked: addons instead of file: prebuilds'),
  flag('--offload', 'Offload addons and assets to disk next to --out'),
  flag('--offload-addons', 'Offload addons to disk next to --out'),
  flag('--offload-assets', 'Offload assets to disk next to --out'),
  flag('--format|-f <name>', 'The bundle format to use'),
  flag('--encoding|-e <name>', 'The encoding to use for text bundle formats'),
  flag('--host <host>', 'The host to bundle for').multiple(),
  flag('--preset <name>', 'Apply an option preset'),
  async (cmd) => {
    const { entry } = cmd.args
    let {
      version,
      base = '.',
      out,
      builtins,
      imports,
      defer,
      linked,
      offload = false,
      offloadAddons,
      offloadAssets,
      format = defaultFormat(out),
      encoding = 'utf8',
      host: hosts = [`${process.platform}-${process.arch}`],
      preset
    } = cmd.flags

    if (version) return console.log(`v${pkg.version}`)

    if (builtins) {
      builtins = require(path.resolve(builtins))

      if ('default' in builtins) builtins = builtins.default
    }

    if (imports) {
      imports = require(path.resolve(imports))

      if ('default' in imports) imports = imports.default
    }

    base = pathToFileURL(base)

    if (!base.pathname.endsWith('/')) base.pathname += '/'

    let writeFile

    offload = { addons: offload || offloadAddons, assets: offload || offloadAssets }

    if (offload.addons || offload.assets) {
      if (!out) {
        throw new Error('--out is required when offloading')
      }

      const dir = pathToFileURL(path.dirname(out) + '/')

      if (dir.href !== base.href) writeFile = writeFileOffloaded(base, dir)
    }

    const bundle = await pack(
      pathToFileURL(entry),
      {
        resolve: resolve.bare,
        hosts,
        builtins,
        imports,
        defer,
        linked,
        preset,
        base,
        offload
      },
      fs.readModule,
      fs.listPrefix,
      writeFile
    )

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
      await fs.writeFile(pathToFileURL(out), data)
    } else {
      await fs.write(1, data)
    }
  }
)

cmd.parse()

function writeFileOffloaded(base, dir) {
  return function writeFile(url, source) {
    let relative

    const nm = url.pathname.indexOf('/node_modules/')

    if (nm >= 0) {
      relative = url.pathname.slice(nm + 1)
    } else if (url.pathname.startsWith(base.pathname)) {
      relative = url.pathname.slice(base.pathname.length)
    } else {
      relative = url.pathname.replace(/^\//, '')
    }

    return fs.writeFile(new URL(relative, dir), source)
  }
}

function defaultFormat(out) {
  if (typeof out !== 'string') return 'bundle'
  if (out.endsWith('.bundle.js') || out.endsWith('.bundle.cjs')) return 'bundle.cjs'
  if (out.endsWith('.bundle.mjs')) return 'bundle.mjs'
  if (out.endsWith('.bundle.json')) return 'bundle.json'
  return 'bundle'
}
