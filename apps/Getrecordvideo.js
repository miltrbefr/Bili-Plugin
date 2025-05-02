export class getrecordvideo extends plugin {
    constructor() {
        super({
            name: "获取群聊语音",
            event: "message.group",
            priority: 1000,
            rule: [{
                reg: "^#?看语音$",
                fnc: "get_1"
            },{
                reg: "^#?看视频$",
                fnc: "get_2"
            }]
        })
    }

    async get_1(e) {
        if (!['ICQQ', 'OneBotv11'].includes(e?.bot?.adapter?.name)) return false
        let id = e.reply_id ? e.reply_id : e?.source?.seq
        if (!id) return e.reply("请回复要get的消息")
        let isSeq = e?.bot?.adapter?.name === 'ICQQ'
        const data = await Packet.getMsg(
            e,
            id,
            isSeq
        )
        let target = data?.["3"]?.["6"]?.["3"]?.["1"]?.["2"]
        if (!Array.isArray(target)) {
            target = [target]
        }
        let size, md5, fid
        for (const i of target) {
            if (size && md5 && fid) break
            if (i?.[53]?.[2]?.[1]?.[1]?.[1])
                size = i?.[53]?.[2]?.[1]?.[1]?.[1]?.[1]
            md5 = i?.[53]?.[2]?.[1]?.[1]?.[1]?.[2]
            if (i?.[53]?.[2]?.[1]?.[1])
                fid = i?.[53]?.[2]?.[1]?.[1]?.[2]
        }
        if (!size || !fid || !md5) return e.reply('请确保引用了语音信息', true)
        let body = {
            "1": {
                "1": {
                    "1": 1,
                    "2": 200
                },
                "2": {
                    "101": 1,
                    "102": 3,
                    "200": 2,
                    "202": {
                        "1": e.group_id
                    }
                },
                "3": {
                    "1": 2
                }
            },
            "3": {
                "1": {
                    1: {
                        1: size,
                        2: md5,
                    },
                    2: fid,
                    3: 1,
                },
                "2": {
                    "2": {
                        "1": 0,
                        "3": 0
                    }
                }
            }
        }
        const rsp = await Packet.sendOidbSvcTrpcTcp(this.e, "OidbSvcTrpcTcp.0x126e_200", body)
        const rkey = rsp[3][1]
        if (!rkey) return e.reply('获取rkey失败', true)
        let url = `https://${rsp[3][3][1]}${rsp[3][3][2]}${rkey}`
        e.reply(`语音链接：\n${url}`, true)
    }


    async get_2(e) {
        if (!['ICQQ', 'OneBotv11'].includes(e?.bot?.adapter?.name)) return false
        let id = e.reply_id ? e.reply_id : e?.source?.seq
        if (!id) return e.reply("请回复要get的消息")
        let isSeq = e?.bot?.adapter?.name === 'ICQQ'
        const data = await Packet.getMsg(
            e,
            id,
            isSeq
        )
        let target = data?.["3"]?.["6"]?.["3"]?.["1"]?.["2"]
        if (!Array.isArray(target)) {
            target = [target]
        }
        let size, md5, fid, name
        for (const i of target) {
            if (size && md5 && fid) break
            if (i?.[53]?.[2]?.[1])
                size = i?.[53]?.[2]?.[1][0]?.[1]?.[1]?.[1]
            md5 = 'ntvideo_' + i?.[53]?.[2]?.[1][0]?.[1]?.[1]?.[2]
            name = i?.[53]?.[2]?.[1][0]?.[1]?.[1]?.[4]
            fid = i?.[53]?.[2]?.[1][0]?.[1]?.[2]
        }
        if (!size || !fid || !md5 || !name) return e.reply('请确保引用了视频信息', true)
        let body = {
            "1": {
                "1": {
                    "1": 1,
                    "2": 200
                },
                "2": {
                    "101": 1,
                    "102": 3,
                    "200": 2,
                    "202": {
                        "1": e.group_id
                    }
                },
                "3": {
                    "1": 2
                }
            },
            "3": {
                "1": {
                    1: {
                        1: size,
                        2: md5,
                        4: name,
                    },
                    2: fid,
                    3: 1,
                },
                "2": {
                    "2": {
                        "1": 0,
                        "3": 0
                    }
                }
            }
        }
        const rsp = await Packet.sendOidbSvcTrpcTcp(this.e, "OidbSvcTrpcTcp.0x126e_200", body)
        const rkey = rsp[3][1]
        if (!rkey) return e.reply('获取rkey失败', true)
        let url = `https://${rsp[3][3][1]}${rsp[3][3][2]}${rkey}`
        e.reply(`视频链接：\n${url}`, true)
    }
}