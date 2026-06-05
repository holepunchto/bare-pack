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
