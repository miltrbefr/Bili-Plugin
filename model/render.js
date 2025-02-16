import {
  pluginName
} from "../model/constant.js"
import Bili from '../model/bili.js';
let info
export default async function (path, params, cfg) {
  let {
    e
  } = cfg
  if (!e.runtime) {
    return console.log('未找到e.runtime，请升级至最新版Yunzai')
  }
  if(!info) info = await Bili.getsha()
  return e.runtime.render(pluginName, path, params, {
    retType: cfg.retMsgId ? 'msgId': 'default',
    beforeRender ( {
      data
    }) {
      return {
        ...data,
        sys: {
          scale: cfg.scale || 1
        },
        copyright: `${data.copyright} & ${pluginName} ${info}`
      }
    }
  })
}