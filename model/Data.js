import lodash from 'lodash'
import fs from 'fs'
import path from 'path'
import {
  _path,
  pluginName
} from "../model/constant.js"

const getRoot = (root = '') => {
  if (root === 'root' || root === 'yunzai') {
    root = _path
  } else if (!root) {
    root = path.join(_path, 'plugins', pluginName, 'data')
  }
  return root
}

let Data = {

  /*
  * 根据指定的path依次检查与创建目录
  * */
  createDir (dir = '', root = '', includeFile = false) {
    root = getRoot(root)
    let pathList = dir.split('/')
    let nowPath = root
    pathList.forEach((name, idx) => {
      name = name.trim()
      if (idx < pathList.length - (includeFile ? 1: 0)) {
        nowPath = path.join(nowPath, name)
        if (name) {
          if (!fs.existsSync(nowPath)) {
            fs.mkdirSync(nowPath)
          }
        }
      }
    })
  },

  read (file = '',
    root = '') {
    root = getRoot(root)
    const filePath = path.join(root,
      file)
    if (!fs.existsSync(filePath)) return ''
    try {
      return fs.readFileSync(filePath, 'utf8')
    } catch (e) {
      console.log(e)
    }
  },

  write (file, data, root = '') {
    // 检查并创建目录
    Data.createDir(file, root, true)
    root = getRoot(root)
    return fs.writeFileSync(path.join(root, file), data)
  },

  /*
  * 读取json
  * */
  readJSON (file = '', root = '') {
    try {
      let fileContent = Data.read(`${file}.json`, root) || "{}"
      return JSON.parse(fileContent)
    } catch (e) {
      console.log(e)
    }
    return {}
  },

  /*
  * 写JSON
  * */
  writeJSON (file, data, space = '\t', root = '') {
    return Data.write(`${file}.json`, JSON.stringify(data || {}, null, space), root)
  },

  async getCacheJSON (key) {
    try {
      let txt = await redis.get(key)
      if (txt) {
        return JSON.parse(txt)
      }
    } catch (e) {
      console.log(e)
    }
    return {}
  },

  async setCacheJSON (key, data, EX = 3600 * 24 * 90) {
    await redis.set(key, JSON.stringify(data), {
      EX
    })
  },

  async importModule (file, root = '') {
    root = getRoot(root)
    if (!/\.js$/.test(file)) {
      file = file + '.js'
    }
    const filePath = path.join(root, file)
    if (fs.existsSync(filePath)) {
      try {
        let data = await import(`file://${filePath}?t=${new Date() * 1}`)
        return data || {}
      } catch (e) {
        console.log(e)
      }
    }
    return {}
  },

  async importDefault (file, root) {
    let ret = await Data.importModule(file, root)
    return ret.default || {}
  },

  async import (name) {
    return await Data.importModule(path.join('components', 'optional-lib', `${name}.js`))
  },

  async importCfg (key) {
    let sysCfg = await Data.importModule(path.join('config', 'system', `${key}_system.js`))
    let diyCfg = await Data.importModule(path.join('config', `${key}.js`))
    if (diyCfg.isSys) {
      console.error(`${pluginName}: config/${key}.js无效，已忽略`)
      console.error(`如需配置请复制config/${key}_default.js为config/${key}.js，请勿复制config/system下的系统文件`)
      diyCfg = {}
    }
    return {
      sysCfg,
      diyCfg
    }
  },

  /*
  * 返回一个从 target 中选中的属性的对象
  *
  * keyList : 获取字段列表，逗号分割字符串
  *   key1, key2, toKey1:fromKey1, toKey2:fromObj.key
  *
  * defaultData: 当某个字段为空时会选取defaultData的对应内容
  * toKeyPrefix：返回数据的字段前缀，默认为空。defaultData中的键值无需包含toKeyPrefix
  *
  * */

  getData (target, keyList = '', cfg = {}) {
    target = target || {}
    let defaultData = cfg.defaultData || {}
    let ret = {}
    // 分割逗号
    if (typeof (keyList) === 'string') {
      keyList = keyList.split(',')
    }

    lodash.forEach(keyList, (keyCfg) => {
      // 处理通过:指定 toKey & fromKey
      let _keyCfg = keyCfg.split(':')
      let keyTo = _keyCfg[0].trim()
      let keyFrom = (_keyCfg[1] || _keyCfg[0]).trim()
      let keyRet = keyTo
      if (cfg.lowerFirstKey) {
        keyRet = lodash.lowerFirst(keyRet)
      }
      if (cfg.keyPrefix) {
        keyRet = cfg.keyPrefix + keyRet
      }
      // 通过Data.getVal获取数据
      ret[keyRet] = Data.getVal(target, keyFrom, defaultData[keyTo], cfg)
    })
    return ret
  },

  getVal (target,
    keyFrom,
    defaultValue) {
    return lodash.get(target,
      keyFrom,
      defaultValue)
  },

  // sleep
  sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  // 获取默认值
  def () {
    for (let idx in arguments) {
      if (!lodash.isUndefined(arguments[idx])) {
        return arguments[idx]
      }
    }
  },

  // 循环字符串回调
  eachStr: (arr, fn) => {
    if (lodash.isString(arr)) {
      arr = arr.replace(/\s*(;|；|、|，)\s*/, ',')
      arr = arr.split(',')
    } else if (lodash.isNumber(arr)) {
      arr = [arr.toString()]
    }
    lodash.forEach(arr, (str, idx) => {
      if (!lodash.isUndefined(str)) {
        fn(str.trim ? str.trim(): str, idx)
      }
    })
  },

  regRet (reg,
    txt,
    idx) {
    if (reg && txt) {
      let ret = reg.exec(txt)
      if (ret && ret[idx]) {
        return ret[idx]
      }
    }
    return false
  }
}

export default Data