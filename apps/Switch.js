import fs from 'fs';
import path from 'path';
import {pluginRoot} from '../model/constant.js';
import YAML from 'yaml';
const filePath = `${pluginRoot}/config/config.yaml`

const storagePath = './data/bili/Recall';
const configPath = path.join(storagePath, 'BILI群消息撤回通知白名单.json');

export class Biliswitch extends plugin {
    constructor() {
        super({
            name: "Bili:配置管理",
            desc: "一些配置切换",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                    reg: /^#?切换(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)账号(.*)/m,
                    fnc: "switchAccount"
                },
                {
                    reg: /^#?(开启|关闭)投币$/,
                    fnc: "switchcoin"
                },
                {
                    reg: /^#?(开启|关闭)直播间(自动)?(发)?弹幕$/,
                    fnc: "switchLiveDanmu"
                },
                {
                    reg: /^#?退出(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)$/,
                    fnc: "deleteAccount"
                },
                {
                    reg: /^#?(添加|新增|取消|删除)弹幕(拉黑|加白|黑名单|白名单)(.*)/mi,
                    fnc: "bililiveaction"
                },
                {
                    reg: /^#?幸运字符(vip)?(添加|删除)(bot|机器人)(.*)/mi,
                    fnc: "switchlukyword",
                    permission: 'master'
                },
                {
                    reg: /^#?幸运字符(取消)?(拉黑|加白)群(.*)/mi,
                    fnc: "switchlukywordgrouplist",
                    permission: 'master'
                },
                {
                    reg: /^#?节日推送(添加|删除)群(.*)/mi,
                    fnc: "switchfestivalgroup"
                },
                {
                    reg: /^#?报时推送(添加|删除)群(.*)/mi,
                    fnc: "switchbaoshigroup"
                },
                {
                    reg: "^(添加|删除)撤回白名单群",
                    fnc: 'recallwhile',
                    permission: 'master'
                }
            ]
        });
    }

    async recallwhile (e) {
        const action = e.msg.includes('添加') ? '添加' :
            e.msg.includes('删除') ? '删除' : '';

        if (!action) {
            e.reply('指令格式不对，请使用 "添加撤回白名单群 [群号]" 或 "删除撤回白名单群 [群号]" 格式', true);
            return;
        }

        const groupId = e.group_id

        let whiteList = readWhiteList();
        ensureDataDir()
        if (action === '添加') {
            if (!isGroupInWhiteList(groupId)) {
                whiteList.push(groupId);
                writeWhiteList(whiteList);
                e.reply(`群号 ${groupId} 已成功添加到撤回白名单`, true);
            } else {
                e.reply(`群号 ${groupId} 已经存在于撤回白名单中`, true);
            }
        } else if (action === '删除') {
            const index = whiteList.indexOf(groupId);
            if (index > -1) {
                whiteList.splice(index, 1);
                writeWhiteList(whiteList);
                e.reply(`群号 ${groupId} 已成功从撤回白名单移除`, true);
            } else {
                e.reply(`群号 ${groupId} 不在撤回白名单中`, true);
            }
        }
    }


    async switchbaoshigroup(e) {
        if (!(e.isMaster || e.member.is_admin || e.member.is_owner)) {
            await this.e.reply("暂无权限，仅群主或管理才能添加哦~", true)
            return
        }
        let config = YAML.parse(fs.readFileSync(filePath, 'utf8'));
        let group = e.msg.replace(/#?报时推送(添加|删除)群/gi, '').trim();
        if (!group) {
            if (e.group_id) {
                group = e.group_id;
            } else {
                return e.reply('请键入群聊号', true);
            }
        }
        let action = e.msg.match(/添加|删除/)[0];
        let replyMessage = '';
        if (action === '添加') {
            if (!config.baoshigroup.includes(group)) {
                config.baoshigroup.push(group);
                fs.writeFileSync(filePath, YAML.stringify(config), 'utf8');
                replyMessage = `群${group}已成功添加到报时推送列表:`;
            } else {
                replyMessage = `群${group}已在报时推送列表中`;
            }
        } else if (action === '删除') {
            let index = config.baoshigroup.indexOf(group);
            if (index > -1) {
                config.baoshigroup.splice(index, 1);
                fs.writeFileSync(filePath, YAML.stringify(config), 'utf8');
                replyMessage = `群${group}已成功从报时推送列表中删除`;
            } else {
                replyMessage = `群${group}不在报时推送列表中`;
            }
        } else {
            return e.reply('未知操作', true);
        }
      //  replyMessage += config.baoshigroup.join(", ");
        return e.reply(replyMessage, true);
    }



    async switchfestivalgroup(e) {
        if (!(e.isMaster || e.member.is_admin || e.member.is_owner)) {
            await this.e.reply("暂无权限，仅群主或管理才能添加哦~", true)
            return
        }
        let config = YAML.parse(fs.readFileSync(filePath, 'utf8'));
        let group = e.msg.replace(/#?节日推送(添加|删除)群/gi, '').trim();
        if (!group) {
            if (e.group_id) {
                group = e.group_id;
            } else {
                return e.reply('请键入群聊号', true);
            }
        }
        let action = e.msg.match(/添加|删除/)[0];
        let replyMessage = '';
        if (action === '添加') {
            if (!config.festivalgroup.includes(group)) {
                config.festivalgroup.push(group);
                fs.writeFileSync(filePath, YAML.stringify(config), 'utf8');
                replyMessage = `群${group}已成功添加到节日推送列表`;
            } else {
                replyMessage = `群${group}已在节日推送列表中`;
            }
        } else if (action === '删除') {
            let index = config.festivalgroup.indexOf(group);
            if (index > -1) {
                config.festivalgroup.splice(index, 1);
                fs.writeFileSync(filePath, YAML.stringify(config), 'utf8');
                replyMessage = `群${group}已成功从节日推送列表中删除`;
            } else {
                replyMessage = `群${group}不在节日推送列表中`;
            }
        } else {
            return e.reply('未知操作', true);
        }
     //   replyMessage += config.festivalgroup.join(", ");
        return e.reply(replyMessage, true);
    }

    async switchlukywordgrouplist(e) {
        let config = YAML.parse(fs.readFileSync(filePath, 'utf8'));

        let group = e.msg.replace(/#?幸运字符(取消)?(拉黑|加白)群/gi, '').trim()
        if (!group) {
            if (e.group_id) {
                group = e.group_id;
            } else {
                return e.reply('请键入群聊号',true);
            }
        }

        let isBlackList = e.msg.includes('拉黑');
        let isRemoveOperation = e.msg.includes('取消');

        let targetList = isBlackList ? 'luckywordblacks' : 'luckywordwhites';
        let operationResultMsg = isRemoveOperation ? '删除成功！' : '添加成功！';

        let formattedGroup = `${e.self_id}:${String(group)}`;

        if (!isRemoveOperation) {
            if (!config[targetList].includes(formattedGroup)) {
                config[targetList].push(formattedGroup);
            }
        } else {
            config[targetList] = config[targetList].filter(item => item !== formattedGroup);
        }

        fs.writeFileSync(filePath, YAML.stringify(config), 'utf8');

        let replyMsg;
        if (config[targetList].length === 0) {
            replyMsg = `${operationResultMsg}当前没有${isBlackList ? '黑名单' : '白名单'}列表了惹TAT。`;
        } else {
            replyMsg = `${operationResultMsg}当前${isBlackList ? '黑名单' : '白名单'}列表：\n${config[targetList].join('\n')}`;
        }
        e.reply(replyMsg,true)
        return true;
    }

    async switchlukyword(e) {
        let config = YAML.parse(fs.readFileSync(filePath, 'utf8'));
        
        let bot = e.msg.replace(/#?幸运字符(vip)?(添加|删除)(bot|机器人)?/gi, '').trim()
        if (!bot) bot = String(e.self_id)
        
        let isVip = e.msg.includes('vip');
        let action = e.msg.match(/添加|删除/)[0]
        let targetList = isVip ? 'isviplists' : 'isluckywordBots';

        if (action === '添加') {
            if (!config[targetList].includes(bot)) {
                config[targetList].push(bot);
            }
        } else if (action === '删除') {
            config[targetList] = config[targetList].filter(b => b !== bot);
        }

        fs.writeFileSync(filePath, YAML.stringify(config), 'utf8');
        let replyMsg;
        if (config[targetList].length === 0) {
            replyMsg = `${action}成功！当前没有${isVip ? 'VIP' : 'Bot'}列表了惹TAT。`;
        } else {
            replyMsg = `${action}成功！当前${isVip ? 'VIP' : 'Bot'}列表：\n${config[targetList].join('\n')}`;
        }
        e.reply(replyMsg,true)
        return true;
    }

    async bililiveaction(e) {
        const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply("未绑定ck，请发送哔站登录进行绑定", true);
            return true;
        }
        
        let cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        const userIds = Object.keys(cookiesData);
        let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
        
        if (!userIds.includes(currentUserId)) {
            currentUserId = userIds[0];
            await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
        }
        const liveFilePath = path.join('./data/bili/live', `${currentUserId}.json`);
        if (!fs.existsSync('./data/bili/live')) {
            fs.mkdirSync('./data/bili/live', { recursive: true });
        }
        if (!fs.existsSync(liveFilePath)) {
            fs.writeFileSync(liveFilePath, JSON.stringify({ whitelists: [], blacklists: [] }, null, 2));
        }
        
        let liveData = JSON.parse(fs.readFileSync(liveFilePath, 'utf-8'));
        const action = /新增|添加/.test(e.msg) ? '写入' : /删除|取消/.test(e.msg) ? '删除' : '';
        const action2 = /加白|白名单/.test(e.msg) ? '加白' : /拉黑|黑名单/.test(e.msg) ? '拉黑' : '';
        
        if (!action || !action2) {
            e.reply("指令格式错误，请使用【添加/删除 弹幕加白/拉黑 + 房间号】格式",true);
            return true;
        }
        const roomIds = e.msg.replace(/#?(?:新增|添加|删除|取消)弹幕(?:加白|拉黑|黑名单|白名单)/g, '')
                            .trim()
                            .split(/\s+/)
                            .filter(id => /^\d+$/.test(id));
        
        if (roomIds.length === 0) {
            e.reply("未检测到有效的房间号（纯数字）",true);
            return true;
        }
        const listType = action2 === '加白' ? 'whitelists' : 'blacklists';
        
        roomIds.forEach(roomId => {
            if (action === '写入') {
                if (!liveData[listType].includes(roomId)) {
                    liveData[listType].push(roomId);
                }
            } else {
                liveData[listType] = liveData[listType].filter(id => id !== roomId);
            }
        });
        fs.writeFileSync(liveFilePath, JSON.stringify(liveData, null, 2));
        const listName = action2 === '加白' ? '白名单' : '黑名单';
        const formattedList = liveData[listType].join('\n') || '空';
        e.reply([
            `哔站账号 ${currentUserId}`,
            `当前弹幕${listName}房间号：`,
            formattedList
        ].join('\n'),true);
    
        return true;
    }


    async switchAccount(e) {
        const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply("未绑定ck，请发送哔站登录进行绑定", true);
            return;
        }
        const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        const userIds = Object.keys(cookiesData);
        if (userIds.length === 1) {
            e.reply(`无需切换，当前账号为${userIds[0]}`);
            return;
        }
        let action = e.msg.replace(/#?切换(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)账号/g, '').trim();
        if (!userIds.map((_, index) => String(index + 1)).includes(action)) {
            e.reply(`无效的操作，请输入1到${userIds.length}之间的数字来选择要切换的账号`,true);
            return;
        }
    
        const targetUserId = userIds[action - 1];
        await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, targetUserId);
        let replyMsg = '已成功切换账号:\n';
        userIds.forEach((id, idx) => {
            replyMsg += `${id} ${idx + 1 === Number(action) ? '√' : ''}\n`;
        });
    
        e.reply(replyMsg.trim(), true);
        return true
    }

    async deleteAccount(e) {
        const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply("未绑定ck，请发送哔站登录进行绑定", true);
            return;
        }
        let cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        const userIds = Object.keys(cookiesData);
        let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
        if (!userIds.includes(currentUserId)) {
            currentUserId = userIds[0];
            await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
        }
    
        const deleteUserId = currentUserId;
        delete cookiesData[deleteUserId];
    
        if (Object.keys(cookiesData).length === 0) {
            fs.unlinkSync(cookiesFilePath);
            await redis.del(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
            e.reply("哔站账号已全部退出", true);
        } else {
            fs.writeFileSync(cookiesFilePath, JSON.stringify(cookiesData, null, 4));
            const newCurrentUserId = Object.keys(cookiesData)[0];
            await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, newCurrentUserId);
            const replyMsg = `账号 ${deleteUserId} 成功退出登录\n剩余账号:\n` +
                Object.keys(cookiesData).map(id => `${id} ${id === newCurrentUserId ? '√' : ''}`).join('\n');
            e.reply(replyMsg.trim(), true);
        }
        return true
    }

    async switchcoin(e) {
        const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply("未绑定ck，请发送哔站登录进行绑定", true);
            return;
        }
        let cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        const userIds = Object.keys(cookiesData);
        let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
        if (!userIds.includes(currentUserId)) {
            currentUserId = userIds[0];
            await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId)
        }
    
        const action = e.msg.includes('开启') ? '开启' : e.msg.includes('关闭') ? '关闭' : '';
    
        if (!action) {
            e.reply('无效的操作，请输入“开启投币”或“关闭投币”', true);
            return;
        }
    
        cookiesData[currentUserId].coin = action === '开启';
        fs.writeFileSync(cookiesFilePath, JSON.stringify(cookiesData, null, 4));
        let replyMsg = `操作成功！${cookiesData[currentUserId].coin ? '呜呜攒不了硬币惹TAT' : '又可以攒硬币啦~'}\n账号投币状态:\n`
        userIds.forEach(id => {
            replyMsg += `${id}: ${cookiesData[id].coin ? '开启' : '关闭'}\n`;
        });

        if (cookiesData.length > 1) {
            replyMsg += '您还可以使用指令："#切换哔站账号2"完成切换账号操作进行修改账号2的投币状态'
        }
        e.reply(replyMsg.trim(), true);
        return true
    }

    async  switchLiveDanmu(e) {
        const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
        if (!fs.existsSync(cookiesFilePath)) {
            e.reply("未绑定ck，请发送哔站登录进行绑定", true);
            return;
        }
        let cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        const userIds = Object.keys(cookiesData);
        let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
        if (!userIds.includes(currentUserId)) {
            currentUserId = userIds[0];
            await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
        }
    
        const action = e.msg.includes('开启') ? '开启' : e.msg.includes('关闭') ? '关闭' : '';
    
        if (!action) {
            e.reply('无效的操作，请输入“开启直播间弹幕”或“关闭直播间弹幕”', true);
            return;
        }
    
        cookiesData[currentUserId].live = action === '开启';
        fs.writeFileSync(cookiesFilePath, JSON.stringify(cookiesData, null, 4));
        let replyMsg = '操作成功，当前直播间弹幕状态:\n';
        userIds.forEach(id => {
            replyMsg += `${id}: ${cookiesData[id].live ? '开启' : '关闭'}\n`;
        });
        if(e.group_id) redis.set(`bili:group:${String(e.user_id).replace(/:/g, '_').trim()}`, `${e.group_id}`);
        if (userIds.length > 1) {
            replyMsg += '您还可以使用指令："#切换哔站账号2"完成切换账号操作进行修改账号2的弹幕状态';
        }
        e.reply(replyMsg.trim(), true);
        return true
    }    
}

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

function writeWhiteList(whiteList) {
    ensureDataDir()
    try {
        fs.writeFileSync(configPath, JSON.stringify({
            whiteList
        }, null, 2));
    } catch (error) {
        logger.error('写入白名单文件时出错:', error);
    }
}


function isGroupInWhiteList(groupId) {
    const whiteList = readWhiteList();
    return whiteList.includes(groupId)
}