const test = require('brittle')
const Bundle = require('bare-bundle')
const traverse = require('bare-module-traverse')
const pack = require('.')

const host = 'host'

test('require', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require('./bar.js')"
    }

    if (url.href === 'file:///bar.js') {
      return "const baz = require('./baz.js')"
    }

    if (url.href === 'file:///baz.js') {
      return 'module.exports = 42'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.js'), readModule)

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require('./bar.js')", {
      main: true,
      imports: {
        './bar.js': 'file:///bar.js'
      }
    })
    .write('file:///bar.js', "const baz = require('./baz.js')", {
      imports: {
        './baz.js': 'file:///baz.js'
      }
    })
    .write('file:///baz.js', 'module.exports = 42', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('require.addon', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.addon('.')"
    }

    if (url.href === 'file:///package.json') {
      return '{ "name": "foo" }'
    }

    if (url.href === 'file:///prebuilds/host/foo.bare') {
      return '<native code>'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.js'), { host, extensions: ['.bare'] }, readModule)

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require.addon('.')", {
      main: true,
      imports: {
        '#package': 'file:///package.json',
        '.': { addon: 'file:///prebuilds/host/foo.bare' }
      }
    })
    .write('file:///prebuilds/host/foo.bare', '<native code>', {
      addon: true,
      imports: {
        '#package': 'file:///package.json'
      }
    })
    .write('file:///package.json', '{ "name": "foo" }', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('require.addon, hosts list', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "module.exports = require.addon('.')"
    }

    if (url.href === 'file:///package.json') {
      return '{ "name": "foo" }'
    }

    if (url.href === 'file:///prebuilds/host-a/foo.bare') {
      return '<native code a>'
    }

    if (url.href === 'file:///prebuilds/host-b/foo.bare') {
      return '<native code b>'
    }

    return null
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { hosts: ['host-a', 'host-b'], extensions: ['.bare'] },
    readModule
  )

  const expected = new Bundle()
    .write('file:///foo.js', "module.exports = require.addon('.')", {
      main: true,
      imports: {
        '#package': 'file:///package.json',
        '.': {
          addon: {
            a: 'file:///prebuilds/host-a/foo.bare',
            b: 'file:///prebuilds/host-b/foo.bare'
          }
        }
      }
    })
    .write('file:///prebuilds/host-a/foo.bare', '<native code a>', {
      addon: true,
      imports: {
        '#package': 'file:///package.json'
      }
    })
    .write('file:///prebuilds/host-b/foo.bare', '<native code b>', {
      addon: true,
      imports: {
        '#package': 'file:///package.json'
      }
    })
    .write('file:///package.json', '{ "name": "foo" }', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('require.asset', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.asset('./bar.txt')"
    }

    if (url.href === 'file:///bar.txt') {
      return 'hello world'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.js'), readModule)

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require.asset('./bar.txt')", {
      main: true,
      imports: {
        './bar.txt': { asset: 'file:///bar.txt' }
      }
    })
    .write('file:///bar.txt', 'hello world', {
      asset: true,
      imports: {}
    })

  t.alike(bundle, expected)
})

test('require.asset, directory', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.asset('./bar')"
    }

    if (url.href === 'file:///bar/a.txt') {
      return 'hello a'
    }

    if (url.href === 'file:///bar/b.txt') {
      return 'hello b'
    }

    return null
  }

  function listPrefix(url) {
    if (url.href === 'file:///bar') {
      return [new URL('file:///bar/a.txt'), new URL('file:///bar/b.txt')]
    }

    return []
  }

  const bundle = await pack(new URL('file:///foo.js'), readModule, listPrefix)

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require.asset('./bar')", {
      main: true,
      imports: {
        './bar': { asset: 'file:///bar' }
      }
    })
    .write('file:///bar/a.txt', 'hello a', {
      asset: true,
      imports: {}
    })
    .write('file:///bar/b.txt', 'hello b', {
      asset: true,
      imports: {}
    })

  t.alike(bundle, expected)
})

