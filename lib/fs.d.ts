import Buffer from 'bare-buffer'
import URL from 'bare-url'

/**
 * A `readModule` callback for `pack()` that reads modules from the file system.
 * @returns a promise that resolves to the module source, or `null` if it could not be read.
 */
export function readModule(url: URL): Promise<Buffer | null>

/**
 * A `resolveModule` callback for `pack()` that resolves `file:` URLs to their real path, preserving
 * a trailing slash. Other URLs, and URLs that cannot be resolved, are returned as-is.
 */
export function resolveModule(url: URL): Promise<URL>

/**
 * A `listPrefix` callback for `pack()` that yields `url` if it is a file, or every file nested
 * under it if it is a directory.
 */
export function listPrefix(url: URL): AsyncGenerator<URL>
