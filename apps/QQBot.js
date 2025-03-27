import fs from 'fs';
import path from 'path';
import QQBot from '../model/QQBot.js';
import config from '../model/Config.js';

const dataDir = './data/bili/QQBotenvent'

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, {
            recursive: true
        });
    }
}


Bot.on("request.group", async event => {
    if (!(await QQBot.check(event))) {
        return false
    }
    if (event.user_id == config.QQBot) {
        return false
    }
    await QQBot.replaceReply(event)
    return false
});


Bot.on("message.group.callback", async e => {
    const rawEvent = e.raw;

    if (e.bot.callback[rawEvent.data?.["resolved"]?.["button_id"]]) {
        return false;
    }
    
    const buttonId = rawEvent.data?.["resolved"]?.["button_id"]
    const groupId = `${e.self_id}:${rawEvent.group_id}`;
    const configDir = path.join('./data/bili/QQBotGroupMap');
    const configPath = path.join(configDir, 'Groupconfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const groupid2 = buttonId || config[groupId]
    if (!groupid2) return false
    ensureDataDir()
    const eventId = rawEvent.event_id;
    const filePath = path.join(dataDir, `${groupid2}.json`);
    const data = {
        event_id: eventId,
        openid: rawEvent.group_id,
        time: Date.now()
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
    await redis.del(`bili:skipgroup:${buttonId}`)
    return false;
})

export class BiliNB extends plugin {
    constructor() {
        super({
            name: "Bili-Plugin(野收官发)",
            desc: "野收官发",
            event: "message.group.normal",
            priority: Number.MIN_SAFE_INTEGER,
        })
    }

    async accept(event) {
        if (!(await QQBot.check(event))) {
            return false;
        }
        if (event.at == config.QQBot) {
            event.at = event.self_id
        }
        await QQBot.replaceReply(event)
        return false;
    }
}