#!/usr/bin/env node

'use strict';

var path = require('path');
var _ = require('lodash');
var PLUGIN_NAME = 'kalabox-plugin-drush';

/*
 * Constructor.
 */
function Drush(kbox, app, image) {

  // We might want to use a different image to run drush commands
  // a la terminus but set drush as the default is no arg
  if (image === undefined) {
    image = 'drush';
  }

  /// Set our things
  this.image = image;
  this.app = app;
  this.kbox = kbox;

}

/**
 * Gets plugin conf from the appconfig or from CLI arg
 **/
Drush.prototype.getOpts = function(options) {
  // Override kalabox.json options with command line args
  var defaults = this.app.config.pluginConf[PLUGIN_NAME];
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
Drush.prototype.cmd = function(payload, options, done) {

  var engine = this.kbox.engine;
  var Promise = this.kbox.Promise;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

  // Run the drush command in the correct directory in the container if the
  // user is somewhere inside the code directory on the host side.
  // @todo: consider if this is better in the actual engine.run command
  // vs here.

  // Get current working directory.
  var cwd = process.cwd();

  // Get code root.
  var codeRoot = this.app.config.codeRoot;

  // Get the branch of current working directory.
  // Run the drush command in the correct directory in the container if the
  // user is somewhere inside the code directory on the host side.
  // @todo: consider if this is better in the actual engine.run command
  // vs here.
  var workingDirExtra = '';
  if (_.startsWith(cwd, codeRoot)) {
    workingDirExtra = cwd.replace(codeRoot, '');
  }
  var codeDir = globalConfig.codeDir;
  var workingDir = '/' + codeDir + workingDirExtra;

  // Get drush version.
  var drushVersion = (opts['drush-version'] === 'backdrush') ?
    'backdrush' :
    'drush' + opts['drush-version'];

  // Image name.
  var image = this.image;

  // Build create options.
  var createOpts = this.kbox.util.docker.CreateOpts()
    .workingDir(workingDir)
    .env('DRUSH_VERSION', drushVersion)
    .volumeFrom(this.app.dataContainerName)
    .json();

  // Build start options.
  var startOpts = this.kbox.util.docker.StartOpts()
    .bind(this.app.config.homeBind, '/ssh')
    .bind(this.app.rootBind, '/src')
    .json();

  // Perform a container run.
  return engine.run(image, cmd, createOpts, startOpts)
  // Return.
  .nodeify(done);

};

// Return constructor as the module object.
module.exports = Drush;
