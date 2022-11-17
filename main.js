const superagent = require('superagent');
const readline = require('readline');
const fs = require('fs');
//读取设置
let config = {}, lastDataPack = {};
if (fs.existsSync('./config.json')) config = JSON.parse(fs.readFileSync('./config.json'));
else {
    fs.writeFileSync('./config.json', JSON.stringify({ dynmapMain: '', username: '', password: '' }));
    return console.log('请先填写config文件！');
}
//初始化常量
const dynmapMain = config.dynmapMain;
const styles = {
    'bold': '\x1B[1m',
    'italic': '\x1B[3m',
    'underline': '\x1B[4m',
    'inverse': '\x1B[7m',
    'strikethrough': '\x1B[9m',
    'white': '\x1B[37m',
    'grey': '\x1B[90m',
    'black': '\x1B[30m',
    'blue': '\x1B[34m',
    'cyan': '\x1B[36m',
    'green': '\x1B[32m',
    'magenta': '\x1B[35m',
    'red': '\x1B[31m',
    'yellow': '\x1B[33m',
    'whiteBG': '\x1B[47m',
    'greyBG': '\x1B[49;5;8m',
    'blackBG': '\x1B[40m',
    'blueBG': '\x1B[44m',
    'cyanBG': '\x1B[46m',
    'greenBG': '\x1B[42m',
    'magentaBG': '\x1B[45m',
    'redBG': '\x1B[41m',
    'yellowBG': '\x1B[43m'
};
//日志模块
const log = (text) => {
    console.log(text);
    let date = new Date();
    let file = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDay()}`;
    fs.appendFileSync(`./logs/${file}.log`, text + '\n');
}
//设置消息接收模块
let lastTimeStamp = 0;
const parseTime = (timestamp) => new Date(timestamp).toLocaleString();
const getEvent = (time) => {
    try {
        superagent.get(`${dynmapMain}/up/world/world/${new Date().getTime() - time}`).end((err, res) => {
            if (err) return log(styles['red'] + err.message + styles['white']);
            let json = JSON.parse(res.text);
            let tempStamp = lastTimeStamp;
            if (json.updates != null) {
                for (let i = 0; i < json.updates.length; i++) {
                    if (json.updates[i].type == 'chat' && json.updates[i].timestamp > lastTimeStamp) {
                        if (json.updates[i].source == 'player') {
                            log(`[${parseTime(json.updates[i].timestamp)}] <${json.updates[i].account}> ${json.updates[i].message}`);
                            tempStamp = Math.max(tempStamp, json.updates[i].timestamp);
                        }
                        if (json.updates[i].source == 'web') {
                            log(`${styles['green']}[${parseTime(json.updates[i].timestamp)}] ${json.updates[i].playerName}(卫星上) ${json.updates[i].message}${styles['white']}`);
                            tempStamp = Math.max(tempStamp, json.updates[i].timestamp);
                        }
                    }
                    if (json.updates[i].type == 'playerjoin' && json.updates[i].timestamp > lastTimeStamp) {
                        log(`${styles['yellow']}[${parseTime(json.updates[i].timestamp)}] ${json.updates[i].account} 加入了服务器${styles['white']}`);
                        tempStamp = Math.max(tempStamp, json.updates[i].timestamp);
                    }
                    if (json.updates[i].type == 'playerquit' && json.updates[i].timestamp > lastTimeStamp) {
                        log(`${styles['yellow']}[${parseTime(json.updates[i].timestamp)}] ${json.updates[i].account} 退出了服务器${styles['white']}`);
                        tempStamp = Math.max(tempStamp, json.updates[i].timestamp);
                    }
                }
            }
            lastTimeStamp = tempStamp;
            lastDataPack = json;
        });
    } catch (err) {
        log(styles['red'] + err.message + styles['white']);
    }
}
//设置输入消息模块
const onCommand = (cmd) => {
    if (cmd == 'help') return '/list 查看玩家列表';
    if (cmd == 'list') {
        let players = lastDataPack.players, s = [];
        for (let i = 0; i < players.length; i++)
            s.push(players[i].account);
        return `当前在线玩家：${s.join(' , ')}`;
    }
    return 'Unknown Command, type /help for help';
}
readline.createInterface({
    input: process.stdin,
    output: process.stdout
}).on('line', (input) => {
    if (input.startsWith('/')) {
        let ret = onCommand(input.substring(1));
        if (ret != null) log(ret);
    }
    else
        try {
            let username = config.username, password = config.password;
            if (username == null || username == '' || password == null || password == '') return;
            superagent.get(`${dynmapMain}/up/login?j_username=${username}&j_password=${password}`).set({
                Accept: 'application/json, text/javascript',
                'Content-Type': 'application/json; charset=UTF-8'
            }).end((err, res) => {
                if (err) return log(styles['red'] + '登录失败！' + styles['white']);
                let cookie = res.headers['set-cookie'][0].split(';')[0];
                superagent.post(`${dynmapMain}/up/sendmessage`).set({
                    Accept: 'application/json, text/javascript',
                    Cookie: cookie,
                    'Content-Type': 'application/json; charset=UTF-8'
                }).send({ name: '', message: input }).then((res) => {
                    let error = JSON.parse(res.text).error;
                    if (error != 'none') log(styles['red'] + '消息发送失败：' + error + styles['white']);
                });
            });
        } catch (err) {
            log(styles['red'] + err.message + styles['white']);
        }
});
//主代码
getEvent(1000000);
setInterval(() => getEvent(5000), 1000);