import path from 'path'
import fs from 'fs'
import PluginLoader from '../../../lib/plugins/loader.js'
const _path = process.cwd().replace(/\\/g, '/')

const pluginName = path.basename(path.join(import.meta.url, '../../'))
const pluginRoot = path.join(_path, 'plugins', pluginName)
const pluginResources = path.join(pluginRoot, 'resources')
const pluginApplications = path.join(pluginRoot, 'apps')

PluginLoader.filtPermission = new Proxy(PluginLoader.filtPermission, {
  apply(target, thisArg, args) {
  const e = args[0]
  if (e.logFnc) {
      const result = e.logFnc
      const isTRSS = Array.isArray(Bot.uin)
      let match
      if (isTRSS) {
        match = result.match(/\[(.+?)\((.+?)\)\]/)
      }else{
        match = result.match(/\[(.+?)\]\[(.+?)\]/)
      }
      if (match) {
          const funcName = match[1].replace('34m[', '')
          const date = new Date().toISOString().split('T')[0];
          const dirPath = './data/bili/Pluginstats';
          const filePath = path.join(dirPath, `${date}.json`);
          if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
          }
          let data = {};
          if (fs.existsSync(filePath)) {
              data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          }
          data[funcName] = (data[funcName] || 0) + 1;
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }
  }
  return target.apply(thisArg, args);
}
})
export {
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  pluginApplications,
}