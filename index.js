'use strict';

// Modules
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var taskOpts = require('./tasks.js');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-drush';

module.exports = function(kbox) {

  var globalConfig = kbox.core.deps.get('globalConfig');
  var events = kbox.core.events;
  var engine = kbox.engine;
  var Promise = kbox.Promise;

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

    /**
     * Runs a git command on the app data container
     **/
    var runDrushCMD = function(cmd, opts, done) {

      // Run the drush command in the correct directory in the container if the
      // user is somewhere inside the code directory on the host side.
      // @todo: consider if this is better in the actual engine.run command
      // vs here.

      // Get current working directory.
      var cwd = process.cwd();

      // Get code root.
      var codeRoot = app.config.codeRoot;

      // Get the branch of current working directory.
      var workingDirBranch = _.startsWith(cwd, codeRoot) ?
        cwd.replace(codeRoot, '') :
        '';

      // Build container's working directory.
      var workingDir = path.join('/', globalConfig.codeDir, workingDirBranch);

      // Get drush version.
      var drushVersion = (opts['drush-version'] === 'backdrush') ?
        'backdrush' :
        'drush' + opts['drush-version'];

      // Image name.
      var image = 'drush';

      // Build create options.
      var createOpts = kbox.util.docker.CreateOpts()
        .workingDir(workingDir)
        .env('DRUSH_VERSION', drushVersion)
        .volumeFrom(app.dataContainerName)
        .json();

      // Build start options.
      var startOpts = kbox.util.docker.StartOpts()
        .bind(app.config.homeBind, '/ssh')
        .bind(app.rootBind, '/src')
        .json();

      // Perform a container run.
      return engine.run(image, cmd, createOpts, startOpts)
      // Return.
      .nodeify(done);

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

        kbox.engine.inspect(component.containerId)
        .then(function(data) {
          var key = '3306/tcp';
          if (data && data.NetworkSettings.Ports[key]) {
            var port = data.NetworkSettings.Ports[key][0].HostPort;
            var cmd = [
              'sed',
              '-i',
              's/\'host\'.*/\'host\' => \'' + app.domain + '\',/g',
              '/src/config/drush/aliases.drushrc.php'
            ];

            // Image name
            var image = 'kalabox/debian:stable';

            // Build create options
            var createOpts = {};

            // Build start options
            var startOpts = kbox.util.docker.StartOpts()
              .bind(app.rootBind, '/src')
              .json();

            return kbox.engine.run(image, cmd, createOpts, startOpts);

          }
        })
        .nodeify(done);

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
