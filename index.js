var Botkit = require('botkit');
var os = require('os');
var _ = require('lodash');
var dateFormat = require('dateformat');

var users, ims, channels;
var statuses = {};

var BOT_USERS = ['scrumbot', 'slackbot'];

var controller = Botkit.slackbot({
  debug: true
});

var bot = controller.spawn({
  token: 'xoxb-17810069398-ZmCA8R9vftSi3rAMp5A2ppq0'
});

bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
  _.remove(payload.users, function(user) {
    return _.contains(BOT_USERS, user.name);
  });
  users = payload.users;
  ims = payload.ims;
  channels = payload.channels;
  console.log(formatJson(channels));
});

controller.hears(['status', 'init', '^s$'],'direct_message,direct_mention,mention',function(bot, message) {

  console.log(message);
  bot.reply(message,':robot_face: Začínám zjišťovat status.');

  var actualStatuses = statuses[dateFormat(new Date(), "yy-mm-dd h:MM")] = {};

  _.forEach(users, function (user) {

    function askYesterday(response, convo) {
      convo.ask("Ahoj :simple_smile: Na čem jsi pracoval včera?", function(response, convo) {
        actualStatuses[user.name] = {
          yesterday: response.text
        };
        askToday(response, convo);
        convo.next();
      });
    }

    function askToday(response, convo) {
      convo.ask("A na čem budeš pracovat dnes?", function(response, convo) {
        actualStatuses[user.name].today = response.text;

        askBlocking(response, convo);
        convo.next();
      });
    }

    function askBlocking(response, convo) {
      convo.ask("Je něco, s čím potřebuješ pomoct?", function(response, convo) {
        actualStatuses[user.name].blocking = response.text;
        convo.say("Ok, díky :simple_smile: Až budu mít odpovědi i od ostatních, pošlu to do channelu #status. Tvoje odpověď je: ```" + formatJson(actualStatuses[user.name]) + '```');
        convo.next();

        bot.say({
          text: 'Hotovo. Status je: ```' + formatJson(actualStatuses) + '```',
          channel: _.find(channels, {name: 'status'}).id
        });
      });
    }

    bot.startConversation({
      channel: _.find(ims, {user: user.id}).id,
      event: 'direct_message',
      type: 'message',
      user: user.id
    }, askYesterday);
  });
});

controller.hears(['users'],'direct_message,direct_mention,mention',function(bot, message) {
  bot.reply(message,'```' + formatJson(users) + '```');
});


controller.hears(['uptime','identify yourself','who are you','what is your name', 'kdo jsi'],'direct_message,direct_mention,mention',function(bot, message) {
  var hostname = os.hostname();
  var uptime = formatUptime(process.uptime());

  bot.reply(message,':robot_face: Jsem <@' + bot.identity.name + '>. Jedu zatím ' + uptime + ' na ' + hostname + '.');
});

controller.hears(['help'],'direct_message,direct_mention,mention',function(bot, message) {
  bot.reply(message,':robot_face: Zatím nemám nápovědu. Smůla. :fu:');
});


function formatUptime(uptime) {
  var unit = 's';
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'min';
  }
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'h';
  }
  if (uptime != 1) {
    unit = unit + 's';
  }

  uptime = uptime + ' ' + unit;
  return uptime;
}

function formatJson(json) {
  return JSON.stringify(json, null, 2);
}