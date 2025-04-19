import QApi from '../model/BAPI/QAPI.js'
import Bili from '../model/bili.js'

export class CatPlugin extends plugin {
    constructor() {
        super({
            name: "Bili-Plugin:图床",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: /^二号图床(.*)/m,
                fnc: "getTencentImageUrl"
            }, {
                reg: /^腾讯图床(.*)/m,
                fnc: "getTencentImageUrl2"
            }, {
                reg: /^作业图床(.*)/m,
                fnc: "getTencentImageUrl3"
            }]
        });
    }

    async getimageUrl(e) {
        let imageUrl = e.msg.replace(/二号图床|腾讯图床|作业图床/g, '').trim() || e.img?.[0]
        if (!imageUrl) {
            const response = await e.getReply()
            const msgObj = JSON.parse(JSON.stringify(response));
            const imageMessage = msgObj.message.find(item => item.type === 'image')
            if (imageMessage) {
                imageUrl = imageMessage.url
            }
        }
        return imageUrl || null
    }

    async getTencentImageUrl(e) {
        let imageUrl = await this.getimageUrl(e)
        if (!imageUrl) {
            return e.reply("获取图片链接失败", true);
        }
        const cookieRes = await Bili.getQQck(e.self_id, "qun.qq.com")
        const {
            skey,
            pskey
        } = cookieRes
        if (!skey || !pskey) return e.reply("获取Cookie失败", true)
        const buffer = await Bot.Buffer(imageUrl)
        const res = await QApi._uploadImg(buffer, e.self_id, skey, pskey)
        if (res.ec == 0) {
            const p = JSON.parse(res.id.replace(/&quot;/g, "\""))
            const finalUrl = `https://p.qlogo.cn/gdynamic/${p.id}/0/${e.user_id}`
            e.reply(`${finalUrl}\n高：${p.h} 宽: ${p.w}`, true)
        } else {
            e.reply(`上传失败：${res}`, true)
        }
    }

    async getTencentImageUrl2(e) {
        let imageUrl = await this.getimageUrl(e)
        if (!imageUrl) {
            return e.reply("获取图片链接失败", true);
        }
        try {
            const image = await Bot.uploadImage(imageUrl)
            e.reply(`${image.url}\n高：${image.height} 宽: ${image.width}`, true)
        } catch (error) {
            logger.error(error);
            e.reply("未知错误", true)
        }
    }

    async getTencentImageUrl3(e) {
        let imageUrl = await this.getimageUrl(e)
        if (!imageUrl) {
            return e.reply("获取图片链接失败", true);
        }
        try {
            const cookieRes = await Bili.getQQck(e.self_id, "qun.qq.com")
            const {
                skey,
                pskey
            } = cookieRes
            if (!skey || !pskey) return e.reply("获取Cookie失败", true)
            const buffer = await Bot.Buffer(imageUrl)
            const base64 = buffer.toString('base64');
            const res = await QApi._uploadImg2(base64, e.self_id, skey, pskey, buffer)
            if (res.code === 200) e.reply(`${res.url}\n高：${res.height} 宽: ${res.width}`, true)
            else e.reply(`${res.msg}`, true)
        } catch (error) {
            logger.error(error);
            e.reply("未知错误", true)
        }
    }


}