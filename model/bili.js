import fetch from "node-fetch";
import moment from 'moment';
import config from '../model/Config.js';
import BApi from '../model/BAPI/BAPI.js';
import QApi from '../model/BAPI/QAPI.js';
import configModule from "../../../lib/config/config.js"
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import {
    pluginName,
    pluginRoot
} from "../model/constant.js"
import {
    exec
} from 'child_process'
import net from 'net'
if (!global.___) global.___ = BApi
let Update = null
try {
    Update = (await import("../../other/update.js").catch(e => null))?.update
    Update ||= (await import("../../system/apps/update.ts")).update
} catch (e) {
    logger.error(`[${pluginName}]未获取到更新js ${logger.yellow("更新功能")} 将无法使用`)
}

class Bili {
    constructor() {
        this.signApi = config.signApi
        this.key = configModule?.qq?.[0] || Bot.uin || ['114514']
        this.clean = this.clean.bind(this)
        this.Update_Plugin = new Update()
        this.configFilePath = './config/config/other.yaml'
        this.config = this.loadConfig()
    }


    // 获取UP最新信息
    async SubscribeUP(mid) {
        const UPUrl = `${this.signApi}/space?mid=${mid}`;
        let response
        let data
        if (config.Enable_SignApi) {
            response = await fetch(UPUrl, {
                headers: {
                    authorization: encodeURIComponent(config.Authorization),
                }
            })
            data = await response.json();
        } else {
            data = await BApi.space(mid)
        }
        const live = data.data.live;
        const archive = data.data.archive.item[0]
        const liveItem = {
            roomStatus: live.roomStatus,
            roundStatus: live.roundStatus,
            liveStatus: live.liveStatus,
            url: live.url,
            title: live.title,
            cover: live.cover,
            roomid: live.roomid,
        }
        const archiveInfo = {
            title: archive.title,
            cover: archive.cover,
            param: archive.param,
            duration: archive.duration,
            bvid: archive.bvid,
            ctime: archive.ctime,
            author: archive.author
        }
        const result = {
            liveItem,
            archiveInfo
        };
        return JSON.stringify(result);
    }

