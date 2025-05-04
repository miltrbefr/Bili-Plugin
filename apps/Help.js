import plugin from '../../../lib/plugins/plugin.js';
import Render from '../model/renders.js';
import {style} from '../resources/help/imgs/config.js';
import _ from 'lodash';
import { Config as config, Button as Button} from "#model"

export class Help extends plugin {
    constructor() {
        super({
            name: "Bili:帮助",
            event: "message",
            priority: Number.MIN_SAFE_INTEGER,
            rule: [{
                    reg: '^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)(功能|菜单|帮助|指令|help)$',
                    fnc: "allHelp"
                },
                {
                    reg: '^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?视频(操作)?(功能|菜单|帮助|指令|help)$',
                    fnc: "videoHelp"
                },
                {
                    reg: '^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)?(站|瞻|蘸|占|战|斩|展|沾|栈|湛)?小功能帮助$',
                    fnc: "xgnHelp"
                }
            ]
        })
    }

    async xgnHelp(e) {
        const helpCfg = {
            "themeSet": false,
            "title": "小功能帮助",
            "subTitle": "BILI XGN HELP",
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
            },
            {
                group: '小功能(tips:推送功能支持QQBot推送啦~)',
                list: [{
                        icon: 82,
                        title: '今日运势',
                        desc: '查看今日运势'
                    },
                    {
                        icon: 2,
                        title: '节日推送(添加/删除)群',
                        desc: '添加群到节日推送列表'
                    },
                    {
                        icon: 25,
                        title: '节日查询',
                        desc: '查询最近的节日'
                    },
                    {
                        icon: 60,
                        title: '看<语音/文件/视频>',
                        desc: '群聊引用对应消息(支持Nap)'
                    },
                    {
                        icon: 50,
                        title: 'get',
                        desc: '群聊引用对应消息(支持Nap)'
                    },
                    {
                        icon: 35,
                        title: '全体假禁',
                        desc: '管理员权限(支持Nap)'
                    },
                    {
                        icon: 6,
                        title: '进群多久了<@>',
                        desc: '看看他进群多久了'
                    },
                    {
                        icon: 30,
                        title: '刷屏<数字>',
                        desc: '群聊引用对应消息(支持Nap)'
                    },
                    {
                        icon: 45,
                        title: '(取消)屏蔽<@>',
                        desc: '单群屏蔽某人(支持Nap)'
                    },
                    {
                        icon: 5,
                        title: '报时推送(添加/删除)群',
                        desc: '添加群到报时推送列表'
                    },
                    {
                        icon: 17,
                        title: '(#/*/%)兑换码',
                        desc: '获取米游社的游戏兑换码（注意命令前的符号）'
                    },
                    {
                        icon: 19,
                        title: '(添加/删除)撤回白名单群',
                        desc: '白名单群监听撤回消息并转发'
                    },
                    {
                        icon: 39,
                        title: '我(老婆/老公)呢',
                        desc: '娶群友小功能'
                    }
                ]
            }
        ]
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
        const image = await Render.render('help/index', {
            helpCfg,
            helpGroup,
            ...themeData,
            element: 'default'
        }, {
            e,
            retType: 'base64',
            scale: 1.6,
        })
        return  e.reply([image,new Button().help()])
    }

    async videoHelp(e) {
        const helpCfg = {
            "themeSet": false,
            "title": "视频帮助",
            "subTitle": "BILI VIDEO HELP",
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
            },
            {
                group: '配置说明',
                list: [{
                        icon: 10,
                        title: '(取消)点赞视频',
                        desc: '引用的视频进行(取消)点赞'
                    },
                    {
                        icon: 12,
                        title: '评论视频',
                        desc: '引用的视频进行评论'
                    },
                    {
                        icon: 13,
                        title: '(取消)收藏视频',
                        desc: '引用的视频进行(取消)收藏'
                    },
                    {
                        icon: 15,
                        title: '点踩视频',
                        desc: '对引用的视频进行点踩'
                    }, {
                        icon: 61,
                        title: '(关注/取关)主播',
                        desc: '引用视频关注/取关'
                    },
                    {
                        icon: 63,
                        title: '(取消)拉黑主播',
                        desc: '引用视频主播(取消)拉黑'
                    },
                    {
                        icon: 66,
                        title: '踢出粉丝',
                        desc: '引用视频踢出粉丝'
                    },
                ],
            }
        ]
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
        const image = await Render.render('help/index', {
            helpCfg,
            helpGroup,
            ...themeData,
            element: 'default'
        }, {
            e,
            retType: 'base64',
            scale: 1.6,
        })
        return  e.reply([image,new Button().help()])
    }

    async allHelp(e) {
        const helpCfg = {
            "themeSet": false,
            "title": "B站帮助",
            "subTitle": "BILI HELP",
            "colWidth": 265,
            "theme": "all",
            "themeExclude": [
                "default"
            ],
            "colCount": 4,
            "bgBlur": true
        }
        const helpList = [{
                group: '本插件均为开源项目，严禁将本库内容用于任何商业用途或违法行为'
            },
            {
                group: '登录与账号管理',
                list: [{
                        icon: 8,
                        title: '哔站登录',
                        desc: '进行扫码登录哔站'
                    },
                    {
                        icon: 9,
                        title: '退出哔站',
                        desc: '执行退出操作'
                    },
                    {
                        icon: 41,
                        title: '切换哔站账号2',
                        desc: '执行切换哔站账号，方便关闭投币'
                    },
                    {
                        icon: 38,
                        title: '刷新哔站ck',
                        desc: '刷新哔站登录凭证'
                    },
                    {
                        icon: 6,
                        title: '(我的/他的)哔站<@>',
                        desc: '获取账号的哔站信息'
                    },
                    {
                        icon: 5,
                        title: '哔站(重新)签到',
                        desc: '执行哔站签到，默认有自动签到'
                    },
                    {
                        icon: 60,
                        title: '哔站签到记录',
                        desc: '查看签到记录'
                    },
                    {
                        icon: 100,
                        title: '关闭投币',
                        desc: '关闭签到时的投币操作'
                    }
                ],
            },
            {
                group: '弹幕与直播',
                list: [{
                        icon: 40,
                        title: '向[房间号]发弹幕[内容]',
                        desc: '向指定直播间发送弹幕'
                    },
                    {
                        icon: 65,
                        title: '(开启/关闭)直播间弹幕',
                        desc: '发弹幕/点赞/分享直播间(续牌牌)'
                    },
                    {
                        icon: 98,
                        title: '开始推送直播间<房间号>',
                        desc: '实时推送直播间'
                    },
                    {
                        icon: 30,
                        title: '(我的/他的)主播去哪了<@>',
                        desc: '获取当前开播的主播'
                    },
                    {
                        icon: 39,
                        title: '查询up124,156',
                        desc: '查询up信息多个逗号隔开'
                    },
                    {
                        icon: 40,
                        title: '(添加/删除)弹幕(黑/白)名单<房间号>',
                        desc: '自动弹幕黑白名单'
                    },
                    {
                        icon: 15,
                        title: 'B站视频自动解析',
                        desc: '配置文件可关闭'
                    }
                ]
            },
            {
                group: '更多的帮助',
                list: [{
                    icon: 99,
                    title: '视频帮助',
                    desc: '查看如何快捷操作视频'
                }, {
                    icon: 89,
                    title: '小功能帮助',
                    desc: '看看有什么小功能吧'
                }, {
                    icon: 88,
                    title: '按钮发送',
                    desc: '快去给天如点star'
                }, {
                    icon: 99,
                    title: 'HDTianRu/Packet-plugin',
                    desc: '快去点star！！！'
                }]
            }
        ]
        if (e.isMaster) {

            helpList.push({
                group: '自动任务一览',
                list: [{
                        icon: 50,
                        title: '自动签到任务',
                        desc: `cron:${config.cron}`
                    },
                    {
                        icon: 51,
                        title: '自动弹幕任务',
                        desc: `cron:${config.livecron}`
                    },
                    {
                        icon: 7,
                        title: 'QQ日签卡任务',
                        desc: `cron:${config.QQDaily}`
                    },
                    {
                        icon: 78,
                        title: '群幸运字符任务',
                        desc: `cron:${config.luckywordcron}`
                    },
                    {
                        icon: 33,
                        title: '节日自动推送任务',
                        desc: `cron:${config.festivalpush}`
                    }
                ]
            });

            helpList.push({
                group: '管理命令，仅主人可用',
                list: [{
                        icon: 85,
                        title: '#(强制)哔站更新',
                        desc: '更新插件'
                    },
                    {
                        icon: 90,
                        title: '#日签打卡',
                        desc: '手动执行打卡'
                    },
                    {
                        icon: 100,
                        title: '幸运字符(vip)(添加/删除)机器人<QQ>',
                        desc: '机器人是vip可以抽3次'
                    },
                    {
                        icon: 71,
                        title: '幸运字符(取消)(拉黑/加白)群<群号>',
                        desc: '黑白名单操作'
                    },
                    {
                        icon: 55,
                        title: '执行抽幸运字符',
                        desc: '手动执行抽幸运字符任务'
                    },
                    {
                        icon: 88,
                        title: '哔站全部签到',
                        desc: '所有账号的签到'
                    },
                    {
                        icon: 32,
                        title: '哔站用户统计',
                        desc: '统计用户数量'
                    },
                    {
                        icon: 18,
                        title: '校验哔站插件',
                        desc: '手动校验插件可用性'
                    }
                ]
            });
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
        const image = await Render.render('help/index', {
            helpCfg,
            helpGroup,
            ...themeData,
            element: 'default'
        }, {
            e,
            retType: 'base64',
            scale: 1.6,
        })
        return  e.reply([image,new Button().help()])
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
        let css = function(sel, css, key, def, fn) {
            let val = (function() {
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