'use strict';

var taskOpts = require('./tasks');

module.exports = function(kbox, appName) {

  var deps = kbox.core.deps;

  // Add an option
  kbox.create.add(appName, {
    option: {
      name: 'drush-version',
      task: taskOpts.drushVersion,
      properties: {
        message: 'Drush version'.green,
        required: false,
        type: 'string',
        validator: /drush(5|6|7)/,
        warning: 'Answer must be drush plus a major version. ie "drush6".',
        default: 'drush6'
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-drush',
        key: 'drush-version'
      }
    }
  });

};
