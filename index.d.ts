import Bundle from 'bare-bundle'
import { TraverseOptions } from 'bare-module-traverse'
import Buffer from 'bare-buffer'
import URL from 'bare-url'

interface PackOptions extends TraverseOptions {
  concurrency?: number
}

declare function pack(
  entry: URL,
  opts: PackOptions,
  readModule: (url: URL) => Buffer | string | null,
  listPrefix?: (url: URL) => Iterable<URL>
): Promise<Bundle>

declare function pack(
  entry: URL,
  readModule: (url: URL) => Buffer | string | null,
  listPrefix?: (url: URL) => Iterable<URL>
): Promise<Bundle>

declare namespace pack {
  export { type PackOptions }
}

export = pack
