import fs from 'fs';
import path from 'path';
import moment from 'moment';
import Render from '../model/renders.js';

export class BiliPluginstats extends plugin {
    constructor() {
        super({
            name: '[Bili-Plugin]',
            dsc: '功能统计',
            event: 'message',
            priority: 300,
            rule: [
                {
                    reg: "^(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?(全部)?(插件)?功能统计$",
                    fnc: 'Pluginstats'
                }
            ]
        });
    }

    async Pluginstats(e) {
        const isAll = e.msg.includes('全部')
        const dirPath = './data/bili/Pluginstats'
        let stats = {}

        if (isAll) {
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
            files.forEach(file => {
                const fileData = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
                for (const [key, value] of Object.entries(fileData)) {
                    stats[key] = (stats[key] || 0) + value
                }
            });
        } else {
            const date = moment().format('YYYY-MM-DD');
            const filePath = path.join(dirPath, `${date}.json`);
            if (fs.existsSync(filePath)) {
                stats = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        }
        const statsList = Object.entries(stats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 50)
            .map(([name, count], index) => ({
                name,
                count,
                rank: index + 1
            }));
        const image = await Render.render('Template/Pluginstats/stats', {
            statsType: isAll ? '累计' : '今日',
            statsList,
            total: Object.keys(stats).length,
            statsTime: moment().format('YYYY-MM-DD HH:mm:ss')
        }, {
            e,
            retType: 'base64'
        });
        await e.reply(image,true);
        return true;
    }
}