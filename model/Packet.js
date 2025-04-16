import pb from "./protobuf/index.js"
import {
  Buffer
} from 'buffer'
import crypto from 'crypto'
import {
  gzip as _gzip,
  gunzip as _gunzip
} from 'zlib'
import {
  promisify
} from 'util'

const gzip = promisify(_gzip)
const gunzip = promisify(_gunzip)

const RandomUInt = () => crypto.randomBytes(4).readUInt32BE()

BigInt.prototype.toJSON = function() {
  return this.toString()
}

export const Proto = pb

export const encode = (json) => {
  return pb.encode(processJSON(json))
}

export const Send = async (
  e,
  cmd,
  content
) => {
  try {
    const data = encode(typeof content === 'object' ? content : JSON.parse(content))
    const req = await e.bot.sendApi('send_packet', {
      cmd: cmd,
      data: Buffer.from(data).toString("hex")
    })
    return pb.decode(req.data)
  } catch (error) {
    logger.error(`sendMessage failed: ${error.message}`, error)
  }
}

export const Elem = async (
  e,
  content
) => {
  try {
    let packet = buildBasePbContent(e.isGroup ? e.group_id : e.user_id, e.isGroup)
    const parsed = typeof content === 'object' ? content : JSON.parse(content)
    const elements = Array.isArray(parsed) ? parsed : [parsed]

    packet = {
      ...packet,
      "3": {
        "1": {
          "2": elements
        }
      },
      "4": RandomUInt(),
      "5": RandomUInt()
    }

    return Send(e, 'MessageSvc.PbSendMsg', packet)
  } catch (error) {
    logger.error(`sendMessage failed: ${error.message}`, error)
  }
}

export const Long = async (
  e,
  content
) => {
  try {
    const resid = await sendLong(e, content)
    const elem = {
      "37": {
        "6": 1,
        "7": resid,
        "17": 0,
        "19": {
          "15": 0,
          "31": 0,
          "41": 0
        }
      }
    }
    return Elem(e, elem)
  } catch (error) {
    logger.error(`sendMessage failed: ${error.message}`, error)
  }
}

export const sendLong = async (
  e,
  content
) => {
  const data = {
    "2": {
      "1": "MultiMsg",
      "2": {
        "1": [{
          "3": {
            "1": {
              "2": typeof content === 'object' ? content : JSON.parse(content)
            }
          }
        }]
      }
    }
  }
  const compressedData = await gzip(encode(data))
  const target = e.isGroup ? BigInt(e.group_id) : e.user_id

  const packet = {
    "2": {
      "1": e.isGroup ? 3 : 1,
      "2": {
        "2": target
      },
      "3": `${target}`,
      "4": compressedData
    },
    "15": {
      "1": 4,
      "2": 2,
      "3": 9,
      "4": 0
    }
  }

  const resp = await Send(e, 'trpc.group.long_msg_interface.MsgService.SsoSendLongMsg', packet)
  return resp?.["2"]?.["3"]
}

export const recvLong = async (
  e,
  resid
) => {
  const packet = {
    "1": {
      "2": resid,
      "3": true
    },
    "15": {
      "1": 2,
      "2": 0,
      "3": 0,
      "4": 0
    }
  }

  const resp = await Send(e, 'trpc.group.long_msg_interface.MsgService.SsoRecvLongMsg', packet)
  return pb.decode(await gunzip(resp?.["1"]?.["4"]))
}

export const getMsg = async (
  e,
  message_id,
  isSeq = false
) => {
  const seq = parseInt(isSeq ? message_id : (await e.bot.sendApi('get_msg', {
    message_id: message_id
  }))?.real_seq)
  if (!seq) throw new Error("获取seq失败，请尝试更新napcat")

  const packet = {
    "1": {
      "1": e.group_id,
      "2": seq,
      "3": seq
    },
    "2": true
  }

  return Send(e, 'trpc.msg.register_proxy.RegisterProxy.SsoGetGroupMsg', packet)
}

function buildBasePbContent(id, isGroupMsg) {
  const base = {
    "1": {
      [isGroupMsg ? "2" : "1"]: isGroupMsg ? {
        "1": id
      } : {
        "2": id
      }
    },
    "2": {
      "1": 1,
      "2": 0,
      "3": 0
    },
    "3": {
      "1": {
        "2": []
      }
    }
  }
  return base
}

function processJSON(json, path = []) {
  const result = {}
  if (Buffer.isBuffer(json) || json instanceof Uint8Array) {
    return json
  } else if (Array.isArray(json)) {
    return json.map((item, index) => processJSON(item, path.concat(index + 1)))
  } else if (typeof json === "object" && json !== null) {
    for (const key in json) {
      const numKey = Number(key)
      if (Number.isNaN(numKey)) {
        throw new Error(`Key is not a valid integer: ${key}`)
      }
      const currentPath = path.concat(key)
      const value = json[key]

      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          result[numKey] = value.map((item, idx) =>
            processJSON(item, currentPath.concat(String(idx + 1)))
          )
        } else {
          result[numKey] = processJSON(value, currentPath)
        }
      } else {
        if (typeof value === "string") {
          if (value.startsWith("hex->")) {
            const hexStr = value.slice("hex->".length)
            if (isHexString(hexStr)) {
              result[numKey] = hexStringToByteArray(hexStr)
            } else {
              result[numKey] = value
            }
          } else if (
            currentPath.slice(-2).join(",") === "5,2" &&
            isHexString(value)
          ) {
            result[numKey] = hexStringToByteArray(value)
          } else {
            result[numKey] = value
          }
        } else {
          result[numKey] = value
        }
      }
    }
  } else {
    return json
  }
  return result
}

function isHexString(s) {
  return s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s)
}

function hexStringToByteArray(s) {
  return Buffer.from(s, "hex")
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}