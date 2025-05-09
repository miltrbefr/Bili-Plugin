import { Readable } from 'stream';
import { Buffer } from 'buffer';

const BUF0 = Buffer.alloc(0);
const TYPE_INT8 = 0;
const TYPE_INT16 = 1;
const TYPE_INT32 = 2;
const TYPE_INT64 = 3;
const TYPE_FLOAT = 4;
const TYPE_DOUBLE = 5;
const TYPE_STRING1 = 6;
const TYPE_STRING4 = 7;
const TYPE_MAP = 8;
const TYPE_LIST = 9;
const TYPE_STRUCT_BEGIN = 10;
const TYPE_STRUCT_END = 11;
const TYPE_ZERO = 12;
const TYPE_SIMPLE_LIST = 13;
const TAG_MAP_K = 0;
const TAG_MAP_V = 1;
const TAG_LIST_E = 0;
const TAG_BYTES = 0;
const TAG_LENGTH = 0;
const TAG_STRUCT_END = 0;
const FLAG_STRUCT_END = Symbol("FLAG_STRUCT_END");

export class JceError extends Error {
  constructor(message) {
    super(message);
    this.name = "JceError";
  }
}

//------------------------------------------------------------------ decode
export class Struct extends null {}

export function readHead(readable) {
  const head = readable.read(1).readUInt8();
  const type = head & 0xf;
  let tag = (head & 0xf0) >> 4;
  if (tag === 0xf) {
    tag = readable.read(1).readUInt8();
  }
  return { tag, type };
}

export function readBody(stream, type) {
  let len;
  switch (type) {
    case TYPE_ZERO: return 0;
    case TYPE_INT8: return stream.read(1).readInt8();
    case TYPE_INT16: return stream.read(2).readInt16BE();
    case TYPE_INT32: return stream.read(4).readInt32BE();
    case TYPE_INT64: {
      let value = stream.read(8).readBigInt64BE();
      if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER)
        value = Number(value);
      return value;
    }
    case TYPE_STRING1: {
      len = stream.read(1).readUInt8();
      return len > 0 ? stream.read(len).toString() : "";
    }
    case TYPE_STRING4: {
      len = stream.read(4).readUInt32BE();
      return len > 0 ? stream.read(len).toString() : "";
    }
    case TYPE_SIMPLE_LIST: {
      readHead(stream);
      len = readElement(stream).value;
      return len > 0 ? stream.read(len) : BUF0;
    }
    case TYPE_LIST: {
      len = readElement(stream).value;
      const list = [];
      while (len > 0) {
        list.push(readElement(stream).value);
        --len;
      }
      return list;
    }
    case TYPE_MAP: {
      len = readElement(stream).value;
      const map = Object.create(null);
      while (len > 0) {
        map[readElement(stream).value] = readElement(stream).value;
        --len;
      }
      return map;
    }
    case TYPE_STRUCT_BEGIN: return readStruct(stream);
    case TYPE_STRUCT_END: return FLAG_STRUCT_END;
    case TYPE_FLOAT: return stream.read(4).readFloatBE();
    case TYPE_DOUBLE: return stream.read(8).readDoubleBE();
    default: throw new JceError("unknown jce type: " + type);
  }
}

export function readStruct(readable) {
  const struct = Object.create(Struct.prototype);
  while (readable.readableLength) {
    const { tag, value } = readElement(readable);
    if (value === FLAG_STRUCT_END) return struct;
    struct[tag] = value;
  }
  return struct;
}

export function readElement(readable) {
  const head = readHead(readable);
  const value = readBody(readable, head.type);
  return { tag: head.tag, value };
}

//------------------------------------------------------------------ encode
export class Nested {
  constructor(data) {
    this.data = data;
  }
}

export function createHead(type, tag) {
  if (tag < 15) return Buffer.from([(tag << 4) | type]);
  if (tag < 256) return Buffer.from([0xf0 | type, tag]);
  throw new JceError("Tag must be less than 256, received: " + tag);
}

