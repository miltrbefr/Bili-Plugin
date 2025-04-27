import configs from '../model/Config.js';
import fs from 'fs'
import path from 'path'
import { Packet, loader as PluginLoader} from "#model"
if (!global.Packet) global.Packet = Packet
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

let faces
(function initializeFaces() {
    faces = []
    if (configs?.faceids) {
    for (let i = 0; i < configs.faceids.length; i++) {
        faces.push({
            "1": String(configs.faceids[i]),
            "2": 1,
            "3": 1000,
            "4": 1
        })
    }
}
if (faces.length === 0) faces = [{
    "1": "66",
    "2": 1,
    "3": 1000,
    "4": 1
}]
})()

let attempts = 0
const maxAttempts = 200
const delay = 200
const checkAdapters = async () => {
    const Napcat = Bot?.adapter?.find(adapter => adapter.name === 'OneBotv11')
    let QQBot = Bot?.adapter?.find(adapter => adapter.version === 'qq-group-bot v11.45.14')
    if (QQBotconfig) QQBot = Bot?.adapter?.find(adapter => adapter.name === 'QQBot')
    const setupNapcat = (adapter) => {
        adapter.makeMsg = async function(msg) {
            if (!Array.isArray(msg))
                msg = [msg]
            const msgs = []
            const forward = []
            const longmsg = []
            for (let i of msg) {
                if (typeof i !== "object")
                    i = {
                        type: "text",
                        data: {
                            text: i
                        }
                    }
                else if (!i.data)
                    i = {
                        type: i.type,
                        data: {
                            ...i,
                            type: undefined
                        }
                    }

                switch (i.type) {
                    case "at":
                        i.data.qq = String(i.data.qq)
                        break
                    case "reply":
                        i.data.id = String(i.data.id)
                        break
                    case "long_msg":
                        longmsg.push(i.data.resid)
                        continue
                    case "json":
                        i.data.data = JSON.stringify(i.data)
                        break
                    case "node":
                        forward.push(...i.data)
                        continue
                    case "raw":
                        i = i.data
                        break
                }

                if (i.data.file)
                    i.data.file = await this.makeFile(i.data.file)

                msgs.push(i)
            }
            return [msgs, forward, longmsg]
        }

        adapter.sendFriendMsg = async function(data, msg) {
            data.isGroup = false
            return this.sendMsg(msg, message => {
                Bot.makeLog("info", `发送好友消息：${this.makeLog(message)}`, `${data.self_id} => ${data.user_id}`, true)
                return data.bot.sendApi("send_msg", {
                  user_id: data.user_id,
                  message,
                })
              }, msg => this.sendFriendForwardMsg(data, msg), msg => this.sendlongmsg(data, msg))
        }

        adapter.sendGroupMsg = async function(data, msg) {
            data.isGroup = true
            return this.sendMsg(msg, message => {
                Bot.makeLog("info", `发送群消息：${this.makeLog(message)}`, `${data.self_id} => ${data.group_id}`, true)
                return data.bot.sendApi("send_msg", {
                  group_id: data.group_id,
                  message,
                })
              }, msg => this.sendGroupForwardMsg(data, msg), msg => this.sendlongmsg(data, msg))
        }

        adapter.sendlongmsg = async function(data, longmsg) {
            if(data.isGroup) {
                Bot.makeLog("info", `发送群聊长消息：${this.makeLog(longmsg)}`, `${data.self_id} => ${data.group_id}`, true)
              } else {
                Bot.makeLog("info", `发送私聊长消息：${this.makeLog(longmsg)}`, `${data.self_id} => ${data.user_id}`, true)
              }
            let ret = []
             for (const i of longmsg) {
                ret.push(await Packet.SendLong_msg(data, i))
             }
             return ret
        }

        adapter.sendMsg = async function(msg, send, sendForwardMsg, sendlongmsg) {
            const [message, forward, longmsg] = await this.makeMsg(msg)
            const ret = []
            if (forward.length) {
                const data = await sendForwardMsg(forward)
                if (Array.isArray(data))
                    ret.push(...data)
                else
                    ret.push(data)
            }
            
            if (message.length)
                ret.push(await send(message))

            if (longmsg.length) {
                await sendlongmsg(longmsg)
            }
            if (ret.length === 1) return ret[0]

            const message_id = []
            for (const i of ret)
                if (i?.message_id)
                    message_id.push(i.message_id)
            return {
                data: ret,
                message_id
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
                    let toQRCodeRegExp = /(?<!\[[^\]]*\]\()(?:https?:\/\/)?[-\w]+(?:\.[-\w]+)+(?:[-\w.,@?^=%&:/~+#]*[-\w@?^=%&/~+#])?/g
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
        if (Napcat) setupNapcat(Napcat)
    }
    if (QQBot && Napcat) {
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
if (QQBotconfig && configs.QQBotsendlink) checkAdapters()
Bot.on('message', async () => {
if (QQBotconfig && configs.QQBotsendlink) checkAdapters()
})
const isTRSS = Array.isArray(Bot.uin)
if (isTRSS && (configs.Napsendtext || configs.ICQQsendfacetext)) {
    const originalLoaderReply = PluginLoader.reply
    PluginLoader.reply = function(e) {
        originalLoaderReply.call(this, e)
        const modifiedReply = e.reply
        e.reply = async (msg = "", quote = false, data = {}) => {
            if (e.group_id && (configs.Napsendtext && e.bot?.adapter?.name === 'OneBotv11') || (configs.ICQQsendfacetext && e.bot?.adapter?.name === 'ICQQ')) {
                let msgArray = Array.isArray(msg) ? [...msg] : [msg]
                const hasContent = msgArray.every(item => {
                    const type = item?.type;
                    return !type || type === 'text'
                })
                if (hasContent) {
                    let text = []
                    for (let i of msg) {
                        const type = i?.type
                        if (!type) {
                            text.push({ "1": { "1": i}})
                        } else {
                            text.push({ "1": { "1": i?.text}})
                        }
                    }
                    return Packet.Elem(e,[...text, {
                        "53": {
                         "1": 38,
                         "2": {
                          "1": {
                           "1": {
                            "1": 5,
                            "2": 7240
                           },
                           "2": faces
                          }
                         },
                         "3": 1
                        }
                    }])
                }
                }
            return modifiedReply(msg, quote, data)
        }
    }
}