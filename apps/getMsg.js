export class getMsg extends plugin {
  constructor() {
      super({
          name: "取消息",
          event: "message.group",
          priority: 1000,
          rule: [{
              reg: "^#?get$",
              fnc: "get"
          }]
      })
  }

  async get(e) {
      if (!['ICQQ', 'OneBotv11'].includes(e?.bot?.adapter?.name)) return false
      let id = e.reply_id ? e.reply_id : e.source.seq
      if (!id) return e.reply("请回复要get的消息")
      let isSeq = e?.bot?.adapter?.name === 'ICQQ'
      const data = await Packet.getMsg(
          e,
          id,
          isSeq
      )
      const forwardNodes = []
      const msg = []
      let target = data?.["3"]?.["6"]?.["3"]?.["1"]?.["2"]
      let g = false
      if (!Array.isArray(target)) {
          target = [target]
          g = true
      }
      msg.push("pb(elem):")
      if (!g) msg.push("可使用rjPacket.Elem(this.e, { } )进行发送pb消息")
      for (const i of target) {
          msg.push(JSON.stringify(i, Packet.replacer, 2))
      }
      msg.push("pb(raw):")
      msg.push(JSON.stringify(data, Packet.replacer, 2))
      for (const i of msg) {
          forwardNodes.push({
              user_id: e.user_id,
              nickname: e.sender.nickname,
              message: i
          })
      }
      const forwardMessage = await Bot.makeForwardMsg(forwardNodes)
      e.reply(forwardMessage)
  }
}