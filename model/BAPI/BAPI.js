import {createHash} from 'node:crypto';

const CONSTANTS = {
    likeApiUrl: 'https://app.bilibili.com/x/v2/view/like',
    dislikeApiUrl: 'https://app.bilibili.com/x/v2/view/dislike',
    replyApiUrl: 'https://api.bilibili.com/x/v2/reply/add',
    shareApiUrl: 'https://api.bilibili.com/x/share/finish',
    reportApiUrl: 'https://api.bilibili.com/x/v2/history/report',
    addCoinApiUrl: 'https://app.bilibili.com/x/v2/view/coin/add',
    unfavApiUrl: 'https://api.bilibili.com/x/v3/fav/resource/unfav-all',
    experienceApiUrl: 'https://api.bilibili.com/x/vip/experience/add',
    privUrl: 'https://api.bilibili.com/x/vip/privilege/receive',
    mangaClockInUrl: 'https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn',
    mangaShareUrl: 'https://manga.bilibili.com/twirp/activity.v1.Activity/ShareComic',
    tripleUrl: 'https://app.bilibili.com/x/v2/view/like/triple',
    refreshUrl: 'https://passport.bilibili.com/x/passport-login/oauth2/refresh_token',
    danmuApiUrl: 'https://api.live.bilibili.com/xlive/app-room/v1/dM/sendmsg',
    favApiUrl: 'https://api.biliapi.net/x/v3/fav/resource/batch-deal',
    spaceApiUrl: 'https://app.bilibili.com/x/v2/space',
    explogApiUrl: 'https://api.bilibili.com/x/member/web/exp/log',
    explog2ApiUrl: 'https://api.bilibili.com/x/member/web/exp/reward', 
    myinfoApiUrl: 'https://api.bilibili.com/x/space/myinfo',
    info2ApiUrl: 'https://app.bilibili.com/x/v2/account/myinfo', 
    livedamuApiUrl: 'https://api.live.bilibili.com/xlive/app-room/v1/dM/gethistory', 
    feed2ApiUrl: 'https://app.bilibili.com/x/v2/feed/index/story',
    relaApiUrl: 'https://api.bilibili.com/x/relation/modify',
    livelikeApiUrl: 'https://api.live.bilibili.com/xlive/app-ucenter/v1/like_info_v3/like/likeReportV3',
    livefeedApiUrl: 'https://api.live.bilibili.com/xlive/app-interface/v2/index/feed',
    userinfoApiUrl: 'https://api.vc.bilibili.com/x/im/user_infos'
};

const appKey = '1d8b6e7d45233436'
const appSecret = '560c52ccd288fed045859ed18bffd973'
const appSign = (params, appkey, appsec) => {
    params.appkey = appkey
    const searchParams = new URLSearchParams(params)
    searchParams.sort()
    return createHash('md5').update(searchParams.toString() + appsec).digest('hex')
}

const appheaders = {
    'Host': 'api.bilibili.com',
    'buvid': 'XU4C85241BF18FBC9C5C20CA1D08F38937711',
    'User-Agent': 'Mozilla/5.0 BiliDroid/8.2.0 (bbcallen@gmail.com) os/android model/NTH-AN00 mobi_app/android build/8020300 channel/yingyongbao innerVer/8020300 osVer/12 network/2',
    'Content-Type': 'application/x-www-form-urlencoded',
    'fp_local': 'ce14fc8255de098acb8c4f83e245543820250121175935cc89db065489232e72',
    'fp_remote': 'ce14fc8255de098acb8c4f83e245543820250121175935cc89db065489232e72',
    'session_id': '3d5cec47',
    'guestid': '24145498840755'
}

class BApi {
    constructor() {}

