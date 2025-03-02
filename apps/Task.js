import fs from 'fs';
import path from 'path';
import config from '../model/Config.js';
import Bili from '../model/bili.js';
import QQBot from '../model/QQBot.js';
import moment from 'moment';
import {
    pluginRoot
} from '../model/constant.js';

const filePath = `${pluginRoot}/config/config.yaml`

export class Bilitask extends plugin {
    constructor() {
        super({
            name: "[Bili-Plugin]",
            desc: "一些定时任务",
            event: "message",
            priority: 1677,
            rule: [{
                reg: /^#?日签打卡$/,
                fnc: "QQDailysign",
                permission: 'master'
            }, {
                reg: /^#?执行抽幸运字符$/,
                fnc: "autolukyword",
                permission: 'master'
            }]
        });
        this.task = [{
                cron: '50 59 23 * * *',
                name: '[Bili-Plugin]b站自动删除日志文件',
                fnc: () => this.Bilidellog()
            }, {
                cron: config.livecron,
                name: '[Bili-Plugin]自动发送弹幕',
                fnc: () => this.autodamu()
            }, {
                cron: config.QQDaily,
                name: '[Bili-Plugin]日签打卡',
                fnc: () => this.QQDailysign()
            }, {
                cron: config.luckywordcron,
                name: '[Bili-Plugin]幸运字符',
                fnc: () => this.autolukyword()
            }, {
                cron: '0 1/20 * * * ?',
                name: '[Bili-Plugin]自动检测更新',
                fnc: () => this.update()
            }, {
                cron: config.festivalpush,
                name: '[Bili-Plugin]自动节日推送',
                fnc: () => this.autofestival()
            }, {
                cron: '0 15 * * * ?',
                name: '[Bili-Plugin]自动校验插件',
                fnc: () => this.autocheck()
            },
            {
                cron: '0 0 0/1 * * ?',
                name: '[Bili-Plugin]整点报时',
                fnc: () => this.autobaoshi()
            },
            {
                cron: '0/30 * * * * ? ',
                name: '[Bili-Plugin]获取事件ID',
                fnc: () => this.autogetevent(),
                log: false
            }
        ]
    }

    async autocheck() {
        await Bili.fetchlist()
        await Bili.Bilicheck()
    }

    async autogetevent() {
        const configDir = path.join('./data/bili/QQBotGroupMap');
        const configPath = path.join(configDir, 'Groupconfig.json');

        try {
            try {
                await fs.promises.access(configDir);
            } catch (error) {
                logger.info('[BILIPLUGIN配置路径不存在，跳过自动获取事件ID...]');
                return false;
            }
            const configData = await fs.promises.readFile(configPath, 'utf-8');
            const groupConfig = JSON.parse(configData);
            const channelIds = Object.values(groupConfig);
            if (!channelIds) return logger.info('[BILIPLUGIN未配置野收官发跳过自动获取事件ID...]');

            for (const channelId of channelIds) {
                const eventFilePath = path.join('./data/bili/QQBotenvent', `${channelId}.json`);
                let needRefresh = false;
                try {
                    await fs.promises.access(eventFilePath);
                    const eventData = await fs.promises.readFile(eventFilePath, 'utf-8');
                    const eventInfo = JSON.parse(eventData);
                    const timeDiff = (Date.now() - eventInfo.time) / 1000;
                    if (timeDiff > 260) {
                        needRefresh = true;
                    }
                } catch (error) {
                    needRefresh = true;
                }
                if (needRefresh) {
                    try {
                        await QQBot.getevent(channelId);
                    } catch (err) {
                        logger.error(`[BILIPLUGIN获取${channelId}事件失败]`, err);
                    }
                }
            }
        } catch (error) {
            logger.error('[BILIPLUGIN获取事件ID错误]', error);
            return false;
        }
    }


