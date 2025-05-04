export class ScreenMsg extends plugin {
    constructor() {
        super({
            name: "群聊屏蔽",
            event: "message.group",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: "^#?(取消)?屏蔽(\d+)?$",
                fnc: "setScreenMsg"
            }]
        })
    }
  
    async setScreenMsg(e) {
        let isScreen = !(e && e.msg && e.msg.includes('取消'))
        let tips = isScreen ? '屏蔽' : '解除屏蔽'
        if (!['ICQQ', 'OneBotv11'].includes(e?.bot?.adapter?.name)) return e.reply('不行的啦~ 窝做不到的啦',true)
        if (!e.isMaster) return e.reply(`不行的啦~ 窝不能帮主人${tips}他的啦`,true)
        
        let user = e.msg.match(/(\d+)/)? e.msg.match(/(\d+)/): e.at
        if (!user) return e.reply(`不行的啦~ 主人还没告诉我${tips}谁呢~`,true)
        user = Number(user)
        const rsp = await Packet.sendOidb(e,isScreen ? "OidbSvc.0x8bb_7" : "OidbSvc.0x8bb_9", {
            1: {
                1: {
                    1: e.group_id,
                    [isScreen ? 5 : 6]: isScreen
                        ? {
                            1: user,
                        }
                        : user,
                },
            },
        })
        if(rsp[3] === 0) return e.reply(`太棒啦，帮主人${tips}这个QQ为${user}的仁了呢~`,true)
        return e.reply('失败了惹，窝做不到的啦~',true)
    }
}