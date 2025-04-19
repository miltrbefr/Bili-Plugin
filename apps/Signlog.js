import fs from 'fs';
import path from 'path';
import { Config as config} from "#model"
export class Bililog extends plugin {
    constructor() {
        super({
            name: "Bili:签到记录",
            desc: "签到记录",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(我的)?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)签到记录$/,
                fnc: "bilisignlog"
            }]
        });
    }

    async bilisignlog(e) {
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
        const filePath = path.join('./data/bilisign', `${String(userID).replace(/:/g, '_').trim()}.json`);
        let forwardNodes = [];
        try {
            const rawData = fs.readFileSync(filePath);
            const records = JSON.parse(rawData);
            records.forEach(record => {
                let message = String(record.message)
                if (['QQBot'].includes(e.adapter_name) && !config.QQBotsendlink ) {
                    message = String(record.message).replace(/https:\/\/b23\.tv\//g, 'https://b23 .tv/')
                }
                forwardNodes.push({
                    user_id: userID,
                    nickname: record.nickname || '哔站签到',
                    message: message
                });
            });
            const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
            e.reply(forwardMessage, false);
        } catch (err) {
            if (err.code === 'ENOENT') {
                e.reply('你还没有签到呢~',true);
            } else {
                logger.error('[Bili-Plugin]',err);
                e.reply('未知错误',true);
            }
        }
        return true
    }
}