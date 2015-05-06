'use strict';

var taskOpts = require('./tasks');
var _ = require('lodash');

module.exports = function(kbox, drupal, appName) {

  var drushVersions = _.pluck(drupal, 'drush');

  // Add an option
  kbox.create.add(appName, {
    option: {
      name: 'drush-version',
      task: taskOpts.drushVersion,
      inquire: {
        type: 'list',
        message: 'Major Drush version?',
        default: function(answers) {
          if (answers['drupal-version']) {
            return drupal[answers['drupal-version']].drush;
          }
          else {
            return '6';
          }
        },
        choices: drushVersions
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-drush',
        key: 'drush-version'
      }
    }
  });

};
