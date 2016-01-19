var Botkit = require('botkit');
var os = require('os');
var _ = require('lodash');
var dateFormat = require('dateformat');
var config = require('./config');

var users, ims, channels, statusChannel;
var statuses = {};

var controller = Botkit.slackbot({
  debug: true
});

var bot = controller.spawn({
  token: config.token
});

bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
  ims = payload.ims;
  channels = payload.channels;

  statusChannel = _.find(channels, {name: config.statusChannelName});
  console.log('members: ', statusChannel.members);

  users = _.filter(payload.users, function (user) {
    return _.contains(statusChannel.members, user.id);
  });
  console.log('users for status channel:' + _.map(users, 'name'));

});

controller.hears(['status', 'init', '^s$'],'direct_message,direct_mention,mention',function(bot, message) {

  console.log(message);
  bot.reply(message,':robot_face: Začínám zjišťovat status.');

  var actualStatuses = statuses[dateFormat(new Date(), "yy-mm-dd h:MM")] = {};

  _.forEach(users, function (user) {
    if (user.is_bot || user.name === 'slackbot') {
      return;
    }
    console.log('starting conversation with user: ' + user.name);
    actualStatuses[user.name] = {};

    function askYesterday(response, convo) {
      convo.ask("Ahoj :simple_smile: Na čem jsi pracoval včera?", function(response, convo) {
        actualStatuses[user.name].yesterday = response.text;
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
        actualStatuses[user.name].finished = true;
        convo.say("Ok, díky :simple_smile: Až budu mít odpovědi i od ostatních, pošlu to do channelu #status. Tvoje odpověď je: ```" + formatJson(actualStatuses[user.name]) + '```');
        convo.next();

        var isFinished = true;
        _.forOwn(actualStatuses, function (userStatus) {
          if (!userStatus.finished) {
            isFinished = false;
          }
        });

        if (isFinished) {
          bot.say({
            text: '!channel: Status je:\n' + formatStatus(actualStatuses),
            channel: _.find(channels, {name: config.statusChannelName}).id
          });
        }
      });
    }

    bot.api.im.open({user: user.id}, function (err, response) {
      bot.startConversation({
        channel: response.channel.id,
        event: 'direct_message',
        type: 'message',
        user: user.id
      }, askYesterday);
    });
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

function formatStatus(actualStatuses) {
  var result = '';

  _.forOwn(actualStatuses, function (value, key) {
    result += '@' + key + ' pracoval/a:\n';
    result += '> *včera*: ' + value.yesterday + '\n';
    result += '> *dnes*: ' + value.today + '\n';
    result += '> *Blokuje ho/ji*: ' + value.blocking + '\n';
    result += '\n';
  });

  return result;
}