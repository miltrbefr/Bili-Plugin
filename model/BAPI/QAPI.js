import moment from 'moment';

function bkn(skey) {
    let hash = 5381;
    for (let i = 0; i < skey.length; i++) {
        hash += (hash << 5 & 2147483647) + skey.charCodeAt(i) & 2147483647;
        hash &= 2147483647;
    }
    return hash;
}


class QQApi {
    constructor() {}

    async DailygetsubType(uin, skey, pskey) {
        try {
            let key = await redis.get('bili:DailygetsubType')
            if (key) return key
            const bknValue = bkn(skey)
            const base_url = `https://ti.qq.com/hybrid-h5/api/json/daily_attendance/SignInMainPage?bkn=${bknValue}`
            const data = JSON.stringify({
                "uin": `${uin}`,
                "QYY": "2",
                "qua": "V1_AND_SQ_9.1.31_8542_YYB_D",
                "loc": {},
                "mpExtend": {
                    "tianshuAdsReq": "{\"app\":\"QQ\",\"os\":\"Android\",\"version\":\"9.1.31\",\"imei\":\"\"}"
                }
            });

            const headers = new Headers({
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Linux; Android 12; AOSP Build/SQ1A.220205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 V1_AND_SQ_9.1.31_8542_YYB_D QQ/9.1.31.22255 NetType/WIFI WebP/0.4.1 AppId/537262754 Pixel/1600 StatusBarHeight/36 SimpleUISwitch/0 QQTheme/1000 StudyMode/0 CurrentMode/0 CurrentFontScale/1.0 GlobalDensityScale/1.0 AllowLandscape/true InMagicWin/0",
                "X-Requested-With": "com.tencent.mobileqq",
                "Content-Length": data.length.toString(),
                "Referer": "https://ti.qq.com/signin/public/index.html",
                "Host": "ti.qq.com",
                "Origin": "https://ti.qq.com",
            });

            const cookieUin = String(uin).startsWith('o') ? String(uin) : `o${String(uin)}`;
            headers.set("Cookie", `uin=${cookieUin}; skey=${skey}; p_skey=${pskey}; p_uin=${cookieUin}`);
            const options = {
                method: 'POST',
                headers: headers,
                body: data
            };
            const response = await fetch(base_url, options)
            const result = await response.json()
            const vecSignInfo = result.data.vecSignInfo.value
            const target = vecSignInfo.find(item => item.type === 4)
            const subType = target.subType
            const cd = Math.floor((moment().endOf('day').valueOf() - Date.now()) / 1000);
            await redis.set(`bili:DailygetsubType`, subType, {
                EX: cd
            })
            return subType
        } catch (error) {
            logger.error('[BILI-PLUGIN]收集卡', error)
            return null
        }
    }

    async Dailyfriend(uin, skey, pskey) {
        try {
            let subType = await redis.get('bili:DailygetsubType')
            if (!subType) subType = await this.DailygetsubType(uin, skey, pskey)
            if (!subType) return `无法获取日签卡类型`

            const signInUrl = "https://ti.qq.com/hybrid-h5/api/json/daily_attendance/SignIn";
            const postData = JSON.stringify({
                "uin": `${uin}`,
                "type": "4",
                "subType": `${subType}`,
                "qua": "V1_AND_SQ_9.1.31_8542_YYB_D",
            });

            const signInHeaders = new Headers({
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Linux; Android 12; AOSP Build/SQ1A.220205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 V1_AND_SQ_9.1.31_8542_YYB_D QQ/9.1.31.22255 NetType/WIFI WebP/0.4.1 AppId/537262754 Pixel/1600 StatusBarHeight/36 SimpleUISwitch/0 QQTheme/1000 StudyMode/0 CurrentMode/0 CurrentFontScale/1.0 GlobalDensityScale/1.0 AllowLandscape/true InMagicWin/0",
            });

            const signInCookieUin = String(uin).startsWith('o') ? String(uin) : `o${String(uin)}`;
            signInHeaders.set("Cookie", `uin=${signInCookieUin}; skey=${skey}; p_skey=${pskey}; p_uin=${signInCookieUin}`);

            const signInOptions = {
                method: 'POST',
                headers: signInHeaders,
                body: postData
            };

            const signInResponse = await fetch(signInUrl, signInOptions);
            const signInResult = await signInResponse.json();
            if (signInResult.ret === 0 && signInResult.msg === 'success!') {
                return {
                    code: 0,
                    uin: uin,
                    msg: `${uin} 日签卡收集卡签到成功`
                }
            } else {
                return {
                    code: -1,
                    uin: uin,
                    msg: `今日已签`
                }
            }
        } catch (error) {
            logger.error('[BILI-PLUGIN]收集卡', error)
            return {
                code: -1,
                uin: uin,
                msg: `请求失败,可能你被ban了`
            }
        }
    }

