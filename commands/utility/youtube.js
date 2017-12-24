const request = require('request'),
req = (obj, POST) => {
    return new Promise((res, rej) => {
        (POST ? request.post : request)(obj, (e, r, body) => {
            if (e || r.statusCode == '404') {
                rej(e);
                return;
            }
            res({res: r, body: body});
        });
    });
};

module.exports = (OpalBot) => {
    const out = {},
    i18n = OpalBot.i18n;
    
    out.peasants = {};
    out.peasants.yt = 'youtube';
    out.peasants.youtube = async (message, content, lang) => {
        if (!content) {
            message.channel.send(i18n.msg('usage', 'youtube', lang)).catch(OpalBot.util.log);
            return;
        }
    
        let downloading = false,
        flags = i18n.msg('download-flags', 'youtube', lang).split('|')
        i = flags.length;
        while (i--) {
            if (
                downloading = content.startsWith('--' + flags[i])
            ) {
                content = content.slice(flags[i].length + 2);
                break;
            }
        }
        
        let res,
        body;
        try {
            let re = await req({
                url: 'https://www.googleapis.com/youtube/v3/search',
                qs: {
                    part: 'snippet',
                    q: content,
                    key: process.env.youtube_token,
                    type: 'video'
                }
            });
            res = re.res;
            body = re.body;
        } catch(e) { return; }
    
        async function result(video) {
            if (downloading) {
                OpalBot.commands.peasants.mp3(message, video.id.videoId, lang, i18n, OpalBot);
                return;
            }
            message.channel.send(`https://youtu.be/${video.id.videoId}`).catch(OpalBot.util.log);
        }
        let r = JSON.parse(body).items,
        titles = r.map(obj => obj.snippet.title);
        if (!r.length) {
            message.channel.send(i18n.msg('no-results', 'youtube', lang)).catch(OpalBot.util.log);
            return;
        }
        let bot_message = null,
        blocked = OpalBot.unprefixed.push({
            type: 'youtube',
            triggers: Array(r.length).fill(undefined).map((n, i) => String(i + 1)),
            callback: (msg, index) => {
                result(r[index]);
                if (msg.deletable) {
                    msg.delete();
                }
                if (bot_message && bot_message.deletable) {
                    bot_message.delete();
                }
            },
            user: message.author.id,
            channel: message.channel.id,
            timeout: 20000,
            ontimeout: () => {
                message.channel.send(i18n.msg('timed-out', 'youtube', lang)).catch(OpalBot.util.log);
            }
        });
        if (blocked === true) {
            result(r[0]);
        } else {
            let list = '';
            for (let i in titles) {
                list += `\n[${Number(i) + 1}] - ${titles[i]}`
            }
            bot_message = await message.channel.send('```' + list.slice(1) + '```').catch(OpalBot.util.log);
        }
    };

    return out;
};