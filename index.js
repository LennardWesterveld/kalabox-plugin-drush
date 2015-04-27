'use strict';

// Modules
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var taskOpts = require('./tasks.js');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-drush';

module.exports = function(kbox) {

  var globalConfig = kbox.core.deps.lookup('globalConfig');
  var events = kbox.core.events;
  var engine = kbox.engine;

  kbox.whenApp(function(app) {

    // Helpers
    /**
     * Gets plugin conf from the appconfig or from CLI arg
     **/
    var getOpts = function(options) {
      // Grab our options from config
      var defaults = app.config.pluginConf[PLUGIN_NAME];
      // Override any config coming in on the CLI
      _.each(Object.keys(defaults), function(key) {
        if (_.has(options, key) && options[key]) {
          defaults[key] = options[key];
        }
      });
      return defaults;
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
      // Run the git command in the correct directory in the container if the
      // user is somewhere inside the code directory on the host side.
      // @todo: consider if this is better in the actual engine.run command
      // vs here.
      var workingDirExtra = '';
      var cwd = process.cwd();
      var codeRoot = app.config.codeRoot;
      if (_.startsWith(cwd, codeRoot)) {
        workingDirExtra = cwd.replace(codeRoot, '');
      }
      var workingDir = '/data' + workingDirExtra;

      engine.run(
        'drush',
        cmd,
        {
          WorkingDir: workingDir,
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
        name: 'drush',
        srcRoot: path.resolve(__dirname)
      };
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
              'debian',
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
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'drush'];
      task.description = 'Run drush commands.';
      task.kind = 'delegate';
      task.options.push(taskOpts.drushVersion);
      task.func = function(done) {
        var opts = getOpts(this.options);
        var cmd = this.payload;
        cmd.unshift('@dev');
        runDrushCMD(cmd, opts, done);
      };
    });

  });

};
