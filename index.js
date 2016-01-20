var Botkit = require('botkit');
var os = require('os');
var _ = require('lodash');
var ActualStatus = require('./actual-status');
var format = require('./format');
var config = require('./config');

var users, ims, channels, statusChannel, actualStatus;

var controller = Botkit.slackbot({
  debug: true
});

var BOT_ICON = config.botIcon || ":robot_face:";

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
  users = _.filter(payload.users, function (user) {
    return _.contains(statusChannel.members, user.id);
  });
  console.log('users for status channel:' + _.map(users, 'name'));
});

controller.hears(['status', 'init', '^s$'],'direct_message,direct_mention,mention',function(bot, message) {

  if (actualStatus) {
    bot.reply(message, BOT_ICON + ' Jeden status už běží. Jak je daleko zjišťování zjistíš, když mi napíšeš message se zprávou "progress".');
  }

  bot.reply(message, BOT_ICON + ' Začínám zjišťovat status.');


  actualStatus = new ActualStatus(users);

  _.forEach(actualStatus.users, function (user) {
    console.log('starting conversation with user: ' + user.name);
    actualStatus[user.name] = {};

    function askYesterday(response, convo) {
      convo.ask(BOT_ICON + " Ahoj :simple_smile: Na čem jsi pracoval včera?", function(response, convo) {
        actualStatus.addYesterday(user.name, response.text);
        askToday(response, convo);
        convo.next();
      });
    }

    function askToday(response, convo) {
      convo.ask(BOT_ICON + " A na čem budeš pracovat dnes?", function(response, convo) {
        actualStatus.addToday(user.name, response.text);

        askBlocking(response, convo);
        convo.next();
      });
    }

    function askBlocking(response, convo) {
      convo.ask(BOT_ICON + " Je něco, s čím potřebuješ pomoct?", function(response, convo) {
        actualStatus.addBlocking(user.name, response.text);
        actualStatus.finishUser(user.name);

        if (actualStatus.isFinished()) {
          convo.say(BOT_ICON + " Ok, díky :simple_smile: Až budu mít odpovědi i od ostatních, pošlu to do channelu #" + config.statusChannelName + "." +
              'Jak je daleko zjišťování zjistíš, když mi napíšeš message se zprávou "progress".');

          convo.next();
          bot.say({
            text: actualStatus.printMessage(),
            channel: _.find(channels, {name: config.statusChannelName}).id
          });

        }
        else {
            convo.say(BOT_ICON +" Ok, díky :simple_smile: Až budu mít odpovědi i od ostatních, pošlu to do channelu #" + config.statusChannelName + ".");
          convo.next();
        }
      });
    }

    bot.api.im.open({user: user.id}, function (err, response) {
    if (!response.channel) {
        console.log('error while opening channel for user ' + user.name);
        console.log(response);
    }
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
  bot.reply(message,'```' + format.formatJson(users) + '```');
});


controller.hears(['uptime','identify yourself','who are you','what is your name', 'kdo jsi'],'direct_message,direct_mention,mention',function(bot, message) {
  var hostname = os.hostname();
  var uptime = format.formatUptime(process.uptime());

  bot.reply(message, BOT_ICON + ' Jsem <@' + bot.identity.name + '>. Jedu zatím ' + uptime + ' na ' + hostname + '.');
});

controller.hears(['help'],'direct_message,direct_mention,mention',function(bot, message) {
  bot.reply(message, BOT_ICON + ' Zatím nemám nápovědu. Smůla. :fu:');
});

controller.hears(['progres', 'progress'],'direct_message,direct_mention,mention',function(bot, message) {
  if (actualStatus) {
    bot.reply(message, BOT_ICON + ' ' + actualStatus.printStatusMessage());
  } else {
    bot.reply(message, BOT_ICON + ' Žádný status neprobíhá. Můžeš ho spustit tak, že mi napíšeš privátní zprávu "status"');
  }
});
