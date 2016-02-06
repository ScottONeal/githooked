# githooked

[![Build Status](https://api.travis-ci.org/ScottONeal/githooked.svg)](http://travis-ci.org/ScottONeal/githooked)

## Intro

**githooked** is a tiny library and companion CLI tool for handling [GitHub webhooks hooks](https://help.github.com/articles/about-webhooks/). This repo is a fork of https://github.com/coreh/hookshot and was created since the author of hookshot was innactive.

## Examples

### Library

```javascript
var githooked = require('githooked');
githooked('refs/heads/master', 'git pull && make').listen(3000)
```

### CLI Tool

```bash
githooked -r refs/heads/master 'git pull && make'
```

## Usage

The library exposes a single function, `githooked()`. When called, this functions returns an express instance configured to handle webhooks pushes from GitHub. You can react to pushes to specific branches by listening to specific events on the returned instance, or by providing optional arguments to the `githooked()` function.

```javascript
githooked()
  .on('refs/heads/master', 'git pull && make')
  .listen(3000)
```

```javascript
githooked('refs/heads/master', 'git pull && make').listen(3000)
```

## Arguments

GitHooked supports up to three arguments: reference, action, and options. The first argument is the branch reference from the GitHooked webhook (i.e: `refs/heads/master`). If only one argument is supplied, it should be the action that needs to be ran. In this instance githooked will bind to every webhook event sent from GitHub.

```js
githooked('branch/references', 'action', { /* options */});
```

### Reference

References are specific webhook references or actions fired when editing tags or branches changes happen. This argument is provided so you can bind to specific branch or the following event hooks:

 - **hook**: This will bind to all webhooks
 - **create**: fired on [create events](https://developer.github.com/v3/activity/events/types/#createevent)
 - **delete**: fired on [delete events](https://developer.github.com/v3/activity/events/types/#deleteevent)
 - **push**: fired on [push events](https://developer.github.com/v3/activity/events/types/#pushevent)

### Action

Actions can either be shell commands or JavaScript functions.

```javascript
githooked('refs/heads/master', 'git pull && make').listen(3000)
```

```javascript
githooked('refs/heads/master', function(info) {
  // do something with push info ...
}).listen(3000)
```

### Options

Lastly, the third option is an object of configuration parameters. Usage:

```js
githooked('push', 'git pull && make', {
  json: {
    limit: '100mb',
    strict: true
  },
  middleware: [
    require('connect-timeout'),
    function(req, res, next) {
      // Do something
      next();
    }
  ]
}})
```

The following configuration options are:

#### json (Object)

These are arguments passed to express's [body-parsers json() middleware](https://github.com/expressjs/body-parser#bodyparserjsonoptions)

#### middleware (Function|Array[Function])

This is an array or function of valid [express middleware](http://expressjs.com/en/guide/using-middleware.html). This middleware will be applied before any other express middleware. If an array is provided, the middleware will be applied in the order they are declared in the array.

#### secret (String)

GitHub webhooks can pass a secret which is used as an validation mechanism between your GitHub repo and your githooked server. Read more about it [here](https://developer.github.com/v3/repos/hooks/#create-a-hook). Validation of the payload will be the first operation performed on incoming requests. If using githooked for any serious purposes this option should be necessary. If validation failed an error event will be called with value of 'signature validation failed' or 'no provider signature':

```js
  githooked.on('error', function(msg) {
    if ( msg === 'signature validation failed' ) {
      // do something
    }
  })
```

#### logFile (String|stream) TODO

If your action is a shell call, then this option will log all STDOUT and STDERR into the provided stream or file descriptor

### Mounting to existing express servers

**githooked** can be mounted to a custom route on your existing express server:

```javascript
// ...
app.use('/my-github-hook', githooked('refs/heads/master', 'git pull && make'));
// ...
```

### Special Events

Special events are fired when branches/tags are created, deleted:

```javascript
githooked()
.on('create', function(info) {
  console.log('ref ' + info.ref + ' was created.')
})
.on('delete', function(info) {
  console.log('ref ' + info.ref + ' was deleted.')
})
```

The `push` event is fired when a push is made to any ref:

```javascript
githooked()
.on('push', function(info) {
  console.log('ref ' + info.ref + ' was pushed.')
})
```

Finally, the `hook` event is fired for every post-receive hook that is send by GitHub.

```javascript
githooked()
.on('push', function(info) {
  console.log('ref ' + info.ref + ' was pushed.')
})
```

### Spawn Event

If githooked was created with a shell command as the action, it will throw a spawn event with the child_process spawn instance.

```javascript
var server = githooked('refs/head/master', 'git pull && make').listen(3000);

server.on('spawn', function(spawn) {
  // Bind on close to get exit code
  spawn.on('close', function(code) {
    if ( code !== 0 ) {
      console.log('something went wrong');
    }
  });
});
```

### CLI Tool

A companion CLI tool is provided for convenience. To use it, install **githooked** via npm using the `-g` flag:

```bash
npm install -g githooked
```

The CLI tool takes as argument a command to execute upon GitHub post-receive hook:

```bash
githooked 'echo "PUSHED!"'
```

You can optionally specify an HTTP port via the `-p` flag (defaults to 3000) and a ref via the `-r` flag (defaults to all refs):

```bash
githooked -r refs/heads/master -p 9001 'echo "pushed to master!"'
```