export function createBody(type, value) {
  let body, len;
  switch (type) {
    case TYPE_INT8: return Buffer.from([Number(value)]);
    case TYPE_INT16: {
      body = Buffer.allocUnsafe(2);
      body.writeInt16BE(Number(value));
      return body;
    }
    case TYPE_INT32: {
      body = Buffer.allocUnsafe(4);
      body.writeInt32BE(Number(value));
      return body;
    }
    case TYPE_INT64: {
      body = Buffer.allocUnsafe(8);
      body.writeBigInt64BE(BigInt(value));
      return body;
    }
    case TYPE_FLOAT: {
      body = Buffer.allocUnsafe(4);
      body.writeFloatBE(value);
      return body;
    }
    case TYPE_DOUBLE: {
      body = Buffer.allocUnsafe(8);
      body.writeDoubleBE(value);
      return body;
    }
    case TYPE_STRING1: {
      len = Buffer.from([value.length]);
      return Buffer.concat([len, value]);
    }
    case TYPE_STRING4: {
      len = Buffer.allocUnsafe(4);
      len.writeUInt32BE(value.length);
      return Buffer.concat([len, value]);
    }
    case TYPE_MAP: {
      const body = [];
      let n = 0;
      for (const stringKey of Object.keys(value)) {
        ++n;
        const key = /^\d+$/.test(stringKey) ? Number(stringKey) : stringKey;
        body.push(createElement(TAG_MAP_K, key));
        body.push(createElement(TAG_MAP_V, value[stringKey]));
      }
      body.unshift(createElement(TAG_LENGTH, n));
      return Buffer.concat(body);
    }
    case TYPE_LIST: {
      const body = [createElement(TAG_LENGTH, value.length)];
      for (let i = 0; i < value.length; ++i) {
        body.push(createElement(TAG_LIST_E, value[i]));
      }
      return Buffer.concat(body);
    }
    case TYPE_ZERO: return BUF0;
    case TYPE_SIMPLE_LIST: {
      return Buffer.concat([
        createHead(0, TAG_BYTES),
        createElement(TAG_LENGTH, value.length),
        value,
      ]);
    }
    default: throw new JceError("Type must be 0 ~ 13, received: " + type);
  }
}

export function createElement(tag, value) {
  if (value instanceof Nested) {
    return Buffer.concat([
      createHead(TYPE_STRUCT_BEGIN, tag),
      value.data,
      createHead(TYPE_STRUCT_END, TAG_STRUCT_END)
    ]);
  }

  let type;
  switch (typeof value) {
    case "string": {
      value = Buffer.from(value);
      type = value.length <= 0xff ? TYPE_STRING1 : TYPE_STRING4;
      break;
    }
    case "object": {
      type = value instanceof Uint8Array ? TYPE_SIMPLE_LIST
        : Array.isArray(value) ? TYPE_LIST : TYPE_MAP;
      break;
    }
    case "bigint":
    case "number": {
      if (value == 0) {
        type = TYPE_ZERO;
      } else if (Number.isInteger(value) || typeof value === "bigint") {
        if (value >= -0x80 && value <= 0x7f) type = TYPE_INT8;
        else if (value >= -0x8000 && value <= 0x7fff) type = TYPE_INT16;
        else if (value >= -0x80000000 && value <= 0x7fffffff) type = TYPE_INT32;
        else if (value >= -0x8000000000000000n && value <= 0x7fffffffffffffffn) type = TYPE_INT64;
        else throw new JceError("Unsupported integer range: " + value);
      } else {
        type = TYPE_DOUBLE;
      }
      break;
    }
    default: throw new JceError("Unsupported type: " + typeof value);
  }
  return Buffer.concat([createHead(type, tag), createBody(type, value)]);
}

export function decode(encoded) {
  const readable = Readable.from(encoded, { objectMode: false });
  readable.read(0);
  const decoded = Object.create(null);
  while (readable.readableLength) {
    const { tag, value } = readElement(readable);
    decoded[tag] = value;
  }
  return decoded;
}

export function encode(obj) {
  const elements = [];
  if (Array.isArray(obj)) {
    for (let tag = 0; tag < obj.length; ++tag) {
      if (obj[tag] == null) continue;
      elements.push(createElement(tag, obj[tag]));
    }
  } else {
    for (const tag of Object.keys(obj).map(Number)) {
      if (obj[tag] == null) continue;
      elements.push(createElement(tag, obj[tag]));
    }
  }
  return Buffer.concat(elements)
}

export function encodeNested(obj) {
  return new Nested(encode(obj));
}