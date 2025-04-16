import protobuf from "protobufjs/minimal.js"
import {
  Buffer
} from 'buffer'

const {
  Writer,
  Reader
} = protobuf

class Protobuf {
  constructor() {}

  encode(obj) {
    const writer = Writer.create()
    for (const tag of Object.keys(obj).map(Number)) {
      const value = obj[tag]
      this._encode(writer, tag, value)
    }
    return writer.finish()
  }

  _encode(writer, tag, value) {
    switch (typeof value) {
      case "undefined":
        break
      case "number":
        writer.uint32((tag << 3) | 0).int32(value)
        break
      case "bigint":
        writer.uint32((tag << 3) | 0).int64(value)
        break
      case "string":
        writer.uint32((tag << 3) | 2).string(value)
        break
      case "boolean":
        writer.uint32((tag << 3) | 0).bool(value)
        break
      case "object":
        if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
          writer.uint32((tag << 3) | 2).bytes(value)
        } else if (Array.isArray(value)) {
          value.forEach(item => this._encode(writer, tag, item))
        } else if (value === null) {
          break
        } else {
          const nestedBuffer = this.encode(value)
          writer.uint32((tag << 3) | 2).bytes(nestedBuffer)
        }
        break
      default:
        throw new Error("Unsupported type: " + (value && typeof value))
    }
  }

  decode(buffer) {
    if (typeof buffer === 'string') buffer = Buffer.from(buffer, "hex")
    const result = {}
    const reader = Reader.create(buffer)
    while (reader.pos < reader.len) {
      const k = reader.uint32()
      const tag = k >> 3,
        type = k & 0b111
      let value
      switch (type) {
        case 0:
          value = this.long2int(reader.int64())
          break
        case 1:
          value = this.long2int(reader.fixed64())
          break
        case 2:
          value = Buffer.from(reader.bytes())
          try {
            value = this.decode(value)
          } catch {
            try {
              const decoded = value.toString('utf-8')
              const reEncoded = Buffer.from(decoded, 'utf-8')
              if (reEncoded.every((v, i) => v === value[i])) {
                value = decoded
              }
            } catch {
              //value = 'hex->' + this.bytesToHex(value)
            }
          }
          break
        case 5:
          value = reader.fixed32()
          break
        default:
          throw new Error("Unsupported wire type: " + type)
      }

      if (Array.isArray(result[tag])) {
        result[tag].push(value)
      } else if (!!result[tag]) {
        result[tag] = [result[tag]]
        result[tag].push(value)
      } else {
        result[tag] = value
      }
    }
    return result
  }

  long2int(long) {
    if (long.high === 0)
      return long.low >>> 0
    const bigint = (BigInt(long.high) << 32n) | (BigInt(long.low) & 0xffffffffn)
    const int = Number(bigint)
    return Number.isSafeInteger(int) ? int : bigint
  }

  bytesToHex(bytes) {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

export default new Protobuf()