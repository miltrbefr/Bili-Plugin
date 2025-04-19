import cfg from '../../../lib/config/config.js'
import moment from "moment"
import { Config as config, Button as Button} from "#model"
const cdTime = config.whoisMyWifecdTime // 5分钟冷却(主人除外)
const cacheTime = config.whoisMyWifecacheTime // 60分钟缓存(群友信息)
const maxMembers = config.whoisMyWifemaxMembers // 选择5个群友(影响每次成功率)
const expression = /^(我(老婆|老公)呢|今日(老婆|老公))$/

export class Biliwife extends plugin {
    constructor() {
        super({
            name: 'Bili:娶群友',
            dsc: '娶群友',
            event: 'message.group',
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: "^(我(老婆|老公)呢|今日(老婆|老公))$",
                fnc: 'whoisMyWife'
            }]
        })
    }

    async whoisMyWife(e) {
        const regRet = expression.exec(e.msg)
        if (!regRet) return false

        const keyword = regRet[1]
        if(['QQBot'].includes(e.adapter_name)){
            return this.replyNoWife(e, keyword)
        }
        const currentTime = moment()
        const masterList = cfg.masterQQ

        const lastCD = await redis.get(`BILI:whois-my-wife-cd:${e.user_id}`)
        if (lastCD && !masterList.includes(e.user_id)) {
            const diff = currentTime.diff(moment(lastCD), 'seconds')
            if (diff < cdTime) {
                const tips = [
                    segment.at(e.user_id),
                    `\n打咩，醒醒你根本没有${keyword}！(*/ω＼*)`,
                    `\n冷却剩余：${cdTime - diff}秒`,
                    new Button().wdlp()
                ]
                return e.reply(tips)
            }
        }
        await redis.set(`BILI:whois-my-wife-cd:${e.user_id}`, currentTime.format(), {EX: cdTime})
        try {
            const memberMap = await e.group.getMemberMap()
            const memberIds = Array.from(memberMap.keys())
            if (memberIds.length === 0) return this.replyNoWife(e, keyword)
            const targetSex = keyword === '老公' ? 'male' : 'female'
            const sexMap = {
                male: '男',
                female: '女'
            }
            const randomUserIds = memberIds
                .sort(() => Math.random() - 0.5)
                .slice(0, maxMembers)
            const memberInfos = await Promise.all(randomUserIds.map(async (userId) => {
                const cacheKey = `BILI:member-info:${e.group_id}:${userId}`
                let info = await redis.get(cacheKey)
                if (!info) {
                    try {
                        info = await e.bot.pickMember(e.group_id, userId).getInfo()
                        await redis.set(cacheKey, JSON.stringify(info), {EX: cacheTime})
                    } catch (err) {
                        return null
                    }
                } else {
                    info = JSON.parse(info)
                }
                return info
            }))
            const validMembers = memberInfos.filter(info => info && info.sex === targetSex)
            if (validMembers.length === 0) return this.replyNoWife(e, keyword)
            const memberInfo = validMembers[Math.floor(Math.random() * validMembers.length)]
            const lastSent = moment(memberInfo.last_sent_time * 1000)
            const msg = [
                segment.at(e.user_id),
                `\n今天你的群友${keyword}是`,
                segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${memberInfo.user_id}`),
                `\n【${memberInfo.card || memberInfo.nickname}】(${memberInfo.user_id}) ${sexMap[memberInfo.sex]} 哒哒哒！`,
                `\n最后发言：${lastSent.fromNow()}`,
                new Button().wdlp()
              //  `\n群头衔：「${memberInfo.title}」`
            ]
            return e.reply(msg)
        } catch (err) {
            return this.replyNoWife(e, keyword)
        }
    }
    replyNoWife(e, keyword) {
        return e.reply([
            segment.at(e.user_id),
            `\n达咩，醒醒你根本没有${keyword}！(*/ω＼*)`,
            new Button().wdlp()
        ])
    }
}