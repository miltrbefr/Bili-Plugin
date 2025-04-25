import __ from "data:text/javascript;charset=utf-8,export%20default%20%5B'PqdSkJZ5PcaQrKjIoZ%2BjQA%3D%3D'%2C'N6Z5HAibyfuT1lBT%2BIRCjA%3D%3D'%2C'fDnde3%2FebYIEuIrsjlIDCw%3D%3D'%2C'jJqhF5v7eKE81GCy%2BdFQ%2FA%3D%3D'%2C'Eej%2BPtKxUMl%2B9c6jM2vegg%3D%3D'%2C'CA%2BuFgJZNsGZC2huxIg17g%3D%3D'%2C'DruDRy7U2xPifujfc7wb2g%3D%3D'%2C'MwfcZUKPGbP13Wk2L38dAw%3D%3D'%2C'huyS2gwBfVNU2oXVyAl9pg%3D%3D'%2C'puDsORQEYEsybrQsrcUt7Q%3D%3D'%2C'bQa1RQX2LvHOmb%2BgzZa%2Bfg%3D%3D'%5D.map(item%20%3D%3E%20Buffer.from(item%2C%20'base64').toString('hex'))"
import {createHash} from 'node:crypto';
import Qrcode from 'qrcode';
import sharp from 'sharp';
import config from '../Config.js';
import { HttpsProxyAgent } from "https-proxy-agent"
let pollMap = {}
let TempE = {}
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
    userinfoApiUrl: 'https://api.vc.bilibili.com/x/im/user_infos',
    QrCodeURL: 'https://passport.snm0516.aisee.tv/x/passport-tv-login/qrcode/auth_code',
    pollCodeURL: 'https://passport.snm0516.aisee.tv/x/passport-tv-login/qrcode/poll'
};

