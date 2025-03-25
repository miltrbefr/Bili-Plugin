import config from '../model/Config.js';
import fetch from "node-fetch";
import fs from 'fs';
import path from 'path';
import imageSize from 'image-size'
import configModule from "../../../lib/config/config.js"
import {
    pluginRoot
} from '../model/constant.js'
import Bili from '../model/bili.js';
let groupConfigCache = null;
let groupConfigMtime = 0;
let groupIdsCache = new Set()

class QQBot {
    constructor() {
        this.signApi = config.signApi
        this.key = configModule?.qq?.[0] || Bot.uin
        this.ark = config.ark
        this.button = config.button
        this.ck = config.ck
        this.appid = config.appid
        this.dataDir = './data/bili/QQBotenvent'
    }

    async isQQBotcheck(groupId) {
        const configDir = path.join('./data/bili/QQBotGroupMap');
        const configPath = path.join(configDir, 'Groupconfig.json');
        try {
            const rawData = await fs.promises.readFile(configPath, 'utf8');
            const groupMap = JSON.parse(rawData);
            const targetId = String(groupId);
            return Object.values(groupMap).includes(targetId);
        } catch (error) {
            return false
        }
    }

    async getevent(groupId) {
        if(!Bot[config.QQBot]?.adapter?.name) return logger.warn(`[BILI-PLUGIN野收官发]请确保您的QQBot：${logger.red(`${config.QQBot}`)})已经上线再使用野收官发功能！！`)
        if (isNaN(Number(this.appid))) {
            logger.warn(`[Bili-PLUGIN 野收官发]请确保您的${logger.red(`APPID`)}认真填写，当前您的APPID为：${logger.red(`${this.appid}`)}`)
            return null
        }
        const res = await fetch(`${this.signApi}/getevent?group=${groupId}&appid=${this.appid}&key=${this.key}`)
        const r = await res.json()
        logger.debug(r)
        if (r.code !== 0) {
            logger.error(r)
        }
        if (r && r.code === 0 && Math.random() < 0.1) {
            logger.mark(r)
        }
        return r
    }


    async fetchValidEventData(groupId) {
        let attempts = 0;
        const maxAttempts = 10
        const retryInterval = 100;
        const filePath = path.join(this.dataDir, `${groupId}.json`);
        while (attempts < maxAttempts) {
            try {
                const rawData = await fs.promises.readFile(filePath, 'utf8');
                const eventData = JSON.parse(rawData);

                if (Date.now() - eventData.time <= 280 * 1000) {
                    return eventData;
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    await fs.promises.writeFile(filePath, JSON.stringify({
                        time: 1740480612310,
                        event_id: 'default',
                        openid: groupId
                    }));
                }
            }
            const r = await this.getevent(groupId)
            logger.mark(r)
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            attempts++;
        }
        return null;
    };

    async recall(message_id, groupId) {
        const eventData = await this.fetchValidEventData(groupId);
        const group = Bot[config.QQBot].pickGroup(eventData.openid)
        return await group.recallMsg(message_id).catch(() => {});
    }

    async sendmsgs(msgs, groupId) {
        await this.ensureDataDir()
        let msg = msgs
        if (!msgs) return false;
        if (!Array.isArray(msgs)) msgs = [msgs];

        try {
            const eventData = await this.fetchValidEventData(groupId);
            if (!eventData) {
                logger.error(`[Bili-PLUGIN 野收官发：${groupId}] 事件数据获取失败`);
                return Bot.pickGroup(groupId).sendMsg(msg)
            }

            const group = Bot[config.QQBot].pickGroup(eventData.openid);
            msgs.push({
                type: "reply",
                id: "event_" + eventData.event_id
            });

            return await group.sendMsg(msgs);
        } catch (error) {
            logger.error(`[Bili-PLUGIN 野收官发：${groupId}]发送失败 `, error);
            return Bot.pickGroup(groupId).sendMsg(msg)
        }
    }

