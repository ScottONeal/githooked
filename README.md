# githooked

[![Build Status](https://api.travis-ci.org/ScottONeal/githooked.svg)](http://travis-ci.org/ScottONeal/githooked)

## Intro

**githooked** is a tiny library and companion CLI tool for handling [GitHub post-receive hooks](https://help.github.com/articles/post-receive-hooks). This repo is a fork of https://github.com/coreh/hookshot and was created since the author of hookshot was innactive.

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

The library exposes a single function, `githooked()`. When called, this functions returns an express instance configured to handle post-receive hooks from GitHub. You can react to pushes to specific branches by listening to specific events on the returned instance, or by providing optional arguments to the `githooked()` function.

```javascript
githooked()
.on('refs/heads/master', 'git pull && make')
.listen(3000)
```

```javascript
githooked('refs/heads/master', 'git pull && make').listen(3000)
```

### Actions

Actions can either be shell commands or JavaScript functions.

```javascript
githooked('refs/heads/master', 'git pull && make').listen(3000)
```

```javascript
githooked('refs/heads/master', function(info) {
  // do something with push info ...
}).listen(3000)
```

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
