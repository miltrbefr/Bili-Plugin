import fs from 'node:fs'
import {
    pluginApplications
} from "./model/constant.js"

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

redis.del('bili:autosign:task')
export { apps }