    async autobaoshi() {
        const configs = await Bili.loadConfig(filePath)
        const rawbaoshigroup = (await Bili.getConfig("baoshigroup", configs)) || []
        if (rawbaoshigroup.length === 0) return logger.info('[Bili-Plugin]自动节日推送未配置群组，已自动跳过...')
        let groups = [];
        for (const g of rawbaoshigroup) {
            groups.push(Number(g))
        }
        const message = segment.record(config.baoshiapi)
        for (const g of groups) {
            if (await QQBot.isQQBotcheck(g)) {
                await QQBot.sendmsgs(message, g)
                await Bili.sleep(1000)
                continue
            }
            await Bot.pickGroup(g).sendMsg(message)
            await Bili.sleep(2500)
        }
    }

    async autofestival() {
        const configs = await Bili.loadConfig(filePath)
        const rawfestivalgroup = (await Bili.getConfig("festivalgroup", configs)) || []
        if (rawfestivalgroup.length === 0) return logger.info('[Bili-Plugin]自动节日推送未配置群组，已自动跳过...')
        let groups = [];
        for (const g of rawfestivalgroup) {
            groups.push(Number(g))
        }
        const message = await Bili.getfestival()
        for (const g of groups) {
            if (await QQBot.isQQBotcheck(g)) {
                await QQBot.sendmsgs(message, g)
                await Bili.sleep(1000)
                continue
            }
            await Bot.pickGroup(g).sendMsg(message)
            await Bili.sleep(2500)
        }
    }

    async update(e = this.e) {
        const action = await Bili.isUpdate()
        if (action) {
            await Bili.execSync(`cd ${pluginRoot} && git pull`)
            await Bili.restart()
        }
    }

