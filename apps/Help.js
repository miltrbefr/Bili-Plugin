import lodash from 'lodash'
import render from "../model/render.js"
import HelpTheme from './help/HelpTheme.js'
import {
  helpCfg,
  helpList
} from "../model/help.js"


export class Bilihelp extends plugin {
  constructor() {
    super({
      name: '[Bili-Plugin]',
      dsc: '帮助',
      event: 'message',
      priority: 100,
      rule: [{
        reg: '^#?(B|b|币|逼|比|🖊|毕|哔|必|壁)(站|瞻|蘸|占|战|斩|展|沾|栈|湛)(功能|菜单|帮助|指令|help)$',
        fnc: 'help'
      }]
    })
  }

  async help (e) {
    let helpGroup = []

    lodash.forEach(helpList, (group) => {
      if (group.auth && group.auth === 'master' && !e.isMaster) {
        return true
      }

      lodash.forEach(group.list, (help) => {
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
    let themeData = await HelpTheme.getThemeData(helpCfg)
    return await render('help/index', {
      helpCfg: helpCfg,
      helpGroup,
      ...themeData,
    //   element: 'default'
    }, {
      e, scale: 1.2
    })
  }
}