test('aliases, .ts to .js', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.ts') {
      return "const bar = require('./bar.ts')"
    }

    if (url.href === 'file:///bar.ts') {
      return 'module.exports = 42'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.ts'), { aliases: { '.ts': '.js' } }, readModule)

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require('./bar.ts')", {
      main: true,
      imports: {
        './bar.ts': 'file:///bar.js'
      }
    })
    .write('file:///bar.js', 'module.exports = 42', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('aliases, .mts to .mjs', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.mts') {
      return "import './bar.mts'"
    }

    if (url.href === 'file:///bar.mts') {
      return 'export default 42'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.mts'), { aliases: { '.mts': '.mjs' } }, readModule)

  const expected = new Bundle()
    .write('file:///foo.mjs', "import './bar.mts'", {
      main: true,
      imports: {
        './bar.mts': 'file:///bar.mjs'
      }
    })
    .write('file:///bar.mjs', 'export default 42', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('aliases, .ts to .js with defaultType MODULE', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.ts') {
      return "import './bar.ts'"
    }

    if (url.href === 'file:///bar.ts') {
      return 'export default 42'
    }

    return null
  }

  const bundle = await pack(
    new URL('file:///foo.ts'),
    {
      defaultType: traverse.constants.MODULE,
      aliases: { '.ts': '.js' }
    },
    readModule
  )

  const expected = new Bundle()
    .write('file:///foo.js', "import './bar.ts'", {
      main: true,
      imports: {
        './bar.ts': 'file:///bar.js'
      }
    })
    .write('file:///bar.js', 'export default 42', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('offload addons', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.addon('.')"
    }

    if (url.href === 'file:///package.json') {
      return '{ "name": "foo" }'
    }

    if (url.href === 'file:///prebuilds/host/foo.bare') {
      return '<native code>'
    }

    return null
  }

  const written = []

  function writeFile(url, source) {
    written.push({ url: url.href, source })
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { host, extensions: ['.bare'], offload: { addons: true } },
    readModule,
    null,
    null,
    writeFile
  )

  t.alike(written, [{ url: 'file:///prebuilds/host/foo.bare', source: '<native code>' }])

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require.addon('.')", {
      main: true,
      imports: {
        '#package': 'file:///package.json',
        '.': { addon: 'file:///prebuilds/host/foo.bare' }
      }
    })
    .write('file:///package.json', '{ "name": "foo" }', {
      imports: {}
    })

  expected.addons = ['file:///prebuilds/host/foo.bare']

  t.alike(bundle, expected)
})

test('offload assets', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.asset('./bar.txt')"
    }

    if (url.href === 'file:///bar.txt') {
      return 'hello world'
    }

    return null
  }

  const written = []

  function writeFile(url, source) {
    written.push({ url: url.href, source })
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { offload: { assets: true } },
    readModule,
    null,
    null,
    writeFile
  )

  t.alike(written, [{ url: 'file:///bar.txt', source: 'hello world' }])

  const expected = new Bundle().write('file:///foo.js', "const bar = require.asset('./bar.txt')", {
    main: true,
    imports: {
      './bar.txt': { asset: 'file:///bar.txt' }
    }
  })

  expected.assets = ['file:///bar.txt']

  t.alike(bundle, expected)
})

test('offload assets, imported as both module and asset', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "require('./bar.txt'), require.asset('./bar.txt')"
    }

    if (url.href === 'file:///bar.txt') {
      return 'hello world'
    }

    return null
  }

  const written = []

  function writeFile(url, source) {
    written.push({ url: url.href, source })
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { offload: { assets: true } },
    readModule,
    null,
    null,
    writeFile
  )

  t.alike(written, [{ url: 'file:///bar.txt', source: 'hello world' }])

  const expected = new Bundle().write(
    'file:///foo.js',
    "require('./bar.txt'), require.asset('./bar.txt')",
    {
      main: true,
      imports: {
        './bar.txt': { require: 'file:///bar.txt', asset: 'file:///bar.txt' }
      }
    }
  )

  expected.assets = ['file:///bar.txt']

  t.alike(bundle, expected)
})

test('offload, writeFile override', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.asset('./bar.txt')"
    }

    if (url.href === 'file:///bar.txt') {
      return 'hello world'
    }

    return null
  }

  function writeFile(url) {
    if (url.href === 'file:///bar.txt') return 'linked:bar.txt'
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { offload: { assets: true } },
    readModule,
    null,
    null,
    writeFile
  )

  const expected = new Bundle().write('file:///foo.js', "const bar = require.asset('./bar.txt')", {
    main: true,
    imports: {
      './bar.txt': { asset: 'linked:bar.txt' }
    }
  })

  expected.assets = ['linked:bar.txt']

  t.alike(bundle, expected)
})

