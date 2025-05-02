export const getgroupfile = async (fid, e) => {
    try {
        const file = await _resolve(fid, e)
        const body = {
            3: {
                1: e.group_id,
                2: 2,
                3: file.busid,
                4: file.fid,
            },
        }
        const payload = await Packet.sendOidbSvcTrpcTcp(e, "OidbSvcTrpcTcp.0x6d6_2", body)
        const rsp = payload[3]
        const hex = Buffer.from(rsp[6], 'base64').toString('hex')
        return {
            name: file.name,
            url: encodeURI(`http://${rsp[4]}/ftn_handler/${hex}/?fname=${file.name}`),
            size: file.size,
            md5: file.md5,
            duration: file.duration,
            fid: file.fid,
        }
    } catch (error) {
        logger.error(`获取群 ${e.group_id} 的 ${fid} 文件直链失败`, error)
    }
}

export const _resolve = async (fid, e) => {
    try {
        const body = {
            1: {
                1: e.group_id,
                2: 0,
                4: String(fid),
            },
        }
        let rsp = await Packet.sendOidbSvcTrpcTcp(e, "OidbSvcTrpcTcp.0x6d8_0", body)
        let file = rsp[1][4]
        if (!rsp[1])
            return
        const md5 = Buffer.from(file[12], 'base64').toString('hex')
        const sha1 = Buffer.from(file[10], 'base64').toString('hex')
        const stat = {
            fid: String(file[1]),
            pid: String(file[16]),
            name: String(file[2]),
            busid: file[4],
            size: file[5],
            md5,
            sha1,
            create_time: file[6],
            duration: file[7],
            modify_time: file[8],
            user_id: file[15],
            download_times: file[9],
            is_dir: false,
        }
        if (stat.fid.startsWith("/"))
            stat.fid = stat.fid.slice(1);
        return stat
    } catch (error) {
        logger.error(`获取群 ${e.group_id} 的 ${fid} 文件信息失败`, error)
    }
}