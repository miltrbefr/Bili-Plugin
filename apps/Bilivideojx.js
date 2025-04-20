import { Bili as Bili, Config as config} from "#model"
import fs from 'fs';
import path from 'path';

const MAX_VIDEO_SIZE_MB = config.maxVideoSizeMB;
const ANONYMOUS_USER = { user_id: '80000000', nickname: '匿名消息' };

export class Bilijx extends plugin {
    constructor() {
        super({
            name: "Bili:视频解析",
            desc: "B站链接解析增强版",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                reg: 'bilibili.com|b23.tv|bili2233.cn',
                fnc: "handleRedirect"
            }]
        });
    }

    async handleRedirect(e) {
        if (!config.Switchjx) return false;

        try {
            const url = this.extractUrl(e.msg);
            if (!url) return;

            const SESSDATA = await this.getUserSession(e.user_id);
            const result = await Bili.getvideoinfo(url, SESSDATA);

            const handler = {
                video: this.handleVideo,
                live: this.handleLive,
                anime: this.handleAnime
            }[result.type];

            if (handler) {
                await handler.call(this, e, result.data);
            }
        } catch (error) {
            logger.info('[Bili-Plugin] 解析出错:', error);
        }
    }

    async buildForwardMessage(e, nodes) {
        const msg = await Bot.makeForwardMsg(nodes);
        await e.reply(msg, false);
    }

    extractUrl(msg) {
        const cleanedMsg = msg.replace(/\\\//g, '/');
        const regex = /https?:\/\/(b23\.tv\/[\w\-]+|live\.bilibili\.com\/[\w\-\/]+|www\.bilibili\.com\/[\w\-\/?=&;]+|bili2233\.cn\/[\w\-\/?=&;]+)/;
        return cleanedMsg.match(regex)?.[0];
    }

    async getUserSession(userId) {
        try {
            const sanitizedId = String(userId).replace(/:/g, '_').trim();
            const cookiesPath = path.join('./data/bili', `${sanitizedId}.json`);

            if (!fs.existsSync(cookiesPath)) {
                return config.SESSDATA;
            }

            const cookiesData = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
            const userIds = Object.keys(cookiesData);
            const currentUserId = await this.getCurrentUserId(sanitizedId, userIds);
            
            return cookiesData[currentUserId]?.SESSDATA || config.SESSDATA;
        } catch (error) {
            logger.info(`${userId}未绑定ck将使用默认SESSDATA解析B站视频`);
            return config.SESSDATA;
        }
    }

    async getCurrentUserId(sanitizedId, userIds) {
        const redisKey = `bili:userset:${sanitizedId}`;
        let currentUserId = await redis.get(redisKey);
        
        if (!userIds.includes(currentUserId)) {
            currentUserId = userIds[0];
            await redis.set(redisKey, currentUserId);
        }
        return currentUserId;
    }

    async handleVideo(e, data) {
        const videoSizeMB = data.size / (1024 ** 2);
        const isOversize = videoSizeMB > MAX_VIDEO_SIZE_MB;

        const baseInfo = [
            segment.image(data.pic),
            `『${data.title}』\n`,
            `简介：${data.desc}\n`,
            `UP：${data.authorName} (UID:${data.mid})\n`,
            `${data.tname}｜${data.tname_v2}\n`,
        ];

        const statsInfo = [
            `点赞：${data.stat.like} 分享：${data.stat.share}\n`,
            `收藏：${data.stat.favorite} 投币：${data.stat.coin}\n`,
            `评论：${data.stat.reply} 播放：${data.stat.view}\n`,
            `弹幕：${data.stat.danmaku}`,
            `视频时长：${data.length}\n`,
            `发布时间：${data.time}\n`,
            `${data.online.total}｜${data.online.count}\n`,
            `视频大小：${videoSizeMB.toFixed(2)}MB`
        ];

        const nodes = [{
            ...ANONYMOUS_USER,
            message: [...baseInfo, ...statsInfo]
        }];

        if (isOversize) {
            nodes.push({
                ...ANONYMOUS_USER,
                message: `视频过大请使用浏览器查看（有效时间 120 分钟）：\n${data.videoUrl}`
            });
        }

        await this.buildForwardMessage(e, nodes);

        if (!isOversize) {
            await Bili.sleep(2000);
            await e.reply(segment.video(data.videoUrl), false);
        }
    }

    async handleLive(e, data) {
        const baseInfo = [
            data.cover && segment.image(data.cover),
            `『${data.title}』\n`,
            `主播UID：${data.uid} 房间号：${data.roomid}\n`,
            `分区：${data.area_name} \n状态：${data.live_status}\n`,
            `开播时间：${data.live_time}`
        ].filter(Boolean);

        const hotWordsInfo = `热词：${data.hot_words.join(' | ')}\n`;

        const danmuNodes = data.danmu.map(danmu => ({
            user_id: e.user_id,
            nickname: e.sender.nickname,
            message: [
                `${danmu.nickname}${danmu.isadmin ? ' (管理员)' : ''}`,
                segment.image(danmu.face),
                `\n${danmu.text}\n===============\n${danmu.time}`
            ]
        }));

        const nodes = [
            { ...ANONYMOUS_USER, message: baseInfo },
            {
                user_id: e.user_id,
                nickname: e.sender.nickname,
                message: [
                    hotWordsInfo,
                    `直播流地址：${data.Url}\n`,
                    `独立播放器：https://www.bilibili.com/blackboard/live/live-activity-player.html?enterTheRoom=0&cid=${data.roomid}`
                ]
            },
            ...danmuNodes
        ];

        await this.buildForwardMessage(e, nodes);
    }

    async handleAnime(e, data) {
        const videoSizeMB = data.size / (1024 ** 2);
        const senderInfo = {
            user_id: e.user_id,
            nickname: e.sender.nickname
        };

        const nodes = [
            {
                ...senderInfo,
                message: [
                    segment.image(data.cover),
                    `『${data.name}』\n`,
                    `${data.styles.join('|')}\n`,
                    `点赞：${data.stat.likes} 分享：${data.stat.share}\n`,
                    `追番：${data.stat.favorites} 投币：${data.stat.coins}\n`,
                    `评论：${data.stat.reply} 播放：${data.stat.views}\n`,
                    `弹幕：${data.stat.danmakus} 收藏：${data.stat.favorite}\n`,
                    `时长：${data.length} 大小：${videoSizeMB.toFixed(2)}MB\n`,
                    `观看次数：${data.subtitle}`
                ]
            },
            {
                ...senderInfo,
                message: `简介：${data.dec}`
            },
            {
                ...senderInfo,
                message: `饰演：${data.actors}`
            },
            {
                ...senderInfo,
                message: `制作：${data.staff}`
            },
            {
                ...senderInfo,
                message: `主下载地址：${data.videoUrl}\n注意：视频流具有referer鉴权，请携带bilibili点com子域名进行下载`
            }/*,
            {
                ...senderInfo,
                message: `备用链接：${data.backupUrls.join('\n-----------\n')}`
            }*/
        ];

        await this.buildForwardMessage(e, nodes);
    }
}