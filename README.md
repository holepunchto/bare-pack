# bare-pack

Bundle packing for Bare.

```
npm i bare-pack
```

## Usage

```js
const pack = require('bare-pack')

async function readModule (url) {
  // Read `url` if it exists, otherwise `null`
}

async function * listPrefix (url) {
  // Yield URLs that have `url` as a prefix. The list may be empty.
}

const bundle = await pack(new URL('file:///directory/file.js'), readModule, listPrefix)
```

## API

#### `const bundle = await pack(url[, options], readModule[, listPrefix])`

Bundle the module graph rooted at `url`, which must be a WHATWG `URL` instance. `readModule` is called with a `URL` instance for every module to be read and must either return the module source, if it exists, or `null`. `listPrefix` is called with a `URL` instance of every prefix to be listed and must yield `URL` instances that have the specified `URL` as a prefix. If not provided, prefixes won't be bundled.

Options include:

```js
{
  concurrency: 1
}
```

Options supported by <https://github.com/holepunchto/bare-module-traverse> may also be specified.

## License

Apache-2.0
