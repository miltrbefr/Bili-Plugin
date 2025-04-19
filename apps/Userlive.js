import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { Config as config, Bili as Bili} from "#model"
export class Biliuserlive extends plugin {
    constructor() {
        super({
            name: "Bili:查询UP开播",
            desc: "主播去哪了",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(我的|他的|她的)?(关注)?(主播|煮波)开播(了)?(没|吗)$|#?(我的|他的|她的)?(主播|煮波)(在干嘛|还没开播吗|怎么回事|逝了|去哪)(了)?(辽)?(嘞)?(没)?$/,
                fnc: "biliuserlive"
            }]
        });
    }

    async biliuserlive(e) {
        let userID = String(e.user_id)
        let selfID = String(e.self_id)
        let qqNumbers = []
        for (let msg of e.message) {
            if (msg.type === 'at') {
              qqNumbers.push(msg.qq);
            }
          }
          if(qqNumbers.length > 0){
            userID = String(qqNumbers[0])
          }
        if(userID === selfID)userID =e.user_id
        const cookiesFilePath = path.join('./data/bili', `${String(userID).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply("未绑定ck，请发送哔站登录进行绑定", true);
            return;
        }
        if(await redis.get(`bili:getlivefeed:${String(userID).replace(/:/g, '_').trim()}`)){
            e.reply('笨蛋你明明刚刚找过你主播了，过一会再试吧~',true)
            return
        }
        redis.set(`bili:getlivefeed:${String(userID).replace(/:/g, '_').trim()}`, '1', {
            EX: 180
        })
        const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        if (Object.keys(cookiesData).length === 0) {
            return await e.reply("您的登录已过期，请先发送【哔站登录】重新进行绑定", true);
        }
        const r = await e.reply("开始获取你的关注列表主播直播状态请稍等...",true)
        await Bili.recall(e, r, 5)
        let forwardNodes = [];
        let Count = 0
        for (const userId in cookiesData) {
            const userCookies = cookiesData[userId]
            try {
                const livefeed = await Bili.getlivefeed(userCookies);
                forwardNodes.push({
                    user_id: e.user_id || '1677979616',
                    nickname: e.sender.nickname || '主播去哪了',
                    message:  `哔站账号 ${userId} 当前关注列表有${livefeed .length}人开播啦~`
                });
  
                if (!livefeed || livefeed.length === 0) {
                    forwardNodes.push({
                        user_id: e.user_id || '1677979616',
                        nickname: e.sender.nickname || '主播去哪了',
                        message:   `===========================\n哔站账号 ${userId} 的关注主播没开播\n===========================`
                    })
                    continue
                }
                for (const live of livefeed) {
                    const {
                        roomid,
                        uid,
                        name,
                        cover,
                        title,
                        live_time,
                        area_name,
                        area_v2_name,
                        area_v2_parent_name,
                        online
                    } = live;
                    let replyMessage = [
                        segment.image(cover),
                        `『主播：${name}(${uid})』\n`,
                        `『房间号：${roomid}』\n`,
                        `『标题：${title}』\n`,
                        `『分区：${area_name}』\n`,
                       // `『分区v2：${area_v2_name}』\n`
                      //  `『分区v3：${area_v2_parent_name}』\n`,
                        `『在线人数：${online}』\n`,
                        `『开播时间：${moment(live_time * 1000).format('YYYY-MM-DD HH:mm:ss')}』\n`,
                        `『房间链接：https://live.bilibili.com/${roomid}』\n`,
                        `『独立播放器：https://www.bilibili.com/blackboard/live/live-activity-player.html?enterTheRoom=0&cid=${roomid}』`,
                    ];
                
                    if (['QQBot'].includes(e.adapter_name) && !config.QQBotsendlink ) {
                        replyMessage = replyMessage.map(item => {
                            if (typeof item === 'string') {
                                return item.replace(/\./g, ' .');
                            }
                            return item;
                        });
                    }
                    forwardNodes.push({
                        user_id: e.user_id || '1677979616',
                        nickname: e.sender.nickname || '主播去哪了',
                        message: replyMessage
                    });
                }
            } catch (err) {
                logger.error("[Bili-Plugin]获取主播去哪了失败:", err);
                forwardNodes.push({
                    user_id: e.user_id || '1677979616',
                    nickname: e.sender.nickname || '主播去哪了',
                    message: "获取主播开播状态失败"
                });
            }
            Count++
            if (Count > 0) {
                await Bot.sleep(2000)
            }
        }
        const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
        e.reply(forwardMessage, false);
        return true
    }
}