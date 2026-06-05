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
        '.': 'file:///prebuilds/host/foo.bare'
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
          a: 'file:///prebuilds/host-a/foo.bare',
          b: 'file:///prebuilds/host-b/foo.bare'
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
        './bar.txt': 'file:///bar.txt'
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
        './bar': 'file:///bar'
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

  const bundle = await pack(
    new URL('file:///foo.ts'),
    { aliases: { '.ts': '.js' } },
    readModule
  )

  const expected = new Bundle()
    .write('file:///foo.ts', "const bar = require('./bar.ts')", {
      main: true,
      imports: {
        './bar.ts': 'file:///bar.ts'
      }
    })
    .write('file:///bar.ts', 'module.exports = 42', {
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

  const bundle = await pack(
    new URL('file:///foo.mts'),
    { aliases: { '.mts': '.mjs' } },
    readModule
  )

  const expected = new Bundle()
    .write('file:///foo.mts', "import './bar.mts'", {
      main: true,
      imports: {
        './bar.mts': 'file:///bar.mts'
      }
    })
    .write('file:///bar.mts', 'export default 42', {
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
    .write('file:///foo.ts', "import './bar.ts'", {
      main: true,
      imports: {
        './bar.ts': 'file:///bar.ts'
      }
    })
    .write('file:///bar.ts', 'export default 42', {
      imports: {}
    })

  t.alike(bundle, expected)
})
