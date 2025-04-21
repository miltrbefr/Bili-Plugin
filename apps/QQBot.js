import configs from '../model/Config.js';
import fs from 'fs'
import path from 'path'
import { MakButton as Make, Packet, loader as PluginLoader} from "#model"
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

let attempts = 0
const maxAttempts = 200
const delay = 200
const checkAdapters = async () => {
    const Napcat = Bot?.adapter?.find(adapter => adapter.name === 'OneBotv11')
    let QQBot = Bot?.adapter?.find(adapter => adapter.version === 'qq-group-bot v11.45.14')
    if (QQBotconfig) QQBot = Bot?.adapter?.find(adapter => adapter.name === 'QQBot')
    const ICQQ = Bot?.adapter?.find(adapter => adapter.name === 'ICQQ')
    const setupNapcat = (adapter) => {
        adapter.makeMsg = async function(msg) {
            if (!Array.isArray(msg))
                msg = [msg]
            const msgs = []
            const forward = []
            const buttons = []
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
                    case "button":
                        buttons.push(i)
                        continue
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
            return [msgs, forward, buttons, longmsg]
        }

        adapter.sendFriendMsg = async function(data, msg) {
            data.isGroup = false
            return this.sendMsg(msg, message => {
                Bot.makeLog("info", `发送好友消息：${this.makeLog(message)}`, `${data.self_id} => ${data.user_id}`, true)
                return data.bot.sendApi("send_msg", {
                  user_id: data.user_id,
                  message,
                })
              }, msg => this.sendFriendForwardMsg(data, msg), msg => this.sendButton(data, msg), msg => this.sendlongmsg(data, msg))
        }

        adapter.sendGroupMsg = async function(data, msg) {
            data.isGroup = true
            return this.sendMsg(msg, message => {
                Bot.makeLog("info", `发送群消息：${this.makeLog(message)}`, `${data.self_id} => ${data.group_id}`, true)
                return data.bot.sendApi("send_msg", {
                  group_id: data.group_id,
                  message,
                })
              }, msg => this.sendGroupForwardMsg(data, msg), msg => this.sendButton(data, msg), msg => this.sendlongmsg(data, msg))
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

        adapter.sendButton = async function(data, buttons) {
           if(data.isGroup) {
             Bot.makeLog("info", `发送群聊按钮消息：${this.makeLog(buttons)}`, `${data.self_id} => ${data.group_id}`, true)
           } else {
             Bot.makeLog("info", `发送私聊按钮消息：${this.makeLog(buttons)}`, `${data.self_id} => ${data.user_id}`, true)
           }
           const buttonData = []
           buttons.forEach(button => {
               if (Array.isArray(button.data)) {
                   buttonData.push(...button.data)
               } else {
                   buttonData.push(button.data)
               }
           })
           const raw = {
               rows: Make.makeButtons(buttonData)
           }
           const packet = Make.button(raw)
           return Packet.Elem(data, packet)
        }

        adapter.sendMsg = async function(msg, send, sendForwardMsg, sendButton, sendlongmsg) {
            const [message, forward, buttons, longmsg] = await this.makeMsg(msg)
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

            if (buttons.length) {
                const Z = await sendButton(buttons)
                /*
                if (Array.isArray(Z))
                    ret.push(...Z)
                else
                    ret.push(Z)
                */
            }

            if (longmsg.length) {
                const Z = await sendlongmsg(longmsg)
                /*
                if (Array.isArray(Z))
                    ret.push(...Z)
                else
                    ret.push(Z)
                */
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

    const setupICQQ = (adapter) => {
        adapter.makeButtons = function(id, pick, button_square, forward) {
            const msgs = [];
            const random = Math.floor(Math.random() * 2)
            const validTypes = (configs.buttonType || [])
                .map(item => Number(item))
                .filter(num => !isNaN(num) && Number.isInteger(num));
            let typeIndex = 0;
            if (validTypes.length > 0) {
                typeIndex = Math.floor(Math.random() * validTypes.length);
            }
            for (const button_row of button_square) {
                const buttons = [];
                for (const button of button_row) {
                    let style
                    if (validTypes.length > 0 && configs.sendbutton) {
                        style = validTypes[typeIndex]
                        typeIndex = (typeIndex + 1) % validTypes.length
                    } else style = (random + msgs.length + buttons.length) % 2
                    const processedButton = this.makeButton(id, pick, button, style, forward)
                    if (processedButton) {
                        buttons.push(processedButton)
                    }
                }
                if (buttons.length > 0) {
                    msgs.push({
                        buttons
                    })
                }
            }
            return msgs
        }
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
        if (Napcat && configs.sendbutton) setupNapcat(Napcat)
    }
    if (QQBot && ICQQ && Napcat) {
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
if (QQBotconfig && configs.QQBotsendlink || configs.sendbutton) checkAdapters()
Bot.on('message', async () => {
if (QQBotconfig && configs.QQBotsendlink || configs.sendbutton) checkAdapters()
})
const isTRSS = Array.isArray(Bot.uin)
if (isTRSS && configs.Napsendtext) {
    const originalLoaderReply = PluginLoader.reply
    PluginLoader.reply = function(e) {
        originalLoaderReply.call(this, e)
        const modifiedReply = e.reply
        e.reply = async (msg = "", quote = false, data = {}) => {
            if (configs.Napsendtext && e.bot?.adapter?.name === 'OneBotv11') {
                let msgArray = Array.isArray(msg) ? [...msg] : [msg]
                const hasContent = msgArray.every(item => {
                    const type = item?.type;
                    return !type || type === 'text'
                })
                if (hasContent) {
                    let text = ''
                    for (let i of msg) {
                        const type = i?.type
                        if (!type) {
                            text += i
                        } else {
                            text += i?.text
                        }
                    }
                    return Packet.Elem(e,[{ "1": { "1": text}}, {
                        "53": {
                         "1": 38,
                         "2": {
                          "1": {
                           "1": {
                            "1": 5,
                            "2": 7240
                           },
                           "2": [
                            {
                             "1": "0",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "1",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "2",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "3",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "4",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "5",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "6",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "7",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "8",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "9",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "10",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "11",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "12",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "13",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "14",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "15",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "16",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "17",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "18",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "19",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "20",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "21",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "22",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "23",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "24",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "25",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "26",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "27",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "28",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "29",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "30",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "31",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "32",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "33",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "34",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "35",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "36",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "37",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "38",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "39",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "40",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "41",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "42",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "43",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "44",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "45",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "46",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "47",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "48",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "49",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "50",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "51",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "52",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "53",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "54",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "55",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "56",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "57",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "58",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "59",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "60",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "61",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "62",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "63",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "64",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "65",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "66",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "67",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "68",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "69",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "70",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "71",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "72",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "73",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "74",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "75",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "76",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "77",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "78",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "79",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 48
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 49
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 50
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 51
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 52
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 53
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 54
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 55
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 56
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": {
                              "7": 57
                             },
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "90",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "91",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "92",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "93",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "94",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "95",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "96",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "97",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "98",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "99",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "100",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "101",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "102",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "103",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "104",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "105",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "106",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "107",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "108",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "109",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "110",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "111",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "112",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "113",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "114",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "115",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "116",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "117",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "118",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "119",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "120",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "121",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "122",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "123",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "124",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "125",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "126",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "127",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "128",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "129",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "130",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "131",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "132",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "133",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "134",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "135",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "136",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "137",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "138",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "139",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "140",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "141",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "142",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "143",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "144",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "145",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "146",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "147",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "148",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "149",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "150",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "151",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "152",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "153",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "154",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "155",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "156",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "157",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "158",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "159",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "160",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "161",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "162",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "163",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "164",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "165",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "166",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "167",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "168",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "169",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "170",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "171",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "172",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "173",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "174",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "175",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "176",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "177",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "178",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "179",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "180",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "181",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "182",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "183",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "184",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "185",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "186",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "187",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "188",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "189",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "190",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "191",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "192",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "193",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "194",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "195",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "196",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "197",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "198",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            },
                            {
                             "1": "199",
                             "2": 1,
                             "3": 1000,
                             "4": 1
                            }
                           ]
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