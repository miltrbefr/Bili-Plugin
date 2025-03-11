import moment from "moment";
import fs from 'fs';
import path from 'path';

const storagePath = './data/bili/Recall';
const configPath = path.join(storagePath, 'BILI群消息撤回通知白名单.json');

function ensureDataDir() {
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, {
            recursive: true
        });
    }
}

function readWhiteList() {
    ensureDataDir()
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({
            whiteList: []
        }, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(configPath)).whiteList || [];
    } catch (error) {
        logger.error('读取白名单文件时出错:', error);
        return [];
    }
}


function isGroupInWhiteList(groupId) {
    const whiteList = readWhiteList();
    return whiteList.includes(groupId)
}



let deltime = 600;
const redisKeyPre = "bili:notice:message";
const redisKeyPreGroup = redisKeyPre + "Group:";
Bot.on('message.group', async (e) => {
    const bot = e.bot;
    if (!isGroupInWhiteList(e.group_id)) {
        return false;
    }
    // 判断是否存在消息
    if (!e.message.length) return false;

    // 判断是否为机器人消息
    if (e.user_id == bot.uin) return false;

    // 判断是否主人消息
    //if (e.isMaster) return false;

    // 判断群聊还是私聊
    if (e.message_type == "group") {
        await redis.set(
            redisKeyPreGroup + e.message_id,
            JSON.stringify(e.message), {
                EX: deltime
            }
        );
    }
});


export class Bilirecall extends plugin {
    constructor() {
        super({
            name: "Bili:撤回监听",
            desc: "撤回通知",
            event: "notice.group.recall",
            priority: Infinity,
        })
    }

    async accept(e) {
        const bot = e.bot;
        let t = e.isGroup ? e.group : e.friend;
        if (e.user_id == bot.uin || e.operator_id == bot.uin) return false;
        if (!isGroupInWhiteList(e.group_id)) {
            return false;
        }
        // if (e.isMaster) return false;
        const rawMsg = JSON.parse(await redis.get(redisKeyPreGroup + e.message_id));

        if (!rawMsg) return false;

        const SpecialMsg = getSpecialMsgType(rawMsg);
        let special = "";
        let forwardMsg = null;
        let msg = null;

        if (Array.isArray(rawMsg) && rawMsg.some(msg => msg.type === 'image')) {
            let isManage = "";
            if (e.operator_id != e.user_id) {
                isManage = `撤回管理：${e.group.pickMember(e.operator_id).card}(${e.operator_id})\n`;
            }
            isManage ? logger.info("群聊管理撤回") : logger.info("群聊撤回");


            msg = [
                segment.image(`https://q.qlogo.cn/g?b=qq&s=0&nk=${e.user_id}`),
                `[通知 - 群聊${isManage ? "管理" : ""}撤回]\n`,
                `撤回群名：${e.group_name}\n`,
                `撤回群号：${e.group_id}\n`,
                isManage,
                `${isManage ? "被撤回人" : "撤回人员"}：${e.group.pickMember(e.user_id).card}(${e.user_id})\n`,
                `撤回时间：${moment.unix(e.time).format("MM-DD HH:mm:ss")}`,
                special ? `\n特殊消息：${special}` : ""
            ];


            await e.reply(msg);
            let MsgList = []
            for (let msg of rawMsg) {
                if (msg.type === 'image' || msg.type === 'text') {
                    let bot = {
                        nickname: e.sender.nickname,
                        user_id: e.user_id
                    }
                    MsgList.push({
                        message: [
                            segment[msg.type](msg.url || msg.text)
                        ],
                        ...bot,
                    })
                }
            }
            if (MsgList.length > 0) {

                let msg
                if (e.isGroup) {
                    msg = e.group.makeForwardMsg(MsgList)
                } else {
                    msg = await e.friend.makeForwardMsg(MsgList)
                }
                await e.reply(msg, false);
            }
            return
        }

        if (SpecialMsg) {
            forwardMsg = await SpecialMsg.msg();
            special = SpecialMsg.type;
        } else {

            try {
                forwardMsg = await t.makeForwardMsg([{
                    message: dealMessage(rawMsg),
                    nickname: e.group.pickMember(e.user_id).card,
                    user_id: e.user_id
                }], true);
            } catch (err) {
                logger.error(err);
                logger.error(rawMsg);
                forwardMsg = `制作转发消息失败：${err.message}`;
            }
        }


        let isManage = "";
        if (e.operator_id != e.user_id) {
            isManage = `撤回管理：${e.group.pickMember(e.operator_id).card}(${e.operator_id})\n`;
        }
        isManage ? logger.info("群聊管理撤回") : logger.info("群聊撤回");


        msg = [
            segment.image(`https://q.qlogo.cn/g?b=qq&s=0&nk=${e.user_id}`),
            `[通知 - 群聊${isManage ? "管理" : ""}撤回]\n`,
            `撤回群名：${e.group_name}\n`,
            `撤回群号：${e.group_id}\n`,
            isManage,
            `${isManage ? "被撤回人" : "撤回人员"}：${e.group.pickMember(e.user_id).card}(${e.user_id})\n`,
            `撤回时间：${moment.unix(e.time).format("MM-DD HH:mm:ss")}`,
            special ? `\n特殊消息：${special}` : ""
        ];


        await e.reply(msg)

        if (forwardMsg) {
            try {
                await e.reply(forwardMsg)
            } catch (err) {
                logger.error(err);
                await e.reply(`未知错误`, false, {
                    recallMsg: 30
                });
            }
        }
    }
}


function dealMessage(message) {
    let res2 = [];
    for (let i of Array.isArray(message) ? message : [message]) {
        if (i?.type !== "long_msg") res2.push(i);
    }
    return res2;
}

function getSpecialMsgType(e) {
    let res = e.message;


    let res2 = [];
    for (let i of Array.isArray(res) ? res : [res]) {
        if (i?.type !== "long_msg") res2.push(i);
    }

    const {
        type,
        url,
        file
    } = res2?.[0] || {};
    // const nickname = e.isGroup ? e.group.pickMember(e.user_id).card : e.nickname;

    const msgType = {
        flash: {
            msg: () => url ? segment.image(url) : "图片不存在",
            type: "[闪照]"
        },
        record: {
            msg: () => url ? segment.record(url) : "语音不存在",
            type: "[语音]"
        },
        video: {
            msg: () => segment.video(file),
            type: "[视频]"
        },
        xml: {
            msg: () => res2,
            type: "[XML消息]"
        },
        json: {
            msg: () => res2,
            type: "[JSON消息]"
        },
        file: {
            msg: async () => await Bot.pickGroup(e.group_id).getFileUrl(res2[0].fid),
            type: "[文件]"
        }
    };
    return msgType[type];
}