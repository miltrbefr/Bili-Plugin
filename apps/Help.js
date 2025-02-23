import plugin from '../../../lib/plugins/plugin.js';
import Render from '../model/renders.js';
import { style } from '../resources/help/imgs/config.js';
import config from '../model/Config.js';
import _ from 'lodash';

export class Help extends plugin {
    constructor() {
        super({
            name: "[Bili-Plugin]",
            event: "message",
            priority: 1008,
            rule: [
                {
                    reg: '^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)(功能|菜单|帮助|指令|help)$',
                    fnc: "allHelp"
                }
            ]
        })
    }

    async allHelp(e) {
        const helpCfg = {
            "themeSet": false,
            "title": "BILI-PLUGIN 帮助",
            "subTitle": "BILI-PLUGIN HELP",
            "colWidth": 265,
            "theme": "all",
            "themeExclude": [
                "default"
            ],
            "colCount": 3,
            "bgBlur": true
        }
        const helpList = [{
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
                  icon: 82,
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
          }]

          if (e.isMaster) {
            helpList.push( {
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
                  icon: 78,
                  title: '群幸运字符任务',
                  desc: `您的cron为:${config.luckywordcron}`
              }, {
                  icon: 33,
                  title: '节日自动推送任务',
                  desc: `您的cron为:${config.festivalpush}`
              }]
              }
            )
        }
        if (e.isMaster) {
            helpList.push({
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
              })
        }

        let helpGroup = []
        _.forEach(helpList, (group) => {
            _.forEach(group.list, (help) => {
                let icon = help.icon * 1
                if (!icon) {
                    help.css = 'display:none'
                } else {
                    let x = (icon - 1) % 10
                    let y = (icon - x - 1) / 10
                    help.css = `background-position:-${x * 50}px -${y * 50}px`
                }
            })
            helpGroup.push(group)
        })

        let themeData = await this.getThemeData(helpCfg, helpCfg)
        return await Render.render('help/index', {
            helpCfg,
            helpGroup,
            ...themeData,
            element: 'default'
        }, { e, scale: 1.6 })
    }

    async getThemeData(diyStyle, sysStyle) {
        let resPath = '{{_res_path}}/help/imgs/'
        let helpConfig = _.extend({}, sysStyle, diyStyle)
        let colCount = Math.min(5, Math.max(parseInt(helpConfig?.colCount) || 3, 2))
        let colWidth = Math.min(500, Math.max(100, parseInt(helpConfig?.colWidth) || 265))
        let width = Math.min(2500, Math.max(800, colCount * colWidth + 30))
        let theme = {
            main: `${resPath}/bg.jpg`,
            bg: `${resPath}/bg.jpg`,
            style: style
        }
        let themeStyle = theme.style || {}
        let ret = [`
          body{background-image:url(${theme.bg}) no-repeat;width:${width}px;}
          .container{background-image:url(${theme.main});background-size:cover;}
          .help-table .td,.help-table .th{width:${100 / colCount}%}
          `]
        let css = function (sel, css, key, def, fn) {
            let val = (function () {
                for (let idx in arguments) {
                    if (!_.isUndefined(arguments[idx])) {
                        return arguments[idx]
                    }
                }
            })(themeStyle[key], diyStyle[key], sysStyle[key], def)
            if (fn) {
                val = fn(val)
            }
            ret.push(`${sel}{${css}:${val}}`)
        }
        css('.help-title,.help-group', 'color', 'fontColor', '#ceb78b')
        css('.help-title,.help-group', 'text-shadow', 'fontShadow', 'none')
        css('.help-desc', 'color', 'descColor', '#eee')
        css('.cont-box', 'background', 'contBgColor', 'rgba(43, 52, 61, 0.8)')
        css('.cont-box', 'backdrop-filter', 'contBgBlur', 3, (n) => diyStyle.bgBlur === false ? 'none' : `blur(${n}px)`)
        css('.help-group', 'background', 'headerBgColor', 'rgba(34, 41, 51, .4)')
        css('.help-table .tr:nth-child(odd)', 'background', 'rowBgColor1', 'rgba(34, 41, 51, .2)')
        css('.help-table .tr:nth-child(even)', 'background', 'rowBgColor2', 'rgba(34, 41, 51, .4)')
        return {
            style: `<style>${ret.join('\n')}</style>`,
            colCount
        }
    }
}
