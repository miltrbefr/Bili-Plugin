export default class Button {
    wdlp() {
        return segment.button([
            { text: "我老婆呢", callback: `我老婆呢` },
            { text: "我老公呢", callback: `我老公呢` },
        ], [
            { text: "看看别的？", callback: `小功能帮助` },
            { text: "今日运势", callback: `今日运势` },
        ])
    }

    bind() {
        return segment.button([
            { text: "登录", callback: `B站登录` },
            { text: "我的B站", callback: `我的B站` },
        ], [
            { text: "刷新CK", callback: `#刷新B站ck` },
            { text: "B站帮助", callback: `B站帮助` },
        ])
    }


    info() {
        return segment.button([
            { text: "登录", callback: `B站登录` },
            { text: "我也要看", callback: `我的B站` },
        ], [
            { text: "刷新CK", callback: `#刷新B站ck` },
            { text: "B站帮助", callback: `B站帮助` },
        ])
    }

    help() {
        return segment.button([
            { text: "登录", callback: `#B站登录` },
            { text: "刷新", input: `#刷新B站ck` },
            { text: "菜单", input: `#B站功能` },
            { text: "信息", callback: `#我的哔站` },
        ], [
            { text: "签到", input: `#B站签到` },
            { text: "切换", input: `#切换B站账号2` },
            { text: "记录", callback: `#B站签到记录` },
        ], [
            { text: "开启投币", input: `#开启投币` },
            { text: "关闭投币", input: `#关闭投币` },
            { text: "重新签到", input: `#B站重新签到` },
        ],[
            { text: "开启弹幕", callback: `#开启直播间弹幕` },
            { text: "关闭弹幕", callback: `#关闭直播间弹幕` },
        ])
    }

    Operate() {
        return segment.button([
            { text: "登录", callback: `#B站登录` },
            { text: "点赞", input: `#B站点赞视频` },
            { text: "收藏", input: `#B站收藏视频` },
        ], [
            { text: "不喜欢", input: `#B站不喜欢视频` },
            { text: "取消点赞", input: `#B站取消点赞视频` },
            { text: "取消收藏", input: `#B站取消收藏视频` },
        ], [
            { text: "点踩", input: `#B站点踩视频` },
            { text: "三连", input: `#B站一键三连视频` },
            { text: "评论", input: `#B站评论视频` },
        ], [
            { text: "关注", input: `#B站关注煮波` },
            { text: "拉黑", input: `#B站拉黑煮波` },
        ], [
            { text: "踢出", input: `#B站踢出粉丝煮波` },
            { text: "取消关注", input: `#B站取消关注煮波` },
            { text: "取消拉黑", input: `#B站取消拉黑煮波` },
        ])
    }
}