const appKey = '1d8b6e7d45233436'
const appSecret = '560c52ccd288fed045859ed18bffd973'
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

    async getloginqrcode(key, e) {
        try {
            const code = await this.getQrCode();
            const auth_code = code.data.auth_code;
            pollMap[key] = auth_code;
            TempE[key] = e.logFnc;
            const url = code.data.url;
            const avatarUrl = await e.bot.pickFriend(e.user_id).getAvatarUrl();
            function getRandomColor(baseColor = [255, 145, 164], variation = 8) {
                const [baseR, baseG, baseB] = baseColor;
                const r = Math.max(0, Math.min(baseR + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0');
                const g = Math.max(0, Math.min(baseG + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0');
                const b = Math.max(0, Math.min(baseB + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0');
                return `#${r}${g}${b}`;
            }
            const qrBuffer = await Qrcode.toBuffer(url, {
                color: {
                    dark: '#000000',
                    light: getRandomColor()
                },
                margin: 1,
                scale: 10,
                width: 400,
                height: 400
            });

            let avatarImage;
            try {
                const response = await fetch(avatarUrl);
                if (!response.ok) throw new Error('Failed to fetch avatar');
                const arrayBuffer = await response.arrayBuffer();
                avatarImage = Buffer.from(arrayBuffer);
            } catch (error) {
                logger.error('[BILI-PLUGIN]无法获取用户头像', error);
                avatarImage = null;
            }
            const compositeImages = [{ input: qrBuffer }];
            if (avatarImage) {
                const processedAvatar = await sharp(avatarImage)
                    .resize(120, 120)
                    .toBuffer();
                
                compositeImages.push({
                    input: processedAvatar,
                    left: 140,
                    top: 140,
                    blend: 'over'
                });
            }
            const finalImage = await sharp({
                    create: {
                        width: 400,
                        height: 400,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    }
                })
                .composite(compositeImages)
                .png()
                .toBuffer()
            const base64String = finalImage.toString('base64');
            logger.mark(`${e.logFnc} ${logger.blue(JSON.stringify(code))}`)
            return {
                code: 0,
                msg: "ok",
                data: {
                    base64: `base64://${base64String}`,
                    auth_code: auth_code,
                    loginurl: url
                }
            }
        } catch (error) {
            logger.error('[BILI-PLUGIN] 获取登录二维码失败', error);
            return {
                code: -1,
                msg: error.message || "QR code generation failed",
                data: null
            };
        }
    }

    async pollQrCode(key) {
        let auth_code = pollMap[key]
        const params = {
            auth_code,
            local_id: 0,
            ts: Math.floor(Date.now() / 1000),
        }
        const qrCodeStatus = await this._fetchRequest({
            url: CONSTANTS.pollCodeURL,
            method: 'POST',
            params,
            extraHeaders: {
              'referer': 'https://www.bilibili.com/'
            },
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
        if (qrCodeStatus.code === 0 && qrCodeStatus.data && qrCodeStatus.data.access_token) {
            let logFnc = TempE[key]
            logger.mark(`${logFnc} ${logger.blue(JSON.stringify(qrCodeStatus))}`)
            const accessToken = qrCodeStatus.data.access_token;
            const refreshToken = qrCodeStatus.data.refresh_token;
            const mid = qrCodeStatus.data.token_info.mid;
            const expiresIn = qrCodeStatus.data.token_info.expires_in;
            const cookieNames = ['SESSDATA', 'bili_jct', 'DedeUserID', 'sid', 'DedeUserID__ckMd5'];
            const cookieString = qrCodeStatus.data.cookie_info.cookies
                .filter(cookie => cookieNames.includes(cookie.name))
                .map(cookie => `${cookie.name}=${cookie.value}`)
                .concat(`access_key=${accessToken}`)
                .join('; ');
            const responseData = {
                code: 0,
                msg: "ok",
                data: {
                    mid,
                    expires_in: expiresIn,
                    cookie: cookieString,
                    refresh_token: refreshToken
                }
            }
            return responseData
        } else {
            return qrCodeStatus
        }
    }

    async isTRSs() {
      return __ || []
    }
    
    async getQrCode() {
        const params = {
            local_id: 0,
            ts: Math.floor(Date.now() / 1000),
        }
        return this._fetchRequest({
            url: CONSTANTS.QrCodeURL,
            method: 'POST',
            params,
            extraHeaders: {
              'referer': 'https://www.bilibili.com/'
              },
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
    }

    async livesenddamu(userCookies, msg, roomid) {
        const baseParams = {
          access_key: userCookies.access_token,
          actionKey: 'appkey',
          appkey: appKey,
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
    
        const bodyParams = {
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
        };
    
        return this._fetchRequest({
          url: CONSTANTS.danmuApiUrl,
          method: 'POST',
          params: baseParams,
          bodyParams: bodyParams,
          extraHeaders: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      }

      async refresh(accessKey,refresh_token) {
        const params = {
            access_key: accessKey,
            refresh_token: refresh_token,
            ts: Math.floor(Date.now() / 1000),
        }

        return this._fetchRequest({
            url: CONSTANTS.refreshUrl,
            method: 'POST',
            params,
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
    }
    
     async _fetchRequest({
        url,
        method = 'GET',
        params = {},
        bodyParams = null,
        signKey = appKey,
        signSecret = appSecret,
        needSign = true,
        extraHeaders = {}
      }) {
        try {
          const finalParams = { ...params }
          if (needSign) {
            finalParams.appkey = signKey;
            const signParams = new URLSearchParams(finalParams);
            signParams.sort();
            finalParams.sign = createHash('md5')
              .update(signParams.toString() + signSecret)
              .digest('hex');
          }
          const headers = { ...appheaders, ...extraHeaders };
          const requestOptions = {
            method,
            headers,
            body: null
          }
          
          if (config.switchProxy) {
            const agent = new HttpsProxyAgent(config.proxyAddress);
            agent.timeout = 5000
            agent.on('error', (err) => {
              logger.error('[Bili-Plugin] 代理连接错误:', err);
            });
            requestOptions.agent = agent
            logger.debug(`[Bili-Plugin] 代理已启用 → ${config.proxyAddress}`);
          }

          if (method === 'POST') {
            requestOptions.body = new URLSearchParams(bodyParams || finalParams).toString();
          }
    
          const urlObj = new URL(url);
          urlObj.search = new URLSearchParams(finalParams).toString();
    
          const response = await fetch(urlObj.toString(), requestOptions);
          return await response.json();
        } catch (error) {
          logger.error('[Bili-Plugin]请求B站API失败:', error)
          return {
            code: -1,
            msg: '请求B站API失败(可能是你IP被拉黑)',
            error: error.message
          };
        }
      }
    

    async getupinfo(mids, userCookies) {
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
            return this._fetchRequest({
                url: CONSTANTS.userinfoApiUrl,
                method: 'GET',
                params,
              })
    }

    async myinfo(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.myinfoApiUrl,
            method: 'GET',
            extraHeaders: headers,
            needSign: false
        });
    }
    
    async myinfo2(userCookies) {
        const params = {
            access_key: userCookies.access_token,
            build: "8020300",
            buvid: "XU4C85241BF18FBC9C5C20CA1D08F38937711",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            disable_rcmd: "0",
            local_id: "XU4C85241BF18FBC9C5C20CA1D08F38937711",
            mobi_app: "android",
            platform: "android",
            s_locale: "zh_CN",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
        };
    
        return this._fetchRequest({
            url: CONSTANTS.info2ApiUrl,
            method: 'GET',
            params,
            signKey: "783bbb7264451d82",
            signSecret: "2653583c8873dea268ab9386918b1d65"
        })
    }

    async exp_log2(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.explog2ApiUrl,
            method: 'GET',
            extraHeaders: headers,
            needSign: false
        });
    }
    
    async space(mid, userCookies) {
        const params = {
            access_key: userCookies.access_token || '114514',
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
    
        return this._fetchRequest({
            url: CONSTANTS.spaceApiUrl,
            method: 'GET',
            params
        });
    }

    async shareVideo(aid, userCookies) {
        const params = {
            access_key: userCookies.access_token,
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
        };
    
        return this._fetchRequest({
            url: CONSTANTS.shareApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    async reportWatch(aid, cid, userCookies, time = Math.floor(Math.random() * 91) + 10) {
        const watchTime = Math.min(Math.max(time, 10), 100);
        
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
            cid: cid,
            progress: watchTime,
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
    
        return this._fetchRequest({
            url: CONSTANTS.reportApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    async getwebheaders(userCookies) {
        return {
            'User-Agent': 'Mozilla/5.0 BiliDroid/8.2.0 (bbcallen@gmail.com) os/android model/24031PN0DC mobi_app/android build/8020300 channel/yingyongbao innerVer/8020300 osVer/12 network/2',
            'Host': 'api.bilibili.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `SESSDATA=${userCookies.SESSDATA}`,
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': 'https://www.bilibili.com/',
            'Origin': 'https://www.bilibili.com'
        };
    }

    async getExperience(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.experienceApiUrl,
            method: 'POST',
            bodyParams: { csrf: userCookies.csrf },
            extraHeaders: headers,
            needSign: false
        });
    }
    
    async getCoupons(userCookies, type = 1) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.privUrl,
            method: 'POST',
            bodyParams: {
                type: String(type),
                csrf: userCookies.csrf
            },
            extraHeaders: headers,
            needSign: false
        });
    }
    
    async shareManhua(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.mangaShareUrl,
            method: 'POST',
            bodyParams: { platform: 'android' },
            extraHeaders: headers,
            needSign: false
        });
    }
    
    async signManhua(userCookies) {
        const headers = await this.getwebheaders(userCookies);
        return this._fetchRequest({
            url: CONSTANTS.mangaClockInUrl,
            method: 'POST',
            bodyParams: { platform: 'android' },
            extraHeaders: headers,
            needSign: false
        });
    }

    async addCoin(aid, userCookies, coin = 1, selectLike = 1) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
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
            ts: Math.floor(Date.now() / 1000),
            upid: 0
        };
    
        return this._fetchRequest({
            url: CONSTANTS.addCoinApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    
    async getFeed(userCookies) {
        const params = {
            access_key: userCookies.access_token || '114514',
            aid: "",
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
        };
    
        return this._fetchRequest({
            url: CONSTANTS.feed2ApiUrl,
            method: 'GET',
            params
        });
    }

    async getlivefeed(userCookies) {
        const params = {
            access_key: userCookies.access_token,
            actionKey: "appkey",
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
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
            version: "8.2.0"
        };
    
        return this._fetchRequest({
            url: CONSTANTS.livefeedApiUrl,
            method: 'GET',
            params
        });
    }
    
    async replyvideo(userCookies, aid, msg) {
        const params = {
            access_key: userCookies.access_token,
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
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            sync_to_dynamic: "false",
            track_id: "all_49.router-pegasus-1914948-cd87cf9bc-rhz8m.1737638175528.728",
            ts: Math.floor(Date.now() / 1000),
            type: "1"
        };
    
        return this._fetchRequest({
            url: CONSTANTS.replyApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    async unfavvideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
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
            ts: Math.floor(Date.now() / 1000),
            type: 2
        };
    
        return this._fetchRequest({
            url: CONSTANTS.unfavApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    
    async favvideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
            add_media_ids: "0",
            build: "8020300",
            c_locale: "zh_CN",
            channel: "yingyongbao",
            del_media_ids: "",
            disable_rcmd: "0",
            extra: JSON.stringify({
                item_id: aid,
                from_spmid: "tm.recommend.0.0",
                spmid: "main.ugc-video-detail-vertical.0.0",
                track_id: "story_20.router-story-1901288-5ccc768c7f-g48sm.1737775288293.986",
                goto: "vertical_av"
            }),
            from: "",
            mobi_app: "android",
            platform: "android",
            resources: `${aid}:2`,
            s_locale: "zh_CN",
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.favApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    
    async triplevideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
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
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.tripleUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    
    async dislikevideo(userCookies, aid) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
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
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.dislikeApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    
    async likevideo(userCookies, aid, like = 1) {
        const params = {
            access_key: userCookies.access_token,
            aid: aid,
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
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.likeApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    async liveclick(userCookies, roomid, upid, click = 10) {
        const params = {
            access_key: userCookies.access_token,
            actionKey: "appkey",
            anchor_id: upid,
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
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
            uid: userCookies.DedeUserID,
            version: "8.2.0"
        };
    
        return this._fetchRequest({
            url: CONSTANTS.livelikeApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    
    async liveshare(userCookies, roomid) {
        const params = {
            access_key: userCookies.access_token,
            actionKey: "appkey",
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
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000),
            version: "8.2.0"
        };
    
        return this._fetchRequest({
            url: 'https://api.live.bilibili.com/xlive/app-room/v1/index/TrigerInteract',
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    
    async relationup(userCookies, mid, act, src = '11') {
        const params = {
            access_key: userCookies.access_token,
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
            statistics: JSON.stringify({
                appId: 1,
                platform: 3,
                version: "8.2.0",
                abtest: ""
            }),
            ts: Math.floor(Date.now() / 1000)
        };
    
        return this._fetchRequest({
            url: CONSTANTS.relaApiUrl,
            method: 'POST',
            params,
            extraHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
}

export default new BApi()