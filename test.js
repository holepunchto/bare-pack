const test = require('brittle')
const Bundle = require('bare-bundle')
const pack = require('.')

const host = 'host'

test('require', async (t) => {
  function readModule (url) {
    if (url.href === 'file:///foo.js') {
      return 'const bar = require(\'./bar.js\')'
    }

    if (url.href === 'file:///bar.js') {
      return 'const baz = require(\'./baz.js\')'
    }

    if (url.href === 'file:///baz.js') {
      return 'module.exports = 42'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.js'), readModule)

  const expected = new Bundle()
    .write('file:///foo.js', 'const bar = require(\'./bar.js\')', {
      main: true,
      imports: {
        './bar.js': 'file:///bar.js'
      }
    })
    .write('file:///bar.js', 'const baz = require(\'./baz.js\')', {
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
  function readModule (url) {
    if (url.href === 'file:///foo.js') {
      return 'const bar = require.addon(\'.\')'
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
    .write('file:///foo.js', 'const bar = require.addon(\'.\')', {
      main: true,
      imports: {
        '#package': 'file:///package.json',
        '.': {
          addon: 'file:///prebuilds/host/foo.bare'
        }
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

test('require.asset', async (t) => {
  function readModule (url) {
    if (url.href === 'file:///foo.js') {
      return 'const bar = require.asset(\'./bar.txt\')'
    }

    if (url.href === 'file:///bar.txt') {
      return 'hello world'
    }

    return null
  }

  const bundle = await pack(new URL('file:///foo.js'), readModule)

  const expected = new Bundle()
    .write('file:///foo.js', 'const bar = require.asset(\'./bar.txt\')', {
      main: true,
      imports: {
        './bar.txt': {
          asset: 'file:///bar.txt'
        }
      }
    })
    .write('file:///bar.txt', 'hello world', {
      asset: true,
      imports: {}
    })

  t.alike(bundle, expected)
})