    async Dailyfriendshare(uin, skey, pskey, friend) {
        try {
            const url = `https://ti.qq.com/hybrid-h5/api/json/daily_attendance/ShareFriend`
            const postData = JSON.stringify({
                "friendUin": friend
            })
            const signInHeaders = new Headers({
                "Content-Type": "application/json",
                "Content-Length": postData.length.toString(),
                "Accept": "application/json, text/plain, */*",
                'X-Requested-With': 'com.tencent.mobileqq',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; AOSP Build/SQ1A.220205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 V1_AND_SQ_9.1.31_8542_YYB_D QQ/9.1.31.22255 NetType/WIFI WebP/0.4.1 AppId/537262754 Pixel/1600 StatusBarHeight/36 SimpleUISwitch/0 QQTheme/1000 StudyMode/0 CurrentMode/0 CurrentFontScale/1.0 GlobalDensityScale/1.0 AllowLandscape/true InMagicWin/0',
            });

            const signInCookieUin = String(uin).startsWith('o') ? String(uin) : `o${String(uin)}`;
            signInHeaders.set("Cookie", `uin=${signInCookieUin}; skey=${skey}; p_skey=${pskey}; p_uin=${signInCookieUin}`);

            const signInOptions = {
                method: 'POST',
                headers: signInHeaders,
                body: postData
            };

            const signInResponse = await fetch(url, signInOptions);
            const signInResult = await signInResponse.json();

            if (signInResult.ret === 0) {
                return {
                    code: 0,
                    uin: uin,
                    msg: `${uin} 向好友 ${friend} 日签卡分享成功(放心这是假分享，好友收不到但是可以增加收集卡抽取次数)`
                }
            } else {
                return {
                    code: -1,
                    uin: uin,
                    msg: `今日已签`
                }
            }
        } catch (error) {
            logger.error('[BILI-PLUGIN]收集卡分享', error)
            return {
                code: -1,
                uin: uin,
                msg: `请求失败,可能你被ban了`
            }
        }
    }

    async DailySignCard1(uin, skey, p_skey) {
        try {
            const signInUrl = "https://ti.qq.com/hybrid-h5/api/json/daily_attendance/SignIn";
            const postData = JSON.stringify({
                "uin": `${uin}`,
                "type": "1",
                "qua": "V1_AND_SQ_9.1.31_8542_YYB_D",
                "mpExtend": {
                    "tianshuAdsReq": "{\"app\":\"QQ\",\"os\":\"Android\",\"version\":\"9.1.31\",\"imei\":\"\"}"
                }
            });

            const signInHeaders = new Headers({
                "Content-Type": "application/json",
                "Content-Length": postData.length.toString(),
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Linux; Android 12; AOSP Build/SQ1A.220205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 V1_AND_SQ_9.1.31_8542_YYB_D QQ/9.1.31.22255 NetType/WIFI WebP/0.4.1 AppId/537262754 Pixel/1600 StatusBarHeight/36 SimpleUISwitch/0 QQTheme/1000 StudyMode/0 CurrentMode/0 CurrentFontScale/1.0 GlobalDensityScale/1.0 AllowLandscape/true InMagicWin/0",
            });

            const signInCookieUin = String(uin).startsWith('o') ? String(uin) : `o${String(uin)}`;
            signInHeaders.set("Cookie", `uin=${signInCookieUin}; skey=${skey}; p_skey=${p_skey}; p_uin=${signInCookieUin}`);

            const signInOptions = {
                method: 'POST',
                headers: signInHeaders,
                body: postData
            };

            const signInResponse = await fetch(signInUrl, signInOptions);
            const signInResult = await signInResponse.json();

            if (signInResult.ret === 0 && signInResult.msg === 'success!') {
                return {
                    code: 0,
                    uin: uin,
                    msg: `${uin} 日签卡签到成功`
                }
            } else {
                return {
                    code: -1,
                    uin: uin,
                    msg: `今日已签`
                }
            }
        } catch (error) {
            logger.error('[BILI-PLUGIN]普通日签卡', error)
            return {
                code: -1,
                uin: uin,
                msg: `请求失败,可能你被ban了`
            }
        }
    }

