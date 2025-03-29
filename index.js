import fs from 'node:fs'
import {
    pluginApplications
} from "./model/constant.js"
import Bili from './model/bili.js';
import QQBot from './model/QQBot.js';
import config from './model/Config.js';
const files = fs.readdirSync(pluginApplications).filter(file => file.endsWith('.js'))
Bot.on("notice.group.poke", async event => {
    if (!(await QQBot.check(event))) {
        return false;
    }
    try {
        if (event.target_id == config.QQBot) {
            const updatedBot = {
                ...event.bot,
                nickname: Bot[config.QQBot].nickname,
            };
            event.bot = updatedBot
            event.target_id = event.self_id
        }
    } catch (error) {
        if (event.target_id == config.QQBot) {
            event.target_id = event.self_id
        }
    }
    await QQBot.replaceReply(event)
    return false
})

Bot.on("notice.group.sign", async event => {
    if (!(await QQBot.check(event))) {
        return false
    }
    await QQBot.replaceReply(event)
    return false
});

Bot.on("notice.group.decrease", async event => {
    if (!(await QQBot.check(event))) {
        return false;
    }
    if (event.user_id == config.QQBot) {
        return true
    }
    await QQBot.replaceReply(event)
    return false;
});

Bot.on("notice.group.increase", async event => {
    if (!(await QQBot.check(event))) {
        return false;
    }

    if (event.user_id == config.QQBot) {
        return true
    }

    await QQBot.replaceReply(event)
    return false;
});

Bot.on("notice.group.recall", async event => {
    if (!(await QQBot.check(event))) {
        return false;
    }
    await QQBot.replaceReply(event)
    return false;
});
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

Bili.fetchlist()
Bili.Bilicheck()
QQBot.ensureDataDir()
redis.del('bili:autosign:task')
export { apps }