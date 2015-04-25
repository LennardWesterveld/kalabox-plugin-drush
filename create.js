'use strict';

module.exports = function(kbox) {

  var deps = kbox.core.deps;

  // Add an option
  kbox.create.add('drupal7', {
    option: {
      name: 'drush-version',
      task: {
        name: 'drush-version',
        kind: 'string',
        description: 'The version of drush that you want.',
      },
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