    async DailySignCard2(uin, skey, p_skey) {
        try {
            const signInUrl = "https://ti.qq.com/hybrid-h5/api/json/daily_attendance/SignIn";
            const postData = JSON.stringify({
                "uin": `${uin}`,
                "type": "2",
                "qua": "V1_AND_SQ_9.1.31_8542_YYB_D",
                "mpExtend": {
                    "tianshuAdsReq": "{\"app\":\"QQ\",\"os\":\"Android\",\"version\":\"9.1.31\",\"imei\":\"\"}"
                }
            });

            const signInHeaders = new Headers({
                "Content-Type": "application/json",
                "Content-Length": postData.length.toString(),
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Linux; Android 12; AOSP Build/SQ1A.220205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 V1_AND_SQ_9.1.31_8542_YYB_D QQ/9.1.31.22255 NetType/WIFI WebP/0.4.1 AppId/537262754 Pixel/1600 StatusBarHeight/36 SimpleUISwitch/0 QQTheme/1000 StudyMode/0 CurrentMode/0 CurrentFontScale/1.0 GlobalDensityScale/1.0 AllowLandscape/true InMagicWin/0",
            });

            const signInCookieUin = String(uin).startsWith('o') ? String(uin) : `o${String(uin)}`;
            signInHeaders.set("Cookie", `uin=${signInCookieUin}; skey=${skey}; p_skey=${p_skey}; p_uin=${signInCookieUin}`);

            const signInOptions = {
                method: 'POST',
                headers: signInHeaders,
                body: postData
            };

            const signInResponse = await fetch(signInUrl, signInOptions);
            const signInResult = await signInResponse.json();

            if (signInResult.ret === 0 && signInResult.msg === 'success!') {
                return {
                    code: 0,
                    uin: uin,
                    msg: `${uin} 晚安卡签到成功`
                }
            } else {
                return {
                    code: -1,
                    uin: uin,
                    msg: `今日已签`
                }
            }
        } catch (error) {
            logger.error('[BILI-PLUGIN]晚安卡', error)
            return {
                code: -1,
                uin: uin,
                msg: `请求失败,可能你被ban了`
            }
        }
    }


    async DailySignCard3(uin, skey, p_skey) {
        try {
            const bknValue = bkn(skey);
            const signInUrl = `https://ti.qq.com/qbox/trpc/SignIn?bkn=${bknValue}`

            const signInHeaders = new Headers({
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Linux; Android 12; AOSP Build/SQ1A.220205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 V1_AND_SQ_9.1.31_8542_YYB_D QQ/9.1.31.22255 NetType/WIFI WebP/0.4.1 AppId/537262754 Pixel/1600 StatusBarHeight/36 SimpleUISwitch/0 QQTheme/1000 StudyMode/0 CurrentMode/0 CurrentFontScale/1.0 GlobalDensityScale/1.0 AllowLandscape/true InMagicWin/0",
            });

            const signInCookieUin = String(uin).startsWith('o') ? String(uin) : `o${String(uin)}`;
            signInHeaders.set("Cookie", `uin=${signInCookieUin}; skey=${skey}; p_skey=${p_skey}; p_uin=${signInCookieUin}`);

            const signInOptions = {
                method: 'GET',
                headers: signInHeaders
            };

            const signInResponse = await fetch(signInUrl, signInOptions);
            const signInResult = await signInResponse.json();

            if (signInResult.errcode === 0) {
                return {
                    code: 0,
                    uin: uin,
                    msg: `${uin} 每日Q崽签到成功:${signInResult.data.wording} `
                }
            } else {
                return {
                    code: -1,
                    uin: uin,
                    msg: `今日已签`
                }
            }
        } catch (error) {
            logger.error('[BILI-PLUGIN]每日Q崽', error)
            return {
                code: -1,
                uin: uin,
                msg: `请求失败,可能你被ban了`
            }
        }
    }

    async DailySignCard4(uin, skey, p_skey) {
        try {
            const bknValue = bkn(skey);
            const signInUrl = `https://ti.qq.com/qqsignin/mindjar/trpc/WriteMindJar?bkn=${bknValue}`

            const signInHeaders = new Headers({
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Linux; Android 12; AOSP Build/SQ1A.220205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 V1_AND_SQ_9.1.31_8542_YYB_D QQ/9.1.31.22255 NetType/WIFI WebP/0.4.1 AppId/537262754 Pixel/1600 StatusBarHeight/36 SimpleUISwitch/0 QQTheme/1000 StudyMode/0 CurrentMode/0 CurrentFontScale/1.0 GlobalDensityScale/1.0 AllowLandscape/true InMagicWin/0",
            });

            const signInCookieUin = String(uin).startsWith('o') ? String(uin) : `o${String(uin)}`;
            signInHeaders.set("Cookie", `uin=${signInCookieUin}; skey=${skey}; p_skey=${p_skey}; p_uin=${signInCookieUin}`);

            const signInOptions = {
                method: 'GET',
                headers: signInHeaders
            };

            const signInResponse = await fetch(signInUrl, signInOptions);
            const signInResult = await signInResponse.json();

            if (signInResult.errcode === 0) {
                return {
                    code: 0,
                    uin: uin,
                    msg: `${uin} 心事罐签到成功`
                }
            } else {
                return {
                    code: -1,
                    uin: uin,
                    msg: `今日已签`
                }
            }
        } catch (error) {
            logger.error('[BILI-PLUGIN]心事罐签到', error)
            return {
                code: -1,
                uin: uin,
                msg: `请求失败,可能你被ban了`
            }
        }
    }

}

export default new QQApi()