import fs from 'fs';
import path from 'path';
import QQBot from '../model/QQBot.js';
import configs from '../model/Config.js';

let QQBotconfig = null

try {
   QQBotconfig =  (await import('../../../plugins/Yunzai-QQBot-Plugin/Model/index.js').catch(e => null))
} catch (e) {
  logger.error(`[plugins/Yunzai-QQBot-Plugin/Model/index.js]路径未获取到小叶姐姐QQBot配置文件 ${logger.yellow("直接发链接功能")} 将无法使用`)
}

const dataDir = './data/bili/QQBotenvent'
let attempts = 0
const maxAttempts = 20
const delay = 100
const checkAdapters = async () => {
    const OneBotv11 = Bot.adapter.find(adapter => adapter.name === 'OneBotv11');
    const ICQQ = Bot.adapter.find(adapter => adapter.name === 'ICQQ');
    const QQBot1 = Bot.adapter.find(adapter => adapter.version === 'qq-group-bot v11.45.14');
    const setupQQBot = (adapter) => {
        adapter.makeMsg = async function(data, msg) {
            const sendType = ['audio', 'image', 'video', 'file']
            const messages = []
            const button = []
            let message = []
            let reply
            const {
              Runtime,
              Handler,
              config
            } = QQBotconfig
            for (let i of Array.isArray(msg) ? msg : [msg]) {
              if (typeof i == 'object') { i = { ...i } } else { i = { type: 'text', text: i } }
        
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
                  if (i.file) i.file = await Bot.fileToUrl(i.file, i, i.type)
                  i = { type: 'text', text: `文件：${i.file}` }
                  break
                case 'reply':
                  if (i.id.startsWith('event_')) {
                    reply = { type: 'reply', event_id: i.id.replace(/^event_/, '') }
                  } else {
                    reply = i
                  }
                  continue
                case 'markdown':
                  if (typeof i.data == 'object') { i = { type: 'markdown', ...i.data } } else { i = { type: 'markdown', content: i.data } }
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
                    for (const { message } of i.data) {
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
                  i = { type: 'text', text: JSON.stringify(i) }
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
                    );
                    i.text = i.text.replace(url, modifiedUrl)
                  }
                }
              }
        
              if (i.type !== 'node') message.push(i)
            }
        
            if (message.length) { messages.push(message) }
        
            while (button.length) {
              messages.push([{
                type: 'keyboard',
                content: { rows: button.splice(0, 5) }
              }])
            }
        
            if (reply) {
              for (const i of messages) i.unshift(reply)
            }
            return messages
        }
    }

    const setupOneBotv11 = (adapter) => {
        adapter.sendGroupMsg = async function(data, msg) {
            return this.sendMsg(msg, (message) => {
                Bot.makeLog("info", `发送群消息：${this.makeLog(message)}`, `${data.self_id} => ${data.group_id}`, true)
                return data.bot.sendApi("send_msg", {
                    group_id: data.group_id,
                    message,
                })
            }, msg => this.sendGroupForwardMsg(data, msg), data)
        }
        adapter.sendMsg = async function(msg, send, sendForwardMsg, data) {
            if(data && data.group_id && QQBot && await QQBot.isQQBotcheck(data.group_id, data.self_id) && await QQBot.getisGroup(data.group_id)) {
                Bot.makeLog("info", `[BILI-PLUGIN ONEBOTV11官发拦截 RUNNING!!!]发送消息: ${this.makeLog(msg)}`, `${configs.QQBot} => ${data.group_id}`, true)
                return await QQBot.sendmsgs(msg, data.group_id, data.self_id)
            }
            const [message, forward] = await this.makeMsg(msg)
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
            if (ret.length === 1) return ret[0]
        
            const message_id = []
            for (const i of ret) if (i?.message_id)
              message_id.push(i.message_id)
            return { data: ret, message_id }
        }
        adapter.recallMsg = async function(data, message_id) {
            if (!Array.isArray(message_id))
                message_id = [message_id]
            const msgs = []
            if (QQBot && await QQBot.isQQBotcheck(data.group_id, data.self_id) && await QQBot.getisGroup(data.group_id)) {
                msgs.push(await QQBot.recall(message_id, data.group_id))
                Bot.makeLog("info", `[BILI-PLUGIN ONEBOTV11官发拦截 RUNNING!!!]撤回消息：${message_id}`, data.self_id)
                return msgs
            }
            Bot.makeLog("info", `撤回消息：${message_id}`, data.self_id)
            for (const i of message_id) {
                msgs.push(await data.bot.sendApi("delete_msg", {
                    message_id: i
                }).catch(i => i))
            }
            return msgs
        }
    }

    const setupICQQ = (adapter) => {
        adapter.sendMsg = async function(id, pick, msg, ...args) {
            const rets = {
                message_id: [],
                data: [],
                error: []
            }
            let msgs
            if (QQBot && await QQBot.isQQBotcheck(pick.group_id, id) && await QQBot.getisGroup(pick.group_id)) {
                Bot.makeLog("info", `[BILI-PLUGIN ICQQ官发拦截 RUNNING!!!]发送消息`, configs.QQBot)
                return await QQBot.sendmsgs(msg, pick.group_id, id)
            }
            const makeConfig = (await import('../../../lib/plugins/config.js'))?.default
            const { config } = await makeConfig("ICQQ")
            const sendMsg = async () => {
                for (const i of msgs) try {
                    Bot.makeLog("debug", ["发送消息", i], id)
                    const ret = await pick.sendMsg(i, ...args)
                    Bot.makeLog("debug", ["发送消息返回", ret], id)

                    rets.data.push(ret)
                    if (ret.message_id)
                        rets.message_id.push(ret.message_id)
                } catch (err) {
                    Bot.makeLog("error", ["发送消息错误", i, err], id)
                    rets.error.push(err)
                    return false
                }
            }

            if (config.markdown.mode) {
                if (config.markdown.mode === "mix")
                    msgs = [
                        ...await this.makeMsg(id, pick, msg),
                        await this.makeMarkdownMsg(id, pick, msg),
                    ]
                else
                    msgs = [await this.makeMarkdownMsg(id, pick, msg)]
            } else {
                msgs = await this.makeMsg(id, pick, msg)
            }

            if (await sendMsg() === false) {
                msgs = await this.makeMsg(id, pick,
                    [await Bot.makeForwardMsg([{
                        message: msg
                    }])])
                await sendMsg()
            }

            if (rets.data.length === 1)
                return rets.data[0]
            return rets
        }
        adapter.recallMsg = async function(id, pick, message_id) {
            if (!Array.isArray(message_id))
                message_id = [message_id]
            const msgs = []
            if (QQBot && await QQBot.isQQBotcheck(pick.group_id, id) && await QQBot.getisGroup(pick.group_id)) {
                msgs.push(await QQBot.recall(message_id, pick.group_id))
                Bot.makeLog("info", `[BILI-PLUGIN ICQQ官发拦截 RUNNING!!!]撤回消息：${message_id}`, configs.QQBot)
                return msgs
            }
            Bot.makeLog("info", `撤回消息：${message_id}`, id)
            for (const i of message_id) {
                msgs.push(await pick.recallMsg(i))
            }
            return msgs
        }
    }
    const handleAdapters = () => {
        if (OneBotv11) setupOneBotv11(OneBotv11)
        if (ICQQ) setupICQQ(ICQQ)
        if (configs.QQBotsendlink && QQBotconfig) {
          if(QQBot1) setupQQBot(QQBot1)
        }
    }
    if (OneBotv11 && ICQQ) {
        handleAdapters()
        return
    }

    attempts++
    if (attempts >= maxAttempts) {
        handleAdapters()
        return
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    await checkAdapters();
}
checkAdapters()

