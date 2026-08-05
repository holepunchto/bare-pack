import Bundle from 'bare-bundle'
import { TraverseOptions } from 'bare-module-traverse'
import Buffer from 'bare-buffer'
import URL from 'bare-url'

interface PackOptions extends TraverseOptions {
  concurrency?: number
  base?: URL | string
  offload?: boolean | { addons?: boolean; assets?: boolean }
}

interface ReadModuleCallback {
  (url: URL): Buffer | string | null
}

interface ListPrefixCallback {
  (url: URL): Iterable<URL>
}

interface WriteFileCallback {
  (url: URL, source: Buffer | string): string | null | void
}

/**
 * Bundle the module graph rooted at `url`, which must be a WHATWG `URL` instance. `readModule` is called with a `URL` instance for every module to be read and must either return the module source, if it exists, or `null`. `listPrefix` is called with a `URL` instance of every prefix to be listed and must yield `URL` instances that have the specified `URL` as a prefix. If not provided, prefixes won't be bundled. `writeFile` is called for every addon or asset that should be offloaded rather than embedded; see the [Offloading section of the README](https://github.com/holepunchto/bare-pack#offloading). When `writeFile` is provided, `listPrefix` must be passed positionally (or as `null`).
 * @param entry - The root of the module graph to bundle; must be a WHATWG `URL` instance (typically a `file:` URL).
 * @param opts - Packing options, extending [`TraverseOptions`](/reference/bare/modules/bare-module-traverse) from `bare-module-traverse`. Adds `concurrency`, `base` (the URL that offloaded file paths are made relative to), and `offload` (whether to write addons and/or assets to disk instead of embedding them).
 * @param readModule - Called with a `URL` for every module in the graph; returns the module source as a `Buffer` or string, or `null` if it does not exist.
 * @param listPrefix - Called with a `URL` for every prefix to list; yields the `URL`s that have it as a prefix. Pass `null` (or omit) to skip prefix bundling.
 * @param writeFile - Called for each addon or asset to offload rather than embed, receiving the file `URL` and its source. See the [Offloading section of the README](https://github.com/holepunchto/bare-pack#offloading).
 * @returns a promise that resolves to the packed [`bare-bundle`](https://github.com/holepunchto/bare-bundle) `Bundle`, with all statically resolvable imports preresolved.
 */
declare function pack(
  entry: URL,
  opts: PackOptions,
  readModule: ReadModuleCallback,
  listPrefix: ListPrefixCallback | null,
  writeFile: WriteFileCallback
): Promise<Bundle>

declare function pack(
  entry: URL,
  opts: PackOptions,
  readModule: ReadModuleCallback,
  listPrefix?: ListPrefixCallback
): Promise<Bundle>

declare function pack(
  entry: URL,
  readModule: ReadModuleCallback,
  listPrefix: ListPrefixCallback | null,
  writeFile: WriteFileCallback
): Promise<Bundle>

declare function pack(
  entry: URL,
  readModule: ReadModuleCallback,
  listPrefix?: ListPrefixCallback
): Promise<Bundle>

declare namespace pack {
  export {
    type PackOptions,
    type ReadModuleCallback,
    type ListPrefixCallback,
    type WriteFileCallback
  }
}

export = pack
