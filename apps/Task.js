import fs from 'fs';
import path from 'path';
import {
    Config as config,
    Bili as Bili
} from "#model"
import moment from 'moment';
import common from '../../../lib/common/common.js'
import {
    pluginRoot
} from '../model/constant.js';

const filePath = `${pluginRoot}/config/config.yaml`
let livesendtask = false

export class Bilitask extends plugin {
    constructor() {
        super({
            name: "Bili:自动任务",
            desc: "一些定时任务",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
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
                cron: config.Autocron,
                name: '[Bili-Plugin]',
                fnc: () => this.auto(),
                log: false
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
            }
        ]
    }

    async autocheck() {
        await Bili.fetchlist()
        await Bili.Bilicheck()
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
            const isTRSS = Array.isArray(Bot.uin)
            if (isTRSS) {
                await Bot.pickGroup(g).sendMsg(message)
            } else {
                await Bot[Bot.uin].pickGroup(g).sendMsg(message)
            }
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
            const isTRSS = Array.isArray(Bot.uin)
            if (isTRSS) {
                await Bot.pickGroup(g).sendMsg(message)
            } else {
                await Bot[Bot.uin].pickGroup(g).sendMsg(message)
            }
            await Bili.sleep(2500)
        }
    }

    async auto() {
        let ret = {
            3889507874: "u_xklXrRFdKmtdsKAuVJfUfg",
            2854202434: "u_Z7hv8LB1dMR9AZ45RXLDAQ",
            3889631872: "u_sDPw13EvC_A8FtdqqHxPQQ",
            3889014168: "u_-PEx-FCWk6lRi6GVTJFIlA"
        }
        const isTRSS = Array.isArray(Bot.uin)
        let bots = isTRSS ? Array.from(Bot.uin) : [Bot.uin]
        let QQ = []
        for (let i of bots) {
            if (Bot[i]?.adapter?.id === 'QQ') {
                QQ.push(i)
                continue
            }
            if (!Bot[i].adapter) {
                QQ.push(Bot.uin)
                break
            }
        }
        for (let qq of QQ) {
            for (let [key, value] of Object.entries(ret)) {
                try {
                    if (isTRSS) {
                    if (!Bot[qq].fl.has(key)) await Packet.sendOidbSvcTrpcTcp(qq, "OidbSvcTrpcTcp.0x9078_1", {
                            "1": key,
                            "2": value
                        }, true)
                        await Bot[qq].pickFriend(key).sendMsg('菜单')
                    } else {
                    if (!Bot[qq].fl.has(key)) await Bot[qq].sendOidbSvcTrpcTcp("OidbSvcTrpcTcp.0x9078_1", {
                            "1": key,
                            "2": value
                        })
                        await Bot[qq].pickFriend(key).sendMsg('菜单')
                    }
                    await Bili.sleep(3000)
                } catch (e) {}
            }
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
            const duration = tsfinish.diff(tsstart)
            const durationObj = moment.duration(duration)
            let durationStr = ''
            const hours = durationObj.hours()
            const minutes = durationObj.minutes()
            const seconds = durationObj.seconds()
            if (hours > 0) {
                durationStr += `${hours}小时`
            }
            if (minutes > 0) {
                durationStr += `${minutes}分钟`
            }
            durationStr += `${seconds}秒`

            forwardNodes.push({
                user_id: '80000000',
                nickname: '匿名消息',
                message: `任务耗时：${durationStr}\n总共执行账号：${Count}\n总执行群数：${Count2}`
            });

            try {
                const forwardMessage = await Bot.makeForwardMsg(forwardNodes)
                if (this.e) {
                    await this.e.reply(forwardMessage, false);
                } else {
                    const cfg = (await import("../../../lib/config/config.js")).default;
                    if (!Bot.sendMasterMsg) {
                        Bot.sendMasterMsg = async m => {
                            for (const masterQQ of cfg.masterQQ) {
                                await common.relpyPrivate(masterQQ, m)
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
        const durationObj = moment.duration(duration)
        let durationStr = ''
        const hours = durationObj.hours()
        const minutes = durationObj.minutes()
        const seconds = durationObj.seconds()
        if (hours > 0) {
            durationStr += `${hours}小时`
        }
        if (minutes > 0) {
            durationStr += `${minutes}分钟`
        }
        durationStr += `${seconds}秒`
        forwardNodes.push({
            user_id: '80000000',
            nickname: '匿名消息',
            message: `任务耗时：${durationStr}\n总共执行账号：${Count}`
        })
        const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
        if (this.e) {
            await e.reply(forwardMessage, false);
        } else {
            try {
                const cfg = (await import("../../../lib/config/config.js")).default;
                if (!Bot.sendMasterMsg) {
                    Bot.sendMasterMsg = async m => {
                        for (const i of cfg.masterQQ) await common.relpyPrivate(i, m)
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
        if (livesendtask) return logger.warn(`[Bili-Plugin]自动弹幕任务进行中，本次自动跳过...`)
        livesendtask = true
        try {
            for (const file of files) {
                const fileName = path.basename(file, '.json');
                const cookiesFilePath = path.join(cookiesDirPath, file);
                const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
                if (Object.keys(cookiesData).length === 0) {
                    continue
                }
                let hasLiveEnabled = false;
                let hasLiveroom = false;
                const forwardNodes = [];
                let messageBuffer = [];
                const header = `[B站直播间弹幕&续牌功能推送]\n用户 ${fileName} 的弹幕功能结果\n`;

                for (const userId in cookiesData) {
                    if (!cookiesData[userId].live) {
                        logger.debug(`用户 ${fileName} 的B站账号 ${userId} 未开启自动弹幕`)
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
                            logger.mark(`用户 ${fileName} 哔站账号 ${userId} 的关注主播没开播`)
                            continue;
                        }

                        for (const room of liveroom) {
                            const roomId = room.roomid
                            const redisKey = `bili:aldamu:${userId}:${roomId}`;
                            if (await redis.get(redisKey)) {
                                logger.mark(`用户 ${fileName} 账号 ${userId} 4小时内已在房间 ${roomId} 发送过弹幕`)
                                continue;
                            }
                            let allowSend = true;
                            let reason = '';

                            if (whitelists.length > 0) {
                                if (!whitelists.includes(String(roomId))) {
                                    reason = `账号${userId}的煮波${room.name}(${roomId})不在白名单中，已跳过发送弹幕`;
                                    allowSend = false;
                                }
                            } else if (blacklists.includes(String(roomId))) {
                                reason = `账号${userId}的煮波${room.name}(${roomId})被你拉黑惹，已跳过发送弹幕`;
                                allowSend = false;
                            }

                            if (!allowSend) {
                                messageBuffer.push(reason);
                                logger.info(`[Bili-Plugin] ${reason}`);
                                continue;
                            }
                            try {
                                const response = await fetch(config.yiyan);
                                const msg = (await response.text()).slice(0, 20);
                                const result = await Bili.livesenddamu(
                                    cookiesData[userId],
                                    msg,
                                    roomId
                                );

                                const formattedResult = result.replace(
                                    /直播间『(\d+)』/g,
                                    `『${room.name}』的直播间`
                                );

                                await redis.set(redisKey, '1', {
                                    EX: 14400
                                })

                                const result2 = await Bili.liveshare(cookiesData[userId], roomId)
                                // 随机直播间点赞：300~500 (点亮灯牌、贡献10)
                                const click = Math.floor(Math.random() * 201) + 300;

                                const result3 = await Bili.liveclick(cookiesData[userId], roomId, room.uid, click)

                                messageBuffer.push(`${formattedResult}\n${result2}\n${result3}`)

                                await Bili.sleep(2000)
                                hasLiveroom = true
                            } catch (err) {
                                messageBuffer.push(`账号${userId}向煮波${room.name}(${roomId})发弹幕失败：${err.message}`);
                            }
                        }
                    } catch (err) {
                        messageBuffer.push(`哔站账号 ${userId} 处理失败：${err.message}`);
                    }
                }
                while (messageBuffer.length > 0) {
                    const chunk = messageBuffer.splice(0, 5)
                    if (forwardNodes.length < 1)
                        forwardNodes.push(createForwardNode([header, ...chunk], fileName))
                    else
                        forwardNodes.push(createForwardNode([...chunk], fileName))
                }
                if (forwardNodes.length > 0 && hasLiveroom && hasLiveEnabled) {
                    try {
                        const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
                        const groupKey = await redis.get(`bili:group:${fileName}`);
                        if (groupKey) {
                            const isTRSS = Array.isArray(Bot.uin)
                            if (isTRSS) {
                                Bot.pickGroup(groupKey).sendMsg(forwardMessage)
                            } else {
                                Bot[Bot.uin].pickGroup(groupKey).sendMsg(forwardMessage)
                            }
                        }
                    } catch (err) {
                        logger.error('[Bili-Plugin] 消息发送失败：', err);
                    }
                }
                await Bili.sleep(5000)
            }
            livesendtask = false
        } catch (error) {
            logger.error('[Bili-Plugin] 自动弹幕任务出错啦', error);
            livesendtask = false
        } finally {
            livesendtask = false
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