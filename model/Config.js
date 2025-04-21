import YAML from 'yaml';
import fs from 'fs';
import {
    pluginRoot
} from '../model/constant.js';

class Config {
    constructor() {
        this.cache = null;
        this.filePath = `${pluginRoot}/config/config.yaml`;
        this.watcher = null;
        this.watcherTimeout = null;
        this.checkAndCreateDefaultConfig();
        this.loadConfig();
        this.startWatching();
    }

    startWatching() {
        if (this.watcher) {
            this.watcher.close();
        }

        try {
            this.watcher = fs.watch(this.filePath, (eventType) => {
                if (eventType === 'change') {
                    clearTimeout(this.watcherTimeout);
                    this.watcherTimeout = setTimeout(() => {
                        logger.mark(`[BILI PLUGIN] 检测到配置文件变更，正在重新假加载...`);
                        this.checkAndCreateDefaultConfig(); 
                        this.loadConfig();
                        logger.mark(`[BILI PLUGIN] 配置假重载完成`);
                    }, 500);
                }
            });

            this.watcher.on('error', (error) => {
                logger.error(`[BILI PLUGIN] 配置文件监听错误: ${error}`);
                logger.mark(`[BILI PLUGIN] 尝试在5秒后重新建立监听...`);
                setTimeout(() => this.startWatching(), 5000);
            });

        } catch (error) {
            logger.error(`[BILI PLUGIN] 初始化文件监听失败: ${error}`);
        }
    }

