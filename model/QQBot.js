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

    async sendmsgs(msgs, groupId) {
        await this.ensureDataDir();
        const filePath = path.join(this.dataDir, `${groupId}.json`);
        if (!msgs) return false;
        if (!Array.isArray(msgs)) msgs = [msgs];

        const fetchValidEventData = async () => {
            let attempts = 0;
            const maxAttempts = 10
            const retryInterval = 100;

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
                const res = await fetch(`${this.signApi}/getevent?group=${groupId}&appid=${this.appid}&key=${this.key}`)
                const r = await res.json()
                logger.info(r)
                await new Promise(resolve => setTimeout(resolve, retryInterval));
                attempts++;
            }
            return null;
        };

        try {
            const eventData = await fetchValidEventData();
            if (!eventData) {
                logger.error(`[Bili-PLUGIN 野收官发：${groupId}] 事件数据获取失败`);
                return false;
            }

            const group = Bot[config.QQBot].pickGroup(eventData.openid);
            msgs.push({
                type: "reply",
                id: "event_" + eventData.event_id
            });
            await group.sendMsg(msgs);
            return true;
        } catch (error) {
            logger.error(`[Bili-PLUGIN 野收官发：${groupId}]发送失败 `, error);
            return false;
        }
    }

    async check(e) {
        const filePath = `${pluginRoot}/config/config.yaml`;
        const configs = await Bili.loadConfig(filePath);
        const jiantingQQ = (await Bili.getConfig("jiantingQQ", configs)) || [];
        const selfId = String(e.self_id);
        const jiantingQQStr = jiantingQQ.map(id => String(id));
        if (!jiantingQQStr.includes(selfId)) {
            return false;
        }
        const filePath2 = './data/bili/QQBotGroupMap/Groupconfig.json';
        try {
            await fs.promises.access(filePath2);
            const data = await fs.promises.readFile(filePath2, 'utf-8');
            const groupConfig = JSON.parse(data);
            const groupId = String(e.group_id);
            for (const key in groupConfig) {
                if (groupConfig[key] === groupId) {
                    return true
                }
            }
            return false;
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
        await this.ensureDataDir()
        const filePath = path.join(this.dataDir, `${groupId}.json`);

        event.reply = async (msgs, quote = false, data) => {
            if (!msgs) return false;
            if (!Array.isArray(msgs)) msgs = [msgs];
            if (!this.button) msgs = msgs.filter(msg => msg.type !== 'button');
            if (this.ark) msgs = await this.makeark(msgs);
            const fetchValidEventData = async () => {
                let attempts = 0;
                const maxAttempts = 10
                const retryInterval = 100;

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
                    const res = await fetch(`${this.signApi}/getevent?group=${groupId}&appid=${this.appid}&key=${this.key}`)
                    const r = await res.json()
                    logger.info(r)
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                    attempts++;
                }
                return null;
            };

            const eventData = await fetchValidEventData();
            if (!eventData) {
                logger.error(`[Bili-PLUGIN 野收官发：${groupId}] 事件数据获取失败`);
                return false;
            }
            try {
                const group = Bot[config.QQBot].pickGroup(eventData.openid);
                const replySegment = {
                    type: "reply",
                    id: "event_" + eventData.event_id
                };
                const sendBatch = async (messages) => {
                    const response = await group.sendMsg([...messages, replySegment]);

                    if (data?.recallMsg > 0 && response?.message_id) {
                        const recallDelay = Math.min(Math.max(data.recallMsg, 5), 300) * 1000;
                        setTimeout(() => {
                            group.recallMsg(response.message_id).catch(() => {});
                            event.message_id && group.recallMsg(event.message_id).catch(() => {});
                        }, recallDelay);
                    }
                    return true;
                };

                const normalMsgs = msgs.filter(msg => msg.type !== 'raw');
                const rawMsgs = msgs.filter(msg => msg.type === 'raw');
                if (normalMsgs.length > 0 && !(await sendBatch(normalMsgs))) {
                    return false;
                }
                for (const rawMsg of rawMsgs) {
                    if (!(await sendBatch([rawMsg]))) {
                        return false;
                    }
                }

                return true;
            } catch (error) {
                logger.error(`[Bili-PLUGIN 野收官发：${groupId}] 消息发送失败:`, error);
                return false;
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
                        logger.warn(`图片高度${height}超过限制，跳过Ark处理`);
                        newmsgs.push(msg);
                        continue;
                    }

                    const imageUrl = await this.img_hb(buffer);
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