    async check(e) {
        const filePath = `${pluginRoot}/config/config.yaml`;
        const configs = await Bili.loadConfig(filePath);
        const jiantingQQ = (await Bili.getConfig("jiantingQQ", configs)) || [];
        const selfId = String(e.self_id);
        const jiantingQQSet = new Set(jiantingQQ.map(id => String(id)));
        if (!jiantingQQSet.has(selfId)) {
            return false;
        }
        const filePath2 = './data/bili/QQBotGroupMap/Groupconfig.json';
        try {
            const stats = await fs.promises.stat(filePath2);
            const currentMtime = stats.mtimeMs;
            if (!groupConfigCache || currentMtime !== groupConfigMtime) {
                const data = await fs.promises.readFile(filePath2, 'utf-8');
                groupConfigCache = JSON.parse(data);
                groupConfigMtime = currentMtime;
                groupIdsCache.clear();
                for (const key in groupConfigCache) {
                    groupIdsCache.add(String(groupConfigCache[key]));
                }
            }
            const groupId = String(e.group_id);
            return groupIdsCache.has(groupId);
        } catch (err) {
            return false;
        }
    }

    async ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, {
                recursive: true
            });
        }
    }

    async replaceReply(event) {
        const groupId = event.group_id;
        this.ensureDataDir()
        const defaultOptions = {
            at: false,
            recallMsg: 0
        }
        const Reply = event.reply ? event.reply.bind(event) : fallbackReply
        event.reply = async (msgs, quote = false, data = defaultOptions) => {
            if (!msgs) return false;
            if (!Array.isArray(msgs)) msgs = [msgs]
            if (!Array.isArray(event.message)) event.message = [event.message]

            const filePath2 = `${pluginRoot}/config/config.yaml`;
            const configs = await Bili.loadConfig(filePath2)
            let skipKeywords = (await Bili.getConfig("skipKeywords", configs)) || []
            for (const message of event.message) {
                if (message && message.type === "text") {
                    if (skipKeywords.some(keyword => message.text.includes(keyword))) {
                        return Reply(msgs, quote, data)
                    }
                }
            }
            const filePath3 = `${pluginRoot}/config/config.yaml`;
            const configs2 = await Bili.loadConfig(filePath3)
            let skipMsgType = (await Bili.getConfig("skipMsgType", configs2)) || []

            for (const msg of msgs) {
                if (msg.type) {
                    if (skipMsgType.some(i => msg.type === i)) {
                        return Reply(msgs, quote, data)
                    }
                }
            }

            const {
                at,
                recallMsg
            } = data
            const processedMsgs = []
            if (at) {
                let userId = at === true ? event.user_id : at;
                msgs.unshift(segment.at(userId))
            }
            for (const msg of msgs) {
                if (msg.type === 'at') {
                    try {
                        const member = event.bot.pickMember(groupId, msg.qq);
                        const userInfo = await member.getInfo() || {}
                        processedMsgs.push(segment.text(`@${userInfo.card || userInfo.nickname || msg.qq}`))
                    } catch (err) {
                        processedMsgs.push(segment.text(`@${msg.qq}`))
                    }
                } else {
                    processedMsgs.push(msg);
                }
            }
            msgs = processedMsgs
            if (!this.button) msgs = msgs.filter(msg => msg.type !== 'button');
            if (this.ark) msgs = await this.makeark(msgs);
            const eventData = await this.fetchValidEventData(groupId);
            if (!eventData) {
                logger.error(`[Bili-PLUGIN 野收官发：${groupId}] 事件数据获取失败`);
                return Reply(msgs, quote, data)
            }
            try {
                const group = Bot[config.QQBot].pickGroup(eventData.openid);
                const replySegment = {
                    type: "reply",
                    id: "event_" + eventData.event_id
                };
                let firstResponse
                const sendBatch = async (messages) => {
                    const response = await group.sendMsg([...messages, replySegment]);
                    if (data?.recallMsg > 0 && response?.message_id) {
                        const recallDelay = Math.min(Math.max(data.recallMsg, 5), 300) * 1000;
                        setTimeout(() => {
                            group.recallMsg(response.message_id).catch(() => {});
                            event.message_id && group.recallMsg(event.message_id).catch(() => {});
                        }, recallDelay);
                    }
                    return response
                }
                const normalMsgs = msgs.filter(msg => msg.type !== 'raw');
                const rawMsgs = msgs.filter(msg => msg.type === 'raw')
                if (normalMsgs.length > 0) {
                    firstResponse = await sendBatch(normalMsgs);
                    if (!firstResponse) {
                        logger.error('[Bili-Plugin]普通消息发送失败, 直接野生发送...')
                        return Reply(msgs, quote, data);
                    }
                }
                for (const rawMsg of rawMsgs) {
                    const rawResponse = await sendBatch([rawMsg]);
                    if (!rawResponse) {
                        logger.error('[Bili-Plugin]ARK消息发送失败');
                        return Reply(msgs, quote, data);
                    }
                    if (firstResponse === undefined) {
                        firstResponse = rawResponse
                    }
                }
                return firstResponse || true
            } catch (error) {
                logger.error(`[Bili-PLUGIN 野收官发：${groupId}] 消息发送失败:`, error);
                return Reply(msgs, quote, data)
            }
        };
    }

    async makeark(msgs) {
        const newmsgs = [];
        let textMessage = '';
        let hasImage = false;
        for (const msg of msgs) {
            if (!msg.type) {
                textMessage += String(msg).replace(/\./g, '·');
            } else if (msg.type === 'text') {
                textMessage += msg.data?.text?.replace(/\./g, '·') || '';
            } else if (msg.type === 'image') {
                hasImage = true;
            }
        }

        textMessage = textMessage.trim();
        if (textMessage && !hasImage) {
            newmsgs.push(await this.arktext(textMessage));
            return newmsgs;
        }

        try {
            for (const msg of msgs) {
                if (msg.type === 'image') {
                    const buffer = await Bot.Buffer(msg.file || msg.url)
                    if (!buffer) return msgs
                    const {
                        height
                    } = await this.getImageSize(buffer);

                    if (height > 3450) {
                        logger.warn(`图片高度${height}超过限制，跳过Ark处理`)
                        newmsgs.push(msg);
                        continue;
                    }
                    let imageUrl = null

                    try {
                        const image = await Bot.uploadImage(await Bot.fileToUrl(buffer))
                        imageUrl = image.url.replace('https', 'http')
                        logger.mark(`腾讯图床URL： ${imageUrl}`)
                    } catch (error) {
                        logger.warn('没有ICQQ在线尝试调用作业图床...')
                    }

                    if (!imageUrl) {
                        try {
                            const base64String = buffer.toString('base64')
                            imageUrl = await this.getTencentImageUrl(base64String)
                            imageUrl = imageUrl.replace('https', 'http')
                            logger.mark(`作业图床URL： ${imageUrl}`)
                        } catch (error) {
                            logger.warn('作业图床获取失败,尝试使用花瓣图床...')
                        }
                    }

                    if (!imageUrl) imageUrl = await this.img_hb(buffer)

                    if (!imageUrl) {
                        newmsgs.push(msg);
                        continue;
                    }
                    let summarys = msg.summary
                    if (!textMessage.includes(summarys)) {
                        textMessage += summarys
                    }
                    const summary = textMessage.slice(0, 40) || "官方群聊218277938"
                    newmsgs.push(await this.arkimage(imageUrl, summary));
                }
            }
            if (textMessage.length > 40) {
                newmsgs.unshift(await this.arktext(textMessage));
            }
            const otherMessages = msgs.filter(m => {
                return m.type && !['text', 'image'].includes(m.type);
            });

            newmsgs.push(...otherMessages);

        } catch (error) {
            logger.error('[Bili-PLUGIN 野收官发：ARK消息处理失败]', error);
            return msgs;
        }

        return newmsgs;
    }


    async getTencentImageUrl(base64Image) {
        try {
            const filePath = `${pluginRoot}/config/config.yaml`
            const configs = await Bili.loadConfig(filePath)
            const jiantingQQ = (await Bili.getConfig("jiantingQQ", configs)) || []
            let uin
            if (jiantingQQ.length > 0) {
                const num = Math.floor(Math.random() * jiantingQQ.length)
                uin = jiantingQQ[num]
            } else {
                uin = Bot.uin
            }
            const cookies = await Bili.getQQck(uin, 'qun.qq.com');
            const result = await this.uploadImageToTencent(base64Image, cookies)
            if (result.code === 200) {
                return result.url
            } else {
                logger.error(result.msg)
                return null
            }
        } catch (error) {
            logger.error(error);
            return null
        }
    }

    async uploadImageToTencent(base64Image, parsedCookies) {
        const bkn = await Bili.GTK(parsedCookies.skey)
        const qun_c = `uin=${parsedCookies.uin}; skey=${parsedCookies.skey}; p_skey=${parsedCookies.pskey}; p_uin=${parsedCookies.uin}`
        try {
            const formData = new URLSearchParams()
            formData.append('pic', base64Image)
            formData.append('client_type', '1')
            formData.append('bkn', bkn)

            const response = await fetch('https://qun.qq.com/cgi-bin/hw/util/image', {
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) QQ/9.7.1.28934 Chrome/43.0.2357.134 Safari/537.36 QBCore/3.43.1298.400 QQBrowser/9.0.2524.400',
                    'Origin': 'https://qun.qq.com',
                    'Referer': 'https://qun.qq.com/homework/p/features/index.html',
                    'Cookie': qun_c,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString(),
                redirect: 'follow'
            });

            const data = await response.json();

            if (data.retcode !== 0) {
                return {
                    code: data.retcode,
                    msg: data.msg
                };
            }
            const purl = data.data.url.origin;
            const finalUrl = purl.replace("p.qpic.cn", "p.qlogo.cn");

            return {
                code: 200,
                url: finalUrl
            };
        } catch (error) {
            logger.error(error);
            return {
                code: -1,
                msg: error.message
            };
        }
    }

    async arktext(textMessage) {
        const textArkMessage = segment.raw({
            type: "ark",
            template_id: 23,
            kv: [{
                    key: "#PROMPT#",
                    value: "官方群聊218277938"
                },
                {
                    key: "#LIST#",
                    obj: [{
                        obj_kv: [{
                            key: "desc",
                            value: textMessage.trim() ? textMessage.trim() : "官方群聊218277938"
                        }]
                    }]
                }
            ]
        });
        return textArkMessage
    }

    async img_hb(data) {
        const formdata = new FormData();
        formdata.append("file", new Blob([data], {
            type: 'image/jpeg'
        }), {
            filename: Date.now(),
            contentType: 'image/jpeg',
        });

        try {
            const res = await fetch('https://api.huaban.com/upload', {
                method: 'POST',
                body: formdata,
                headers: {
                    Cookie: ck
                }
            });
            const respond = await res.json();
            const url = `https://gd-hbimg.huaban.com/${respond.key}_fw1200`;
            logger.mark(`[Bili-PLUGIN 野收官发]花瓣图床URL: ${url}`);
            return url;
        } catch (error) {
            logger.error(error);
            return null;
        }
    }

    async getImageSize(buffer) {
        try {
            return imageSize(new Uint8Array(buffer));
        } catch (error) {
            logger.error('[Bili-PLUGIN 野收官发]获取图片尺寸失败:', error);
            return {
                width: 0,
                height: 0
            };
        }
    }

    async arkimage(imageUrl, summary) {
        let customWords = ["签到", "芙宁娜面板", "米游社全部签到", "#扫码登录", "哔站签到", "哔站功能", "哔站登录", "菜单", "网易功能", "#深渊", "#练度统计", "*练度统计", "#角色", "*角色", "体力", "哔站签到记录", "我的哔站", "#原石预估", "芙宁娜伤害", "#队伍伤害 角色，角色", "#更新面板", "*更新面板"]
        const selectedWord = customWords[Math.floor(Math.random() * customWords.length)]
        const arkMessage = segment.raw({
            type: "ark",
            template_id: 37,
            kv: [{
                    key: "#PROMPT#",
                    value: summary || "官方群聊218277938"
                },
                {
                    key: "#METATITLE#",
                    value: `宝宝还能艾特我发送『${selectedWord} 』哦~`
                },
                {
                    key: "#METASUBTITLE#",
                    value: summary || "官方群聊218277938"
                },
                {
                    key: "#METACOVER#",
                    value: imageUrl
                }
            ]
        });
        return arkMessage
    }

}
export default new QQBot();