import QQBot from '../model/QQBot.js';

const START_PUSH_COMMAND_REGEX = /^#?开始推送(.*)$/
const STOP_PUSH_COMMAND = '取消推送'
let limittime = 120
let pushGroupId = null
let pushUserId = null


export class BiliPush extends plugin {
    constructor() {
        super({
            name: "Bili:无限主动",
            desc: "无限主动",
            event: "message",
            priority: 1677,
            rule: [{
                reg: START_PUSH_COMMAND_REGEX,
                fnc: "startPush"
            }]
        });
    }

    async startPush(e) {
        if (!e.isMaster) return;
        const groupId = this.extractGroupId(e);
        if (!groupId) {
            return  e.reply('错误指令')
        }
        const groupNumber = Number(groupId);
        if (isNaN(groupNumber)) {
        return  e.reply('群号键入错误,请使用指令<开始推送123456>尝试')
        }
        try {
            await e.reply(`开始向${groupId}实时转发消息，发送<取消推送>即可取消`);
            pushGroupId = groupId
            pushUserId = e.user_id
            this.setContext('push', e.isGroup, limittime, "时间到啦~给你取消推送了哦~");
        } catch (error) {
            logger.error(`[BILIPLUGIN]启动无限主动失败: ${error.message}`);
        }
    }

    extractGroupId(e) {
        return e.msg.replace(START_PUSH_COMMAND_REGEX, "$1").trim();
    }

    async stopPush(e) {

        if (e.msg && e.msg.includes(STOP_PUSH_COMMAND)) {
            try {
                this.finish('push', e.isGroup);
                pushGroupId = null;
                pushUserId = null;
                await e.reply("成功取消推送");
                return true;
            } catch (error) {
                logger.error(`停止推送失败: ${error.message}`);
            }
        }
        return false;
    }

    async push(e) {
        e = this.e
        if (pushUserId !== e.user_id) return;
        if (await this.stopPush(e)) return;
        if (!pushGroupId) return
        try {
            let message = []
            if (e.img) {
                message.push(segment.image(e.img[0]));
            }
            if (e.msg) {
                message.push(e.msg);
            }
            if (!message) return
            await QQBot.sendmsgs(message, Number(pushGroupId))
        } catch (error) {
            logger.debug(`${error.message}`);
        }
    }
}