    async autolukyword(e) {
        const configs = await Bili.loadConfig(filePath);
        const rawIsluckywordBots = (await Bili.getConfig("isluckywordBots", configs)) || [];
        if (!Array.isArray(rawIsluckywordBots)) {
            logger.warn('配置项 "isluckywordBots" 不是一个数组');
            return
        }
        const isluckywordBots = [];
        for (const bot of rawIsluckywordBots) {
            isluckywordBots.push(Number(bot.trim()));
        }

        if (isluckywordBots.length === 0) return this.e ? this.e.reply('幸运字符任务Bot名单为空，已自动跳过', true) : logger.info('幸运字符任务Bot名单为空，已自动跳过');

        const rawLuckywordwhites = (await Bili.getConfig("luckywordwhites", configs)) || [];
        if (!Array.isArray(rawLuckywordwhites)) {
            logger.warn('配置项 "luckywordwhites" 不是一个数组');
            return
        }
        const luckywordwhites = rawLuckywordwhites.map(entry => {
            const [botQQ, group] = entry.trim().split(':');
            return {
                botQQ: Number(botQQ),
                group: Number(group)
            };
        });

        const rawLuckywordblacks = (await Bili.getConfig("luckywordblacks", configs)) || [];
        if (!Array.isArray(rawLuckywordblacks)) {
            logger.warn('配置项 "luckywordblacks" 不是一个数组');
            return
        }
        const luckywordblacks = rawLuckywordblacks.map(entry => {
            const parts = entry.trim().split(':');
            return parts.length === 2 ? {
                botQQ: Number(parts[0]),
                group: Number(parts[1])
            } : {
                group: Number(parts[0])
            }
        });

        const rawIsviplists = (await Bili.getConfig("isviplists", configs)) || [];
        if (!Array.isArray(rawIsviplists)) {
            logger.warn('配置项 "isviplists" 不是一个数组');
            return
        }
        const isviplists = [];
        for (const bot of rawIsviplists) {
            isviplists.push(Number(bot.trim()));
        }

        const allMessages = [];
        if (this.e) {
            const r = await this.e.reply("开始执行抽取幸运字符任务，请稍等...", true);
            await Bili.recall(e, r, 5);
        }

        const tsstart = moment();
        let Count = 0;
        let Count2 = 0;

        for (const botQQ of isluckywordBots) {
            try {
                const rawGroupList = ((await Bili.getQQgrouplist(botQQ))).msg || [];
                const groupList = []
                for (const group of rawGroupList) {
                    groupList.push(Number(group));
                }
                if (groupList.length === 0) {
                    logger.mark(`机器人${botQQ}群聊列表为空，自动跳过幸运字符抽取...`);
                    continue;
                }

                const whiteGroups = [];
                for (const entry of luckywordwhites) {
                    if (entry.botQQ === botQQ) {
                        whiteGroups.push(entry.group);
                    }
                }

                let filteredGroups = [];
                if (whiteGroups.length > 0) {
                    for (const g of groupList) {
                        if (whiteGroups.includes(g)) {
                            filteredGroups.push(g);
                        }
                    }
                } else {
                    filteredGroups = [...groupList];
                }

                const blackGroups = [];
                for (const entry of luckywordblacks) {
                    if (entry.botQQ && entry.botQQ === botQQ) {
                        blackGroups.push(entry.group);
                    } else if (!entry.botQQ) {
                        blackGroups.push(entry.group);
                    }
                }

                for (const g of filteredGroups.slice()) {
                    if (blackGroups.includes(g)) {
                        filteredGroups.splice(filteredGroups.indexOf(g), 1);
                    }
                }

                filteredGroups = filteredGroups.filter(g => !blackGroups.includes(g));

                if (filteredGroups.length === 0) {
                    logger.mark(`机器人${botQQ}字符过滤配置后，群聊列表为空，自动跳过幸运字符抽取...`);
                    continue;
                }

                const isVip = isviplists.includes(botQQ);
                const execTimes = isVip ? 3 : 1;
                const cookieRes = await Bili.getQQck(botQQ, "qun.qq.com");
                const {
                    skey,
                    pskey
                } = cookieRes;

                if (!skey || !pskey) continue;

                for (const group of filteredGroups) {
                    logger.mark(`[${botQQ}@${group}]开始执行抽字符....`);

                    for (let i = 0; i < execTimes; i++) {
                        const r = await Bili.luckyword(botQQ, skey, pskey, group)
                        if ([0, -1].includes(r.code)) { //只记录0，-1
                            allMessages.push(`[${botQQ}@${group}] ${r.msg}\n`);
                        }
                    }
                    Count2++;
                }
            } catch (err) {
                logger.error(`[Bili-Plugin]幸运字符在处理机器人 ${botQQ} 时出错:`, err)
            }

            Count++;
            await Bili.sleep(4000);
        }

        if (allMessages.length > 0) {
            const chunks = [];
            while (allMessages.length > 0) {
                chunks.push(allMessages.splice(0, 10).join('\n'));
            }

            const forwardNodes = chunks.map(chunk => ({
                user_id: '80000000',
                nickname: '匿名消息',
                message: chunk
            }));

            const tsfinish = moment();
            const duration = tsfinish.diff(tsstart);
            const time = moment.duration(duration).asSeconds();

            forwardNodes.push({
                user_id: '80000000',
                nickname: '匿名消息',
                message: `任务耗时：${time} 秒\n总共执行账号：${Count}\n总执行群数：${Count2}`
            });

            try {
                const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
                if (this.e) {
                    await this.e.reply(forwardMessage, false);
                } else {
                    const cfg = (await import("../../../lib/config/config.js")).default;
                    if (!Bot.sendMasterMsg) {
                        Bot.sendMasterMsg = async m => {
                            for (const masterQQ of cfg.masterQQ) {
                                await Bot.pickFriend(masterQQ).sendMsg(m);
                            }
                        };
                    }
                    await Bot.sendMasterMsg(forwardMessage);
                }
            } catch (e) {
                logger.error('发送合并消息失败:', e);
            }
        }
    }