    loadYAML(filePath) {
        try {
            return YAML.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (error) {
            logger.error(`[BILI PLUGIN] 读取 ${filePath} 失败`, error);
            return null;
        }
    }

    saveConfig(filePath, data) {
        try {
            fs.writeFileSync(filePath, YAML.stringify(data));
            logger.info(`[BILI PLUGIN] 写入 ${filePath} 成功`);
            return true;
        } catch (error) {
            logger.error(`[BILI PLUGIN] 写入 ${filePath} 失败`, error);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    checkAndCreateDefaultConfig() {
        if (!fs.existsSync(this.filePath)) {
            const defaultConfig = {
                Enable_SignApi: false,
                Enable_LoginApi: false,
                signApi: "http://113.44.131.92:2536/bili",
                loginApi: "http://113.44.131.92:3333/bili",
                switchProxy: false,
                proxyAddress: 'http://127.0.0.1:7890',
                cron: this.generateCronExpression(),
                livecron: this.generateCronlive(),
                QQDaily: this.generateCronluckyword() || this.generateCronExpression(),
                luckywordcron: this.generateCronluckyword(),
                festivalpush: this.generateCronfestival(),
                yiyan: "http://113.44.131.92:3333/text?wb=yy&type=text",
                totalApi: "http://113.44.131.92:2536/bili",
                baoshiapi: "http://113.44.131.92:3333/bs/zdbs",
                Switchjx: true,
                SESSDATA: '这里可以填写默认解析ck(仅SESSDATA字段即可)，用于解析视频(没有哔站登录的用户，已登录的用户使用自己的)，下面的配置是最大视频发送大小/MB',
                maxVideoSizeMB: '15',
                isluckywordBots: [],
                isviplists: [],
                luckywordwhites: [],
                luckywordblacks: [],
                totalbody: [],
                festivalgroup: [],
                baoshigroup: [],
                whoisMyWifecdTime: 300,
                whoisMyWifecacheTime: 3600,
                whoisMyWifemaxMembers: 5,
                Authorization: 'Bearer <access_token>',
                sendbutton: true,
                buttonType: ['0','1','3','4'],
                QQBotsendlink: true,
                Napsendtext: false,
            };
            this.saveConfig(this.filePath, defaultConfig);
        } else {
            let currentConfig = this.loadYAML(this.filePath);
            const defaultConfig = {
                Enable_SignApi: currentConfig?.Enable_SignApi || false,
                Enable_LoginApi: currentConfig?.Enable_LoginApi || false,
                signApi: currentConfig?.signApi || "http://113.44.131.92:2536/bili",
                loginApi: currentConfig?.loginApi || "http://113.44.131.92:3333/bili",
                switchProxy: currentConfig?.switchProxy || false,
                proxyAddress: currentConfig?.proxyAddress || 'http://127.0.0.1:7890',
                cron: currentConfig?.cron || this.generateCronExpression(),
                livecron: currentConfig?.livecron || this.generateCronlive(),
                QQDaily: currentConfig?.QQDaily || this.generateCronluckyword() || this.generateCronExpression(),
                luckywordcron: currentConfig?.luckywordcron || this.generateCronluckyword(),
                festivalpush: currentConfig?.festivalpush || this.generateCronfestival(),
                yiyan: currentConfig?.yiyan || "http://113.44.131.92:3333/text?wb=yy&type=text",
                totalApi: currentConfig?.totalApi || "http://113.44.131.92:2536/bili",
                baoshiapi: currentConfig?.baoshiapi || "http://113.44.131.92:3333/bs/zdbs",
                Switchjx: currentConfig?.Switchjx || true,
                SESSDATA: currentConfig?.SESSDATA || '这里可以填写默认解析ck(仅SESSDATA字段即可)，用于解析视频(没有哔站登录的用户，已登录的用户使用自己的)，下面的配置是最大视频发送大小/MB',
                maxVideoSizeMB: currentConfig?.maxVideoSizeMB || '15',
                isluckywordBots: currentConfig?.isluckywordBots || [],
                isviplists: currentConfig?.isviplists || [],
                luckywordwhites: currentConfig?.luckywordwhites || [],
                luckywordblacks: currentConfig?.luckywordblacks || [],
                totalbody: currentConfig?.totalbody || [],
                festivalgroup: currentConfig?.festivalgroup || [],
                baoshigroup: currentConfig?.baoshigroup || [],
                whoisMyWifecdTime: currentConfig?.whoisMyWifecdTime || 300,
                whoisMyWifecacheTime: currentConfig?.whoisMyWifecacheTime || 3600,
                whoisMyWifemaxMembers: currentConfig?.whoisMyWifemaxMembers || 5,
                Authorization: currentConfig?.Authorization || 'Bearer <access_token>',
                sendbutton: currentConfig?.sendbutton || true,
                buttonType: currentConfig?.buttonType || ['0','1','3','4'],
                QQBotsendlink: currentConfig?.QQBotsendlink || true,
                Napsendtext: currentConfig?.Napsendtext || false,
            }

            let needsUpdate = false;
            for (const key in defaultConfig) {
                if (!(key in currentConfig)) {
                    currentConfig[key] = defaultConfig[key];
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                this.saveConfig(this.filePath, currentConfig);
            }
        }
    }

    loadConfig() {
        try {
            this.checkAndCreateDefaultConfig();
            this.cache = this.loadYAML(this.filePath);
            logger.mark(`[BILI PLUGIN] 配置文件加载成功`);
        } catch (error) {
            logger.error(`[BILI PLUGIN] 配置加载失败: ${error}`);
        }
    }

    get Napsendtext() {
        if (!this.cache) this.loadConfig()
        return this.cache?.Napsendtext
    }

    get buttonType() {
        if (!this.cache) this.loadConfig();
        return this.cache?.buttonType
    }
    
    get QQBotsendlink() {
        if (!this.cache) this.loadConfig();
        return this.cache?.QQBotsendlink
    }
    
    get sendbutton() {
        if (!this.cache) this.loadConfig();
        return this.cache?.sendbutton
    }
    get proxyAddress() {
        if (!this.cache) this.loadConfig();
        return this.cache?.proxyAddress
    }
    get switchProxy() {
        if (!this.cache) this.loadConfig();
        return this.cache?.switchProxy
    }

    get QQBotsendlink() {
        if (!this.cache) this.loadConfig();
        return this.cache?.QQBotsendlink
    }

    get Authorization() {
        if (!this.cache) this.loadConfig();
        return this.cache?.Authorization
    }

    get Enable_LoginApi() {
        if (!this.cache) this.loadConfig();
        return this.cache?.Enable_LoginApi
    }

    get Enable_SignApi() {
        if (!this.cache) this.loadConfig();
        return this.cache?.Enable_SignApi
    }

    get whoisMyWifecdTime() {
        if (!this.cache) this.loadConfig();
        return this.cache?.whoisMyWifecdTime
    }
    get whoisMyWifecacheTime() {
        if (!this.cache) this.loadConfig();
        return this.cache?.whoisMyWifecacheTime
    }
    get whoisMyWifemaxMembers() {
        if (!this.cache) this.loadConfig();
        return this.cache?.whoisMyWifemaxMembers
    }

    get baoshiapi() {
        if (!this.cache) this.loadConfig();
        return this.cache?.baoshiapi
    }

    get maxVideoSizeMB() {
        if (!this.cache) this.loadConfig();
        return this.cache?.maxVideoSizeMB
    }

    get Switchjx() {
        if (!this.cache) this.loadConfig();
        return this.cache?.Switchjx
    }

    get signApi() {
        if (!this.cache) this.loadConfig();
        return this.cache?.signApi;
    }

    get totalApi() {
        if (!this.cache) this.loadConfig();
        return this.cache?.totalApi
    }

    get loginApi() {
        if (!this.cache) this.loadConfig();
        return this.cache?.loginApi;
    }

    get SESSDATA() {
        if (!this.cache) this.loadConfig();
        return this.cache?.SESSDATA
    }

    get yiyan() {
        if (!this.cache) this.loadConfig();
        return this.cache?.yiyan;
    }

    get cron() {
        if (!this.cache) this.loadConfig();
        return this.cache?.cron;
    }

    get festivalpush() {
        if (!this.cache) this.loadConfig();
        return this.cache?.festivalpush
    }

    get QQDaily() {
        if (!this.cache) this.loadConfig();
        return this.cache?.QQDaily
    }

    get luckywordcron() {
        if (!this.cache) this.loadConfig();
        return this.cache?.luckywordcron
    }

    get livecron() {
        if (!this.cache) this.loadConfig();
        return this.cache?.livecron;
    }
    setConfig(config_data) {
        if (this.saveConfig(this.filePath, config_data)) {
            this.cache = config_data;
            return true;
        }
        return false;
    }

    // 生成自动签到定时任务
    generateCronExpression() {
        // 生成特定的自动签到定时任务，据说依据超强统计学原理，生成成功率99.99%！！
        let startHour = Math.floor(Math.random() * 9) + 1;
        let interval = Math.floor(Math.random() * 5) + 5;
        let secondHour = startHour + interval > 21 ? 21 : startHour + interval;
        const minute = Math.floor(Math.random() * 60);
        const cronExpression = `0 ${minute} ${startHour},${secondHour} * * *`;
        logger.mark(`[Bili-Plugin]获取哔站自动签到时间成功：${logger.yellow(cronExpression)},已保存至配置文件，请勿修改！！`)
        logger.mark(`[Bili-Plugin]据说依据超强统计学原理，生成成功率99.99%`)
        return cronExpression;
    }
    // 生成节日查询定时任务
    generateCronfestival() {
        // 生成特定的节日查询定时任务，据说依据超强统计学原理，生成成功率99.99%！！
        let hour;
        if (Math.random() < 0.5) {
            hour = Math.floor(Math.random() * (9 - 6 + 1)) + 6; // 6到9
        } else {
            hour = Math.floor(Math.random() * (20 - 15 + 1)) + 15; // 15到20
        }
        let minute = Math.floor(Math.random() * 60);
        let second = Math.floor(Math.random() * 60);
        const cronExpression = `${second} ${minute} ${hour} * * *`;
        logger.mark(`[Bili-Plugin]获取节日查询时间成功：${logger.yellow(cronExpression)},已保存至配置文件，请勿修改！！`)
        logger.mark(`[Bili-Plugin]据说依据超强统计学原理，生成成功率99.99%`)
        return cronExpression;
    }

    // 生成幸运字符定时任务
    generateCronluckyword() {
        // 生成特定的幸运字符定时任务，据说依据超强统计学原理，生成成功率99.99%！！
        let hour = Math.floor(Math.random() * (18 - 4 + 1)) + 4
        let minute = Math.floor(Math.random() * 60)
        let second = Math.floor(Math.random() * 60);
        const cronExpression = `${second} ${minute} ${hour} * * *`;
        logger.mark(`[Bili-Plugin]获取哔站幸运字符时间成功：${logger.yellow(cronExpression)},已保存至配置文件，请勿修改！！`)
        logger.mark(`[Bili-Plugin]据说依据超强统计学原理，生成成功率99.99%`)
        return cronExpression;
    }

    // 生成直播间弹幕发送定时任务
    generateCronlive() {
        // 生成特定的直播间弹幕发送定时任务，据说依据超强统计学原理，生成成功率99.99%！！
        let m1, m2, m3;
        do {
            m1 = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
            const minInterval1 = Math.max(13, 25 - m1);
            const maxInterval1 = Math.min(20, 40 - m1);
            if (minInterval1 > maxInterval1) continue

            const interval1 = Math.floor(Math.random() * (maxInterval1 - minInterval1 + 1)) + minInterval1;
            m2 = m1 + interval1;
            const minInterval2 = Math.max(13, 45 - m2);
            const maxInterval2 = Math.min(20, 55 - m2);
            if (minInterval2 > maxInterval2) continue

            const interval2 = Math.floor(Math.random() * (maxInterval2 - minInterval2 + 1)) + minInterval2;
            m3 = m2 + interval2;
            break;
        } while (true);
        const second = Math.floor(Math.random() * 60);
        const cronExpression = `${second} ${m1},${m2},${m3} * * * *`;
        logger.mark(`[Bili-Plugin]获取直播间弹幕发送时间成功：${logger.yellow(cronExpression)},已保存至配置文件，请勿修改！！`);
        logger.mark(`[Bili-Plugin]据说依据超强统计学原理，生成成功率99.99%`)
        return cronExpression;
    }
    closeWatcher() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}

export default new Config();