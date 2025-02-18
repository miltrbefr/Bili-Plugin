import Bili from '../model/bili.js';

export class BiliSearch extends plugin {
    constructor() {
        super({
            name: "[Bili-Plugin]",
            desc: "简单的查询",
            event: "message",
            priority: 1677,
            rule: [{
                reg: /^#?查询up(.*)/mi,
                fnc: "Searchup"
            }]
        });
    }

    async Searchup(e) {
        try {
            let msg = e.msg.replace(/，/gi, ',').trim();
            let mids = msg.replace(/#?查询up/gi, '').trim()
            if(!mids)await e.reply(`输入错误，请按照这个格式重试：查询up123456,789456`, true);
            const forwardNodes = await Bili.getupinfo(mids)
            const forwardMessage = await Bot.makeForwardMsg(forwardNodes)
            await e.reply(forwardMessage, false);
        } catch (error) {
            logger.error('[Bili-Plugin]查询up信息失败：',error)
            await e.reply(`出错了，请检查日志`, true);
        }
    }
}