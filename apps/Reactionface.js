export class Reaction extends plugin {
    constructor() {
        super({
            name: "取消息",
            event: "message.group",
            priority: 1000,
            rule: [{
                reg: "^#?刷屏\\s*(.*)$",
                fnc: "get"
            }]
        })
    }

    async get(e) {
        if (!['ICQQ', 'OneBotv11'].includes(e?.bot?.adapter?.name)) return false
        let seq = e.reply_id ? e.reply_id : e?.source?.seq
        if (!seq) return e.reply("请回复要刷屏的消息")
        let isSeq = e?.bot?.adapter?.name === 'ICQQ'
        let real_seq
        if (!isSeq) {
            real_seq = parseInt(isSeq ? message_id : (await e.bot.sendApi('get_msg', {
                message_id: seq
            }))?.real_seq)
            seq = real_seq
        }
        if (!isSeq && !real_seq) return e.reply("获取seq失败，请尝试更新napcat")
        const match = e.msg.match(/^#?刷屏\s*(\d+)$/)
        const times = match ? match[1] : 1
        const maxAllowed = 10
        if (times > maxAllowed) await e.reply('报告主人，太多啦，会坏掉的Õ_Õ 只能帮你十次哦~', true)
        const loopTimes = Math.min(times, maxAllowed)
        for (let i = 0; i < loopTimes; i++) {
            const ids = RandomArray()
            for (const id of ids) {
                const type = id < 500 ? 1 : 2
                const body = {
                    2: e.group_id,
                    3: seq,
                    4: String(id),
                    5: type,
                }
                await this.setReaction(e, body)
            }
            for (const id of ids) {
                const type = id < 500 ? 1 : 2
                const body = {
                    2: e.group_id,
                    3: seq,
                    4: String(id),
                    5: type,
                }
                await this.delReaction(e, body)
            }
        }
        e.reply(`主人窝完成惹`, true)
    }

    async setReaction(e, body) {
        await Packet.sendOidbSvcTrpcTcp(e, "OidbSvcTrpcTcp.0x9082_1", body)
    }

    async delReaction(e, body) {
        await Packet.sendOidbSvcTrpcTcp(e, "OidbSvcTrpcTcp.0x9082_2", body)
    }
}

function RandomArray(length = 20, equalProbability = true) {
    const range1 = {
        min: 1,
        max: 500
    }
    const range2 = {
        min: 127801,
        max: 128563
    }
    const range1Size = range1.max - range1.min + 1
    const range2Size = range2.max - range2.min + 1
    const totalSize = range1Size + range2Size

    return Array.from({
        length
    }, () => {
        if (equalProbability) {
            const randomValue = Math.floor(Math.random() * totalSize);
            return randomValue < range1Size ?
                randomValue + range1.min :
                randomValue - range1Size + range2.min;
        } else {
            return Math.random() < 0.5 ?
                Math.floor(Math.random() * range1Size) + range1.min :
                Math.floor(Math.random() * range2Size) + range2.min;
        }
    })
}