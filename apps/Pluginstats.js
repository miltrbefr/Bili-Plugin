import fs from 'fs'
import path from 'path'
import moment from 'moment'

export class BiliPluginstats extends plugin {
    constructor() {
        super({
            name: '[Bili-Plugin]',
            dsc: '功能统计',
            event: 'message',
            priority: 300,
            rule: [{
                reg: "^(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?(全部)?(插件)?功能统计$",
                fnc: 'Pluginstats'
            }]
        })
    }
    async Pluginstats(e) {
        const isAll = e.msg.includes('全部')
        const dirPath = './data/bili/Pluginstats';
        let stats = {};

        if (isAll) {
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
            files.forEach(file => {
                const fileData = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
                for (const [key, value] of Object.entries(fileData)) {
                    stats[key] = (stats[key] || 0) + value;
                }
            });
        } else {
            const date = new Date().toISOString().split('T')[0];
            const filePath = path.join(dirPath, `${date}.json`);
            if (fs.existsSync(filePath)) {
                stats = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        }
        const sorted = Object.entries(stats)
            .sort(([,a], [,b]) => b - a)
            .map(([name, count], index) => `${index + 1}. 『${name}』 - ${count} 次`);

        const replyText = [
            `『Bili-Plugin统计实现』`,
            `${isAll ? '全部' : '今日'}功能使用统计`,
            ...(sorted.length > 0 ? sorted : ['暂无统计数据']),
            `\n统计时间：${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}`
        ].join('\n');
        e.reply(replyText,true);
        return true;
    }
}