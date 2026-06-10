# bare-pack

Bundle packing for Bare. It traverses a module graph and constructs a <https://github.com/holepunchto/bare-bundle> bundle with all statically resolvable import specifiers preresolved and embeds addon and asset imports. Built on <https://github.com/holepunchto/bare-module-traverse>, it relies on modules being read and prefixes being listed by callbacks, making it independent of the underlying module storage.

A [CLI](#cli) is also included and provides out-of-the box support for constructing bundles for use with <https://github.com/holepunchto/bare> on both desktop and mobile.

```
npm i [-g] bare-pack
```

## Usage

```js
const pack = require('bare-pack')

async function readModule(url) {
  // Read `url` if it exists, otherwise `null`
}

async function* listPrefix(url) {
  // Yield URLs that have `url` as a prefix. The list may be empty.
}

const bundle = await pack(new URL('file:///directory/file.js'), readModule, listPrefix)
```

## API

#### `const bundle = await pack(url[, options], readModule[, listPrefix[, writeFile]])`

Bundle the module graph rooted at `url`, which must be a WHATWG `URL` instance. `readModule` is called with a `URL` instance for every module to be read and must either return the module source, if it exists, or `null`. `listPrefix` is called with a `URL` instance of every prefix to be listed and must yield `URL` instances that have the specified `URL` as a prefix. If not provided, prefixes won't be bundled. `writeFile` is called for every addon or asset that should be offloaded rather than embedded; see [Offloading](#offloading) below. When `writeFile` is provided, `listPrefix` must be passed positionally (or as `null`).

Options include:

```js
options = {
  concurrency: 0,
  base: null,
  offload: false
}
```

`base`, if set, must be a WHATWG `URL` instance (or string) indicating where the bundle will be deployed. The resulting bundle is unmounted relative to `base` so that all keys and resolutions become relative paths.

`offload` controls whether addons and assets are written to the bundle or routed to `writeFile`. Pass `true` to offload both, or an object such as `{ addons: true }` or `{ assets: true }` to offload only one.

Options supported by <https://github.com/holepunchto/bare-module-traverse> may also be specified.

##### Aliases

To bundle source files with extensions that aren't natively recognized, use the `aliases` option from <https://github.com/holepunchto/bare-module-traverse> to map them to a supported extension. The aliased extension is used for module type detection, so `readModule` must return source compatible with that type. Aliased modules are stored in the bundle with the aliased extension, and resolutions to them are rewritten to match, so the example below stores `file:///foo.js` and `file:///bar.js`.

```js
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
```

##### Offloading

To keep addons and assets out of the bundle, set `offload` to `true` (or `{ addons: true }` / `{ assets: true }` for a single kind) and provide a `writeFile` callback. Each offloaded file is passed to `writeFile` instead of being embedded and is omitted from `bundle.addons` and `bundle.assets`.

`writeFile` receives the file's `URL` and source. If it returns a string, that string replaces the file's resolution in the bundle's imports map. Otherwise, when `base` is set, the resolution defaults to `'/../' + <path-relative-to-base>`, which resolves to a sibling of the bundle.

```js
function writeFile(url, source) {
  // Persist `source` for `url`, e.g. to disk next to the bundle.
}

const bundle = await pack(
  new URL('file:///app/foo.js'),
  { offload: true, base: new URL('file:///app/') },
  readModule,
  null,
  writeFile
)
```

URLs with the `builtin:`, `linked:`, or `deferred:` protocol are never offloaded.

## CLI

#### `bare-pack [flags] <entry>`

Bundle the module graph rooted at `<entry>`. If `--out` is provided, the bundle will be written to the specified file. Otherwise, the bundle will be written to `stdout`.

Flags include:

```console
--version|-v
--base <path>
--out|-o <path>
--builtins <path>
--imports <path>
--defer <specifier>
--linked
--offload
--offload-addons
--offload-assets
--format|-f
--encoding|-e
--host <host>
--help|-h
```

##### Host

By default, the bundle will be created for the host platform and architecture. To instead create a bundle for a different system, pass the `--host` flags.

```console
bare-pack --host <platform>[-<arch>[-<environment>]] index.js
```

The `--host` flag may be specified multiple times to create a combined bundle for multiple systems.

> [!TIP]
> Most often you'll use one of the possible values of [`Bare.Addon.host`](https://github.com/holepunchto/bare#addonhost). Omitting the architecture and environment is also valid; `--host ios` will create a bundle for iOS with no architecture specific code, for example, whereas `--host ios-arm64-simulator` will create a bundle specifically for iOS ARM64 simulators.

##### Linking

If your runtime environment dynamically links native addons ahead of time using <https://github.com/holepunchto/bare-link>, pass the `--linked` flag to ensure that addons resolve to `linked:` specifiers instead of `file:` prebuilds. This will mostly always be necessary when targeting mobile as both iOS and Android require native code to be linked ahead of time rather than loaded at runtime from disk.

```console
bare-pack --linked index.js
```

`index.js`

```js
const addon = require.addon()
```

`package.json`

```json
{
  "name": "addon",
  "version": "1.0.0",
  "addon": true
}
```

`require.addon()` will then resolve to `linked:addon.1.0.0.framework/addon.1.0.0` on macOS and iOS, `linked:libaddon.1.0.0.so` on Linux and Android, and `linked:addon-1.0.0.dll` on Windows.

See [`example/addon`](example/addon) for the full example.

##### Builtins

If your runtime environment includes builtin modules or statically embeds native addons, pass the `--builtins` flag and point it at a module exporting the list of builtins.

```console
bare-pack --builtins builtins.json index.js
```

`index.js`

```js
const addon = require('addon')
```

`package.json`

```json
{
  "name": "builtin",
  "version": "1.0.0",
  "dependencies": {
    "addon": "file:../addon"
  }
}
```

To treat both the `addon` JavaScript module and native addon as being provided by the runtime environment, do:

`builtins.json`

```json
["addon"]
```

To instead bundle the `addon` JavaScript module and only treat the native addon as being provided by the runtime environment, do:

`builtins.json`

```json
[{ "addon": "addon" }]
```

See [`example/builtin`](example/builtin) for the full example.

##### Offloading

To keep addons and assets out of the bundle and write them to disk alongside `--out` instead, pass `--offload` (or `--offload-addons` / `--offload-assets` for a single kind). `--out` is required.

```console
bare-pack --offload --out ./dist/index.bundle index.js
```

Each offloaded file is written at the directory of `--out`, mirroring its path relative to `--base`. The bundle's resolution for the file becomes `/../<path-relative-to-base>`, so when the bundle is later mounted (e.g. at `./dist/index.bundle/`) the resolution points to the file's location next to the bundle. If `--out` happens to be inside `--base`, the file is not rewritten on disk.

##### Format

The bundle format to use will be inferred from the `--out` flag if specified and can also be set directly using the `--format` and `--encoding` flags.

```console
bare-pack --format <bundle.cjs|bundle.mjs|bundle.json|bundle> --encoding <utf8|base64|ascii|hex|utf16le> index.js
```

| Format        | Extension(s)                | Description                       |
| ------------- | --------------------------- | --------------------------------- |
| `bundle.cjs`  | `.bundle.js`, `.bundle.cjs` | CommonJS wrapper for a `.bundle`  |
| `bundle.mjs`  | `.bundle.mjs`               | ES module wrapper for a `.bundle` |
| `bundle.json` | `.bundle.json`              | JSON wrapper for a `.bundle`      |
| `bundle`      | `.bundle`, `.*`             | Raw `.bundle`                     |

The default encoding is `utf8` for all text formats. Use `base64` or `hex` if combining a text format with native addons or binary assets.

## License

Apache-2.0
