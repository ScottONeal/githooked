'use strict';

var bodyParser = require('body-parser'),
    normalize  = require('path').normalize,
    spawn      = require('child_process').spawn,
    express    = require('express');

module.exports = GitHooked;

/**
 * Create a express app with github webhook parsing and actions
 *
 * @param {String} This is the git reference being listened to
 * @param {String|Function} This is the action which will be invoked when the reference is called. Can be either a function that will be executed or a string which will be called from a shell
 * @api public
 */
function GitHooked(ref, action) {

  // create express instance
  var githooked = express();

  // middleware
  githooked.use(bodyParser.urlencoded({ extended: false }));
  githooked.use(bodyParser.json());

  // main POST handler
  githooked.post('/', function (req, res ) {
    var payload = req.body;

    // Check if Payload was sent
    if (!payload) {
      throw new Error('No payload');
    }

    // Check if payload has a ref, this is required in order to run contexted scripts
    if (!payload.ref || typeof payload.ref !== 'string') {
      throw new Error('Invalid ref');
    }

    // Created hook event
    if (payload.created) {
      githooked.emit('create', payload);
    }

    // Deleted hook event
    else if (payload.deleted) {
      githooked.emit('delete', payload);
    }

    // Else, default to a push hook event
     else {
      githooked.emit('push', payload);
    }

    // Always emit a global 'hook' event so people can watch all requests
    githooked.emit('hook', payload);

    // Emit a ref type specfic event
    githooked.emit(payload.ref, payload);
    res.status(202);
    res.send('Accepted\n');

  // default ref to hook and action to reference if only single args sent
  // This means that all webhooks will invoke the action
  if (arguments.length === 1) {
    action = ref;
    ref = 'hook';
  }  });

  if (typeof action === 'string') {
    var shell = process.env.SHELL,
        args  = ['-c', action],
        opts  = { stdio: 'inherit' };

    // Windows specfic env checks
    if (shell && isCygwin()) {
      shell = cygpath(shell);
    } else if (isWin()) {
      shell = process.env.ComSpec;
      args = ['/s', '/c', '"' + action + '"'];
      opts.windowsVerbatimArguments = true;
    }

    githooked.on(ref, function() {
      // Send emit spawn event w/ instance
      githooked.emit('spawn', spawn(shell, args, opts));
    });
  }
  else if (typeof action === 'function') {
    githooked.on(ref, action);
  }

  // Development Error middleware
  if ( process.env.NODE_ENV === 'development' ) {
    githooked.use(function(err, req, res, next) {
      console.log(err.stack);
      next(err);
    });
  }

  // Default Error middlware
  githooked.use(function(err, req, res, next) { // jshint ignore:line
    githooked.emit('error', err);
    res.status(500);
    res.end(err.message);
  });

  return githooked;
}

/**
 * Returns `true` if node is currently running on Windows, `false` otherwise.
 *
 * @return {Boolean}
 * @api private
 */

function isWin () {
  return 'win32' === process.platform;
}

/**
 * Returns `true` if node is currently running from within a "cygwin" environment.
 * Returns `false` otherwise.
 *
 * @return {Boolean}
 * @api private
 */

function isCygwin () {
  // TODO: implement a more reliable check here...
  return isWin() && /cygwin/i.test(process.env.HOME);
}

/**
 * Convert a Unix-style Cygwin path (i.e. "/bin/bash") to a Windows-style path
 * (i.e. "C:\cygwin\bin\bash").
 *
 * @param {String} path
 * @return {String}
 * @api private
 */

function cygpath (path) {
  path = normalize(path);
  if (path[0] === '\\') {
    // TODO: implement better cygwin root detection...
    path = 'C:\\cygwin' + path;
  }
  return path;
}
