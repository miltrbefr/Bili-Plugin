import Version from '../model/Version.js'
import Bili from '../model/bili.js';
import { pluginRoot, pluginResources } from '../model/constant.js'
import fs from 'fs'
let info
function getScale(pct = null) {
    pct = 2
    pct = Math.min(2, Math.max(0.5, pct))
    return `style=transform:scale(${pct});`
}

const time = {}
function getsaveId(name) {
    if (!time[name]) time[name] = 0;

    time[name]++;

    if (time[name] === 1) {
        setTimeout(() => {
            time[name] = 0;
        }, 10000);
    }

    return `${name}_${time[name]}`;
}

const Render = {
    async render(path, params, cfg) {
        if(!info) info = await Bili.getsha() || `& Sha: 114514 & Date: 1919810`
        let { e } = cfg
        if (!e.runtime) {
            logger.mark(logger.blue('[Bili-Plugin]'), logger.red(`未找到e.runtime，请升级至最新版Yunzai`));
        }

        let BotName = Version.isMiao ? 'Miao-Yunzai' : Version.isTrss ? 'TRSS-Yunzai' : 'Yunzai-Bot'
        let currentVersion = null
        const package_path = `${pluginRoot}/package.json`
        try {
            const package_json = JSON.parse(fs.readFileSync(package_path, 'utf-8'))
            if (package_json.version) {
                currentVersion = package_json.version
            }
        } catch (error) {
            logger.mark(logger.blue('[Bili-Plugin]'), logger.cyan(`读取 package.json 失败`), logger.red(error));
        }
        return e.runtime.render('Bili-Plugin', path, params, {
            retType: cfg.retType || (cfg.retMsgId ? 'msgId' : 'default'),
            beforeRender({ data }) {
                let pluginName = ''
                if (data.pluginName !== false) {
                    pluginName = ` & ${data.pluginName || 'Bili-Plugin'}`
                    if (data.pluginVersion !== false) {
                        pluginName += `<span class="version">${currentVersion}</span>`
                    }
                }
                let resPath = data.pluResPath
                const layoutPath = pluginRoot + '/resources/common/layout/'
                return {
                    ...data,
                    avatarUrl: params.isSelf && e.friend?.getAvatarUrl?.() || "",
                    pluginResources,
                    _res_path: resPath,
                    _layout_path: layoutPath,
                    defaultLayout: layoutPath + 'default.html',
                    elemLayout: layoutPath + 'elem.html',
                    sys: {
                        scale: getScale(cfg.scale)
                    },
                    quality: 100,
                    saveId: getsaveId(data.saveId),
                    copyright: `Created By ${BotName}<span class="version">${Version.yunzai}</span>${pluginName} ${info}`,
                    copyright2: `Created By ${BotName}<span class="version">${Version.yunzai}</span>${pluginName} `,
                }
            }
        })
    }
}

export default Render