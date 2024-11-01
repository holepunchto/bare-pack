const { fileURLToPath } = require('url')
const fs = require('fs')

exports.write = async function write (fd, data) {
  return new Promise((resolve) => {
    fs.write(fd, data, (err, written) => {
      resolve(err ? 0 : written)
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