    async getupinfo(mids, userCookies) {
        try {
            const params = {
                _device: "android",
                _hwid: "e0l9GCEVJB15HSUTIUN1RQVLH1d6O3VFdQ",
                access_key: userCookies.access_token,
                appkey: "1d8b6e7d45233436",
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                disable_rcmd: "0",
                mobi_app: "android",
                platform: "android",
                s_locale: "zh_CN",
                src: "yingyongbao",
                statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
                style: "16",
                trace_id: "20250203224200010",
                ts: Math.floor(Date.now() / 1000),
                uids: mids,
                version: "8.2.0.8020300"
            };
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.userinfoApiUrl + '?' + new URLSearchParams(params), {
                method: 'GET',
                headers: appheaders,
            })
            return await response.json()
        } catch (error) {
            logger.error('[BILI-PLUGIN]批量查询用户信息失败：', error)
            return {
                code: -1,
                msg: `批量查询用户信息失败(可能是你IP被拉黑)`,
                error: error.message
            }
        }
    }

    async myinfo(userCookies) {
       try {
        const headers = await this.getwebheaders(userCookies);
        const response = await fetch(CONSTANTS.myinfoApiUrl, {
            method: 'GET',
            headers
        });
        return await response.json()
       } catch (error) {
        logger.error('[BILI-PLUGIN]获取网页个人信息失败：', error)
        return {
            code: -1,
            msg: `获取网页个人信息失败(可能是你IP被拉黑)`,
            error: error.message
        }
       }
    }

    async myinfo2(userCookies) {
        try {
            const params = {
                access_key: userCookies.access_token,
                appkey: "783bbb7264451d82",
                build: "8020300",
                buvid: "XU4C85241BF18FBC9C5C20CA1D08F38937711",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                disable_rcmd: "0",
                local_id: "XU4C85241BF18FBC9C5C20CA1D08F38937711",
                mobi_app: "android",
                platform: "android",
                s_locale: "zh_CN",
                statistics: "{\"appId\":1,\"platform\":3,\"version\":\"8.2.0\",\"abtest\":\"\"}",
                ts: Math.floor(Date.now() / 1000),
            };
    
            params.sign = appSign(params, "783bbb7264451d82", "2653583c8873dea268ab9386918b1d65");
            const response = await fetch(CONSTANTS.info2ApiUrl + '?' + new URLSearchParams(params), {
                method: 'GET',
                headers: appheaders,
            })
            return await response.json()
        } catch (error) {
            logger.error('[BILI-PLUGIN]获取个人信息失败：', error)
            return {
                code: -1,
                msg: `获取个人信息失败(可能是你IP被拉黑)`,
                error: error.message
            }
        }
    }

    async exp_log2(userCookies) {
        try {
            const headers = await this.getwebheaders(userCookies);
            const response = await fetch(CONSTANTS.explog2ApiUrl, {
                method: 'GET',
                headers
            })
            return await response.json()
        } catch (error) {
            logger.error('[BILI-PLUGIN]获取今日日志失败：', error)
            return {
                code: -1,
                msg: `获取今日日志失败(可能是你IP被拉黑)`,
                error: error.message
            }
        }

    }

    async space(mid, userCookies) {
        try {
            const params = {
                access_key: userCookies.access_token || '114514',
                appkey: '1d8b6e7d45233436',
                build: '8020300',
                c_locale: 'zh_CN',
                channel: 'yingyongbao',
                disable_rcmd: 0,
                fnval: 912,
                fnver: 0,
                force_host: 0,
                fourk: 1,
                from: 0,
                local_time: Math.floor(Date.now() / 1000),
                mobi_app: 'android',
                platform: 'android',
                player_net: 1,
                qn: 32,
                qn_policy: 1,
                s_locale: 'zh_CN',
                statistics: JSON.stringify({
                    "appId": 1,
                    "platform": 3,
                    "version": "8.2.0",
                    "abtest": ""
                }),
                ts: Math.floor(Date.now() / 1000),
                vmid: mid,
                voice_balance: 1
            };
    
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.spaceApiUrl + '?' + new URLSearchParams(params), {
                method: 'GET',
                headers: appheaders,
            })
            return await response.json()
        } catch (error) {
            logger.error('[BILI-PLUGIN]获取用户信息失败：', error)
            return {
                code: -1,
                msg: `获取用户信息失败(可能是你IP被拉黑)`,
                error: error.message
            }
        }
    }

    async shareVideo(aid, userCookies) {
        try {
            const params = {
                access_key: userCookies.access_token,
                appkey: appKey,
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                disable_rcmd: "0",
                from_spmid: "tm.recommend.0.0",
                mobi_app: "android",
                object_extra_fields: JSON.stringify({
                    goto: "vertical_av",
                    track_id: "all_49.router-pegasus-1914948-cd87cf9bc-rhz8m.1737638175528.728"
                }),
                oid: aid,
                panel_type: "1",
                platform: "android",
                s_locale: "zh_CN",
                share_channel: "biliIm",
                share_id: "main.ugc-video-detail-vertical.0.0.pv",
                share_origin: "story",
                share_session_id: "d4a6cffa-4988-4078-b2b9-b6ec5b2c6177",
                sid: "27882881279",
                spm_id: "main.ugc-video-detail-vertical.0.0",
                statistics: JSON.stringify({
                    appId: 1,
                    platform: 3,
                    version: "8.2.0",
                    abtest: ""
                }),
                success: "true",
                ts: Math.floor(Date.now() / 1000),
            }

            params.sign = appSign(params, appKey, appSecret);

            const response = await fetch(CONSTANTS.shareApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            })

            return await response.json()
        } catch (error) {
            logger.error('[BILI-PLUGIN]请求分享视频API失败：', error)
            return {
                code: -1,
                msg: `请求分享视频API失败(可能是你IP被拉黑)`,
                error: error.message
            }
        }
    }

    async reportWatch(aid, cid, userCookies, time = Math.floor(Math.random() * 91) + 10) {
        const watchTime = Math.min(Math.max(time, 10), 100);
        try {
            const params = {
                access_key: userCookies.access_token,
                aid: aid,
                cid: cid,
                progress: watchTime,
                appkey: appKey,
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                scene: 'front',
                statistics: JSON.stringify({
                    appId: 1,
                    platform: 3,
                    version: "8.2.0",
                    abtest: ""
                }),
                ts: Math.floor(Date.now() / 1000),
                type: '3',
                platform: 'android',
                mobi_app: 'android_i',
                disable_rcmd: '0',
            };

            params.sign = appSign(params, appKey, appSecret);

            const response = await fetch(CONSTANTS.reportApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params)
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            logger.error('[BILI-PLUGIN]上报观看进度失败:', error);
            return {
                code: -1,
                msg: '上报观看进度失败(可能是你IP被拉黑)',
                error: error.message
            }
        }
    }

    async getwebheaders(userCookies) {
        return {
            'User-Agent': 'Mozilla/5.0 BiliDroid/8.2.0 (bbcallen@gmail.com) os/android model/24031PN0DC mobi_app/android build/8020300 channel/yingyongbao innerVer/8020300 osVer/12 network/2',
            'Host': 'api.bilibili.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `SESSDATA=${encodeURIComponent(userCookies.SESSDATA)}${userCookies.csrf ? `; bili_jct=${userCookies.csrf}` : ''}${userCookies.sid ? `; sid=${userCookies.sid}` : ''}${userCookies.DedeUserID ? `; DedeUserID=${userCookies.DedeUserID}` : ''}${userCookies.DedeUserID__ckMd5 ? `; DedeUserID__ckMd5=${userCookies.DedeUserID__ckMd5}` : ''}`,
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': 'https://www.bilibili.com/',
            'Origin': 'https://www.bilibili.com'
        };
    }

    async getExperience(userCookies) {
        try {
            const headers = await this.getwebheaders(userCookies);
            const body = new URLSearchParams({
                csrf: userCookies.csrf
            });

            const response = await fetch(CONSTANTS.experienceApiUrl, {
                method: 'POST',
                headers,
                body: body.toString(),
            })
            const responseData = await response.json();
            return responseData;
        } catch (error) {
            logger.error('[BILI-PLUGIN] 获取大会员经验失败:', error);
            return {
                code: -1,
                msg: '获取大会员经验失败(可能是你IP被拉黑)',
                error: error.message
            }
        }
    }

    async getCoupons(userCookies, type = 1) {
        try {
            const body = new URLSearchParams({
                type: String(type),
                csrf: userCookies.csrf
            });
            const headers = await this.getwebheaders(userCookies);
            const response = await fetch(CONSTANTS.privUrl, {
                method: 'POST',
                headers,
                body: body.toString(),
            })
            const responseData = await response.json();
            return responseData
        } catch (error) {
            logger.error('[BILI-PLUGIN] 领取卡券失败:', error);
            return {
                code: -1,
                msg: '领取卡券失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async shareManhua(userCookies) {
        try {
            const headers = await this.getwebheaders(userCookies);
            const body = new URLSearchParams({
                platform: 'android'
            });
            const response = await fetch(CONSTANTS.mangaShareUrl, {
                method: 'POST',
                headers,
                body: body.toString()
            })
            const responseData = await response.json();
            return responseData
        } catch (error) {
            logger.error('[BILI-PLUGIN] 漫画分享失败:', error);
            return {
                code: -1,
                msg: '漫画分享失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }


    async signManhua(userCookies) {
        try {
            const headers = await this.getwebheaders(userCookies);
            const body = new URLSearchParams({
                platform: 'android'
            });
            const response = await fetch(CONSTANTS.mangaClockInUrl, {
                method: 'POST',
                headers,
                body: body.toString()
            });
            const responseData = await response.json();
            return responseData
        } catch (error) {
            logger.error('[BILI-PLUGIN] 漫画签到失败:', error);
            return {
                code: -1,
                msg: '漫画签到失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }


    async addCoin(aid, userCookies, coin = 1, selectLike = 1) {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const params = {
                access_key: userCookies.access_token,
                aid: aid,
                appkey: appKey,
                avtype: 1,
                build: 8020300,
                c_locale: 'zh_CN',
                channel: 'yingyongbao',
                disable_rcmd: 0,
                from: 7,
                from_spmid: 'tm.recommend.0.0',
                goto: 'vertical_av',
                mobi_app: 'android',
                multiply: coin,
                platform: 'android',
                s_locale: 'zh_CN',
                select_like: selectLike,
                source: '',
                spmid: 'main.ugc-video-detail-vertical.0.0',
                statistics: JSON.stringify({
                    appId: 1,
                    platform: 3,
                    version: '8.2.0',
                    abtest: ''
                }),
                token: '',
                track_id: 'all_49.router-pegasus-1914948-cd87cf9bc-xvjrp.1737546540957.109',
                ts: ts,
                upid: 0
            };
            params.sign = appSign(params, appKey, appSecret)
            const response = await fetch(CONSTANTS.addCoinApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            })
            return await response.json()
        } catch (error) {
            logger.error('[BILI-PLUGIN] 投币视频失败:', error);
            return {
                code: -1,
                msg: '投币视频失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }


    async getFeed(userCookies) {
        try {
            const params = {
                access_key: userCookies.access_token || '114514',
                aid: "",
                appkey: "1d8b6e7d45233436",
                auto_play: "0",
                build: "8020300",
                bvid: "",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                cid: "",
                contain: "false",
                creative_id: "0",
                device_name: "2206123SC",
                disable_rcmd: "0",
                display_id: "1",
                epid: "0",
                feed_status: "0",
                fnval: "912",
                fnver: "0",
                force_host: "0",
                fourk: "1",
                from: "6",
                from_spmid: "main.homepage.avatar.0",
                goto: "",
                mobi_app: "android",
                network: "wifi",
                ogv_style: "0",
                platform: "android",
                player_net: "1",
                pull: "1",
                qn: "32",
                request_from: "1",
                s_locale: "zh_CN",
                spmid: "main.switch-mode.story.0",
                statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
                story_param: "",
                trackid: "",
                ts: Math.floor(Date.now() / 1000),
                video_mode: "1",
                voice_balance: "1"
            }
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.feed2ApiUrl + '?' + new URLSearchParams(params), {
                method: 'GET',
                headers: appheaders,
            })
            return await response.json()
        } catch (error) {
            logger.error('[BILI-PLUGIN] 获取推荐视频失败:', error);
            return {
                code: -1,
                msg: '获取推荐视频失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async getlivefeed(userCookies) {
        try {
            const params = {
                access_key: userCookies.access_token,
                actionKey: "appkey",
                appkey: "1d8b6e7d45233436",
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                device: "android",
                device_name: "2206123SC",
                disable_rcmd: "0",
                https_url_req: "0",
                is_refresh: "0",
                login_event: "1",
                mobi_app: "android",
                module_select: "0",
                network: "wifi",
                out_ad_name: "",
                page: "1",
                platform: "android",
                qn: "0",
                relation_page: "1",
                s_locale: "zh_CN",
                scale: "hdpi",
                statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
                ts: Math.floor(Date.now() / 1000),
                version: "8.2.0"
            };
            params.sign = appSign(params, appKey, appSecret)
            const response = await fetch(CONSTANTS.livefeedApiUrl + '?' + new URLSearchParams(params), {
                method: 'GET',
                headers: appheaders,
            })
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]获取用户关注主播开播状态失败', error);
            return {
                code: -1,
                msg: '获取用户关注主播开播状态失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async livesenddamu(userCookies, msg, roomid) {
        try {
            const params = {
                access_key: userCookies.access_token,
                actionKey: 'appkey',
                appkey: "1d8b6e7d45233436",
                build: '7750600',
                c_locale: 'zh_CN',
                channel: 'master',
                device: 'android',
                disable_rcmd: '0',
                mobi_app: 'android_i',
                platform: 'android',
                s_locale: 'zh_CN',
                statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
                ts: Math.floor(Date.now() / 1000),
            };
            params.sign = appSign(params, appKey, appSecret)
            const params2 = {
                data_extend: '{"from_launch_id":"1000280","from_session_id":"2c2e89476541bffb108cffcfaf67c473_5d929793-fdbf-4db0-bdcf-a790613593f5","live_key":"581850624722422072","sub_session_key":"581850624722422072sub_time:1740924315"}',
                bubble: '0',
                msg_type: '0',
                room_type: '0',
                live_status: 'live',
                launch_id: '1000280',
                reply_attr: '0',
                reply_mid: '0',
                jumpfrom: '24000',
                cid: roomid,
                msg: msg,
                rnd: '874725357',
                mode: '1',
                pool: '0',
                type: 'json',
                av_id: '-99998',
                color: '16777215',
                fontsize: '25',
                bussiness_extend: '{"broadcast_type":"0","stream_scale":"2","watch_ui_type":"2"}',
                flow_extend: '{"position":"1","s_position":"1","slide_direction":"-99998"}',
                jumpfrom_extend: '4',
                screen_status: '2',
                session_id: '2c2e89476541bffb108cffcfaf67c473_5d929793-fdbf-4db0-bdcf-a790613593f5',
                dm_type: '0',
                playTime: '0.0'
            }
            const response = await fetch(CONSTANTS.danmuApiUrl + '?' + new URLSearchParams(params), {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params2)
            })
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]发送弹幕失败', error);
            return {
                code: -1,
                msg: '发送弹幕失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async replyvideo(userCookies, aid, msg) {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const params = {
                access_key: userCookies.access_token,
                appkey: "1d8b6e7d45233436",
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                disable_rcmd: "0",
                from_spmid: "tm.recommend.0.0",
                goto: "vertical_av",
                has_vote_option: "false",
                message: msg,
                mobi_app: "android",
                oid: aid,
                ordering: "heat",
                plat: "2",
                platform: "android",
                s_locale: "zh_CN",
                scene: "main",
                spmid: "main.ugc-video-detail-vertical.0.0",
                statistics: "{\"appId\":1,\"platform\":3,\"version\":\"8.2.0\",\"abtest\":\"\"}",
                sync_to_dynamic: "false",
                track_id: "all_49.router-pegasus-1914948-cd87cf9bc-rhz8m.1737638175528.728",
                ts: ts,
                type: "1",
            }
            params.sign = appSign(params, appKey, appSecret)
            const response = await fetch(CONSTANTS.replyApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]评论视频失败', error);
            return {
                code: -1,
                msg: '评论视频失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async unfavvideo(userCookies, aid) {
        try {
            const ts = Math.floor(Date.now() / 1000)
            const params = {
                access_key: userCookies.access_token,
                appkey: appKey,
                build: 8020300,
                c_locale: 'zh_CN',
                channel: 'yingyongbao',
                disable_rcmd: 0,
                mobi_app: 'android',
                platform: 'android',
                rid: aid,
                s_locale: 'zh_CN',
                statistics: JSON.stringify({
                    appId: 1,
                    platform: 3,
                    version: '8.2.0',
                    abtest: ''
                }),
                ts: ts,
                type: 2
            }
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.unfavApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]取消收藏失败', error);
            return {
                code: -1,
                msg: '取消收藏失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async favvideo(userCookies, aid) {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const params = {
                access_key: userCookies.access_token,
                add_media_ids: "0",
                appkey: "1d8b6e7d45233436",
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                del_media_ids: "",
                disable_rcmd: "0",
                extra: {
                    item_id: aid,
                    from_spmid: "tm.recommend.0.0",
                    spmid: "main.ugc-video-detail-vertical.0.0",
                    track_id: "story_20.router-story-1901288-5ccc768c7f-g48sm.1737775288293.986",
                    goto: "vertical_av"
                },
                from: "",
                mobi_app: "android",
                platform: "android",
                resources: `${aid}:2`,
                s_locale: "zh_CN",
                statistics: {
                    appId: 1,
                    platform: 3,
                    version: "8.2.0",
                    abtest: ""
                },
                ts: ts
            };
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.favApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]收藏失败', error);
            return {
                code: -1,
                msg: '收藏失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async triplevideo(userCookies, aid) {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const params = {
                access_key: userCookies.access_token,
                aid: aid,
                appkey: appKey,
                build: 8020300,
                c_locale: 'zh_CN',
                channel: 'yingyongbao',
                disable_rcmd: 0,
                from: 7,
                from_spmid: 'tm.recommend.0.0',
                goto: 'vertical_av',
                mobi_app: 'android',
                platform: 'android',
                s_locale: 'zh_CN',
                source: 'view_vvoucher',
                spmid: 'main.ugc-video-detail-vertical.0.0',
                statistics: JSON.stringify({
                    appId: 1,
                    platform: 3,
                    version: '8.2.0',
                    abtest: ''
                }),
                token: '',
                track_id: 'all_49.router-pegasus-1914948-cd87cf9bc-rhz8m.1737638175528.728',
                ts: ts
            }
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.tripleUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]一键三连失败', error);
            return {
                code: -1,
                msg: '一键三连失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async dislikevideo(userCookies, aid) {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const params = {
                access_key: userCookies.access_token,
                aid: aid,
                appkey: "1d8b6e7d45233436",
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                disable_rcmd: "0",
                dislike: "0",
                from: "7",
                from_spmid: "tm.recommend.0.0",
                mobi_app: "android",
                platform: "android",
                s_locale: "zh_CN",
                spmid: "united.player-video-detail.0.0",
                statistics: "{\"appId\":1,\"platform\":3,\"version\":\"8.2.0\",\"abtest\":\"\"}",
                ts: ts
            }
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.dislikeApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            })
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]点踩视频失败', error);
            return {
                code: -1,
                msg: '点踩视频失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async likevideo(userCookies, aid, like = 1) {
        try {
            const params = {
                access_key: userCookies.access_token,
                aid: aid,
                appkey: appKey,
                build: '8020300',
                c_locale: 'zh_CN',
                channel: 'yingyongbao',
                disable_rcmd: '0',
                from: '7',
                from_spmid: 'tm.recommend.0.0',
                goto: 'vertical_av',
                like: like,
                mobi_app: 'android',
                ogv_type: '0',
                platform: 'android',
                s_locale: 'zh_CN',
                source: 'view_vvoucher',
                spmid: 'main.ugc-video-detail-vertical.0.0',
                statistics: JSON.stringify({
                    appId: 1,
                    platform: 3,
                    version: '8.2.0',
                    abtest: ''
                }),
                token: '',
                track_id: 'all_49.router-pegasus-1914948-cd87cf9bc-xvjrp.1737546540957.109',
                ts: Math.floor(Date.now() / 1000),
            };

            params.sign = appSign(params, appKey, appSecret);

            const response = await fetch(CONSTANTS.likeApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]点赞视频失败', error);
            return {
                code: -1,
                msg: '点赞视频失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async liveclick(userCookies, roomid, upid, click = 10) {
        try {
            const params = {
                access_key: userCookies.access_token,
                actionKey: "appkey",
                anchor_id: upid,
                appkey: "1d8b6e7d45233436",
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                click_time: click,
                device: "android",
                disable_rcmd: "0",
                mobi_app: "android",
                platform: "android",
                room_id: roomid,
                s_locale: "zh_CN",
                statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
                ts: Math.floor(Date.now() / 1000),
                uid: userCookies.DedeUserID,
                version: "8.2.0"
            };

            params.sign = appSign(params, appKey, appSecret);
            const body = new URLSearchParams(params).toString();
            const response = await fetch(CONSTANTS.livelikeApiUrl, {
                method: 'POST',
                headers: appheaders,
                body
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]直播间点赞失败', error);
            return {
                code: -1,
                msg: '直播间点赞失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async liveshare(userCookies, roomid) {
        try {
            const params = {
                access_key: userCookies.access_token,
                actionKey: "appkey",
                appkey: "1d8b6e7d45233436",
                build: "7750600",
                c_locale: "zh_CN",
                channel: "master",
                device: "android",
                disable_rcmd: "0",
                interact_type: "3",
                mobi_app: "android_i",
                platform: "android",
                roomid: roomid,
                s_locale: "zh_CN",
                statistics: "{\"appId\":1,\"platform\":3,\"version\":\"8.2.0\",\"abtest\":\"\"}",
                ts: Math.floor(Date.now() / 1000),
                version: "8.2.0"
            };
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch('https://api.live.bilibili.com/xlive/app-room/v1/index/TrigerInteract', {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]直播间分享失败', error);
            return {
                code: -1,
                msg: '直播间分享失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }

    async relationup(userCookies, mid, act, src = '11') {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const params = {
                access_key: userCookies.access_token,
                appkey: "1d8b6e7d45233436",
                act: act,
                build: "8020300",
                c_locale: "zh_CN",
                channel: "yingyongbao",
                disable_rcmd: "0",
                fid: mid,
                mobi_app: "android",
                platform: "android",
                re_src: src,
                s_locale: "zh_CN",
                statistics: '{"appId":1,"platform":3,"version":"8.2.0","abtest":""}',
                ts: ts
            };
            params.sign = appSign(params, appKey, appSecret);
            const response = await fetch(CONSTANTS.relaApiUrl, {
                method: 'POST',
                headers: appheaders,
                body: new URLSearchParams(params).toString()
            });
            return await response.json()
        } catch (error) {
            logger.error('[Bili-Plugin]用户关系操作失败', error);
            return {
                code: -1,
                msg: '用户关系操作失败(可能是你IP被拉黑)',
                error: error
            }
        }
    }
}

export default new BApi()