    async QQDailysign(e) {
        const forwardNodes = []
        const qq = await Bili.getQQlist()
        if (this.e) this.e.reply("开始对所有机器人执行日签打卡请稍等....", true, {
            recallMsg: 5
        })
        const tsstart = moment();
        let Count = 0
        for (const qqNum of qq) {
            try {
                let skey, pskey
                const cookies = await Bili.getQQck(qqNum, "ti.qq.com")
                if (cookies.code === 0) {
                    skey = cookies.skey
                    pskey = cookies.pskey
                } else {
                    logger.warn(`账号${qqNum}获取cookies失败，已跳过日签卡任务...\n错误信息：${cookies.msg}`)
                    forwardNodes.push({
                        user_id: '80000000',
                        nickname: '匿名消息',
                        message: `账号${qqNum}获取cookies失败，已跳过日签卡任务...\n错误信息：${cookies.msg}`
                    })
                    Count++
                    continue
                }

                const msg = (await Bili.DailySignCard(qqNum, skey, pskey)).trim()
                const msg2 = (await Bili.Dailyfriend(qqNum, skey, pskey)).trim()
                logger.mark(`[Bili-Plugin]日签打卡结果（QQ: ${qqNum}）: ${msg}\n${msg2}`);
                forwardNodes.push({
                    user_id: '80000000',
                    nickname: '匿名消息',
                    message: `QQ: ${qqNum} 的打卡结果:\n${msg}\n${msg2}`
                })
                Count++
            } catch (error) {
                logger.error(`[Bili-Plugin]处理 QQ ${qqNum} 时出错: ${error.message}`);
                forwardNodes.push({
                    user_id: '80000000',
                    nickname: '匿名消息',
                    message: `QQ: ${qqNum} 的打卡失败: ${error.message}\n`
                });
            }
        }
        const tsfinish = moment()
        const duration = tsfinish.diff(tsstart)
        const time = moment.duration(duration).asSeconds()
        forwardNodes.push({
            user_id: '80000000',
            nickname: '匿名消息',
            message: `任务耗时：${time} 秒\n总共执行账号：${Count}`
        })
        const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
        if (this.e) {
            await e.reply(forwardMessage, false);
        } else {
            try {
                const cfg = (await import("../../../lib/config/config.js")).default;
                if (!Bot.sendMasterMsg) {
                    Bot.sendMasterMsg = async m => {
                        for (const i of cfg.masterQQ) await Bot.pickFriend(i).sendMsg(m)
                    }
                }
                if (forwardNodes.length) {
                    Bot.sendMasterMsg?.(forwardMessage);
                }
            } catch (error) {
                logger.error('不必要的错误，可以忽略', error)
            }
        }
    }

