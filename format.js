module.exports.formatUptime = function(uptime) {
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
};

module.exports.formatJson = function(json) {
  return JSON.stringify(json, null, 2);
};