test('offload with base', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///app/foo.js') {
      return "const bar = require.addon('.')"
    }

    if (url.href === 'file:///app/package.json') {
      return '{ "name": "foo" }'
    }

    if (url.href === 'file:///app/prebuilds/host/foo.bare') {
      return '<native code>'
    }

    return null
  }

  function writeFile() {}

  const bundle = await pack(
    new URL('file:///app/foo.js'),
    {
      host,
      extensions: ['.bare'],
      offload: true,
      base: new URL('file:///app/')
    },
    readModule,
    null,
    null,
    writeFile
  )

  const expected = new Bundle()
    .write('/foo.js', "const bar = require.addon('.')", {
      main: true,
      imports: {
        '#package': '/package.json',
        '.': { addon: '/../prebuilds/host/foo.bare' }
      }
    })
    .write('/package.json', '{ "name": "foo" }', {
      imports: {}
    })

  expected.addons = ['/../prebuilds/host/foo.bare']

  t.alike(bundle, expected)
})

test('offload with base, root', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.addon('.')"
    }

    if (url.href === 'file:///package.json') {
      return '{ "name": "foo" }'
    }

    if (url.href === 'file:///prebuilds/host/foo.bare') {
      return '<native code>'
    }

    return null
  }

  function writeFile() {}

  const bundle = await pack(
    new URL('file:///foo.js'),
    {
      host,
      extensions: ['.bare'],
      offload: true,
      base: new URL('file:///')
    },
    readModule,
    null,
    null,
    writeFile
  )

  const expected = new Bundle()
    .write('/foo.js', "const bar = require.addon('.')", {
      main: true,
      imports: {
        '#package': '/package.json',
        '.': { addon: '/../prebuilds/host/foo.bare' }
      }
    })
    .write('/package.json', '{ "name": "foo" }', {
      imports: {}
    })

  expected.addons = ['/../prebuilds/host/foo.bare']

  t.alike(bundle, expected)
})

test('offload assets, directory', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.asset('./bar')"
    }

    if (url.href === 'file:///bar/a.txt') {
      return 'hello a'
    }

    if (url.href === 'file:///bar/b.txt') {
      return 'hello b'
    }

    return null
  }

  function listPrefix(url) {
    if (url.href === 'file:///bar') {
      return [new URL('file:///bar/a.txt'), new URL('file:///bar/b.txt')]
    }

    return []
  }

  function writeFile(url) {
    return url.pathname
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { offload: { assets: true } },
    readModule,
    listPrefix,
    null,
    writeFile
  )

  const expected = new Bundle().write('file:///foo.js', "const bar = require.asset('./bar')", {
    main: true,
    imports: {
      './bar': { asset: '/bar' }
    }
  })

  expected.assets = ['/bar/a.txt', '/bar/b.txt']

  t.alike(bundle, expected)
})

test('offload, linked addons not offloaded', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require.addon('.')"
    }

    if (url.href === 'file:///package.json') {
      return '{ "name": "foo" }'
    }

    return null
  }

  function writeFile(url) {
    t.fail('writeFile should not be called: ' + url.href)
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { host: 'darwin-arm64', extensions: ['.bare'], offload: true },
    readModule,
    null,
    null,
    writeFile
  )

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require.addon('.')", {
      main: true,
      imports: {
        '#package': 'file:///package.json',
        '.': { addon: 'linked:foo.framework/foo' }
      }
    })
    .write('file:///package.json', '{ "name": "foo" }', {
      imports: {}
    })

  expected.addons = ['linked:foo.framework/foo']

  t.alike(bundle, expected)
})

