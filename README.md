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

const bundle = await pack(
  new URL('file:///directory/file.js'),
  readModule,
  listPrefix
)
```

## API

#### `const bundle = await pack(url[, options], readModule[, listPrefix])`

Bundle the module graph rooted at `url`, which must be a WHATWG `URL` instance. `readModule` is called with a `URL` instance for every module to be read and must either return the module source, if it exists, or `null`. `listPrefix` is called with a `URL` instance of every prefix to be listed and must yield `URL` instances that have the specified `URL` as a prefix. If not provided, prefixes won't be bundled.

Options include:

```js
options = {
  concurrency: 0
}
```

Options supported by <https://github.com/holepunchto/bare-module-traverse> may also be specified.

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
--format|-f
--encoding|-e
--platform|-p <name>
--arch|-a <name>
--simulator
--target|-t <host>
--help|-h
```

##### Target

By default, the bundle will be created for the host platform and architecture. To instead create a bundle for a different target system, pass the `--platform`, `--arch`, and `--simulator` flags.

```console
bare-pack --platform <darwin|ios|linux|android|win32> --arch <arm|arm64|ia32|x64> [--simulator] index.js
```

Behind the scenes, the `--platform`, `--arch`, and `--simulator` flags are used to construct a single `--target` flag for the targeted system. To create a combined bundle for multiple target systems, pass several `--target` flags explicitly.

```console
bare-pack --target <platform>-<arch>[-simulator] --target ... index.js
```

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
