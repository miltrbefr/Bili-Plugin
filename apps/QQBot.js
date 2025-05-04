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

        adapter.pokeFriend = async function(data, self = false) {
            Bot.makeLog("info", "发送私聊戳一戳", `${data.self_id} => ${data.user_id}`, true)
            return data.bot.sendApi("send_poke", {
                user_id: self ? data.self_id : data.user_id,
            })
        }

        adapter.searchSameGroup = async function(data, qq = data.user_id) {
            Bot.makeLog("info", "查找机器人与这个人的共群", `${data.self_id} => ${qq}`, true)
            let body = {
                "1": 3316,
                "2": 0,
                "3": 0,
                "4": {
                    "1": data.self_id,
                    "2": qq,
                    "4": 1,
                    "5": [
                        {
                            "3": {
                                "1": data.self_id,
                                "2": qq,
                            },
                            "5": 3436,
                        },
                        {
                            "3": {
                                "1": {
                                    "1": {
                                        "6": `${qq}`,
                                    },
                                    "2": 1,
                                },
                            },
                            "5": 3460,
                        },
                    ],
                    "6": 0,
                },
                "6": "android 8.9.28",
            }
            let res = await Packet.Send(data,"OidbSvc.0xcf4", body)
            if (!res[4][12][1]) {
                return [];
            }
            return res[4][12][1].map((item) => {
                return {
                    groupName: item["3"],
                    Group_Id: item["1"],
                };
            })
        }

        adapter.pickFriend = function(data,  user_id) {
            const i = {
                ...data.bot.fl.get(user_id),
                ...data,
                user_id,
              }
              return {
                ...i,
                sendMsg: this.sendFriendMsg.bind(this, i),
                getMsg: this.getMsg.bind(this, i),
                recallMsg: this.recallMsg.bind(this, i),
                getForwardMsg: this.getForwardMsg.bind(this, i),
                sendForwardMsg: this.sendFriendForwardMsg.bind(this, i),
                sendFile: this.sendFriendFile.bind(this, i),
                getInfo: this.getFriendInfo.bind(this, i),
                poke: self  => this.pokeFriend(i,self),
                searchSameGroup: qq  => this.searchSameGroup(i,qq),
                getAvatarUrl() { return this.avatar || `https://q.qlogo.cn/g?b=qq&s=0&nk=${user_id}` },
                getChatHistory: this.getFriendMsgHistory.bind(this, i),
                thumbUp: this.sendLike.bind(this, i),
                delete: this.deleteFriend.bind(this, i),
              }
        }

        adapter.sendGroupSign = async function(data) {
            Bot.makeLog("info", "群打卡", `${data.self_id} => ${data.group_id}`, true)
            const body = {
                2: {
                    1: String(data.self_id),
                    2: String(data.group_id),
                    3: '9.0.90',
                },
            }
            const rsp = await Packet.sendOidb(data, "OidbSvc.0xeb7_1", body)
            return { result: rsp[3] & 0xffffffff }
        }

        adapter.poke = async function(data,qq) {
            Bot.makeLog("info", "发送群戳一戳", `${data.self_id} => ${data.group_id}`, true)
            const body = {
                1: qq,
                2: data.group_id,
            }
            const rsp = await Packet.sendOidb(data, "OidbSvc.0xed3", body)
            return rsp[3] === 0
        }

        adapter.pickGroup = function(data, group_id) {
            if (typeof group_id === "string" && group_id.match("-")) {
                const guild_id = group_id.split("-")
                const i = {
                  ...data.bot.gl.get(group_id),
                  ...data,
                  guild_id: guild_id[0],
                  channel_id: guild_id[1],
                }
                return {
                  ...i,
                  sendMsg: this.sendGuildMsg.bind(this, i),
                  getMsg: this.getMsg.bind(this, i),
                  recallMsg: this.recallMsg.bind(this, i),
                  getForwardMsg: this.getForwardMsg.bind(this, i),
                  getInfo: this.getGuildInfo.bind(this, i),
                  getChannelArray: this.getGuildChannelArray.bind(this, i),
                  getChannelList: this.getGuildChannelList.bind(this, i),
                  getChannelMap: this.getGuildChannelMap.bind(this, i),
                  getMemberArray: this.getGuildMemberArray.bind(this, i),
                  getMemberList: this.getGuildMemberList.bind(this, i),
                  getMemberMap: this.getGuildMemberMap.bind(this, i),
                  pickMember: this.pickMember.bind(this, i),
                }
              }
          
              const i = {
                ...data.bot.gl.get(group_id),
                ...data,
                group_id,
              }
              return {
                ...i,
                sendMsg: this.sendGroupMsg.bind(this, i),
                getMsg: this.getMsg.bind(this, i),
                recallMsg: this.recallMsg.bind(this, i),
                getForwardMsg: this.getForwardMsg.bind(this, i),
                sendForwardMsg: this.sendGroupForwardMsg.bind(this, i),
                sendFile: (file, name) => this.sendGroupFile(i, file, undefined, name),
                getInfo: this.getGroupInfo.bind(this, i),
                getAvatarUrl() { return this.avatar || `https://p.qlogo.cn/gh/${group_id}/${group_id}/0` },
                getChatHistory: this.getGroupMsgHistory.bind(this, i),
                getHonorInfo: this.getGroupHonorInfo.bind(this, i),
                getEssence: this.getEssenceMsg.bind(this, i),
                getMemberArray: this.getMemberArray.bind(this, i),
                getMemberList: this.getMemberList.bind(this, i),
                getMemberMap: this.getMemberMap.bind(this, i),
                pickMember: this.pickMember.bind(this, i, group_id),
                pokeMember: qq => this.poke(i,qq),
                setName: this.setGroupName.bind(this, i),
                setAvatar: this.setGroupAvatar.bind(this, i),
                setAdmin: this.setGroupAdmin.bind(this, i),
                setCard: this.setGroupCard.bind(this, i),
                setTitle: this.setGroupTitle.bind(this, i),
                sign: this.sendGroupSign.bind(this, i),
                muteMember: this.setGroupBan.bind(this, i),
                muteAll: this.setGroupWholeKick.bind(this, i),
                kickMember: this.setGroupKick.bind(this, i),
                quit: this.setGroupLeave.bind(this, i),
                fs: this.getGroupFs(i),
                get is_owner() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "owner" },
                get is_admin() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "admin" || this.is_owner },
              }
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
               await sendButton(buttons)
            }

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
                Bot.makeLog("error", ["消息发送错误", msg, error], id)
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