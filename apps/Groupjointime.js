import moment from 'moment';

export class Bilijointime extends plugin {
    constructor() {
        super({
            name: "Bili:进群多久了",
            desc: "进群多久了",
            event: "message.group",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^#?(我|它|她|他|he|she|it|i)?进群(多久了|时间)$/i,
                fnc: "jointime"
            }]
        })
    }

    async jointime(e) {
      if(['QQBot'].includes(e.adapter_name)) return e.reply('你在干嘛笨蛋，别艾特我了！！')
        let userID = e.user_id;
        let selfID = e.self_id;
        let qqNumbers = [];
        for (let msg of e.message) {
            if (msg.type === 'at') {
                qqNumbers.push(msg.qq);
            }
        }
        if (qqNumbers.length > 0) {
            userID = qqNumbers[0];
        }
        if (userID === selfID) userID = e.user_id;

        const member = await e.bot.pickMember(e.group_id, userID).getInfo();
        const joinTime = moment(member.join_time * 1000)
        const now = moment()
        const duration = moment.duration(now.diff(joinTime))
        const totalDays = duration.years() * 365 + duration.months() * 30 + duration.days();
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();
        let timeDiff = '';
        if (totalDays > 0) {
            timeDiff += `${totalDays}天`;
        }
        timeDiff += `${hours}小时${minutes}分钟${seconds}秒`;

        await e.reply(timeDiff, true);
        return true;
    }
}