import fs from 'fs'
import { pluginRoot } from "#model"
let packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
let packageJsons = JSON.parse(fs.readFileSync(`${pluginRoot}/package.json`, 'utf8'))
const yunzaiVersion = packageJson.version
const isMiao = packageJson.name === 'miao-yunzai'
const isTrss = !!Array.isArray(Bot.uin)
let currentVersion = packageJsons.version
let author = packageJsons.author
let Contributor = Array.isArray(packageJsons.Contributor) ? [...packageJsons.Contributor] : [packageJsons.Contributor]
let Version = {
  isMiao,
  isTrss,
  get version() {
    return currentVersion
  },
  get yunzai() {
    return yunzaiVersion
  },
  get author() {
    return author
  },
  get Contributor() {
    return Contributor
  }
}

export default Version