    async autodamu(e) {
        const cookiesDirPath = path.join('./data/bili');
        if (!fs.existsSync(cookiesDirPath)) {
            logger.info('[Bili-Plugin] cookie目录不存在');
            return;
        }
        const files = fs.readdirSync(cookiesDirPath)
            .filter(file => path.extname(file) === '.json')
            .sort(() => Math.random() - 0.5);

        for (const file of files) {
            const fileName = path.basename(file, '.json');
            const cookiesFilePath = path.join(cookiesDirPath, file);
            const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
            let hasLiveEnabled = false;
            let hasLiveroom = false;
            const forwardNodes = [];
            let messageBuffer = [];
            const header = `[哔站直播间自动弹幕推送]\n用户 ${fileName} 的本次自动弹幕结果：\n`;

            for (const userId in cookiesData) {
                if (!cookiesData[userId].live) {
                    logger.debug(`哔站账号 ${userId} 未开启自动弹幕功能`)
                    continue;
                }
                hasLiveEnabled = true;
                const listPath = path.join('./data/bili/live', `${userId}.json`);
                let whitelists = [];
                let blacklists = [];
                if (fs.existsSync(listPath)) {
                    try {
                        const listData = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
                        whitelists = (listData.whitelists || []).map(String);
                        blacklists = (listData.blacklists || []).map(String);
                    } catch (err) {
                        logger.error(`[Bili-Plugin] 配置文件 ${listPath} 加载失败：`, err);
                    }
                }

                try {
                    const liveroom = await Bili.getlivefeed(cookiesData[userId]);
                    if (!liveroom?.length) {
                        logger.mark(`哔站账号 ${userId} 的关注主播没开播`)
                        continue;
                    }

                    for (const room of liveroom) {
                        const roomId = String(room.roomid);
                        const redisKey = `bili:aldamu:${userId}:${roomId}`;
                        if (await redis.get(redisKey)) {
                            logger.mark(`⏳ 账号 ${userId} 4小时内已在房间 ${roomId} 发送过弹幕`)
                            continue;
                        }
                        let allowSend = true;
                        let reason = '';

                        if (whitelists.length > 0) {
                            if (!whitelists.includes(roomId)) {
                                reason = `账号${userId}的煮波${room.name}(${roomId})不在白名单中，已跳过发送弹幕`;
                                allowSend = false;
                            }
                        } else if (blacklists.includes(roomId)) {
                            reason = `账号${userId}的煮波${room.name}(${roomId})被你拉黑惹，已跳过发送弹幕`;
                            allowSend = false;
                        }

                        if (!allowSend) {
                            messageBuffer.push(reason);
                            logger.mark(`[Bili-Plugin] ${reason}`);
                            continue;
                        }
                        try {
                            const response = await fetch(config.yiyan);
                            const msg = (await response.text()).slice(0, 20);
                            const result = await Bili.livesenddamu(
                                cookiesData[userId],
                                msg,
                                parseInt(roomId)
                            );

                            const formattedResult = result.replace(
                                /直播间『(\d+)』/g,
                                `『${room.name}』的直播间`
                            );

                            messageBuffer.push(`${formattedResult}\n`);
                            await redis.set(redisKey, '1', {
                                EX: 14400
                            });
                            await Bili.sleep(2000);
                            hasLiveroom = true;
                        } catch (err) {
                            messageBuffer.push(`账号${userId}向煮波${room.name}(${roomId})发弹幕失败：${err.message}`);
                        }
                    }
                } catch (err) {
                    messageBuffer.push(`哔站账号 ${userId} 处理失败：${err.message}`);
                }
            }
            while (messageBuffer.length > 0) {
                const chunk = messageBuffer.splice(0, 5);
                forwardNodes.push(createForwardNode([header, ...chunk], fileName));
            }
            if (forwardNodes.length > 0 && hasLiveroom && hasLiveEnabled) {
                try {
                    const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
                    const groupKey = await redis.get(`bili:group:${fileName}`);
                    if (groupKey) {
                        if (await QQBot.isQQBotcheck(groupKey)) {
                            await QQBot.sendmsgs(forwardMessage, groupKey)
                        } else {
                            Bot.pickGroup(groupKey).sendMsg(forwardMessage)
                        }
                    }
                } catch (err) {
                    logger.error('[Bili-Plugin] 消息发送失败：', err);
                }
            }
            await Bili.sleep(5000)
        }
    }




    async Bilidellog(e) {
        const dirPath = path.join('./data/bilisign');

        try {
            if (!fs.existsSync(dirPath)) {
                logger.info('[Bili-Plugin]签到日志目录不存在');
                return;
            }
            const files = await new Promise((resolve, reject) => {
                fs.readdir(dirPath, (err, files) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(files);
                    }
                });
            });

            const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');

            if (jsonFiles.length === 0) {
                logger.warn('[Bili-Plugin]没有找到哔站签到日志文件');
                return;
            }
            for (const file of jsonFiles) {
                const filePath = path.join(dirPath, file);
                try {
                    await new Promise((resolve, reject) => {
                        fs.unlink(filePath, err => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    logger.info(`[Bili-Plugin]已删除签到缓存文件 data/bilisign/${file}`);
                } catch (err) {
                    logger.error(`[Bili-Plugin]无法删除签到缓存文件 ${file}: ${err}`);
                }
            }
            logger.info('[Bili-Plugin]所有签到缓存文件已删除');
        } catch (err) {
            logger.error(`[Bili-Plugin]无法读取签到缓存目录目录: ${err}`);
        }
    }
}
Bot.on('message', Bili.clean);
Bot.on('notice', Bili.clean);
Bot.on('request', Bili.clean);

function createForwardNode(messages, fileName) {
    return {
        user_id: '80000000',
        nickname: '匿名消息',
        message: messages.join('\n')
    };
}