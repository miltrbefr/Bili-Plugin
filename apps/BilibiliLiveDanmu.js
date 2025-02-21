import WebSocket from 'ws';
import { inflateSync, brotliDecompressSync } from 'zlib';
import axios from 'axios';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';

export class BilibiliLiveDanmu extends plugin {
  constructor() {
    super({
      name: 'BilibiliLiveDanmu',
      dsc: '监听 Bilibili 直播间弹幕并发送到群聊',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#?开始推送直播间(.*)$',
          fnc: 'bindLiveRoom'
        }
      ]
    });

    this.wsClient = null;
    this.timeout = null;
    this.heartbeatInterval = null;
  }

  async bindLiveRoom(e) {
    if (!e.isMaster && e.adapter_name !== 'QQBot') {
      return e.reply('暂无权限请联系主人', true);
  }
    const cookiesFilePath = path.join('./data/bili', `${String(e.user_id).replace(/:/g, '_').trim()}.json`);
    if (!fs.existsSync(cookiesFilePath)) {
      return await e.reply("未绑定哔站账号，请先发送【哔站登录】进行绑定", true);
    }
    const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
    const userIds = Object.keys(cookiesData);
    if (userIds.length === 0) {
      return await e.reply("账号数据异常，请先发送【哔站登录】进行绑定", true);
    }
    let currentUserId = await redis.get(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`);
    if (!userIds.includes(currentUserId)) {
      currentUserId = userIds[0];
      await redis.set(`bili:userset:${String(e.user_id).replace(/:/g, '_').trim()}`, currentUserId);
    }
    const userCookies = cookiesData[currentUserId]
    const roomId = e.msg.replace(/#?开始推送直播间/g, '').trim();
    if (!roomId) return e.reply('请输入正确的直播间ID');

    try {
      const danmuInfo = await this.getDanmuInfo(roomId,userCookies);
      await this.connectToLiveRoom(e, danmuInfo, roomId,userCookies);
      this.setAutoDisconnect();
      return e.reply(`开始监听直播间 ${roomId}，5分钟后自动断开`,true);
    } catch (err) {
      return e.reply(`连接失败: ${err.message}`);
    }
  }

  async getDanmuInfo(roomId, userCookies) {
    const headers = {
        "Cookie": `SESSDATA=${userCookies.SESSDATA}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    };

    const response = await axios.get(
        'https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo',
        { 
            params: { id: roomId },
            headers: headers
        }
    );
    
    if (response.data.code !== 0) throw new Error(response.data.message);
    return {
      host: response.data.data.host_list[0].host,
      port: response.data.data.host_list[0].wss_port,
      token: response.data.data.token
    };
}

  async connectToLiveRoom(e, danmuInfo, roomId,userCookies) {
    const wsUrl = `wss://${danmuInfo.host}:${danmuInfo.port}/sub`;
    this.wsClient = new WebSocket(wsUrl);

    this.wsClient.on('open', () => {
      this.sendAuthPacket(danmuInfo.token, roomId,userCookies);
      this.startHeartbeat();
    });

    this.wsClient.on('message', (data) => {
      this.decodeMessage(data, e);
    });

    this.wsClient.on('close', () => this.cleanup());
    this.wsClient.on('error', (err) => logger.error('WebSocket错误:', err));
  }

  sendAuthPacket(token, roomId,userCookies) {
    const authData = JSON.stringify({
      uid: Number(userCookies.DedeUserID),
      roomid: Number(roomId),
      protover: 3,
      platform: 'web',
      type: 2,
      key: token
    });

    const header = Buffer.alloc(16);
    header.writeUInt32BE(16 + Buffer.byteLength(authData), 0);  // 总长度
    header.writeUInt16BE(16, 4);    // 头部长度
    header.writeUInt16BE(1, 6);     // 协议版本
    header.writeUInt32BE(7, 8);     // 操作码（认证）
    header.writeUInt32BE(1, 12);    // 序列号

    this.wsClient.send(Buffer.concat([header, Buffer.from(authData)]));
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const header = Buffer.alloc(16);
      header.writeUInt32BE(16 + 4, 0);   // 总长度
      header.writeUInt16BE(16, 4);        // 头部长度
      header.writeUInt16BE(1, 6);         // 协议版本
      header.writeUInt32BE(2, 8);         // 操作码（心跳）
      header.writeUInt32BE(2, 12);        // 序列号
      
      const payload = Buffer.from('[object Object]');
      this.wsClient.send(Buffer.concat([header, payload]));
    }, 30000);
  }


  decodeMessage(data, e) {
    try {
      let buffer = Buffer.from(data);
      while (buffer.length >= 16) {
        const packetLen = buffer.readUInt32BE(0);
        if (buffer.length < packetLen) break;
  
        const headerLen = buffer.readUInt16BE(4);
        const ver = buffer.readUInt16BE(6);
        const operation = buffer.readUInt32BE(8);
  
        const body = buffer.slice(headerLen, packetLen);
        buffer = buffer.slice(packetLen);
  
        if (operation === 5) { // 操作码5为消息数据
          let decompressed = body;
          try {
            if (ver === 2) decompressed = inflateSync(body);
            if (ver === 3) decompressed = brotliDecompressSync(body);
          } catch (err) {
            logger.error('解压失败:', err);
            continue;
          }
  
          // 修改分割方式为\x00分割，并过滤空字符串和非JSON格式消息
          const messages = decompressed.toString('utf-8').split(/\x00/g).filter(msg => {
            const trimmedMsg = msg.trim();
            return trimmedMsg && trimmedMsg.startsWith('{') && trimmedMsg.endsWith('}');
          });
  
          messages.forEach(msg => {
            try {
              const data = JSON.parse(msg);
              this.handleMessage(data, e);
            } catch (err) {
              logger.error('消息解析失败:', err, '原始数据:', msg);
            }
          });
        }
      }
    } catch (err) {
      logger.error('解码消息失败:', err);
    }
  }
  handleMessage(data, e) {
    try {
      const cmd = data.cmd?.split(':')[0] || '';
      const info = data.info || [];
      const cmdData = data.data || {};

      switch (cmd) {
        case 'DANMU_MSG':
          const content = info[1] || '未知内容';
          const userInfo = info[2] || [];
          const userName = userInfo[1] || '未知用户';
          e.reply(`[弹幕] ${userName}: ${content}`);
          break;

        case 'SEND_GIFT':
          const giftName = cmdData.giftName || '未知礼物';
          const num = cmdData.num || 1;
          const uname = cmdData.uname || '未知用户';
          e.reply(`[礼物] ${uname} 赠送了 ${num} 个 ${giftName}`);
          break;

        case 'INTERACT_WORD':
          const interactName = cmdData.uname || '未知用户';
          e.reply(`[进场] 欢迎 ${interactName} 进入直播间`);
          break;

        case 'GUARD_BUY':
          const guardLevel = cmdData.guard_level || 0;
          const guardName = {1: "总督", 2: "提督", 3: "舰长"}[guardLevel] || "未知";
          e.reply(`[上舰] ${cmdData.username} 成为了 ${guardName}`);
          break;

        case 'SUPER_CHAT_MESSAGE':
          const scUser = cmdData.user_info?.uname || '未知用户';
          const message = cmdData.message || '';
          const price = cmdData.price || 0;
          e.reply(`[醒目留言] ${scUser} 发送了 ${price} 元 SC: ${message}`);
          break;

        case 'LIKE_INFO_V3_CLICK':
          const likeText = cmdData.like_text || '为主播点赞了';
          e.reply(`[点赞] ${cmdData.uname} ${likeText}`);
          break;

        case 'ONLINE_RANK_COUNT':
          case 'ONLINE_RANK_V2':
          case 'STOP_LIVE_ROOM_LIST':
          break;

        default:
          logger.debug(`[未知消息] CMD: ${cmd}, 数据: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      logger.error('处理消息时出错:', err);
    }
  }

  setAutoDisconnect() {
    this.timeout = setTimeout(() => this.cleanup(), 5 * 60 * 1000);
  }

  cleanup() {
    this.wsClient?.close();
    clearInterval(this.heartbeatInterval);
    clearTimeout(this.timeout);
    this.wsClient = null;
  }
}