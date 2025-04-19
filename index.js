import { pluginName, Version as Version } from "#model"
import { loadApps, logSuccess } from "./lib/load/loadApps.js"

let apps, loadeYilesCount = 0, loadeYilesCounterr = 0

try {
  const {
    apps: loadedApps,
    loadeYilesCount: count,
    loadeYilesCounterr: counterr
  } = await loadApps({ AppsName: "apps" })

  apps = loadedApps
  loadeYilesCount = count
  loadeYilesCounterr = counterr
  logSuccess(
    `---------------------------`,
    `${pluginName} v${Version.version} 载入成功！`,
    `作者：${Version.author}`,
    `感谢这些默默付出的人们：${Version.Contributor}`,
    `共加载了 ${loadeYilesCount} 个插件文件，${loadeYilesCounterr} 个失败`,
    `---------------------------`
  )
logger.mark(" ╱|、")
logger.mark("(˚ˎ 。7")
logger.mark(" |、˜〵")
logger.mark("じしˍ,)ノ")
logger.mark(logger.cyan("⸝⸝｡･ω･｡⸝⸝"))
logger.mark(logger.green(" づ❤⊂"))
logger.mark(logger.cyan("🎀 欢迎使用Bili插件🎀"))
logger.mark(logger.yellow("交流群 470225982"))
redis.del('bili:autosign:task')
} catch (error) {
  logger.error(`${pluginName}插件加载失败：`, error)
}

export { apps }