test('serial', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "const bar = require('./bar.js')"
    }

    if (url.href === 'file:///bar.js') {
      return "const baz = require('./baz.js')"
    }

    if (url.href === 'file:///baz.js') {
      return 'module.exports = 42'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.js'), { concurrency: 1 }, readModule)

  const expected = new Bundle()
    .write('file:///foo.js', "const bar = require('./bar.js')", {
      main: true,
      imports: {
        './bar.js': 'file:///bar.js'
      }
    })
    .write('file:///bar.js', "const baz = require('./baz.js')", {
      imports: {
        './baz.js': 'file:///baz.js'
      }
    })
    .write('file:///baz.js', 'module.exports = 42', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('serial, module imported as both asset and module', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') {
      return "require.asset('./bar.js'), require('./bar.js')"
    }

    if (url.href === 'file:///bar.js') {
      return "const baz = require('./baz.js')"
    }

    if (url.href === 'file:///baz.js') {
      return 'module.exports = 42'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.js'), { concurrency: 1 }, readModule)

  const expected = new Bundle()
    .write('file:///foo.js', "require.asset('./bar.js'), require('./bar.js')", {
      main: true,
      imports: {
        './bar.js': { require: 'file:///bar.js', asset: 'file:///bar.js' }
      }
    })
    .write('file:///bar.js', "const baz = require('./baz.js')", {
      asset: true,
      imports: {
        './baz.js': 'file:///baz.js'
      }
    })
    .write('file:///baz.js', 'module.exports = 42', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('resolveModule, symlinked package', async (t) => {
  // `bar` is linked into `/app/node_modules` from `/store`, where its own
  // dependency `baz` lives next to it.
  const modules = {
    'file:///app/foo.js': "require('bar')",
    'file:///app/node_modules/bar/package.json': '{ "name": "bar" }',
    'file:///app/node_modules/bar/index.js': "require('baz')",
    'file:///store/bar/package.json': '{ "name": "bar" }',
    'file:///store/bar/index.js': "require('baz')",
    'file:///store/node_modules/baz/package.json': '{ "name": "baz" }',
    'file:///store/node_modules/baz/index.js': 'module.exports = 42'
  }

  function readModule(url) {
    return modules[url.href] ?? null
  }

  function resolveModule(url) {
    return new URL(url.href.replace('file:///app/node_modules/bar/', 'file:///store/bar/'))
  }

  const opts = { resolve: traverse.resolve.bare }

  await t.exception(pack(new URL('file:///app/foo.js'), opts, readModule), /MODULE_NOT_FOUND/)

  const bundle = await pack(new URL('file:///app/foo.js'), opts, readModule, null, resolveModule)

  t.alike([...bundle.keys()].sort(), [
    'file:///app/foo.js',
    'file:///store/bar/index.js',
    'file:///store/bar/package.json',
    'file:///store/node_modules/baz/index.js',
    'file:///store/node_modules/baz/package.json'
  ])

  t.is(bundle.resolutions['file:///app/foo.js'].bar, 'file:///store/bar/index.js')
})

test('resolveModule, without options', async (t) => {
  function readModule(url) {
    if (url.href === 'file:///foo.js') return "require('./bar.js')"
    if (url.href === 'file:///bar.js') return 'module.exports = 42'
    if (url.href === 'file:///baz.js') return 'module.exports = 42'

    return null
  }

  function resolveModule(url) {
    return url.href === 'file:///bar.js' ? new URL('file:///baz.js') : url
  }

  const bundle = await pack(new URL('file:///foo.js'), readModule, null, resolveModule)

  t.alike([...bundle.keys()].sort(), ['file:///baz.js', 'file:///foo.js'])
})

test('wasi attribute', async (t) => {
  const modules = {
    'file:///foo.js': "require('bar', { with: { wasi: './caps.js' } })",
    'file:///caps.js': 'module.exports = () => ({})',
    'file:///node_modules/bar/package.json': '{ "name": "bar" }',
    'file:///node_modules/bar/index.js': "module.exports = require.addon('.')",
    'file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm': '<webassembly>'
  }

  function readModule(url) {
    return modules[url.href] ?? null
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { resolve: traverse.resolve.bare, host },
    readModule
  )

  const expected = new Bundle()
    .write('file:///foo.js', "require('bar', { with: { wasi: './caps.js' } })", {
      main: true,
      imports: {
        './caps.js': 'file:///caps.js',
        bar: 'file:///node_modules/bar/index.js'
      }
    })
    .write('file:///caps.js', 'module.exports = () => ({})', {
      imports: {}
    })
    .write('file:///node_modules/bar/index.js', "module.exports = require.addon('.')", {
      imports: {
        '#package': 'file:///node_modules/bar/package.json',
        '.': { addon: 'file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm' }
      }
    })
    .write('file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm', '<webassembly>', {
      addon: true,
      imports: {
        '#package': 'file:///node_modules/bar/package.json'
      }
    })
    .write('file:///node_modules/bar/package.json', '{ "name": "bar" }', {
      imports: {}
    })

  t.alike(bundle, expected)
})

test('wasi attribute, transitive dependency', async (t) => {
  const modules = {
    'file:///foo.js': "require('baz', { with: { wasi: './caps.js' } })",
    'file:///caps.js': 'module.exports = () => ({})',
    'file:///node_modules/baz/package.json': '{ "name": "baz" }',
    'file:///node_modules/baz/index.js': "module.exports = require('bar')",
    'file:///node_modules/bar/package.json': '{ "name": "bar" }',
    'file:///node_modules/bar/index.js': "module.exports = require.addon('.')",
    'file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm': '<webassembly>'
  }

  function readModule(url) {
    return modules[url.href] ?? null
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { resolve: traverse.resolve.bare, host },
    readModule
  )

  t.alike([...bundle.keys()].sort(), [
    'file:///caps.js',
    'file:///foo.js',
    'file:///node_modules/bar/index.js',
    'file:///node_modules/bar/package.json',
    'file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm',
    'file:///node_modules/baz/index.js',
    'file:///node_modules/baz/package.json'
  ])
  t.alike(bundle.addons, ['file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm'])
})

test('wasi attribute, host attribute', async (t) => {
  const modules = {
    'file:///foo.js': "require('bar', { with: { host: 'wasi-wasm32', wasi: './caps.js' } })",
    'file:///caps.js': 'module.exports = () => ({})',
    'file:///node_modules/bar/package.json': '{ "name": "bar" }',
    'file:///node_modules/bar/index.js': "module.exports = require.addon('.')",
    'file:///node_modules/bar/prebuilds/host/bar.bare': '<native code>',
    'file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm': '<webassembly>'
  }

  function readModule(url) {
    return modules[url.href] ?? null
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { resolve: traverse.resolve.bare, hosts: [host] },
    readModule
  )

  t.alike(bundle.resolutions['file:///node_modules/bar/index.js']['.'], {
    addon: 'file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm'
  })
  t.alike(bundle.addons, ['file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm'])
})

test('wasi attribute, conflicting provider', async (t) => {
  const modules = {
    'file:///foo.js':
      "require('bar', { with: { wasi: './a.js' } }); require('bar', { with: { wasi: './b.js' } })",
    'file:///a.js': 'module.exports = () => ({})',
    'file:///b.js': 'module.exports = () => ({})',
    'file:///node_modules/bar/package.json': '{ "name": "bar" }',
    'file:///node_modules/bar/index.js': "module.exports = require.addon('.')",
    'file:///node_modules/bar/prebuilds/wasi-wasm32/bar.wasm': '<webassembly>'
  }

  function readModule(url) {
    return modules[url.href] ?? null
  }

  await t.exception(
    pack(new URL('file:///foo.js'), { resolve: traverse.resolve.bare, host }, readModule),
    /ADDON_WASI_INCOMPATIBLE/
  )
})

test('offload, module imported in several addon contexts', async (t) => {
  const modules = {
    'file:///foo.js': "require('bar', { with: { wasi: './caps.js' } }); require('bar')",
    'file:///caps.js': 'module.exports = () => ({})',
    'file:///node_modules/bar/package.json': '{ "name": "bar" }',
    'file:///node_modules/bar/index.js': "module.exports = require.addon('.')",
    'file:///node_modules/bar/prebuilds/host/bar.bare': '<native code>'
  }

  function readModule(url) {
    return modules[url.href] ?? null
  }

  const written = []

  function writeFile(url, source) {
    written.push({ url: url.href, source })
  }

  const bundle = await pack(
    new URL('file:///foo.js'),
    { resolve: traverse.resolve.bare, host, offload: true },
    readModule,
    null,
    null,
    writeFile
  )

  t.alike(written, [
    { url: 'file:///node_modules/bar/prebuilds/host/bar.bare', source: '<native code>' }
  ])

  t.alike(bundle.addons, ['file:///node_modules/bar/prebuilds/host/bar.bare'])
})
