import {
  pluginName
} from "./constant.js"
import config from '../model/Config.js';


export const helpCfg = {
  title: '哔站帮助',
  subTitle: `${pluginName || 'Bili-Plugin'}`,
  columnCount: 3,
  colWidth: 265,
  theme: 'all',
  themeExclude: [ /*'default'*/ ],
  style: {
      fontColor: '#d3bc8e',
      descColor: '#eee',
      contBgColor: 'rgba(14, 53, 79, 0.5)',
      contBgBlur: 3,
      headerBgColor: 'rgba(6, 21, 31, .4)',
      rowBgColor1: 'rgba(6, 21, 31, .2)',
      rowBgColor2: 'rgba(6, 21, 31, .35)'
  }
}

export const helpList = [{
  group: '本插件均为开源项目，严禁将本库内容用于任何商业用途或违法行为'
}, {
  group: '相关命令',
  list: [{
          icon: 8,
          title: '哔站登录',
          desc: '进行扫码登录哔站'
      }, {
          icon: 9,
          title: '退出哔站',
          desc: '执行退出操作'
      }, {
          icon: 5,
          title: '哔站(重新)签到',
          desc: '执行哔站签到，默认有自动签到'
      },
      {
          icon: 6,
          title: '(我的/他的)哔站<@>?',
          desc: '获取哔站信息<可艾特别人>'
      },
      {
          icon: 41,
          title: '切换哔站账号2',
          desc: '执行切换哔站账号，方便关闭投币'
      },
      {
          icon: 19,
          title: '(开启/关闭)投币',
          desc: '如题'
      },
      {
          icon: 60,
          title: '哔站签到记录',
          desc: '如题'
      },
      {
          icon: 40,
          title: '向[房间号]发弹幕[内容]',
          desc: '如题'
      },
      {
          icon: 36,
          title: '哔站更新日志',
          desc: '如题'
      },
      {
          icon: 65,
          title: '(开启/关闭)直播间弹幕',
          desc: '打开弹幕功能，先已开播主播发送一句话'
      }, {
          icon: 30,
          title: '(我的/他的)主播去哪了<@>',
          desc: '获取当前开播主播<可艾特别人>'
      }, {
          icon: 38,
          title: '刷新哔站ck',
          desc: '如题'
      }, {
          icon: 25,
          title: '(添加/删除)弹幕(白/黑)名单<房间号>',
          desc: '在打开自动弹幕情况下，只向某些房间或不向某些房间发弹幕'
      }, {
          icon: 32,
          title: '哔站用户统计',
          desc: '进行统计用户数量(仅主人)'
      }, {
          icon: 18,
          title: '哔站插件统计|校验哔站插件',
          desc: '手动校验插件可以性并获取统计信息(仅主人)'
      }, {
        icon: 17,
        title: '(#/*/%)兑换码',
        desc: '获取米游社的游戏兑换码(注意命令前的符号)'
    }, {
        icon: 15,
        title: 'B站视频自动解析(配置文件可关闭)',
        desc: '支持链接、小程序等'
    },{
        icon: 6,
        title: '(点赞/取消点赞/评论/收藏/取消收藏/点踩)视频',
        desc: '通过引用别人或自己或机器人的B站视频进行快捷操作'
    },{
        icon: 8,
        title: '今日运势',
        desc: '看看今天运势怎么样吧！'
    },{
        icon: 2,
        title: '节日推送(添加|删除)群',
        desc: '每天进行推送最近节日(群管理权限)'
    },{
        icon: 25,
        title: '节日查询',
        desc: '看看什么时候过节吧~'
    }, {
        icon: 39,
        title: '查询up123456,789456',
        desc: `批量查询up主基本信息`
    }, {
        icon: 60,
        title: '(关注|取关|拉黑|取消拉黑|踢出粉丝)主播',
        desc: `通过引用别人或自己或机器人的B站视频进行快捷操作`
    }, {
        icon: 98,
        title: '开始推送直播间<房间号>',
        desc: `实时推送直播间信息`
    }
  ]
}, {
  group: '自动任务一览',
  list: [{
      icon: 5,
      title: '自动签到任务',
      desc: `您的cron为:${config.cron}`
  }, {
      icon: 6,
      title: '自动弹幕任务',
      desc: `您的cron为:${config.livecron}`
  }, {
      icon: 7,
      title: 'QQ日签卡任务',
      desc: `您的cron为:${config.QQDaily}`
  }, {
    icon: 8,
    title: '群幸运字符任务',
    desc: `您的cron为:${config.luckywordcron}`
}, {
    icon: 33,
    title: '节日自动推送任务',
    desc: `您的cron为:${config.festivalpush}`
}]
}, {
  group: '管理命令，仅主人可用',
  list: [{
      icon: 85,
      title: '#(强制)哔站更新',
      desc: '更新插件'
  }, {
      icon: 88,
      title: '哔站全部签到',
      desc: '手动执行签到'
  }, {
      icon: 90,
      title: '#日签打卡',
      desc: '手动执行打卡'
  }, {
    icon: 99,
    title: '幸运字符(vip)(添加/删除)机器人<QQ>',
    desc: '添加抽群字符机器人列表,是vip可在指令里加vip(抽3次)'
}, {
    icon: 70,
    title: '幸运字符(取消)(拉黑/加白)群<群号>',
    desc: '黑白名单操作(优先白名单,过滤黑名单)'
}, {
    icon: 55,
    title: '执行抽幸运字符',
    desc: '手动执行抽幸运字符任务'
}]
}]