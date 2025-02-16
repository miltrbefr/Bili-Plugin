import Bili from '../model/bili.js';
import fs from 'fs';
import path from 'path';

export class Biliinfo extends plugin {
    constructor() {
        super({
            name: "[Bili-Plugin]",
            desc: "信息查询",
            event: "message",
            priority: 1677,
            rule: [{
                    reg: /^#?(我的|他的|她的)(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)$/,
                    fnc: "biliinfo"
                }
            ]
        });
    }

    async biliinfo(e) {
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
            e.reply("未绑定ck，请发送哔站登录进行绑定",true);
            return;
        }
        const r = await e.reply("开始获取你的B站信息请稍等....",true)
        await Bili.recall(e, r, 5)
        const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        let forwardNodes = [];
        let Count = 0
        for (const userId in cookiesData) {
            const userCookies = cookiesData[userId];
            try {
                const replyMessage = await Bili.getInfo(userCookies);
                forwardNodes.push({
                    user_id: e.user_id || '1677979616',
                    nickname: e.sender.nickname || '哔站信息查询',
                    message: replyMessage 
                });
            } catch (err) {
                logger.error("[Bili-Plugin]获取用户信息失败:", err);
                forwardNodes.push({
                    user_id: e.user_id || '1677979616',
                    nickname: e.sender.nickname || '哔站信息查询',
                    message: "获取用户信息失败"
                });
            }
            Count++
            if (Count > 0) {
                await Bot.sleep(2000)
            }
        }

        if (forwardNodes.length === 1) {
            e.reply(forwardNodes[0].message, true);
        } else {
            const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
            e.reply(forwardMessage, false);
        }
        return true
    }
}