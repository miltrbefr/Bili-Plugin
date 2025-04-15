import configs from '../model/Config.js';
import fs from 'fs'
import path from 'path'
const isTRSS = Array.isArray(Bot.uin)
let QQBotconfig = null
/**
 * 动态导入模块，支持大小写不敏感的路径匹配
 * @param {string} modulePath - 模块路径
 * @returns {Promise<object|null>} 导入的模块或 null
 */
async function tryImport(modulePath) {
    try {
        return await import(modulePath)
    } catch (e) {
        const dir = path.dirname(modulePath)
        const fileName = path.basename(modulePath)
        try {
            const files = fs.readdirSync(dir);
            const matchedFile = files.find(file => 
                file.toLowerCase() === fileName.toLowerCase()
            )
            if (matchedFile) {
                const resolvedPath = path.join(dir, matchedFile)
                return await import(resolvedPath)
            }
        } catch (e) {
            return null
        }
        return null
    }
}
const possiblePaths = [
    '../../../plugins/Yunzai-QQBot-Plugin/Model/index.js',
    '../../../plugins/QQBot-Plugin/Model/index.js'
]
for (const modulePath of possiblePaths) {
    QQBotconfig = await tryImport(modulePath)
    if (QQBotconfig) break
}
if (!QQBotconfig) {
    logger.error(
        `[BILI-PLUGIN] 未找到QQBot的配置文件 ${logger.yellow("直接发链接功能")} 将无法使用`
    )
}

let attempts = 0
const maxAttempts = 250
const delay = 200
const checkAdapters = async () => {
    let QQBot = Bot.adapter.find(adapter => adapter.version === 'qq-group-bot v11.45.14')
    if (QQBotconfig) QQBot = Bot.adapter.find(adapter => adapter.name === 'QQBot')
    const ICQQ = Bot.adapter.find(adapter => adapter.name === 'ICQQ')
    const setupICQQ = (adapter) => {
        adapter.sendMsg = async function(id, pick, msg, ...args) {
            const rets = {
                message_id: [],
                data: [],
                error: []
            }
            try {
                const processMessages = async () => {
                    const processed = {
                        buttonMsgs: [],
                        normalMsgs: [],
                        rawMsgs: Array.isArray(msg) ? [...msg] : [msg]
                    }
                    for (const item of processed.rawMsgs) {
                        const type = item?.type;
                        if (type === 'button') {
                            processed.buttonMsgs.push({
                                type: "button",
                                appid: this.markdown_appid,
                                content: {
                                    rows: this.makeButtons(id, pick, item.data)
                                },
                            })
                        } else {
                            processed.normalMsgs.push(item);
                        }
                    }
                    let normalMsgs = await this.makeMsg(id, pick, processed.normalMsgs);
                    if (normalMsgs.length === 0) {
                        return {
                            messages: processed.buttonMsgs,
                        }
                    }
                    if (Array.isArray(normalMsgs) && normalMsgs.length > 0 && Array.isArray(normalMsgs[0]))
                        normalMsgs = normalMsgs[0]

                    return {
                        messages: configs.sendbutton ? [[...normalMsgs], ...processed.buttonMsgs] : normalMsgs,
                    }
                }
                let { messages } = await processMessages()
                const sendMsg = async () => {
                    for (const i of messages) try {
                        Bot.makeLog("debug", ["发送消息", i], id)
                        const ret = await pick.sendMsg(i, ...args)
                        Bot.makeLog("debug", ["发送消息返回", ret], id)
                        rets.data.push(ret)
                        if (ret.message_id)
                            rets.message_id.push(ret.message_id)
                    } catch (err) {
                        rets.error.push(err)
                        return false
                    }
                }
                if (await sendMsg() === false) {
                    messages = await this.makeMsg(id, pick,
                        [await Bot.makeForwardMsg([{ message: messages?.[0] }])])
                    await sendMsg()
                }
                return rets.data.length === 1 ? rets.data[0] : rets
            } catch (error) {
                Bot.makeLog("error", ["消息发送错误", messages, error], id)
                rets.error.push(error)
                return rets
            }
        }
    }
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
        if (QQBot) setupQQBot(QQBot)
        if (ICQQ && configs.sendbutton) setupICQQ(ICQQ)
    }
    if (QQBot && ICQQ) {
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
if (isTRSS && (QQBotconfig && configs.QQBotsendlink || configs.sendbutton)) checkAdapters()