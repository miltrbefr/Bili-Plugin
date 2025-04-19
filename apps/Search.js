import { Bili as Bili} from "#model"
import fs from 'fs';
import path from 'path';

export class BiliSearch extends plugin {
    constructor() {
        super({
            name: "Bili:查询UP",
            desc: "简单的查询",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?查询up(.*)/mi,
                fnc: "Searchup"
            }]
        });
    }

    async Searchup(e) {
        try {
            const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
            if (!fs.existsSync(cookiesFilePath)) {
              return await e.reply("未绑定哔站账号，请先发送【哔站登录】进行绑定", true);
            }
            const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
            const userIds = Object.keys(cookiesData);
            if (userIds.length === 0) {
                return await e.reply("您的登录已过期，请先发送【哔站登录】重新进行绑定", true);
            }
            let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
            if (!userIds.includes(currentUserId)) {
              currentUserId = userIds[0];
              await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
            }
            const userCookies = cookiesData[currentUserId];
            let msg = e.msg.replace(/，/gi, ',').trim();
            let mids = msg.replace(/#?查询up/gi, '').trim()
            if(!mids)await e.reply(`输入错误，请按照这个格式重试：查询up123456,789456`, true);
            const forwardNodes = await Bili.getupinfo(mids,userCookies)
            const forwardMessage = await Bot.makeForwardMsg(forwardNodes)
            await e.reply(forwardMessage, false);
        } catch (error) {
            logger.error('[Bili-Plugin]查询up信息失败：',error)
            await e.reply(`出错了，请检查日志`, true);
        }
    }
}