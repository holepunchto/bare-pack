const { fileURLToPath } = require('url')
const fs = require('fs')

exports.write = async function write (fd, data) {
  return new Promise((resolve) => {
    fs.write(fd, data, (err, written) => {
      resolve(err ? 0 : written)
    })
  })
}

exports.writeFile = async function writeFile (url, data) {
  return new Promise((resolve) => {
    fs.writeFile(fileURLToPath(url), data, (err) => {
      resolve(!err)
    })
  })
}

exports.readFile = async function readFile (url) {
  return new Promise((resolve) => {
    fs.readFile(fileURLToPath(url), (err, data) => {
      resolve(err ? null : data)
    })
  })
}

exports.openDir = async function openDir (url) {
  return new Promise((resolve, reject) => {
    fs.opendir(fileURLToPath(url), async (err, dir) => {
      err ? reject(err) : resolve(dir)
    })
  })
}

exports.readModule = async function readModule (url) {
  return exports.readFile(url)
}

exports.listPrefix = async function * listPrefix (url) {
  if (url.pathname[url.pathname.length - 1] !== '/') url.pathname += '/'

  for await (const entry of await exports.openDir(url)) {
    if (entry.isDirectory()) {
      yield * listPrefix(new URL(entry.name, url))
    } else {
      yield new URL(entry.name, url)
    }
  }
}
