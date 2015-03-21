'use strict';

// Modules
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-drush';

module.exports = function(kbox, app) {

  var argv = kbox.core.deps.lookup('argv');
  var events = kbox.core.events;
  var engine = kbox.engine;
  var tasks = kbox.core.tasks;

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

  // This only will work if you have plugin conf for kalabox-plugin-dbenv
  var getAppSettings = function() {
    var settings = {};
    if (app.config.pluginConf['kalabox-plugin-dbenv']) {
      if (app.config.pluginConf['kalabox-plugin-dbenv'].settings) {
        settings = app.config.pluginConf['kalabox-plugin-dbenv'].settings;
      }
    }
    return JSON.stringify(settings);
  };

  /**
   * Runs a git command on the app data container
   **/
  var runDrushCMD = function(cmd, opts, done) {
    engine.run(
      'kalabox/drush:stable',
      cmd,
      {
        Env: [
          'DRUSH_VERSION=' + opts['drush-version'],
          'APPNAME=' +  app.name,
          'APPDOMAIN=' +  app.domain,
          'PRESSFLOW_SETTINGS=' + getAppSettings(),
          'BACKDROP_SETTINGS=' + getAppSettings()
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

  // Events
  // Install the drush container for our things
  events.on('post-install', function(app, done) {
    // If profile is set to dev build from source
    var opts = {
      name: 'kalabox/drush:stable',
      build: false,
      src: ''
    };
    if (globalConfig.profile === 'dev') {
      opts.build = true;
      opts.src = path.resolve(__dirname, 'dockerfiles', 'drush', 'Dockerfile');
    }
    engine.build(opts, done);
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
          var cmd = [
            'sed',
            '-i',
            's/\'host\'.*/\'host\' => \'' + app.domain + '\',/g',
            '/src/config/drush/aliases.drushrc.php'
          ];

          engine.once(
            'kalabox/debian:stable',
            ['/bin/bash'],
            {
              'Env': ['APPDOMAIN=' + app.domain],
            },
            {
              Binds: [app.rootBind + ':/src:rw']
            },
            function(container, done) {
              engine.queryData(container.id, cmd, function(err, data) {
                if (err) {
                  done(err);
                } else {
                  done();
                }
              });
            },
            function(err) {
              done(err);
            }
          );
        }
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