Bot.on("request.group", async event => {
    if (!(await QQBot.check(event))) {
        return false
    }
    if (event.user_id == configs.QQBot) {
        return false
    }
    await QQBot.replaceReply(event)
    return false
});


Bot.on("message.group.callback", async e => {
    const rawEvent = e.raw;

    if (e.bot.callback[rawEvent.data?.["resolved"]?.["button_id"]]) {
        return false;
    }

    const buttonId = rawEvent.data?.["resolved"]?.["button_id"]
    const groupId = `${e.self_id}:${rawEvent.group_id}`;
    const configDir = path.join('./data/bili/QQBotGroupMap');
    const configPath = path.join(configDir, 'Groupconfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const groupid2 = buttonId || config[groupId]
    if (!groupid2) return false
    const eventId = rawEvent.event_id;
    const filePath = path.join(dataDir, `${groupid2}.json`);
    const data = {
        event_id: eventId,
        openid: rawEvent.group_id,
        time: Date.now()
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
    await QQBot.delsikpgroup(groupId)
    checkAdapters()
    return false;
})

export class BiliNB extends plugin {
    constructor() {
        super({
            name: "Bili-Plugin(野收官发)",
            desc: "野收官发",
            event: "message.group.normal",
            priority: Number.MIN_SAFE_INTEGER,
        })
    }

    async accept(event) {
        if (!(await QQBot.check(event))) {
            return false;
        }
        if (event.at == configs.QQBot) {
            event.at = event.self_id
        }
        await QQBot.replaceReply(event)
        return false;
    }
}