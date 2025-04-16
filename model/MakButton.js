import configs from '../model/Config.js'
import {ulid} from 'ulid'
class Button {
    constructor() {}

    chunkArray(array, chunkSize = 3) {
        const result = []
        for (let i = 0; i < array.length; i += chunkSize) {
          result.push(array.slice(i, i + chunkSize))
        }
        return result
      }
    
      makeButton(button, style) {
        const msg = {
          id: ulid(),
          render_data: {
            label: button.text,
            visited_label: button.clicked_text,
            style,
            ...button.QQBot?.render_data,
          },
          appid: 102089849
        }
    
        if (button.link)
          msg.action = {
            type: 0,
            permission: {
              type: 2
            },
            data: button.link,
            ...button.QQBot?.action,
          }
        else if (button.input)
          msg.action = {
            type: 2,
            permission: {
              type: 2
            },
            data: button.input,
            enter: button.send,
            ...button.QQBot?.action,
          }
        else if (button.callback)
          msg.action = {
            type: 2,
            permission: {
              type: 2
            },
            data: button.callback,
            enter: true,
            ...button.QQBot?.action,
          }
        else return false
        return msg
      }
    
      makeButtons(button_square) {
        const msgs = []
        const random = Math.floor(Math.random() * 2)
        const validTypes = (configs.buttonType || [])
        .map(item => Number(item))
        .filter(num => !isNaN(num) && Number.isInteger(num));
        let typeIndex = 0;
        if (validTypes.length > 0) {
         typeIndex = Math.floor(Math.random() * validTypes.length);
        } 
        for (const button_row of button_square) {
          let column = 0
          const buttons = []
          for (let button of button_row) {
            let style
            if (validTypes.length > 0) {
                style = validTypes[typeIndex]
                typeIndex = (typeIndex + 1) % validTypes.length
            } else style = (random + msgs.length + buttons.length) % 2
            button = this.makeButton(button,style)
            if (button) buttons.push(button)
          }
          if (buttons.length)
            msgs.push({
              buttons
            })
        }
        return msgs
      }
    
      button(elem) {
        const content = elem
        const _content = {
          1: {
            1: content.rows.map(row => {
              return {
                1: row.buttons.map(button => {
                  return {
                    1: button.id,
                    2: {
                      1: button.render_data.label,
                      2: button.render_data.visited_label,
                      3: button.render_data.style
                    },
                    3: {
                      1: button.action.type,
                      2: {
                        1: button.action.permission.type,
                        2: button.action.permission.specify_role_ids,
                        3: button.action.permission.specify_user_ids,
                      },
                      4: "err",
                      5: button.action.data,
                      7: button.action.reply ? 1 : 0,
                      8: button.action.enter ? 1 : 0
                    }
                  }
                })
              }
            }),
            2: content.appid
          }
        }
        return {
          53: {
            1: 46,
            2: _content,
            3: 1
          }
        }
      }

}

export default new Button()