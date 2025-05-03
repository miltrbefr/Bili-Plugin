export class Silence extends plugin {
    constructor() {
        super({
            name: "全体假禁",
            event: "message.group",
            priority: 1000,
            rule: [{
                reg: "^#?全体假禁(\d+)?$",
                fnc: "setSilence"
            }]
        })
    }
  
    async setSilence(e) {
        if (!(e.isMaster || e.member.is_admin || e.member.is_owner)) return e.reply('不行的啦~ 窝不能帮主人做坏事',true)
        if (!['ICQQ', 'OneBotv11'].includes(e?.bot?.adapter?.name)) return false
        let time = e.msg.match(/(\d+)/)? e.msg.match(/(\d+)/): 1
        const rsp = await Packet.sendOidb(e,"OidbSvc.0x89a_0", {
            1: e.group_id,
            2: {17: time },
        })
        if(rsp[3] === 0) return e.reply('帮主人开启啦~',true)
        return e.reply('失败了惹，主人窝没权限的啦~',true)
    }
}