import fs from 'fs';
import path from 'path';
import { Bili as Bili} from "#model"

export class Bilidamu extends plugin {
  constructor() {
    super({
      name: 'Bili:发弹幕',
      dsc: '弹幕发送功能',
      event: 'message',
      priority: Number.MIN_SAFE_INTEGER,
      rule: [
        {
          reg: '^#?向\\d+发弹幕.+$',
          fnc: 'senddamu'
        }
      ]
    });
  }

  async senddamu(e) {
    try {
      const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
      if (!fs.existsSync(cookiesFilePath)) {
        return await e.reply("未绑定哔站账号，请先发送【哔站登录】进行绑定", true);
      }
      const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
      const userIds = Object.keys(cookiesData);
      if (userIds.length === 0) {
        return await e.reply("您的登录已过期，请先发送【哔站登录】重新进行绑定", true);
      }
      let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
      if (!userIds.includes(currentUserId)) {
        currentUserId = userIds[0];
        await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
      }
      const match = e.msg.match(/^#?向(\d+)发弹幕(.+)$/);
      if (!match) {
        return await e.reply("格式错误，正确格式：向[房间号]发弹幕[内容]\n示例：#向123456发弹幕你好呀", true);
      }

      const [, roomid, msg] = match;
      const cleanMsg = msg.trim();
      if (!cleanMsg) {
        return await e.reply("弹幕内容不能为空", true);
      }
      const userCookies = cookiesData[currentUserId];
      const result = await Bili.livesenddamu(
        userCookies,
        cleanMsg,
        parseInt(roomid)
      );
        await e.reply(result, true);
    } catch (err) {
      logger.error('[Bili-Plugin]弹幕发送异常:', err);
    }
    return true
  }
}