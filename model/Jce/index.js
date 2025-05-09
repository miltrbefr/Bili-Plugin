import * as jce from './jce.js';

export function decodeWrapper(blob) {
  const wrapper = jce.decode(blob);
  const map = jce.decode(wrapper[7])[0];
  let nested = map[Object.keys(map)[0]];
  if (!(nested instanceof Buffer)) {
    nested = nested[Object.keys(nested)[0]];
  }
  return jce.decode(nested)[0];
}

export function encodeWrapper(map, servant, func, reqid = 0) {
  return jce.encode([null, 3, 0, 0, reqid, servant, func, jce.encode([map]), 0, {}, {}]);
}

export function encodeStruct(nested) {
  return jce.encode([jce.encodeNested(nested)]);
}

export function encodeNested(nested) {
  return jce.encodeNested(nested)
}

export function encode(nested) {
  return jce.encode(nested);
}


