import configs from '../model/Config.js';
let attempts = 0
const maxAttempts = 20
const delay = 100
const checkAdapters = async () => {
    const ICQQ = Bot.adapter.find(adapter => adapter.name === 'ICQQ')
    const setupICQQ = (adapter) => {
        adapter.sendMsg = async function(id, pick, msg, ...args) {
            const rets = {
                message_id: [],
                data: [],
                error: []
            }
            try {
                const processMessages = async () => {
                    const processed = {
                        buttonMsgs: [],
                        normalMsgs: [],
                        rawMsgs: Array.isArray(msg) ? [...msg] : [msg]
                    }
                    for (const item of processed.rawMsgs) {
                        const type = item?.type;
                        if (type === 'button') {
                            processed.buttonMsgs.push({
                                type: "button",
                                appid: this.markdown_appid,
                                content: {
                                    rows: this.makeButtons(id, pick, item.data)
                                },
                            })
                        } else {
                            processed.normalMsgs.push(item);
                        }
                    }
                    let normalMsgs = await this.makeMsg(id, pick, processed.normalMsgs);
                    if (normalMsgs.length === 0) {
                        return {
                            messages: processed.buttonMsgs,
                        }
                    }
                    if (Array.isArray(normalMsgs) && normalMsgs.length > 0 && Array.isArray(normalMsgs[0]))
                        normalMsgs = normalMsgs[0]

                    return {
                        messages: configs.sendbutton ? [...normalMsgs, ...processed.buttonMsgs] : normalMsgs,
                    }
                }
                let { messages } = await processMessages()
                const sendMsg = async () => {
                    for (const i of messages) try {
                        Bot.makeLog("debug", ["发送消息", i], id)
                        const ret = await pick.sendMsg(i, ...args)
                        Bot.makeLog("debug", ["发送消息返回", ret], id)
                        rets.data.push(ret)
                        if (ret.message_id)
                            rets.message_id.push(ret.message_id)
                    } catch (err) {
                        rets.error.push(err)
                        return false
                    }
                }
                if (await sendMsg() === false) {
                    messages = await this.makeMsg(id, pick,
                        [await Bot.makeForwardMsg([{ message: messages }])])
                    await sendMsg()
                }
                return rets.data.length === 1 ? rets.data[0] : rets
            } catch (error) {
                Bot.makeLog("error", ["消息发送错误", messages, error], id)
                rets.error.push(error)
                return rets
            }
        }
    }
    const handleAdapters = () => {
        if (ICQQ) setupICQQ(ICQQ)
    }
    if (ICQQ) {
        handleAdapters()
        return
    }
    attempts++
    if (attempts >= maxAttempts) {
        handleAdapters()
        return
    }
    await new Promise(resolve => setTimeout(resolve, delay))
    await checkAdapters()
}
if(configs.sendbutton) checkAdapters()