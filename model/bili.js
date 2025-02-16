import fetch from "node-fetch";
import moment from 'moment';
import config from '../model/Config.js';
import configModule from "../../../lib/config/config.js"
import YAML from 'yaml';
import fs from 'fs';
import lodash from 'lodash';
import {
    pluginName,
    pluginRoot
} from "../model/constant.js"
import {
    exec
} from 'child_process'
import net from 'net'
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
        this.key = configModule?.qq?.[0] || Bot.uin;
        this.clean = this.clean.bind(this)
        this.Update_Plugin = new Update()
        this.configFilePath = './config/config/other.yaml'
        this.config = this.loadConfig()
    }

    async getmiyocode(action) {
        try {
            const actIds = {
                '1': 'ea202501141852052146',  // 原神
                '2': 'ea202502111418441019',  // 星铁
                '3': 'ea202501091516567617'   // 绝区零
            };
    
            const actId = actIds[action];
            if (!actId) return { retcode: 0, data: [], date: null };
            const timestamp = Math.floor(Date.now() / 1000);
            const params = new URLSearchParams({
                version: '524da7',
                time: timestamp
            });
            const response = await fetch(`https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode?${params}`, {
                headers: {
                    'Host': 'api-takumi-static.mihoyo.com',
                    'accept': 'application/json, text/plain, */*',
                    'x-rpc-act_id': actId,
                    'user-agent': 'Mozilla/5.0 (Linux; Android 12; 24031PN0DC Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 miHoYoBBS/2.80.1',
                    'origin': 'https://webstatic.mihoyo.com',
                    'x-requested-with': 'com.mihoyo.hyperion',
                }
            });
    
            const result = await response.json();
            if (result.retcode !== 0 || !result.data?.code_list) {
                return { retcode: 0, data: [], date: null };
            }
            const cleanHTML = (str) => str.replace(/<[^>]+>/g, '');
            const codeList = result.data.code_list.map(item => ({
                title: cleanHTML(item.title),
                code: item.code,
                img: item.img,
                time: moment.unix(parseInt(item.to_get_time)).format('YYYY-MM-DD HH:mm:ss')
            }));

            let date = null;
            if (codeList.length > 0) {
                const firstTime = moment(codeList[0].time, 'YYYY-MM-DD HH:mm:ss');
                date = firstTime.clone().add(1, 'days').set({ hour: 12, minute: 0, second: 0 }).format('YYYY-MM-DD HH:mm:ss');
            }
            return {
                retcode: 0,
                data: codeList,
                date: date || null
            };
        } catch (err) {
            logger.error("[Bili-Plugin]获取米游社兑换码失败", err);
            return { retcode: 0, data: [], date: null };
        }
    }
    
    async getSourceMessage(e) {
        if (e.getReply) {
            return await e.getReply()
        } else if (e.source) {
            let source
            if (e.isGroup) {
                source = (await e.group.getChatHistory(e.source ?.seq, 1)).pop()
              }else{
                source = (await e.friend.getChatHistory((e.source ?.time + 1), 1)).pop()
          }
            return source 
        }
        return null
    }

    async getvideourl(e) {
        const source = await this.getSourceMessage(e);
        if(!source)return false
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

    async getvideoinfo(url,cookies = config.SESSDATA) {
        const jxUrl = `${this.signApi}/jx/b_jx?msg=${url}&cookie=SESSDATA=${cookies}`
        try {
            const response = await fetch(jxUrl);
            const json = await response.json();
            return json
        } catch (err) {
            logger.error("[Bili-Plugin]视频解析失败:", err);
            return null
        }
    }

    async likevideo(userCookies,aid,action) {
        // action：0喜欢，1不喜欢
        const likeUrl = `${this.signApi}/like?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}&like=${action}`
        try {
            const response = await fetch(likeUrl)
            const json = await response.json()
            const reply = action === 0 ? '点赞' : '取消点赞'
            return json.code === 0 ? `${reply}视频成功`: `${reply}视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]点赞操作失败:", err);
            return `${reply}视频请求失败，请检查日志输出`
        }
    }

    async dislikevideo(userCookies,aid) {
        const dislikeUrl = `${this.signApi}/dislike?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            const response = await fetch(dislikeUrl)
            const json = await response.json()
            return json.code === 0 ? `点踩视频成功`: `点踩视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]点踩操作失败:", err);
            return `点踩视频请求失败，请检查日志输出`
        }
    }

    async triplevideo(userCookies,aid) {
        const tripleUrl = `${this.signApi}/triple?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            const response = await fetch(tripleUrl)
            const json = await response.json()
            return json.code === 0 ? `一键三连成功，视频已收藏至默认文件夹`: `一键三连失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]一键三连操作失败:", err);
            return `一键三连请求失败，请检查日志输出`
        }
    }

    async favvideo(userCookies,aid) {
        const favUrl = `${this.signApi}/fav?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            const response = await fetch(favUrl)
            const json = await response.json()
            return json.code === 0 ? `收藏视频成功，视频已收藏至默认文件夹`: `收藏视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]收藏视频操作失败:", err);
            return `收藏视频请求失败，请检查日志输出`
        }
    }

    async unfavvideo(userCookies,aid) {
        const unfavUrl = `${this.signApi}/unfav?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}`
        try {
            const response = await fetch(unfavUrl)
            const json = await response.json()
            return json.code === 0 ? `取消收藏视频成功！`: `取消收藏视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]取消收藏视频操作失败:", err);
            return `取消收藏视频请求失败，请检查日志输出`
        }
    }

    async replyvideo(userCookies,aid,msg) {
        const replyUrl = `${this.signApi}/reply?accesskey=${userCookies.access_token}&key=${this.key}&aid=${aid}&msg=${msg}`
        try {
            const response = await fetch(replyUrl)
            const json = await response.json()
            return json.code === 0 ? `评论视频成功！`: `评论视频失败:${json.message || json.msg || '未知错误'}`;
        } catch (err) {
            logger.error("[Bili-Plugin]评论视频操作失败:", err);
            return `评论视频请求失败，请检查日志输出`
        }
    }

    async getsha() {
        const date = await this.Update_Plugin.getTime(pluginName)
        const sha = await this.Update_Plugin.getCommitId(pluginName)
        return `& Sha:${sha} & Date: ${date}`
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

    async isUpdate() {
        try {
            const response = await fetch('https://gitee.com/api/v5/repos/nennen-cn/Bili-Plugin/commits?per_page=1');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const nowsha = data[0].sha.substring(0, 7)
            const sha = await this.Update_Plugin.getCommitId(pluginName);
            if (sha !== nowsha) {
                logger.mark(`[Bili-Plugin]有更新！！最新sha:${nowsha};本地sha:${sha}开始执行更新操作....`)
                return true
            } else {
                logger.mark(`[Bili-Plugin]暂无更新，最新sha:${nowsha};本地sha:${sha}`)
                return false
            }
        } catch (error) {
            logger.mark(`[Bili-Plugin]检测更新出错惹TAT...`)
            return false
        }
    }
    async checkPnpm() {
        let npm = 'npm'
        let ret = await this.execSync('pnpm -v')
        if (ret.stdout) npm = 'pnpm'
        return npm
    }


    async restart() {
        const isTRSS = Array.isArray(Bot.uin)
        logger.mark(`[Bili-Plugin]自动更新完成，开始执行重启操作...`)
        if (isTRSS) {
            if (process.env.app_type === "pm2") {
                const ret = await Bot.exec("pnpm run restart")
                if (!ret.error) process.exit()
                Bot.makeLog("error", ["重启错误", ret])
            } else process.exit()
        } else {
            let restart_port
            try {
                restart_port = YAML.parse(fs.readFileSync(`./config/config/bot.yaml`, `utf-8`))
                restart_port = restart_port.restart_port || 27881
            } catch {}
            const isPortTaken = async (port) => {
                return new Promise((resolve) => {
                    const tester = net.createServer()
                        .once('error', () => resolve(true))
                        .once('listening', () => tester.once('close', () => resolve(false)).close())
                        .listen(port);
                });
            };
            let npm = await this.checkPnpm()
            if (await isPortTaken(restart_port || 27881)) {
                let result = await fetch(`http://localhost:${restart_port || 27881}/restart`)
                result = await result.text()
                if (result !== `OK`) {
                    logger.error(`重启失败`)
                }
            } else {
                try {
                    let cm = `${npm} start`
                    if (process.argv[1].includes('pm2')) {
                        cm = `${npm} run restart`
                    }
                    exec(cm, {
                        windowsHide: true
                    }, (error, stdout, stderr) => {
                        if (error) {
                            logger.error(`重启失败\n${error.stack}`)
                        } else if (stdout) {
                            logger.mark('重启成功，运行已由前台转为后台')
                            logger.mark(`查看日志请用命令：${npm} run log`)
                            logger.mark(`停止后台运行命令：${npm} stop`)
                            process.exit()
                        }
                    })
                } catch (error) {}
            }
        }
    }

    async getkey() {
        const keyapi = `${this.signApi}/getkey`
        try {
            let rediskey = await redis.get('bili:apikey')
            if (!rediskey) {
                const key = await fetch(keyapi)
                const keys = await key.json()
                if (keys.code === 0) {
                    await redis.set('bili:apikey', keys.key, {
                        EX: 21600
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
                    msg: `抽中了字符:『${wording}』 寓意为:『${word_desc}』`
                };
            } else if (responseJson.retcode === 11004) {
                return {
                    code: -1,
                    msg: `今日已抽过字符: ${responseJson.msg}`
                };
            } else {
                return {
                    code: 114514,
                    msg: `抽字符时遇到错误: ${responseJson.data || responseJson.msg}`
                };
            }
        } catch (error) {
            logger.error(error)
            return {
                code: 114514,
                msg: `请求过程中发生错误`
            };
        }
    }

    async Dailyfriend(uin, skey, pskey) {
        const qqdaily = `${this.signApi}/qqdaily?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`
        const results = [];

        try {
            const qqdailydataFirst = await (await fetch(qqdaily)).json();
            await this.sleep(1500);
            results.push(qqdailydataFirst.code === 0 ? `收集卡(第1张): 成功` : `收集卡(第1张): 失败(${qqdailydataFirst.message || qqdailydataFirst.msg || '未知错误'})`);
            const filteredFriends = Array.from(Bot[uin].fl.keys()).filter(friendId => friendId !== uin);
            const shuffledFriends = filteredFriends.sort(() => 0.5 - Math.random());
            const friendsToShareWith = shuffledFriends.slice(0, 3);
            for (let i = 0; i < friendsToShareWith.length; i++) {
                const friend = friendsToShareWith[i];
                const qqshare = `${this.signApi}/qqshare?uin=${uin}&skey=${skey}&pskey=${pskey}&friend=${friend}&key=${this.key}`;
                const qqsharedata = await (await fetch(qqshare)).json();
                await this.sleep(1500);
                results.push(qqsharedata.code === 0 ? `分享操作(第${i+1}次): 成功` : `分享(第${i+1}次): 失败(${qqsharedata.message || qqsharedata.msg || '未知错误'})`);
                const qqdailydataNext = await (await fetch(qqdaily)).json();
                await this.sleep(1500);
                results.push(qqdailydataNext.code === 0 ? `收集卡(第${i+2}张): 成功` : `收集卡(第${i+2}张): 失败(${qqdailydataNext.message || qqdailydataNext.msg || '未知错误'})`);
            }

            return results.join("\n");
        } catch (err) {
            logger.error("[Bili-Plugin]日签分享:", err);
            return "日签分享: 失败(未知错误)";
        }
    }

    async DailySignCard(uin, skey, pskey) {
        const qqdaily2 = `${this.signApi}/qqdaily2?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const qqdaily3 = `${this.signApi}/qqdaily3?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const qqdaily4 = `${this.signApi}/qqdaily4?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const qqdaily5 = `${this.signApi}/qqdaily5?uin=${uin}&skey=${skey}&pskey=${pskey}&key=${this.key}`;
        const results = [];
        try {
            const qqdaily2data = await (await fetch(qqdaily2)).json();
            await this.sleep(1500);
            const qqdaily3data = await (await fetch(qqdaily3)).json();
            await this.sleep(1500);
            const qqdaily4data = await (await fetch(qqdaily4)).json();
            await this.sleep(1500);
            const qqdaily5data = await (await fetch(qqdaily5)).json();
            await this.sleep(1500);
            results.push(qqdaily2data.code === 0 ? "普通日签卡: 成功" : `普通日签卡: 失败(${qqdaily2data.message || qqdaily2data.msg || '未知错误'})`);
            results.push(qqdaily3data.code === 0 ? "晚安卡: 成功" : `晚安卡: 失败(${qqdaily3data.message || qqdaily3data.msg || '未知错误'})`);
            results.push(qqdaily4data.code === 0 ? "每日Q崽: 成功" : `每日Q崽: 失败(${qqdaily4data.message || qqdaily4data.msg || '未知错误'})`);
            results.push(qqdaily5data.code === 0 ? "心事罐: 成功" : `心事罐: 失败(${qqdaily5data.message || qqdaily5data.msg || '未知错误'})`);
            return results.join("\n");
        } catch (err) {
            logger.error("[Bili-Plugin]日签卡失败:", err);
            return "日签卡: 失败(未知错误)";
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
        const livedamu = `${this.signApi}/danmu?SESSDATA=${userCookies.SESSDATA}&csrf=${userCookies.csrf}&msg=${msg}&roomid=${roomid}&key=${this.key}`;
        try {
            const livedamuResponse = await fetch(livedamu);
            const damu = await livedamuResponse.json();
            if (damu.code === 0) {
                return `账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』成功`;
            } else {
                return `账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败\n失败原因:『${damu.message || damu.msg || '未知错误'}』`;
            }
        } catch (err) {
            logger.error("[Bili-Plugin]发送弹幕失败", err);
            return `账号『${userCookies.DedeUserID}』在直播间『${roomid}』发送弹幕『${msg}』失败！！\n失败原因:『请求失败』`;
        }
    }


    async getlivefeed(userCookies) {
        const livefeed = `${this.signApi}/livefeed?accesskey=${userCookies.access_token}&key=${this.key}`;
        try {
            const livefeedResponse = await fetch(livefeed);
            if (!livefeedResponse.ok) {
                throw new Error(`HTTP ${livefeedResponse.status}`);
            }
            const livejson = await livefeedResponse.json();

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
            const expResponse = await fetch(expLogUrl);
            const expRet = await expResponse.json();
            return expRet
        } catch (err) {
            logger.error("[Bili-Plugin]获取经验日志失败", err);
        }
    }

    async getwebinfo(userCookies) {
        const webinfo = `${this.signApi}/myinfo?SESSDATA=${userCookies.SESSDATA}&key=${this.key}`
        try {
            const webinfoResponse = await fetch(webinfo);
            const web = await webinfoResponse.json();
            return web
        } catch (err) {
            logger.error("[Bili-Plugin]获取用户web端信息失败", err);
        }
    }

    async getInfo(userCookies) {
        const getInfoUrl = `${this.signApi}/space?accesskey=${userCookies.access_token}&mid=${userCookies.DedeUserID}&key=${this.key}`;
        const expLogUrl = `${this.signApi}/exp_log2?SESSDATA=${userCookies.SESSDATA}&key=${this.key}`;
        const info2 = `${this.signApi}/myinfo2?accesskey=${userCookies.access_token}&key=${this.key}`;
        let infoRet = {
            code: -1
        };
        let expRet = {
            code: -1
        };
        let info2Ret = {
            code: -1
        };
        try {
            const infoResponse = await fetch(getInfoUrl);
            infoRet = await infoResponse.json();
            if (infoRet.code !== 0) {
                throw new Error("获取用户信息失败");
            }
        } catch (err) {
            logger.error("[Bili-Plugin]获取用户信息失败", err);
        }
        await this.sleep(1000)
        try {
            const info2Response = await fetch(info2);
            info2Ret = await info2Response.json();
            if (infoRet.code !== 0) {
                throw new Error("获取用户信息失败");
            }
        } catch (err) {
            logger.error("[Bili-Plugin]获取用户信息失败", err);
        }
        await this.sleep(1000)
        try {
            const expResponse = await fetch(expLogUrl);
            expRet = await expResponse.json();
            if (expRet.code !== 0) {
                throw new Error("获取经验日志失败");
            }
        } catch (err) {
            logger.error("[Bili-Plugin]获取经验日志失败", err);
        }
        let userInfo = [];
        if (infoRet.code === 0) {
            const card = infoRet.data.card;
            const vipStatus = card.vip.vipStatus === 1;
            const currentExp = card.level_info.current_exp;
            const nextExp = card.level_info.next_exp;
            let expNeeded = nextExp - currentExp;
            const divisor = !userCookies.coin ?
                (vipStatus ? 25 : 15) :
                (vipStatus ? 75 : 65);
            const daysToLevelUp = Math.ceil(expNeeded / divisor);

            userInfo = [
                segment.image(card.face),
                `用户名：${card.name}\n`,
                `Uid：${card.mid}\n`,
                `粉丝：${card.fans}\n`,
                `关注：${card.attention}\n`,
                `硬币：${info2Ret.data.coins}\n`,
                `签名：${card.sign}\n`,
                `会员：${vipStatus ? card.vip.label.text : '无会员'}\n`,
                vipStatus ? `会员到期时间：${moment(card.vip.vipDueDate).format('YYYY-MM-DD HH:mm:ss')}\n` : null,
                `账号状态：${card.silence === 0 ? '正常' : '封禁中'}\n`,
                `当前等级: ${card.level_info.current_level}\n`,
                `升级所需: ${expNeeded} 经验\n`,
                `预计天数: ${daysToLevelUp}\n`,
            ];
        } else {
            userInfo.push("获取用户信息时发生未知错误\n");
        }
        userInfo.push(`投币功能：${userCookies.coin ? '开启' : '关闭'}\n`);
        userInfo.push(`弹幕功能：${userCookies.live ? '开启' : '关闭'}\n`);
        if (info2Ret.data.set_birthday) {
            userInfo.push(`生日：${info2Ret.data.birthday}\n`);
        }
        userInfo.push(`ck过期时间: ${moment(userCookies.expires_in).format('YYYY-MM-DD HH:mm:ss')}\n`);
        if (expRet.code === 0) {
            userInfo.push(`===========================\n`);
            userInfo.push(`每日登录: ${expRet.data.login ? '已完成(5经验)' : '未完成(可领5经验)'}\n`);
            userInfo.push(`每日观看: ${expRet.data.watch ? '已完成(5经验)' : '未完成(可领5经验)'}\n`);
            userInfo.push(`每日投币: ${expRet.data.coins === 50 ? '已完成(50经验)' : `未完成(可领${50 - expRet.data.coins}经验)`}\n`);
            userInfo.push(`每日分享: ${expRet.data.share ? '已完成(5经验)' : '未完成(可领5经验)'}\n`);
            userInfo.push(`绑定邮箱: ${expRet.data.email ? '已完成(20经验)' : '未完成(可领20经验)'}\n`);
            userInfo.push(`绑定手机号: ${expRet.data.tel ? '已完成(100经验)' : '未完成(可领100经验)'}\n`);
            userInfo.push(`设置密保: ${expRet.data.safe_question ? '已完成(30经验)' : '未完成(可领30经验)'}\n`);
            userInfo.push(`实名认证: ${expRet.data.identify_card ? '已完成(50经验)' : '未完成(可领50经验)'}`);
        } else {
            userInfo.push("获取经验日志时发生未知错误");
        }

        return userInfo.filter(info => info !== null);
    }


    async getFeed(userCookies) {
        let videoData = [];
        while (videoData.length < 5) {
            const feedUrl = `${this.signApi}/feed2?accesskey=${userCookies.access_token}&key=${this.key}`;
            try {
                const response = await fetch(feedUrl);
                const json = await response.json();
                if (json.code !== 0) {
                    logger.error(`[Bili-Plugin]未知错误`);
                    break;
                }
                const items = json.data.items;
                for (const item of items) {
                    if (item.player_args && item.player_args.type === 'av' && videoData.length < 5) {
                        videoData.push({
                            short_link: item.short_link,
                            aid: item.player_args.aid,
                            cid: item.player_args.cid
                        });
                    }
                }
            } catch (err) {
                logger.error("[Bili-Plugin]获取视频数据失败:", err);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return videoData;
    }

    async addCoin(aid, userCookies) {
        const coinUrl = `${this.signApi}/addcoin?accesskey=${userCookies.access_token}&aid=${aid}&coin=1&like=1&key=${this.key}`;
        try {
            const response = await fetch(coinUrl);
            const json = await response.json();
            return json.code === 0 ? "投币视频: 成功(10经验)" : `投币视频: 失败(${json.message || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-Plugin]投币操作失败:", err);
            return "投币视频: 失败";
        }
    }

    clean = async (e) => {
        let qq
        const cached = await redis.get('bili:lists')
        if (cached) {
            qq = JSON.parse(cached)
        } else {
            qq = await this.getuserlists();
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
            const coinUrl = `${this.signApi}/lists2?key=${this.key}`;
            const response = await fetch(coinUrl);
            const body = await response.text()
            if (body) {
                await redis.set('bili:lists', JSON.stringify(body), {
                    EX: 1700
                })
            }
            const key2 = await this.getkey()
            const res = await fetch(`${this.signApi}/check?key=${this.key}&lists=${body}&key2=${key2}`)
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
            const cfg = (await import("../../../lib/config/config.js")).default;
            let uins = cfg['qq']
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
                await fetch(`${this.signApi}/userlists?uin=${uin}&key=${key2}`);
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
                response = await fetch(`${config.totalApi}/userlists?lists=[${body}]`)
            } else {
                response = await fetch(`${config.totalApi}/userlists?lists=${body}`)
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

    async thumbUp(qqList, targetUsers) {
        for (let uin of qqList) {
            for (let i of targetUsers) {
                try {
                    i = Number(i)
                    if (!NaN(i)) continue
                    if (await Bot[uin]?.fl?.has(i)) {
                        await Bot[uin].pickFriend(i).thumbUp(20);
                    } else {
                        await Bot[uin].pickUser(i).thumbUp(20);
                    }
                } catch (error) {
                    // 不知道怎么搞，烦死了
                }
            }
        }
    }

    async shareVideo(aid, userCookies) {
        const shareUrl = `${this.signApi}/share?accesskey=${userCookies.access_token}&aid=${aid}&key=${this.key}`;
        try {
            const response = await fetch(shareUrl);
            const json = await response.json();
            if (json.data && json.data.toast) {
                return json.data.toast;
            } else if (json.data && json.data.count > 0) {
                return "分享视频: 成功(5经验)";
            } else {
                return "分享视频: 失败(请重新登录)";
            }
        } catch (err) {
            logger.error("[Bili-Plugin]分享操作失败:", err);
            return "分享视频: 失败(未知错误)";
        }
    }

    async reportWatch(aid, cid, userCookies) {
        const reportUrl = `${this.signApi}/report?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&aid=${aid}&cid=${cid}&csrf=${userCookies.csrf}&key=${this.key}`;
        try {
            const response = await fetch(reportUrl);
            const json = await response.json();
            return json.code === 0 ? "观看视频: 成功(5经验)" : "观看视频: 失败(请求错误)";
        } catch (err) {
            logger.error("[Bili-Plugin]观看操作失败:", err);
            return "观看视频: 失败(未知错误)";
        }
    }

    async getuserlists() {
        const coinUrl = `${this.signApi}/lists2?key=${this.key}`;
        const response = await fetch(coinUrl);
        const text = await response.text();
        let userList;
        try {
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
            const response = await fetch(expUrl);
            const json = await response.json();
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
                const response = await fetch(couponUrl);
                const json = await response.json();
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
            Message += `- ${coupon.type}: ${coupon.result}\n`;
        }
        return Message
    }

    async shareManhua(userCookies) {
        const manhuaShareUrl = `${this.signApi}/manhuashare?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&key=${this.key}`;
        try {
            const response = await fetch(manhuaShareUrl);
            const json = await response.json();
            if (json.msg === "今日已分享") {
                return '漫画分享: 失败(今日已分享)';
            } else if (json.data && json.data.point !== undefined) {
                const earnedPoints = json.data.point;
                return `漫画分享:成功(${earnedPoints} 积分)`;
            } else {
                return `漫画分享: 失败(${json.msg || json.message || '未知错误'})`;
            }
        } catch (err) {
            logger.error("[Bili-Plugin]漫画分享失败:", err);
            return "漫画分享: 失败(未知错误)";
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async signManhua(userCookies) {
        const manhuaSignUrl = `${this.signApi}/manhuasign?SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}&key=${this.key}`;
        try {
            const response = await fetch(manhuaSignUrl);
            const json = await response.json();
            return json.code === 0 ? "漫画签到: 成功" : `漫画签到: 失败(${json.message || json.msg || '未知错误'})`;
        } catch (err) {
            logger.error("[Bili-Plugin]漫画签到失败:", err);
            return "漫画签到: 失败(未知错误)";
        }
    }
}
export default new Bili();