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

const fileLocks = new Map()
async function withFileLock(filePath, fn) {
  while (fileLocks.has(filePath)) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  fileLocks.set(filePath, true)
  try {
    return await fn()
  } finally {
    fileLocks.delete(filePath)
  }
}

async function safeWriteFile(filePath, data) {
  const tempPath = `${filePath}.tmp`
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  return withFileLock(filePath, async () => {
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8')
    try {
      await fs.rename(tempPath, filePath)
    } catch (error) {
      if (fssync.existsSync(tempPath)) {
        await fs.unlink(tempPath).catch(() => {})
      }
      throw error
    }
  })
}

async function updatePluginStats(funcName) {
  const date = moment().format('YYYY-MM-DD')
  const statsPath = path.join('./data/bili/Pluginstats', `${date}.json`)

  try {
    let data = {}
    try {
      const content = await fs.readFile(statsPath, 'utf8')
      data = JSON.parse(content)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    data[funcName] = (data[funcName] || 0) + 1
    await safeWriteFile(statsPath, data)
  } catch (error) {
    logger.error('[BILI-PLUGIN] 写入插件统计文件失败:', error)
  }
}

PluginLoader.filtPermission = new Proxy(PluginLoader.filtPermission, {
  apply: async (target, thisArg, args) => {
    const e = args[0]
    if (e.logFnc) {
      const result = e.logFnc
      const isTRSS = Array.isArray(Bot.uin)
      let match

      try {
        if (isTRSS) {
          match = result.match(/\[(.+?)\((.+?)\)\]/)
        } else {
          match = result.match(/\[(.+?)\]\[(.+?)\]/)
        }

        if (match) {
          const funcName = match[1].replace('34m[', '')
          updatePluginStats(funcName).catch(error => {
            logger.error('[BILI-PLUGIN] 插件统计信息更新失败:', error)
          })
        }
      } catch (error) {
        logger.error('[BILI-PLUGIN] 插件统计日志解析错误:', error)
      }
    }
    return target.apply(thisArg, args)
  }
})

export {
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  pluginApplications,
}