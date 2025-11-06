const { fileURLToPath } = require('url')
const fs = require('fs')

exports.write = async function write(fd, data) {
  return new Promise((resolve) => {
    fs.write(fd, data, (err, written) => {
      resolve(err ? 0 : written)
    })
  })
}

exports.writeFile = async function writeFile(url, data) {
  return new Promise((resolve) => {
    fs.writeFile(fileURLToPath(url), data, (err) => {
      resolve(!err)
    })
  })
}

exports.readFile = async function readFile(url) {
  return new Promise((resolve) => {
    fs.readFile(fileURLToPath(url), (err, data) => {
      resolve(err ? null : data)
    })
  })
}

exports.makeDir = async function makeDir(url) {
  return new Promise((resolve, reject) => {
    fs.mkdir(fileURLToPath(url), { recursive: true }, (err) => {
      err ? reject(err) : resolve()
    })
  })
}

exports.openDir = async function openDir(url) {
  return new Promise((resolve, reject) => {
    fs.opendir(fileURLToPath(url), (err, dir) => {
      err ? reject(err) : resolve(dir)
    })
  })
}

exports.readModule = async function readModule(url) {
  return exports.readFile(url)
}

async function isFile(url) {
  return new Promise((resolve) => {
    fs.stat(fileURLToPath(url), (err, stat) => {
      resolve(err === null && stat.isFile())
    })
  })
}

async function isDir(url) {
  return new Promise((resolve) => {
    fs.stat(fileURLToPath(url), (err, stat) => {
      resolve(err === null && stat.isDirectory())
    })
  })
}

exports.listPrefix = async function* listPrefix(url) {
  if (await isFile(url)) return yield url

  if (url.pathname[url.pathname.length - 1] !== '/') {
    url.pathname += '/'
  }

  if (await isDir(url)) {
    for await (const entry of await exports.openDir(url)) {
      if (entry.isDirectory()) {
        yield* listPrefix(new URL(entry.name, url))
      } else {
        yield new URL(entry.name, url)
      }
    }
  }
}
