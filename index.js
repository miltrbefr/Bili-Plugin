import fs from 'node:fs'
import { pluginApplications, pluginRoot } from "./model/constant.js"
import Bili from './model/bili.js';
const files = fs.readdirSync(pluginApplications).filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

logger.mark(logger.yellow("Bili插件载入完毕"))
logger.mark(logger.yellow("交流群 218277938"))
logger.mark(" ╱|、")
logger.mark("(˚ˎ 。7")
logger.mark(" |、˜〵")
logger.mark("じしˍ,)ノ")
logger.mark(logger.cyan("⸝⸝｡･ω･｡⸝⸝"))
logger.mark(logger.green(" づ❤⊂"))
logger.mark(logger.cyan("🎀 欢迎使用哔站插件🎀"))

await Bili.fetchlist()
await Bili.Bilicheck()
await redis.del('bili:autosign:task')
const configPath = `${pluginRoot}/config/config.yaml`

async function reloadApps() {
  const newFiles = fs.readdirSync(pluginApplications).filter(file => file.endsWith('.js'))
  const newRet = await Promise.allSettled(newFiles.map(file => import(`./apps/${file}`)))

  for (let i in newFiles) {
    let name = newFiles[i].replace('.js', '')

    if (newRet[i].status !== 'fulfilled') {
      logger.error(`[Bili-Plugin] 重新载入插件错误：${logger.red(name)}`)
      logger.error(newRet[i].reason)
      continue
    }
    
    apps[name] = newRet[i].value[Object.keys(newRet[i].value)[0]]
    logger.info(`[Bili-Plugin] 插件 ${name} 重新加载成功`)
  }
}

let isReloading = false
fs.watch(configPath, async (eventType) => {
  if (eventType === 'change' && !isReloading) {
    isReloading = true
    try {
      await reloadApps()
    } catch (error) {
      logger.error('[Bili-Plugin] 插件重载失败:', error)
    } finally {
      isReloading = false
    }
  }
})

export { apps }