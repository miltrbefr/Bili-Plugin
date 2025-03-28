import fs from 'fs';
import path from 'path';
import QQBot from '../model/QQBot.js';
import configs from '../model/Config.js';
import makeConfig from "../../../lib/plugins/config.js"
const { config } = await makeConfig("ICQQ", {
    tips: "",
    permission: "master",
    markdown: {
        mode: false,
        button: false,
        callback: true,
    },
    bot: {},
    token: [],
}, {
    tips: [
        "欢迎使用 TRSS-Yunzai ICQQ Plugin ! 作者：时雨🌌星空",
        "参考：https://github.com/TimeRainStarSky/Yunzai-ICQQ-Plugin",
    ],
})
const dataDir = './data/bili/QQBotenvent'
let attempts = 0
const maxAttempts = 5
const delay = 100
const checkAdapters = async () => {
    const OneBotv11 = Bot.adapter.find(adapter => adapter.name === 'OneBotv11');
    const ICQQ = Bot.adapter.find(adapter => adapter.name === 'ICQQ');
    const setupOneBotv11 = (adapter) => {
        adapter.sendGroupMsg = async function(data, msg) {
            return this.sendMsg(msg, async (message) => {
                Bot.makeLog("info", `发送群消息：${this.makeLog(message)}`, `${data.self_id} => ${data.group_id}`, true)
                if (QQBot && await QQBot.isQQBotcheck(data.group_id, data.self_id) && await QQBot.getisGroup(data.group_id))
                    return await QQBot.sendmsgs(msg, data.group_id, data.self_id)
                return data.bot.sendApi("send_msg", {
                    group_id: data.group_id,
                    message,
                })
            }, msg => this.sendGroupForwardMsg(data, msg))
        }
        adapter.recallMsg = async function(data, message_id) {
            Bot.makeLog("info", `撤回消息：${message_id}`, data.self_id)
            if (!Array.isArray(message_id))
                message_id = [message_id]
            const msgs = []
            for (const i of message_id) {
                if (QQBot && await QQBot.isQQBotcheck(data.group_id, data.self_id) && await QQBot.getisGroup(data.group_id)) {
                    msgs.push(await QQBot.recall(message_id, data.group_id))
                    continue
                }
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
                return await QQBot.sendmsgs(msg, pick.group_id, id)
            }
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
            Bot.makeLog("info", `撤回消息：${message_id}`, id)
            if (!Array.isArray(message_id))
                message_id = [message_id]
            const msgs = []
            for (const i of message_id) {
                if (QQBot && await QQBot.isQQBotcheck(pick.group_id, id) && await QQBot.getisGroup(pick.group_id)) {
                    msgs.push(await QQBot.recall(message_id, pick.group_id))
                    continue
                }
                msgs.push(await pick.recallMsg(i))
            }
            return msgs
        }
    }
    const handleAdapters = () => {
        if (OneBotv11) setupOneBotv11(OneBotv11)
        if (ICQQ) setupICQQ(ICQQ)
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

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, {
            recursive: true
        });
    }
}


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
    ensureDataDir()
    const eventId = rawEvent.event_id;
    const filePath = path.join(dataDir, `${groupid2}.json`);
    const data = {
        event_id: eventId,
        openid: rawEvent.group_id,
        time: Date.now()
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
    await redis.del(`bili:skipgroup:${buttonId}`)
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