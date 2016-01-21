var dateFormat = require('dateformat');
var _ = require('lodash');

module.exports = ActualStatus = function(users) {
  this.date = new Date();
  this.finished = false;
  this.users = [];
  this.data = {};
  var self = this;

  _.forEach(users, function(user) {
    if (!user.is_bot || user.name === 'slackbot') {
      self.data[user.name] = {finished: false};
      self.users.push(user);
    }
  })
};

ActualStatus.prototype.finish = function() {
  this.finished = true;
};

ActualStatus.prototype.sendStatusMessage = function(bot, channels, config) {
  bot.say({
    text: this.printMessage(),
    channel: _.find(channels, {name: config.statusChannelName}).id
  });
};

ActualStatus.prototype.allUsersFinished = function() {
  return this.finishedUsers().length === this.users.length;
};

ActualStatus.prototype.finishedUsers = function() {
  var finishedUsers = [];
  _.forOwn(this.data, function (userStatus, username) {
    if (userStatus.finished) {
      finishedUsers.push(username);
    }
  });
  return finishedUsers;
};

ActualStatus.prototype.addYesterday = function(username, msg) {
  this.data[username].yesterday = msg;
};

ActualStatus.prototype.addToday = function(username, msg) {
  this.data[username].today = msg;
};

ActualStatus.prototype.addBlocking = function(username, msg) {
  this.data[username].blocking = msg;
};

ActualStatus.prototype.finishUser = function(username) {
  this.data[username].finished = true;
};

ActualStatus.prototype.printMessage = function() {
  return 'Hlásím status z ' + dateFormat(this.date, 'mm.dd. H:MM') + ':\n' + this.print()
};

ActualStatus.prototype.printStatusMessage = function() {
  var finishedUsers = this.finishedUsers();
  return 'Status spuštěn ' + dateFormat(this.date, 'mm.dd. H:MM') + '. ' +
      'Aktuálně odpovědělo ' + finishedUsers.length + ' lidí z ' + this.users.length +':\n' + finishedUsers.join(', ');
};

ActualStatus.prototype.print = function() {
  var result = '';

  _.forOwn(this.data, function(value, key) {
    result += '@' + key + ':\n';
    if (value.yesterday) {
      result += '> *včera*: ' + value.yesterday + '\n';
    }
    if (value.today) {
      result += '> *dnes*: ' + value.today + '\n';
    }
    if (value.blocking) {
      result += '> *potřebuje pomoct s*: ' + value.blocking + '\n';
    }
    if (!value.yesterday && !value.today && !value.blocking) {
      result += 'Neodpověděl/a.';
    }
    result += '\n';
  });

  return result;
};
