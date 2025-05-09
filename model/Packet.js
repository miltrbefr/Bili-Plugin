import pb from "./protobuf/index.js"
import * as jce from './Jce/index.js';
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

export const Proto = pb

export const replacer = (key, value) => {
    if (typeof value === 'bigint') {
        return Number(value) >= Number.MAX_SAFE_INTEGER ? value.toString() : Number(value);
    } else if (Buffer.isBuffer(value)) {
        return `hex->${value.toString('hex')}`
    } else if (value?.type === 'Buffer' && Array.isArray(value.data)) {
        return `hex->${Buffer.from(value.data).toString('hex')}`
    } else {
        return value
    }
};

export const encode = (json) => {
    return pb.encode(processJSON(json))
}

export const Send = async (
    e,
    cmd,
    content,
    isJce = false,
    isQQ = false
) => {
    try {
        const bot = isQQ ? Bot[e] : e.bot;

        if (!isJce) {
            const data = encode(typeof content === 'object' ? content : JSON.parse(content));
            let ret;

            if (bot?.adapter?.name === 'OneBotv11') {
                ret = Buffer.from(data).toString("hex");
                const req = await bot.sendApi('send_packet', {
                    cmd: cmd,
                    data: ret
                });
                let rsp = pb.decode(req.data);
                if (rsp[1] !== 0 && cmd === 'MessageSvc.PbSendMsg') {
                    logger.error(`消息发送失败，请检查您的消息是否正确！`);
                }
                return rsp;
            } else {
                ret = Array.from(data);
                const payload = await bot.sdk.sendUni(cmd, ret);
                let rsp = pb.decode(payload);
                if (rsp[1] !== 0 && cmd === 'MessageSvc.PbSendMsg') {
                    logger.error(`消息发送失败，请检查您的消息是否正确！`);
                }
                return rsp;
            }
        } else {
            let payload;
            if (bot?.adapter?.name === 'OneBotv11') {
                let body
                if (/^[0-9a-fA-F]+$/.test(content)) {
                    body = content
                } else {
                    body = Buffer.from(content, 'base64').toString("hex");
                }
                const req = await bot.sendApi('send_packet', {
                    cmd: cmd,
                    data: body
                });
                payload = Buffer.from(req.data, 'hex');
            } else {
                let body
                if (/^[0-9a-fA-F]+$/.test(content)) {
                    body = Buffer.from(content, 'hex');
                } else {
                    body = content
                }
                payload = await bot.sdk.sendUni(cmd, body);
            }
            return payload ? jce.decodeWrapper(payload) : null;
        }
    } catch (error) {
        logger.error(`sendMessage failed: ${error.message}`, error);
    }
}

export const sendOidb = async (
    e,
    cmd,
    body,
    isQQ = false
) => {
    try {
        const bot = isQQ ? Bot[e] : e.bot;
        const sp = cmd
            .replace("OidbSvc.", "")
            .replace("oidb_", "")
            .split("_");
        const type1 = parseInt(sp[0], 16),
            type2 = parseInt(sp[1]);
        body = {
            1: type1,
            2: isNaN(type2) ? 1 : type2,
            3: 0,
            4: body,
            6: "android " + (bot?.apk?.ver || '9.0.90'),
        }
        return Send(e, cmd, body, false, isQQ)
    } catch (error) {
        logger.error(`sendMessage failed: ${error.message}`, error)
    }
}

export const sendOidbSvcTrpcTcp = async (
    e,
    cmd,
    body,
    isQQ = false
) => {
    try {
        const bot = isQQ ? Bot[e] : e.bot;
        let type1, type2;
        if (Array.isArray(cmd) && cmd.length > 2) {
            (type1 = cmd[1]), (type2 = cmd[2]);
            cmd = String(cmd[0]);
        } else {
            cmd = Array.isArray(cmd) ? String(cmd[0]) : cmd;
            const sp = cmd
                .replace("OidbSvcTrpcTcp.", "")
                .split("_");
            (type1 = parseInt(sp[0], 16)), (type2 = parseInt(sp[1]));
        }
        const _body = {
            1: type1,
            2: type2,
            4: body,
            6: "android " + (bot?.apk?.ver || '9.0.90'),
        }
        const rsp = await Send(e, cmd, _body, false, isQQ)
        if (rsp[3] === 0)
            return rsp[4]
    } catch (error) {
        logger.error(`sendMessage failed: ${error.message}`, error)
    }
}


export const Elem = async (
    e,
    content
) => {
    try {
        const packet = {
            "1": {
                [e.isGroup ? "2" : "1"]: {
                    "1": e.isGroup ? e.group_id : e.user_id
                }
            },
            "2": {
                "1": 1,
                "2": 0,
                "3": 0
            },
            "3": {
                "1": {
                    "2": typeof content === 'object' ? content : JSON.parse(content)
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

export const SendLong_msg = async (
    e,
    resid
) => {
    try {
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
    const compressedData = await gzip(pb.encode(data))
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
    isSeq = false,
    cnt = 1
) => {
    const seq = parseInt(isSeq ? message_id : (await e.bot.sendApi('get_msg', {
        message_id: message_id
    }))?.real_seq)
    if (!seq) throw new Error("获取seq失败，请尝试更新napcat")

    const packet = {
        "1": {
            "1": e.group_id,
            "2": seq - cnt + 1,
            "3": Number(seq)
        },
        "2": 1
    }

    return Send(e, 'trpc.msg.register_proxy.RegisterProxy.SsoGetGroupMsg', packet)
}

// 仅用于方便用户手动输入pb时使用，一般不需要使用
export const processJSON = (json) => _processJSON(typeof json === 'string' ? JSON.parse(json) : json)

function _processJSON(json, path = []) {
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
                            result[numKey] = Buffer.from(hexStr, "hex")
                        } else {
                            result[numKey] = value
                        }
                    } else if (
                        currentPath.slice(-2).join(",") === "5,2" &&
                        isHexString(value)
                    ) {
                        result[numKey] = Buffer.from(value, "hex")
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