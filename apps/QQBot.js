import fs from 'fs';
import path from 'path';
import QQBot from '../model/QQBot.js';
import config from '../model/Config.js';
let QQBot_id = config.QQBot
const dataDir = './data/bili/QQBotenvent'

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, {
            recursive: true
        });
    }
}


Bot.on("notice.group.sign", async event => {
    if (!(await QQBot.check(event))) {
        return false
    }
    await QQBot.replaceReply(event)
    return false
});

Bot.on("notice.group.decrease", async event => {

    if (!(await QQBot.check(event))) {
        return false;
    }
    if (event.user_id == QQBot_id) {
        return false
    }
    await QQBot.replaceReply(event)
    return false;
});

Bot.on("notice.group.increase", async event => {
    if (qq == event.self_id || jiantingqq.includes(event.self_id)) {
        if (!(await QQBot.check(event))) {
            return false;
        }

        if (event.user_id == QQBot_id) {
            return false
        }

        await QQBot.replaceReply(event)
        return false;
    }

    return false;
});

Bot.on("notice.group.recall", async event => {
    if (!(await QQBot.check(event))) {
        return false;
    }
    await QQBot.replaceReply(event)
    return false;
});

Bot.on("notice.group.poke", async e => {
    if (!(await QQBot.check(e))) {
        return false;
    }
    if (e.target_id == QQBot_id) {
        e.target_id = e.self_id
    }
    await QQBot.replaceReply(e)
    return false
})


Bot.on("message.group.callback", async e => {
    const rawEvent = e.raw;
    if (e.bot.callback[rawEvent.data?.["resolved"]?.["button_id"]]) {
        return false;
    }

    const groupId = `${e.self_id}:${rawEvent.group_id}`;
    const configDir = path.join('./data/bili/QQBotGroupMap');
    const configPath = path.join(configDir, 'Groupconfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const groupid2 = config[groupId]
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
    return false;
})

export class BiliNB extends plugin {
    constructor() {
        super({
            name: "[Bili-Plugin]",
            desc: "野收官发",
            event: "message.group",
            priority: 1677979616,
        })
    }

    async accept(event) {
        if (!(await QQBot.check(event))) {
            return false;
        }
        if (event.at == QQBot_id) {
            event.at = event.self_id;
        }
        await QQBot.replaceReply(event)
        return false;
    }
}

