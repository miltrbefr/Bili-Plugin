import configs from '../model/Config.js'
const isTRSS = Array.isArray(Bot.uin)
let QQBotconfig = null
const possiblePaths = [
    '../../../plugins/Yunzai-QQBot-Plugin/Model/index.js',
    '../../../plugins/QQBot-Plugin/Model/index.js',
    '../../../plugins/yunzai-qqbot-plugin/Model/index.js',
    '../../../plugins/Yunzai-QQBot-plugin/Model/index.js',
    '../../../plugins/yunzai-QQBot-Plugin/Model/index.js',
    '../../../plugins/qqbot-plugin/Model/index.js',
    '../../../plugins/QQBot-plugin/Model/index.js',
    '../../../plugins/Qqbot-Plugin/Model/index.js',
    '../../../plugins/Yunzai-QQBot/Model/index.js',
    '../../../plugins/QQBot/Model/index.js',
    '../../../plugins/qqbot/Model/index.js',
]
try {
    for (const path of possiblePaths) {
        try {
            QQBotconfig = await import(path)
            if (QQBotconfig) break
        } catch (e) {
            logger.info(`[BILI-PLUGIN] 尝试加载路径 ${path} 的适配器失败`)
        }
    }
    if (!QQBotconfig) {
        logger.warn(
            `[BILI-PLUGIN] 未找到QQBot的配置文件 ${logger.yellow("直接发链接功能")} 将无法使用`
        )
        logger.error('请确保已安装并更新最新版QQBot插件')
    }
} catch (e) {
    logger.error(`加载QQBot配置时发生错误: ${e.message}`)
    logger.error('请升级至最新版云崽');
}

let attempts = 0
const maxAttempts = 100
const delay = 200
const checkAdapters = async () => {
    const QQBot1 = Bot.adapter.find(adapter => adapter.version === 'qq-group-bot v11.45.14');
    const setupQQBot = (adapter) => {
        adapter.makeMsg = async function(data, msg) {
            const sendType = ['audio', 'image', 'video', 'file']
            const messages = []
            const button = []
            let message = []
            let reply
            let {Runtime,Handler,config} = QQBotconfig
            for (let i of Array.isArray(msg) ? msg : [msg]) {
                if (typeof i == 'object') {
                    i = {
                        ...i
                    }
                } else {
                    i = {
                        type: 'text',
                        text: i
                    }
                }
                switch (i.type) {
                    case 'at':
                        // if (config.toQQUin && userIdCache[user_id]) {
                        //   i.qq = userIdCache[user_id]
                        // }
                        // i.qq = i.qq?.replace?.(`${data.self_id}${this.sep}`, "")
                        continue
                    case 'text':
                    case 'face':
                    case 'ark':
                    case 'embed':
                        break
                    case 'record':
                        i.type = 'audio'
                        i.file = await this.makeRecord(i.file)
                    case 'video':
                    case 'image':
                        if (message.some(s => sendType.includes(s.type))) {
                            messages.push(message)
                            message = []
                        }
                        break
                    case 'file':
                       // if (i.file) i.file = await Bot.fileToUrl(i.file, i, i.type)
                       // i = {
                       //     type: 'text',
                       //     text: `文件：${i.file}`
                       // }
                       // break
                        return []
                    case 'reply':
                        if (i.id.startsWith('event_')) {
                            reply = {
                                type: 'reply',
                                event_id: i.id.replace(/^event_/, '')
                            }
                        } else {
                            reply = i
                        }
                        continue
                    case 'markdown':
                        if (typeof i.data == 'object') {
                            i = {
                                type: 'markdown',
                                ...i.data
                            }
                        } else {
                            i = {
                                type: 'markdown',
                                content: i.data
                            }
                        }
                        break
                    case 'button':
                        config.sendButton && button.push(...this.makeButtons(data, i.data))
                        continue
                    case 'node':
                        if (Handler.has('ws.tool.toImg') && config.toImg) {
                            const e = {
                                reply: (msg) => {
                                    i = msg
                                },
                                user_id: data.bot.uin,
                                nickname: data.bot.nickname
                            }
                            e.runtime = new Runtime(e)
                            await Handler.call('ws.tool.toImg', e, i.data)
                            // i.file = await Bot.fileToUrl(i.file)
                            if (message.some(s => sendType.includes(s.type))) {
                                messages.push(message)
                                message = []
                            }
                        } else {
                            for (const {
                                    message
                                }
                                of i.data) {
                                messages.push(...(await this.makeMsg(data, message)))
                            }
                        }
                        break
                    case 'raw':
                        if (Array.isArray(i.data)) {
                            messages.push(i.data)
                            continue
                        }
                        i = i.data
                        break
                    default:
                        i = {
                            type: 'text',
                            text: JSON.stringify(i)
                        }
                }
                if (i.type === 'text' && i.text) {
                    let toQRCodeRegExp
                    if (typeof config.toQRCode == 'boolean') {
                        toQRCodeRegExp = config.toQRCode ? /(?<!\[[^\]]*\]\()(?:https?:\/\/)?[-\w]+(?:\.[-\w]+)+(?:[-\w.,@?^=%&:/~+#]*[-\w@?^=%&/~+#])?/g : false
                    } else {
                        toQRCodeRegExp = new RegExp(config.toQRCode, 'g')
                    }
                    const match = i.text.match(toQRCodeRegExp)
                    if (match) {
                        for (const url of match) {
                            const modifiedUrl = url.replace(
                                /\.[a-z]{2,}(?=[/?]|$)/gi,
                                (match) => match.toUpperCase()
                            )
                            i.text = i.text.replace(url, modifiedUrl)
                        }
                    }
                }
                if (i.type !== 'node') message.push(i)
            }
            if (message.length) {
                messages.push(message)
            }
            while (button.length) {
                messages.push([{
                    type: 'keyboard',
                    content: {
                        rows: button.splice(0, 5)
                    }
                }])
            }
            if (reply) {
                for (const i of messages) i.unshift(reply)
            }
            return messages
        }
    }
    const handleAdapters = () => {
        if (QQBot1) setupQQBot(QQBot1)
    }
    if (QQBot1) {
        handleAdapters()
        return
    }
    attempts++
    if (attempts >= maxAttempts) {
        handleAdapters()
        return
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    await checkAdapters()
}
if (isTRSS && QQBotconfig && configs.QQBotsendlink) checkAdapters()