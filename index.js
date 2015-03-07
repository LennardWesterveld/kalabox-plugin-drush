'use strict';

// Modules
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-drush';

module.exports = function(argv, app, events, engine, tasks) {

  // Helpers
  /**
   * Gets plugin conf from the appconfig or from CLI arg
   **/
  var getOpts = function() {
    // Grab our options from config
    var opts = app.config.pluginConf[PLUGIN_NAME];

    // Override any config coming in on the CLI
    for (var key in opts) {
      if (argv[key]) {
        opts[key] = argv[key];
      }
    }
    return opts;
  };

  /**
   * Returns an arrayed set of drush-ready commands
   **/
  var getCmd = function() {
    // @todo: not sure if the command structure is different on D7 vs D6
    // Grab our options from config so we can filter these out
    var cmd = argv._;
    delete argv._;
    var strip = app.config.pluginConf[PLUGIN_NAME];

    // Remove
    for (var key in strip) {
      delete argv[key];
    }

    for (var opt in argv) {
      cmd.push('--' + opt + '=' + argv[opt]);
    }

    return cmd;
  };

  /*
   * Some drupal sites dont use settings.php and drush will fail without this
   * @todo : there should be a way for the pressflow plugin to handle this?
   */
  var getPressflowSettings = function() {
    var pressflowSettings = {
      databases: {
        default: {
          default: {
            driver: 'mysql',
            prefix: '',
            database: 'kalabox',
            username: 'kalabox',
            password: '',
            host: app.domain,
            port: 3306,
          }
        }
      },
      conf: {
        'pressflow_smart_start': 1
      }
    };
    return JSON.stringify(pressflowSettings);
  };

  /**
   * Runs a git command on the app data container
   **/
  var runDrushCMD = function(cmd, opts, done) {
    // @todo: needs to come from a DEEPER PLACE
    engine.run(
      'kalabox/drush:stable',
      cmd,
      {
        Env: [
          'DRUSH_VERSION=' + opts['drush-version'],
          'APPNAME=' +  app.name,
          'APPDOMAIN=' +  app.domain,
          'PRESSFLOW_SETTINGS=' + getPressflowSettings()
        ],
        HostConfig: {
          VolumesFrom: [app.dataContainerName]
        }
      },
      {
        Binds: [
          app.config.homeBind + ':/ssh:rw',
          app.rootBind + ':/src:rw'
        ]
      },
      done
    );
  };

  /**
   * Create a symlink from the local.aliases.drushrc.php file to ~/.drush/kalabox/<appname>.aliases.drushrc.php
   **/
  var copyLocalAlias = function() {
    var home =
      process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    var drushPath = path.resolve(home, '.drush');
    // Create ~/.drush dir if it doesn't exist.
    if (!fs.existsSync(drushPath)) {
      fs.mkdirSync(drushPath);
    }

    // Define the paths
    var src = path.resolve(
      app.root, 'config', 'drush', 'local.aliases.drushrc.php'
    );
    var dst = path.resolve(drushPath, app.domain + '.aliases.drushrc.php');

    // Create the symlink
    if (process.platform !== 'win32') {
      if (!fs.existsSync(dst) && fs.existsSync(src)) {
        fs.symlinkSync(src, dst);
      }
    }
  };

  // Events
  // Install the util container for our things
  events.on('post-install', function(app, done) {
    engine.build({name: 'kalabox/drush:stable'}, done);
  });

  // Updates kalabox aliases when app is started.
  // This allows for both kbox drush to be used
  // and local drush to be used via: drush @<appname> status
  events.on('post-start-component', function(component, done) {
    // Only run on the db container
    if (component.name !== 'db') {
      done();
    }
    else {
      engine.inspect(component.containerId, function(err, data) {
        var key = '3306/tcp';
        if (data && data.NetworkSettings.Ports[key]) {
          var port = data.NetworkSettings.Ports[key][0].HostPort;
          var commands = [
            [
              'sed',
              '-i',
              's/\'host\'.*/\'host\' => \'' + app.domain + '\',/g',
              '/src/config/drush/aliases.drushrc.php'
            ],
            [
              'sed',
              '-i',
              's/\'uri\'.*/\'uri\' => \'' + app.domain + '\',/g',
              '/src/config/drush/local.aliases.drushrc.php'
            ],
            [
              'sed',
              '-i',
              's/aliases\\[\'.*/aliases[\'' + app.name + '\'] = array(/g',
              '/src/config/drush/local.aliases.drushrc.php'
            ],
            [
              'sed',
              '-i',
              's@\'root\'.*@\'root\' => \'' +
              path.join(app.config.codeRoot, app.name) + '\',@g',
              '/src/config/drush/local.aliases.drushrc.php'
            ],
            [
              'sed',
              '-i',
              's%\'db-url.*%\'db-url\' => \'mysql://kalabox@' + app.domain +
              ':' + port + '/kalabox\',%g',
              '/src/config/drush/local.aliases.drushrc.php'
            ]
          ];

          _.map(commands, function(cmd) {
            engine.run(
              'kalabox/debian:stable',
              cmd,
              {
                'Env': ['APPDOMAIN=' + app.domain]
              },
              {
                Binds: [app.rootBind + ':/src:rw']
              },
              function(err) {
                if (err) {
                  console.log(err);
                }
              }
            );
          });
          copyLocalAlias();
        }
        done();
      });
    }
  });

  // Tasks
  // drush wrapper: kbox drush COMMAND
  tasks.registerTask([app.name, 'drush'], function(done) {
    var opts = getOpts();
    var cmd = getCmd();
    cmd.unshift('@dev');
    runDrushCMD(cmd, opts, done);
  });

};
