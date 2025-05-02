import {Gfs} from "#model"
if (!global.Gfs) global.Gfs = Gfs
export class getfile extends plugin {
    constructor() {
        super({
            name: "获取群文件信息",
            event: "message.group",
            priority: 1000,
            rule: [{
                reg: "^#?看文件$",
                fnc: "get"
            }]
        })
    }

    async get(e) {
        if (!['ICQQ', 'OneBotv11'].includes(e?.bot?.adapter?.name)) return false
        if (!e.getReply) return e.reply('请引用需要获取信息的文件')
        const rsp = await e?.getReply()
        const msg = rsp.message?.[0]
        if (msg.type !== 'file') return e.reply('请引用确保你引用了文件')
        let fid = msg.file_id || msg.fid
        fid = fid.startsWith('/') ? fid.slice(1) : fid
        let {name,url,size,md5} = await Gfs.getgroupfile(fid, e)
        let rep = `文件名：${name}\n直链：${url}\n大小：${size}\nmd5: ${md5}`
        e.reply(rep, true)
    }
}