    async relationup(userCookies, mid, act) {
        const actionMap = {
            1: '关注',
            2: '取关',
            5: '拉黑',
            6: '取消拉黑',
            7: '踢出粉丝'
        };
        const actionName = actionMap[act] || '未知操作';
        const relationUrl = `${this.signApi}/relation?accesskey=${userCookies.access_token}&key=${this.key}&mid=${mid}&act=${act}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(relationUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })
                json = await response.json();
            } else {
                json = await BApi.relationup(userCookies, mid, act)
            }
            if (json.code === 0) {
                return `🌸${actionName}成功`;
            } else {
                return `🌸${actionName}失败: ${json.message || json.msg || '未知错误'}`;
            }
        } catch (err) {
            logger.error("[Bili-Plugin]用户关系操作失败:", err);
            return `用户关系操作请求失败，请检查日志输出`;
        }
    }

    async getmiyocode(action = 1) {
        try {
            const miyocodeUrl = `${this.signApi}/miyocode?num=${action}`;
            const response = await fetch(miyocodeUrl, {
                headers: {
                    authorization: encodeURIComponent(config.Authorization),
                }
            });
            if (!response.ok) {
                throw new Error(`[Bili-Plugin]获取节日信息请求出错: ${response.status}`);
            }
            const data = await response.json();
            return data
        } catch (err) {
            logger.error("[Bili-Plugin]获取米游社兑换码失败", err);
            return {
                retcode: 0,
                data: [],
                date: null
            };
        }
    }

    async getSourceMessage(e) {
        if (e.getReply) {
            return await e.getReply()
        } else if (e.source) {
            let source
            if (e.isGroup) {
                source = (await e.group.getChatHistory(e.source?.seq, 1)).pop()
            } else {
                source = (await e.friend.getChatHistory((e.source?.time + 1), 1)).pop()
            }
            return source
        }
        return null
    }

    async getvideourl(e) {
        const source = await this.getSourceMessage(e);
        if (!source) return false
        const parsedSource = JSON.parse(JSON.stringify(source));
        const regex = /https?:\/\/(b23\.tv\/[\w\-]+|live\.bilibili\.com\/[\w\-\/]+|www\.bilibili\.com\/[\w\-\/?=&;]+|bili2233\.cn\/[\w\-\/?=&;]+)/;
        for (let item of parsedSource.message) {
            if (item.type === 'text' || item.type === 'json') {
                let content;
                if (item.type === 'text') {
                    content = item.text;
                } else {
                    try {
                        const jsonData = JSON.parse(item.data);
                        content = jsonData.meta?.detail_1?.qqdocurl || jsonData
                    } catch (error) {
                        logger.error('[Bili-Plugin]JSON 解析失败:', error);
                        continue
                    }
                }
                const match = content.match(regex);
                if (match) {
                    return match[0]
                }
            }
        }
        return null
    }

    async getfestival(num = 5) {
        const yunshiUrl = `${this.signApi}/jieri?num=${num}`;
        let message = ["每日节日准时提醒！"];

        try {
            const response = await fetch(yunshiUrl, {
                headers: {
                    authorization: encodeURIComponent(config.Authorization),
                }
            });
            if (!response.ok) {
                throw new Error(`[Bili-Plugin]获取节日信息请求出错: ${response.status}`);
            }
            const data = await response.json();

            if (data.code === "0") {
                message.push(`\r距离周末剩余：${data.weekend.daysToWeekend}天`);
                data.festivals.forEach(festival => {
                    const timeParts = [];
                    if (festival.days > 0) {
                        timeParts.push(`${festival.days}天`);
                    }
                    if (festival.hours > 0) {
                        timeParts.push(`${festival.hours}小时`);
                    }
                    if (festival.minutes > 0) {
                        timeParts.push(`${festival.minutes}分钟`);
                    }
                    if (festival.seconds > 0) {
                        timeParts.push(`${festival.seconds}秒`);
                    }
                    //   const seconds = festival.seconds ?? 0;
                    //   timeParts.push(`${seconds}秒`);
                    message.push(`\r🌸『${festival.name}』剩余${timeParts.join('')}！`);
                });
            } else {
                message.push("获取节日信息失败");
            }
        } catch (error) {
            logger.error('[Bili-Plugin]获取节日信息请求出错', error);
            message.push("🌸获取节日信息失败");
        }
        return message;
    }

    async getyunshi(uin) {
        const yunshiUrl = `${this.signApi}/yunshi?uin=${uin}`;
        const response = await fetch(yunshiUrl, {
            headers: {
                authorization: encodeURIComponent(config.Authorization),
            }
        });
        const data = await response.json()
        if (data.code === 0) {
            let message = [
                `『运势』${data.msg.fortuneSummary}`,
                '\r『星级』' + data.msg.luckyStar,
                '\r『点评』' + data.msg.signText,
                '\r『解读』' + data.msg.unsignText
            ];

            return message;
        } else {
            return ['获取运势信息失败。']
        }
    }

    async getvideoinfo(url, cookies = config.SESSDATA) {
        const jxUrl = `${this.signApi}/jx/b_jx?msg=${url}&cookie=SESSDATA=${cookies}`
        try {
            const response = await fetch(jxUrl, {
                headers: {
                    authorization: encodeURIComponent(config.Authorization),
                }
            });
            const json = await response.json();
            return json
        } catch (err) {
            logger.error("[Bili-Plugin]视频解析失败:", err);
            return null
        }
    }


    async liveshare(userCookies, roomid) {
        const jxUrl = `${this.signApi}/liveshare?accesskey=${userCookies.access_token}&key=${this.key}&roomid=${roomid}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(jxUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.liveshare(userCookies, roomid)
            }
            return json.code === 0 ? `🌸分享直播间${roomid}成功` : `🌸分享直播间${roomid}失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]视频解析失败:", err);
            return `🌸分享直播间${roomid}失败: 未知错误`;
        }
    }

    async liveclick(userCookies, roomid, upid, click = 10, MAX_CLICK_PER_REQUEST = 10) {
        let successTotal = 0;
        let failTotal = 0;
        const errorMessages = new Set();
        const sendClickRequest = async (batchClick) => {
            const liveclickUrl = `${this.signApi}/livelike?accesskey=${userCookies.access_token}&key=${this.key}&roomid=${roomid}&upid=${upid}&uid=${userCookies.DedeUserID}&click=${batchClick}`;
            try {
                let response
                let json
                if (config.Enable_SignApi) {
                    response = await fetch(liveclickUrl, {
                        headers: {
                            authorization: encodeURIComponent(config.Authorization),
                        }
                    });
                    json = await response.json();
                } else {
                    json = await BApi.liveclick(userCookies, roomid, upid, click)
                }

                if (json.code === 0) {
                    return {
                        success: batchClick,
                        error: null
                    };
                } else {
                    const msg = json.message || json.msg || '未知错误';
                    return {
                        success: 0,
                        error: msg
                    };
                }
            } catch (err) {
                logger.error("[Bili-Plugin]直播间点赞请求失败:", err);
                return {
                    success: 0,
                    error: "请求异常"
                };
            }
        }
        try {
            let remaining = click;
            while (remaining > 0) {
                const batchClick = Math.min(remaining, MAX_CLICK_PER_REQUEST);
                const {
                    success,
                    error
                } = await sendClickRequest(batchClick);
                successTotal += success;
                failTotal += error ? batchClick : 0;
                if (error) errorMessages.add(error);
                remaining -= batchClick
                await this.sleep(2000)
            }
        } catch (err) {
            logger.error("[Bili-Plugin]直播间点赞流程异常:", err);
            return `🌸直播间点赞流程异常: ${err.message}`;
        }
        const successInfo = `🌸成功给直播间${roomid}点赞${successTotal}下`;
        //${Array.from(errorMessages).join('；')}
        const failInfo = failTotal > 0 ?
            `\n🌸其中点赞失败 ${failTotal} 次(未知错误)` :
            '';
        return `${successInfo}${failInfo}`
    }

    async likevideo(userCookies, aid, action) {
        // action：0喜欢，1不喜欢
        const likeUrl = `${this.signApi}/like?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}&like=${action}`
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(likeUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.likevideo(userCookies, aid, action)
            }
            const reply = action === 0 ? '点赞' : '取消点赞'
            return json.code === 0 ? `🌸${reply}视频成功` : `🌸${reply}视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]点赞操作失败:", err);
            return `🌸${reply}视频请求失败，请检查日志输出`
        }
    }

    async dislikevideo(userCookies, aid) {
        const dislikeUrl = `${this.signApi}/dislike?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(dislikeUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.dislikevideo(userCookies, aid)
            }
            return json.code === 0 ? `🌸点踩视频成功` : `🌸点踩视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]点踩操作失败:", err);
            return `🌸点踩视频请求失败，请检查日志输出`
        }
    }

    async triplevideo(userCookies, aid) {
        const tripleUrl = `${this.signApi}/triple?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(tripleUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.triplevideo(userCookies, aid)
            }
            return json.code === 0 ? `🌸一键三连成功，视频已收藏至默认文件夹` : `🌸一键三连失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]一键三连操作失败:", err);
            return `🌸一键三连请求失败，请检查日志输出`
        }
    }

    async favvideo(userCookies, aid) {
        const favUrl = `${this.signApi}/fav?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(favUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.favvideo(userCookies, aid)
            }
            return json.code === 0 ? `🌸收藏视频成功，视频已收藏至默认文件夹` : `🌸收藏视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]收藏视频操作失败:", err);
            return `🌸收藏视频请求失败，请检查日志输出`
        }
    }

    async unfavvideo(userCookies, aid) {
        const unfavUrl = `${this.signApi}/unfav?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(unfavUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.unfavvideo(userCookies, aid)
            }
            return json.code === 0 ? `🌸取消收藏视频成功！` : `🌸取消收藏视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]取消收藏视频操作失败:", err);
            return `🌸取消收藏视频请求失败，请检查日志输出`
        }
    }

    async replyvideo(userCookies, aid, msg) {
        const replyUrl = `${this.signApi}/reply?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}&msg=${msg}`
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(replyUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.replyvideo(userCookies, aid, msg)
            }
            return json.code === 0 ? `🌸评论视频成功！` : `🌸评论视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]评论视频操作失败:", err);
            return `🌸评论视频请求失败，请检查日志输出`
        }
    }

    async getsha() {
        let date, sha
        try {
            date = await this.Update_Plugin.getTime(pluginName)
            sha = await this.Update_Plugin.getCommitId(pluginName)
            return `& Sha:${sha} & Date: ${date}`
        } catch (error) {
            return `& Sha: 114514 & Date: 1919810`
        }
    }

    async execSync(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, {
                windowsHide: true
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        stdout,
                        stderr
                    });
                }
            });
        });
    }

    async getkey() {
        const keyapi = `${this.signApi}/getkey`
        try {
            let rediskey = await redis.get('bili:apikey')
            if (!rediskey) {
                const key = await fetch(keyapi, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })
                const keys = await key.json()
                if (keys.code === 0) {
                    await redis.set('bili:apikey', keys.key, {
                        EX: 300
                    })
                    return keys.key
                } else {
                    logger.error(`[Bili-Plugin]获取密钥失败请马上加入群聊联系解禁：${keys.msg}\n${keys.notice}`)
                }
            } else {
                return rediskey
            }
        } catch (err) {
            logger.error("[Bili-Plugin]获取密钥失败", err)
            return null
        }
    }

    loadConfig(configFilePath = this.configFilePath) {
        if (fs.existsSync(configFilePath)) {
            const file = fs.readFileSync(configFilePath, 'utf8');
            return YAML.parse(file);
        }
        return {};
    }

    saveConfig(configFilePath = this.configFilePath) {
        const yamlStr = YAML.stringify(this.config);
        fs.writeFileSync(configFilePath, yamlStr, 'utf8');
    }

    getConfig(keyPath, config = this.config) {
        return lodash.get(config, keyPath);
    }

    setConfig(keyPath, value, config = this.config, configFilePath = this.configFilePath) {
        lodash.set(config, keyPath, value);
        this.saveConfig(configFilePath);
    }

    async getQQgrouplist(qq) {
        let num = Number(qq);
        if (isNaN(num) || !Number.isInteger(num)) {
            return {
                code: -1,
                qq,
                msg: '请不要传入非法QQ号'
            };
        }
        const number = qq
        const isForbidden =
            (number >= 2854000000 && number <= 2855000000) ||
            (number >= 2854196301 && number <= 2854216399) ||
            (number >= 3889000000 && number <= 3890000000) ||
            number === 3328144510 ||
            number === 66600000 ||
            (number >= 4010000000 && number <= 4019999999);

        if (isForbidden) {
            return {
                code: -1,
                qq,
                msg: '请不要传入官方机器人QQ号'
            };
        }
        let attempts = 0
        const maxAttempts = 10
        while (attempts < maxAttempts) {
            attempts++
            try {
                const groupList = Array.from(Bot[qq].gl.keys())
                return {
                    code: 0,
                    msg: groupList
                }
            } catch (error) {
                await this.sleep(5000)
            }
        }
        return {
            code: -1,
            qq,
            msg: `获取账号 ${qq} 群列表失败`
        };
    }

    async recall(e, r, times) {
        times = Number(times)
        if (times > 0)
            setTimeout(() => {
                if (e?.group?.recallMsg && r?.message_id)
                    e?.group?.recallMsg(r?.message_id)
                else if (e?.friend?.recallMsg && r?.message_id)
                    e?.friend?.recallMsg(r?.message_id)
            }, 1000 * times)
    }

    async GTK(skey) {
        let hash = 5381;
        for (let i = 0; i < skey.length; i++) {
            hash += (hash << 5 & 2147483647) + skey.charCodeAt(i) & 2147483647;
            hash &= 2147483647;
        }
        return hash;
    }

    async luckyword(uin, skey, pskey, group) {
        try {
            let bkn = await this.GTK(skey)
            let url = `https://qun.qq.com/v2/luckyword/proxy/domain/qun.qq.com/cgi-bin/group_lucky_word/draw_lottery?bkn=${bkn}`;
            const cookiesStr = `uin=o${uin}; skey=${skey}; p_skey=${pskey}; p_uin=o${uin}`
            const headers = {
                "Content-Type": "application/json;charset=UTF-8",
                "Cookie": cookiesStr,
                "qname-service": "976321:131072",
                "qname-space": "Production"
            }
            let body = JSON.stringify({
                group_code: group
            });
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body
            })
            const responseJson = await response.json();
            if (responseJson.retcode === 0 && responseJson.data.word_info) {
                let {
                    wording,
                    word_desc
                } = responseJson.data.word_info.word_info;
                return {
                    code: 0,
                    msg: `🌸抽中了字符:『${wording}』 寓意为:『${word_desc}』`
                };
            } else if (responseJson.retcode === 11004) {
                return {
                    code: -1,
                    msg: `🌸今日已抽过字符: ${responseJson.msg}`
                };
            } else {
                return {
                    code: 114514,
                    msg: `🌸抽字符时遇到错误: ${responseJson.data || responseJson.msg}`
                };
            }
        } catch (error) {
            logger.error(error)
            return {
                code: 114514,
                msg: `🌸请求过程中发生错误`
            };
        }
    }

    async Dailyfriend(uin, skey, pskey) {
        const qqdaily = `${this.signApi}/qqdaily?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`
        const results = [];

        try {
            let qqdailydataFirst
            if (config.Enable_SignApi) {
                qqdailydataFirst = await (await fetch(qqdaily, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json();
            } else {
                qqdailydataFirst = await QApi.Dailyfriend(uin, skey, pskey)
            }
            await this.sleep(1500);
            results.push(qqdailydataFirst.code === 0 ? `🌸收集卡(第1张): 成功` : `🌸收集卡(第1张): 失败(${qqdailydataFirst.message || qqdailydataFirst.msg || '未知错误'})`);
            const filteredFriends = Array.from(Bot[uin].fl.keys()).filter(friendId => friendId !== uin);
            const shuffledFriends = filteredFriends.sort(() => 0.5 - Math.random());
            const friendsToShareWith = shuffledFriends.slice(0, 3);
            for (let i = 0; i < friendsToShareWith.length; i++) {
                const friend = friendsToShareWith[i];
                const qqshare = `${this.signApi}/qqshare?uin=${uin}&skey=${skey}&pskey=${pskey}&friend=${friend}&key=${this.key}`;
                let qqsharedata
                if (config.Enable_SignApi) {
                    qqsharedata = await (await fetch(qqshare, {
                        headers: {
                            authorization: encodeURIComponent(config.Authorization),
                        }
                    })).json()
                } else {
                    qqsharedata = await QApi.Dailyfriendshare(uin, skey, pskey, friend)
                }
                await this.sleep(1500);
                results.push(qqsharedata.code === 0 ? `🌸分享操作(第${i+1}次): 成功` : `🌸分享(第${i+1}次): 失败(${qqsharedata.message || qqsharedata.msg || '未知错误'})`);
                let qqdailydataNext
                if (config.Enable_SignApi) {
                    qqdailydataNext = await (await fetch(qqdaily, {
                        headers: {
                            authorization: encodeURIComponent(config.Authorization),
                        }
                    })).json();
                } else {
                    qqdailydataNext = await QApi.Dailyfriend(uin, skey, pskey)
                }
                await this.sleep(1500);
                results.push(qqdailydataNext.code === 0 ? `🌸收集卡(第${i+2}张): 成功` : `🌸收集卡(第${i+2}张): 失败(${qqdailydataNext.message || qqdailydataNext.msg || '未知错误'})`);
            }

            return results.join("\n");
        } catch (err) {
            logger.error("[Bili-Plugin]日签分享:", err);
            return "🌸日签分享: 失败(未知错误)";
        }
    }

    async DailySignCard(uin, skey, pskey) {
        const qqdaily2 = `${this.signApi}/qqdaily2?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const qqdaily3 = `${this.signApi}/qqdaily3?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const qqdaily4 = `${this.signApi}/qqdaily4?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const qqdaily5 = `${this.signApi}/qqdaily5?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const results = [];
        let qqdaily2data, qqdaily3data, qqdaily4data, qqdaily5data
        try {
            if (config.Enable_SignApi) {
                qqdaily2data = await (await fetch(qqdaily2, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json();
                await this.sleep(1000);
                qqdaily3data = await (await fetch(qqdaily3, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json();
                await this.sleep(1000);
                qqdaily4data = await (await fetch(qqdaily4, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json();
                await this.sleep(1000);
                qqdaily5data = await (await fetch(qqdaily5, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json();
                await this.sleep(1000);
            } else {
                qqdaily2data = await QApi.DailySignCard1(uin, skey, pskey)
                await this.sleep(1000);
                qqdaily3data = await QApi.DailySignCard2(uin, skey, pskey)
                await this.sleep(1000);
                qqdaily4data = await QApi.DailySignCard3(uin, skey, pskey)
                await this.sleep(1000);
                qqdaily5data = await QApi.DailySignCard4(uin, skey, pskey)
                await this.sleep(1000);
            }
            results.push(qqdaily2data.code === 0 ? "🌸普通日签卡: 成功" : `🌸普通日签卡: 失败(${qqdaily2data.message || qqdaily2data.msg || '未知错误'})`);
            results.push(qqdaily3data.code === 0 ? "🌸晚安卡: 成功" : `🌸晚安卡: 失败(${qqdaily3data.message || qqdaily3data.msg || '未知错误'})`);
            results.push(qqdaily4data.code === 0 ? "🌸每日Q崽: 成功" : `🌸每日Q崽: 失败(${qqdaily4data.message || qqdaily4data.msg || '未知错误'})`);
            results.push(qqdaily5data.code === 0 ? "🌸心事罐: 成功" : `🌸心事罐: 失败(${qqdaily5data.message || qqdaily5data.msg || '未知错误'})`);
            return results.join("\n");
        } catch (err) {
            logger.error("[Bili-Plugin]日签卡失败:", err);
            return "🌸日签卡: 失败(未知错误)";
        }
    }

    async extractCookies(cookiesStr, keysToFind) {
        const cookies = {};
        cookiesStr.split('; ').forEach(cookie => {
            const [key, value] = cookie.split('=');
            if (keysToFind.includes(key)) {
                cookies[key] = value;
            }
        });
        return cookies;
    }

    async getQQck(qq, domain = "ti.qq.com") {
        try {
            let skey, pskey;
            let isSuccess = false;
            for (let i = 0; i < 10; i++) {
                let cookiesStr;
                try {
                    cookiesStr = Bot[qq].sendApi ?
                        (await Bot[qq].sendApi('get_cookies', {
                            "domain": domain
                        })).data.cookies :
                        await Bot[qq].cookies[domain]
                } catch (err) {
                    logger.warn(`[Bili-Plugin]第 ${i+1} 次获取账号 ${qq} 的cookies 失败:`, err);
                    continue;
                }
                const parsedCookies = await this.extractCookies(cookiesStr, ['skey', 'p_skey']);
                skey = parsedCookies.skey;
                pskey = parsedCookies.p_skey;

                if (skey && pskey) {
                    isSuccess = true;
                    break;
                }
                await this.sleep(5000);
            }

            return isSuccess ? {
                code: 0,
                uin: qq,
                skey: skey,
                pskey: pskey
            } : {
                code: 114514,
                uin: qq,
                skey: skey || "获取失败",
                pskey: pskey || "获取失败",
                msg: "多次尝试后仍未能获取完整 cookies"
            };

        } catch (err) {
            logger.error("[Bili-Plugin]获取机器人ck失败:", err);
            return {
                code: -1,
                uin: qq,
                skey: "获取失败",
                pskey: "获取失败",
                msg: `获取异常: ${err.message}`
            };
        }
    }

    async livesenddamu(userCookies, msg, roomid) {
        const livedamu = `${this.signApi}/danmu2?accesskey=${userCookies.access_token}&msg=${msg}&roomid=${roomid}&key=${this.key}`;
        try {
            let response
            let damu
            if (config.Enable_SignApi) {
                response = await fetch(livedamu, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                damu = await response.json();
            } else {
                damu = await BApi.livesenddamu(userCookies, msg, roomid)
            }
            if (damu.code === 0) {
                return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』成功`;
            } else {
                return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败\n失败原因:『${damu.message || damu.msg || '未知错误'}』`;
            }
        } catch (err) {
            logger.error("[Bili-Plugin]发送弹幕失败", err);
            return `===========================\n🌸B站账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败！！\n失败原因:『请求失败』`;
        }
    }


    async getlivefeed(userCookies) {
        const livefeed = `${this.signApi}/livefeed?accesskey=${userCookies.access_token}&key=${this.key}`;
        try {
            let response
            let livejson
            if (config.Enable_SignApi) {
                response = await fetch(livefeed, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                livejson = await response.json();
            } else {
                livejson = await BApi.getlivefeed(userCookies)
            }
            let livedata = livejson.data?.card_list
                ?.filter(card =>
                    card.card_type === "my_idol_v1" &&
                    Array.isArray(card.card_data?.my_idol_v1?.list)
                )
                .flatMap(card => card.card_data.my_idol_v1.list)
                .map(room => ({
                    roomid: room.roomid || '未知',
                    uid: room.uid || '未知',
                    name: room.uname || '未知',
                    face: room.face,
                    cover: room.cover,
                    title: room.title || '未知',
                    live_time: room.live_time,
                    area_name: room.area_name || '未知',
                    area_v2_name: room.area_v2_name || '未知',
                    area_v2_parent_name: room.area_v2_parent_name || '未知',
                    live_tag_name: room.live_tag_name || '未知',
                    online: room.online || '未知'
                })) || []

            return livedata;
        } catch (err) {
            logger.error("[Bili-Plugin]获取用户关注主播开播状态失败", err);
            return [];
        }
    }


    async gettoexplog(userCookies) {
        const expLogUrl = `${this.signApi}/exp_log2?SESSDATA=${userCookies.SESSDATA}&key=${this.key}`
        try {
            let response
            let expRet
            if (config.Enable_SignApi) {
                response = await fetch(expLogUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                expRet = await response.json();
            } else {
                expRet = await BApi.exp_log2(userCookies)
            }
            return expRet
        } catch (err) {
            logger.error("[Bili-Plugin]获取经验日志失败", err);
        }
    }

    async getwebinfo(userCookies) {
        const webinfo = `${this.signApi}/myinfo?SESSDATA=${userCookies.SESSDATA}&key=${this.key}`
        try {
            let response
            let web
            if (config.Enable_SignApi) {
                response = await fetch(webinfo, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                web = await response.json();
            } else {
                web = await BApi.myinfo(userCookies)
            }
            return web
        } catch (err) {
            logger.error("[Bili-Plugin]获取用户web端信息失败", err);
        }
    }

    async checkcookies(userCookies) {
        try {
            let apiResponse = await BApi.myinfo2(userCookies)
            if (apiResponse.code === -400) {
                return {
                    code: -1,
                    msg: '账号cookie已过期'
                }
            }
            if (apiResponse.code === 0) {
                return {
                    code: 0,
                    msg: '账号cookie有效'
                }
            }
            return {
                code: 0,
                msg: '请求异常,跳过检查'
            }
        } catch (error) {
            return {
                code: 0,
                msg: '请求异常,跳过检查'
            }
        }
    }

    async getupinfo(mids, userCookies) {
        const getInfoUrl = `${this.signApi}/userinfo?mid=${mids}&key=${this.key}&accesskey=${userCookies.access_token}`;
        let apiResponse
        if (config.Enable_SignApi) {
            apiResponse = await (await fetch(getInfoUrl, {
                headers: {
                    authorization: encodeURIComponent(config.Authorization),
                }
            })).json()
        } else {
            apiResponse = await BApi.getupinfo(mids, userCookies)
        }
        const forwardNodes = [];
        if (apiResponse.code === 0 && apiResponse.data && apiResponse.data.length > 0) {
            for (const card of apiResponse.data) {
                const vipStatus = card.vip?.status !== 0;
                const messageContent = [
                    segment.image(card.face),
                    `用户名：${card.name}\n`,
                    `Uid：${card.mid}\n`,
                    `性别：${card.sex}\n`,
                    `签名：${String(card.sign).replace(/\./g, ' .').trim()}\n`,
                    `会员：${vipStatus ? card.vip?.label?.text : '无会员'}\n`,
                    vipStatus && card.vip?.due_date ?
                    `会员到期时间：${moment(card.vip.due_date).format('YYYY-MM-DD HH:mm:ss')}\n` : null,
                    `账号状态：${card.silence === 0 ? '正常' : '封禁中'}\n`,
                    `当前等级：${card.level}\n`,
                    `认证信息：${card.official?.role !== 0 ? card.official?.title : '无'}\n`,
                    `生日：${card.birthday ? moment(card.birthday * 1000).format('YYYY-MM-DD') : '未设置'}`
                ].filter(item => item !== null && item !== undefined)
                forwardNodes.push({
                    user_id: '80000000',
                    nickname: '匿名消息',
                    message: messageContent
                });
            }
        } else {
            forwardNodes.push({
                user_id: '80000000',
                nickname: '匿名消息',
                message: `没有查询到up主信息:${apiResponse.message}`
            });
        }
        return forwardNodes;
    }


    async getInfo(userCookies) {
        const getInfoUrl = `${this.signApi}/space?accesskey=${userCookies.access_token}&mid=${userCookies.DedeUserID}&key=${this.key}`;
        const expLogUrl = `${this.signApi}/exp_log2?SESSDATA=${userCookies.SESSDATA}&key=${this.key}`;
        const info2 = `${this.signApi}/myinfo2?accesskey=${userCookies.access_token}&key=${this.key}`;
        const defaultResponse = {
            code: -1,
            data: {
                face: '',
                name: '未知用户',
                vip: {
                    label: {
                        text: ''
                    }
                },
                level_info: {
                    current_level: 0
                }
            }
        };
        let infoRet = {
            ...defaultResponse
        };
        try {
            if (config.Enable_SignApi) {
                infoRet = await (await fetch(getInfoUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json()
            } else {
                infoRet = await BApi.space(userCookies.DedeUserID, userCookies)
            }
        } catch (err) {
            logger.error('[Bili-Plugin]空间接口请求失败:', err);
        }
        await this.sleep(250);
        let info2Ret = {
            code: -1,
            data: {
                coins: 0
            }
        };
        try {
            if (config.Enable_SignApi) {
                info2Ret = await (await fetch(info2, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json()
            } else {
                info2Ret = await BApi.myinfo2(userCookies)
            }
        } catch (err) {
            logger.error('[Bili-Plugin]详细信息请求失败:', err);
        }
        await this.sleep(250);
        let expRet = {
            code: -1,
            data: {}
        };
        try {
            if (config.Enable_SignApi) {
                expRet = await (await fetch(expLogUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })).json()
            } else {
                expRet = await BApi.exp_log2(userCookies)
            }
        } catch (err) {
            logger.error('[Bili-Plugin]经验日志请求失败:', err);
        }
        const card = infoRet.data.card || defaultResponse.data;
        const currentExp = card.level_info?.current_exp || 0;
        const collectionTop = infoRet.data.images?.collection_top_simple?.top?.result || []
        const pendant = card.pendant
        const nextExp = card.level_info?.next_exp || (card.level_info.current_level * 1000 + 2000);
        const divisor = !userCookies.coin ?
            (card.vip?.vipStatus ? 25 : 15) :
            (card.vip?.vipStatus ? 75 : 65);
        const expTasks = [{
                name: '每日登录',
                exp: `${expRet.data?.login ? '5/5' : '0/5'}`,
                status: expRet.data?.login || false
            },
            {
                name: '每日观看',
                exp: `${expRet.data?.watch ? '5/5' : '0/5'}`,
                status: expRet.data?.watch || false
            },
            {
                name: '每日投币',
                exp: `${expRet.data?.coins}/50`,
                status: (expRet.data?.coins || 0) >= 50
            },
            {
                name: '每日分享',
                exp: `${expRet.data?.share ? '5/5' : '0/5'}`,
                status: expRet.data?.share || false
            },
            {
                name: '绑定邮箱',
                exp: `${expRet.data?.email ? '20/20' : '0/20'}`,
                status: expRet.data?.email || false
            },
            {
                name: '绑定手机',
                exp: `${expRet.data?.tel ? '100/100' : '0/100'}`,
                status: expRet.data?.tel || false
            },
            {
                name: '设置密保',
                exp: `${expRet.data?.safe_question ? '30/30' : '0/30'}`,
                status: expRet.data?.safe_question || false
            },
            {
                name: '实名认证',
                exp: `${expRet.data?.identify_card ? '50/50' : '0/50'}`,
                status: expRet.data?.identify_card || false
            }
        ];
        return {
            face: card.face,
            name: card.name || '未知用户',
            uid: card.mid || '0',
            fans: card.fans || 0,
            attention: card.attention || 0,
            coins: info2Ret.data?.coins || 0,
            collectionTop,
            pendant,
            sign: card.sign ? card.sign : '这个人很神秘，什么都没有写',
            vipStatus: !!card.vip?.vipStatus,
            vipLabel: card.vip?.label?.text || '普通用户',
            vipDue: card.vip?.vipDueDate ?
                moment(card.vip.vipDueDate).format('YYYY-MM-DD') : '未开通',
            accountStatus: card.silence === 0 ? '正常' : '封禁中',
            currentLevel: card.level_info?.current_level || 0,
            expNeeded: Math.max(0, nextExp - currentExp),
            daysToLevelUp: Math.ceil(Math.max(0, nextExp - currentExp) / divisor),
            coinStatus: !!userCookies.coin,
            liveStatus: !!userCookies.live,
            birthday: info2Ret.data?.set_birthday ?
                moment(info2Ret.data.birthday).format('YYYY-MM-DD') : null,
            expireTime: userCookies.expires_in ?
                moment(userCookies.expires_in).format('YYYY-MM-DD') : '已过期',
            expTasks
        };
    }


    async getFeed(userCookies) {
        const tempDir = './temp/bilivideo';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, {
                recursive: true
            });
        }

        const userId = userCookies.DedeUserID;
        const recordPath = path.join(tempDir, `${userId}.json`);
        let usageRecord = {};
        try {
            const data = fs.readFileSync(recordPath, 'utf8');
            usageRecord = JSON.parse(data);
        } catch (err) {}

        let videoData = [];
        while (videoData.length < 5) {
            const feedUrl = `${this.signApi}/feed2?accesskey=${userCookies.access_token}&key=${this.key}`;
            try {
                let response
                let json
                if (config.Enable_SignApi) {
                    response = await fetch(feedUrl, {
                        headers: {
                            authorization: encodeURIComponent(config.Authorization),
                        }
                    });
                    json = await response.json();
                } else {
                    json = await BApi.getFeed(userCookies)
                }
                if (json.code !== 0) {
                    logger.error(`[Bili-Plugin]获取推荐视频未知错误`);
                    break;
                }

                const items = json.data.items;
                for (const item of items) {
                    if (videoData.length >= 5) break;

                    if (item.player_args?.type === 'av') {
                        const aid = item.player_args.aid;
                        // 检查次数
                        if (userCookies.coin && (usageRecord[aid] || 0) >= 2) continue;
                        // 添加视频数据
                        videoData.push({
                            short_link: item.short_link,
                            aid: aid,
                            cid: item.player_args.cid
                        });
                        // 更新使用记录
                        usageRecord[aid] = (usageRecord[aid] || 0) + 1;
                    }
                }
                fs.writeFileSync(recordPath, JSON.stringify(usageRecord));

                if (videoData.length >= 5) break;
            } catch (err) {
                logger.error("[Bili-Plugin]获取视频数据失败:", err);
            }
            await this.sleep(2000)
        }
        return videoData;
    }

    async addCoin(aid, userCookies, coin = 1) {
        const coinUrl = `${this.signApi}/addcoin?accesskey=${userCookies.access_token}&aid=${aid}&coin=${coin}&like=1&key=${this.key}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(coinUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.addCoin(aid, userCookies, coin)
            }
            return json.code === 0 ? "🌸投币视频: 成功(10经验)" : `🌸投币视频: 失败(${json.message || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-Plugin]投币操作失败:", err);
            return "🌸投币视频: 失败(请求错误)";
        }
    }

    clean = async (e) => {
        let qq
        const cached = await redis.get('bili:lists')
        if (cached) {
            qq = JSON.parse(cached)
        } else {
            qq = await this.getuserlists() || []
            await redis.set('bili:lists', JSON.stringify(qq), {
                EX: 1700
            })
        }
        if (!qq) return false
        if (qq.includes(e.user_id)) {
            e.isMaster = true;
        }
        return e
    }

    async Bilicheck() {
        try {
            const body = await this.getuserlists() || []
            if (body) {
                await redis.set('bili:lists', JSON.stringify(body), {
                    EX: 1700
                })
            }
            const key2 = await this.getkey()
            const res = await fetch(`${this.signApi}/check?key=${this.key}&lists=${body}&key2=${key2}`, {
                headers: {
                    authorization: encodeURIComponent(config.Authorization),
                }
            })
            const r = await res.json()
            logger.mark(logger.cyan(r.msg))
            return r.msg
        } catch (err) {
            logger.error("[Bili-Plugin]校验出现错误：", err);
            return '未知错误'
        }
    }

    async fetchlist() {
        try {
            let uins = []
            let isTRSS = Array.isArray(Bot.uin)
            if (isTRSS) {
                const cfg = (await import("../../../lib/config/config.js")).default;
                uins = cfg['qq'] || ['114514']
            } else {
                uins = [Bot.uin] || ['114514']
            }
            const cached = await redis.get('bili:lists')
            let body
            if (cached) {
                body = JSON.parse(cached)
            } else {
                body = await this.getuserlists() || []
                await redis.set('bili:lists', JSON.stringify(body), {
                    EX: 3600
                })
            }
            const key2 = await this.getkey()
            for (const uin of uins) {
                await fetch(`${this.signApi}/userlists?uin=${uin}&key=${key2}`, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                await this.sleep(1000)
            }
            let configs
            if (fs.existsSync(this.configFilePath)) {
                const file = fs.readFileSync(`${pluginRoot}/config/config.yaml`, 'utf8');
                configs = YAML.parse(file);
            } else {
                configs = {}
            }
            let y = false
            if (lodash.get(configs, 'totalbody')) {
                body = await lodash.get(configs, 'totalbody')
                y = true
            }
            if (!body.length) {
                body = await this.getuserlists()
                y = false
            }
            let response
            if (y) {
                response = await fetch(`${config.totalApi}/userlists?lists=[${body}]`, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })
            } else {
                response = await fetch(`${config.totalApi}/userlists?lists=${body}`, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                })
            }
            const r = await response.json();
            logger.mark(logger.cyan(r.msg))
            return r.msg
        } catch (err) {}
    }

    async getQQlist() {
        let qq = [];
        const getUins = (source) => {
            if (Array.isArray(source)) {
                return source;
            } else if (typeof source === 'number' || typeof source === 'string') {
                return [source];
            }
            return [];
        };
        let uins = getUins(Bot.uin);
        if (uins.length === 0 && Bin && Bin.uin) {
            uins = getUins(Bin.uin);
        }
        for (let attempt = 0; uins.length === 0 && attempt < 3; attempt++) {
            uins = getUins(Bot.uin);
            if (uins.length === 0 && Bin && Bin.uin) {
                uins = getUins(Bin.uin);
            }
        }

        qq.push(...uins.map(Number).filter(num => !isNaN(num)));

        qq = qq.filter(number => !(
            (number >= 2854000000 && number <= 2855000000) ||
            (number >= 2854196301 && number <= 2854216399) ||
            (number >= 3889000000 && number <= 3890000000) ||
            number === 3328144510 ||
            number === 66600000 ||
            (number >= 4010000000 && number <= 4019999999)
        ))
        return qq;
    }

    async targetUsers() {
        const coinUrl = `${this.signApi}/lists2?key=${this.key}`;
        let text = []
        const response = await fetch(coinUrl, {
            headers: {
                authorization: encodeURIComponent(config.Authorization),
            }
        })
        text = await response.json()
        return text
    }

    async thumbUp(qqList, targetUsers) {
        for (let uin of qqList) {
            for (let i of targetUsers) {
                try {
                    i = Number(i)
                    uin = Number(uin)
                    if (isNaN(i)) continue
                    if (isNaN(uin)) continue
                    if (await Bot[uin]?.fl?.has(i)) {
                        await Bot[uin].pickFriend(i).thumbUp(20);
                    } else {
                        await Bot[uin].pickUser(i).thumbUp(20);
                    }
                } catch (error) {
                    continue
                }
            }
        }
    }

    async shareVideo(aid, userCookies) {
        const shareUrl = `${this.signApi}/share?accesskey=${userCookies.access_token}&aid=${aid}&key=${this.key}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(shareUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.shareVideo(aid, userCookies)
            }
            if (json.data && json.data.toast) {
                return json.data.toast;
            } else if (json.data && json.data.count > 0) {
                return "🌸分享视频: 成功(5经验)";
            } else {
                return "🌸分享视频: 失败(请重新登录)";
            }
        } catch (err) {
            logger.error("[Bili-Plugin]分享操作失败:", err);
            return "🌸分享视频: 失败(未知错误)";
        }
    }

    async reportWatch(aid, cid, userCookies, time = Math.floor(Math.random() * 91) + 10) {
        const reportUrl = `${this.signApi}/report?accesskey=${userCookies.access_token}&aid=${aid}&cid=${cid}&key=${this.key}&time=${time}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(reportUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.reportWatch(aid, cid, userCookies, time)
            }
            if (json.code === 0) {
                return "🌸观看视频: 成功(5经验)"
            } else {
                const reportUrl2 = `${this.signApi}/report?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&aid=${aid}&cid=${cid}&csrf=${userCookies.csrf}&key=${this.key}&time=${time}`
                const response2 = await fetch(reportUrl2, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                const json2 = await response2.json()
                return json2.code === 0 ? "🌸观看视频: 成功(5经验)" : "🌸观看视频: 失败(请求错误)";
            }
        } catch (err) {
            logger.error("[Bili-Plugin]观看操作失败:", err);
            return "🌸观看视频: 失败(未知错误)";
        }
    }

    async getuserlists() {
        const coinUrl = `${this.signApi}/lists2?key=${this.key}`;
        let userList;
        let text = []
        try {
            const response = await fetch(coinUrl, {
                headers: {
                    authorization: encodeURIComponent(config.Authorization),
                }
            })
            try {
                text = await response.text()
            } catch (error) {
                text = await response.json()
            }
            userList = JSON.parse(text);
            if (!Array.isArray(userList)) {
                userList = []
            }
        } catch (error) {
            userList = []
        }
        const blackUser = this.getConfig('blackUser') || [];
        const blackQQ = this.getConfig('blackQQ') || [];
        const usersToRemoveFromBlackUser = userList.filter(item => blackUser.includes(item));
        const usersToRemoveFromBlackQQ = userList.filter(item => blackQQ.includes(item));
        if (usersToRemoveFromBlackUser.length > 0) {
            const updatedBlackUser = blackUser.filter(item => !usersToRemoveFromBlackUser.includes(item));
            this.setConfig('blackUser', updatedBlackUser);
        }
        if (usersToRemoveFromBlackQQ.length > 0) {
            const updatedBlackQQ = blackQQ.filter(item => !usersToRemoveFromBlackQQ.includes(item));
            this.setConfig('blackQQ', updatedBlackQQ);
        }

        return text;
    }

    async getExperience(userCookies) {
        const expUrl = `${this.signApi}/experience?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&csrf=${userCookies.csrf}&key=${this.key}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(expUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.getExperience(userCookies)
            }
            return json.code === 0 ? "成功" : `失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-Plugin]大会员经验领取失败:", err);
            return "失败";
        }
    }

    async getCoupons(userCookies) {
        const couponTypes = {
            1: "B币券",
            2: "会员购优惠券",
            3: "漫画福利券",
            4: "会员购包邮券",
            5: "漫画商城优惠券",
            6: "装扮体验卡",
            7: "课堂优惠券"
        };
        let couponResults = [];
        for (let type = 1; type <= 7; type++) {
            let result = "失败(未知错误)\n";
            try {
                const couponUrl = `${this.signApi}/kaquan?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&csrf=${userCookies.csrf}&type=${type}&key=${this.key}`;
                let response
                let json
                if (config.Enable_SignApi) {
                    response = await fetch(couponUrl, {
                        headers: {
                            authorization: encodeURIComponent(config.Authorization),
                        }
                    });
                    json = await response.json();
                } else {
                    json = await BApi.getCoupons(userCookies, type)
                }
                result = json.code === 0 ? "成功" : `失败(${json.message || json.msg || '未知错误'})`;
            } catch (err) {
                logger.error(`[Bili-Plugin] ${couponTypes[type]} 领取失败:`, err);
            }
            couponResults.push({
                type: couponTypes[type],
                result
            });
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        let Message = `卡券领取情况:\n`
        for (const coupon of couponResults) {
            Message += `- 🌸${coupon.type}: ${coupon.result}\n`;
        }
        return Message
    }

    async shareManhua(userCookies) {
        const manhuaShareUrl = `${this.signApi}/manhuashare?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&key=${this.key}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(manhuaShareUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.shareManhua(userCookies)
            }
            if (json.msg === "今日已分享") {
                return '🌸漫画分享: 今日已分享';
            } else if (json.data && json.data.point !== undefined) {
                const earnedPoints = json.data.point;
                return `🌸漫画分享:成功(${earnedPoints} 积分)`;
            } else {
                return `🌸漫画分享: 失败(${json.msg || json.message || '未知错误'})`;
            }
        } catch (err) {
            logger.error("[Bili-Plugin]漫画分享失败:", err);
            return "🌸漫画分享: 失败(未知错误)";
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async signManhua(userCookies) {
        const manhuaSignUrl = `${this.signApi}/manhuasign?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&key=${this.key}`;
        try {
            let response
            let json
            if (config.Enable_SignApi) {
                response = await fetch(manhuaSignUrl, {
                    headers: {
                        authorization: encodeURIComponent(config.Authorization),
                    }
                });
                json = await response.json();
            } else {
                json = await BApi.signManhua(userCookies)
            }
            return json.code === 0 ? "🌸漫画签到: 成功" : `🌸漫画签到: 失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-Plugin]漫画签到失败:", err);
            return "🌸漫画签到: 失败(未知错误)";
        }
    }
}
export default new Bili();