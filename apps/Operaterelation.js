import fs from 'fs';
import path from 'path';
import Bili from '../model/bili.js';

export class BiliAccount extends plugin {
    constructor() {
        super({
            name: "Bili-Plugin(快捷操作用户关系)",
            desc: "简单快捷用户关系操作",
            event: "message",
            priority: 1677,
            rule: [{
                reg: /^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?(关注|取关|拉黑|取消拉黑|踢出粉丝|取消关注)(up|主播|煮波|博主)(主)?$|^#?踢出粉丝$/i,
                fnc: "Operationrelation"
            }]
        });
    }
    async Operationrelation(e) {
        try {
            const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
            if (!fs.existsSync(cookiesFilePath)) {
              return await e.reply("未绑定哔站账号，请先发送【哔站登录】进行绑定", true);
            }
            const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
            const userIds = Object.keys(cookiesData);
            if (userIds.length === 0) {
              return await e.reply("账号数据异常，请先发送【哔站登录】进行绑定", true);
            }
            let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
            if (!userIds.includes(currentUserId)) {
              currentUserId = userIds[0];
              await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
            }
          const userCookies = cookiesData[currentUserId];
          const videoUrl = await Bili.getvideourl(e);
            if (!videoUrl) {
                return await e.reply("获取资源失败，请确保正确引用消息！！", true);
            }
            const videoinfo = await Bili.getvideoinfo(videoUrl, userCookies.SESSDATA);
            let mid
            if (videoinfo.type === 'video') {
                mid = videoinfo.data.mid
            } else if (videoinfo.type === 'live') {
                mid = videoinfo.data.uid
            } else {
                return await e.reply("不支持的资源类型", true);
            }

            const match = e.msg.match(/(关注|取关|拉黑|取消拉黑|踢出粉丝|取消关注)/);
            if (!match) {
                return await e.reply("未识别到有效操作，请检查输入~", true);
            }
            const operation = match[1];

            const operationMap = {
                '关注': 1,
                '取关': 2,
                '取消关注': 2,
                '拉黑': 5,
                '取消拉黑': 6,
                '踢出粉丝': 7
            };
            const act = operationMap[operation];
            if (act === undefined) {
                return await e.reply("不支持的操作类型", true);
            }
            const result = await Bili.relationup(userCookies, mid, act);
            
            await e.reply(result, true);

        } catch (err) {
            logger.error("[Bili-Plugin]用户关系操作失败：", err);
            await e.reply("操作出错，请稍后再试~", true);
        }
    }
}
