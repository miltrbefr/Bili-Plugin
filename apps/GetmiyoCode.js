import { Bili as Bili} from "#model"
export class Bilimiyocode extends plugin {
    constructor() {
        super({
            name: "Bili:兑换码",
            desc: "简单的获取米游社兑换码",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^(#|原神)?(\*|星铁)?(%|绝区零)?兑换码$/,
                fnc: "getmiyocod"
            }]
        });
    }

    async getmiyocod(e) {
        try {
            let action = 1; // 默认值为 1
            if (e.msg.includes('*') || e.msg.includes('星铁')) {
                action = 2;
            } else if (e.msg.includes('%') || e.msg.includes('绝区零')) {
                action = 3;
            }

            const response = await Bili.getmiyocode(action);
            const forwardNodes = [];
            const codeList = response.data;

            if (codeList.length === 0) return false;  // 获取失败就让别的插件处理

            forwardNodes.push({
                user_id: '80000000',
                nickname: '匿名消息',
                message: `${action === 1 ? '原神' : action === 2 ? '星铁' : '绝区零'}前瞻游戏兑换码\n失效时间：${response.date || '未知'}`
            });

            for (const item of codeList) {
                if (item.img) {
                    forwardNodes.push({
                        user_id: '80000000',
                        nickname: '匿名消息',
                        message: [
                            segment.image(item.img),
                            `======================\n`,
                            `${item.title}\n`,
                            `兑换码：${item.code}\n`,
                            `生成时间:${item.time}`
                        ]
                    });
                } else {
                    forwardNodes.push({
                        user_id: '80000000',
                        nickname: '匿名消息',
                        message: [
                            `======================\n`,
                            `${item.title}\n`,
                            `兑换码：${item.code}\n`,
                            `生成时间:${item.time}`
                        ]
                    });
                }
            }

            const forwardMessage = await Bot.makeForwardMsg(forwardNodes);
            await e.reply(forwardMessage, false);
        } catch (err) {
            logger.error(`[Bili-Plugin] 获取兑换码失败，action=${action}, msg=${e.msg}:`, err);
            e.reply("不好啦~获取失败惹TAT", true);
        }
    }
}