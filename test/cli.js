'use strict';

var assert  = require('assert'),
    cp      = require('child_process'),
    path    = require('path'),
    getport = require('getport'),
    request = require('superagent'),
    cli     = path.resolve(__dirname + '/../bin/githooked');

describe('githooked cli', function() {
  it('should return help if no action is provided with exit code 1', function(done){
    cp.exec(cli + ' -p 3965', function(err) {
      assert.equal(err.code, 1);
      done();
    });
  });

  // 1.0.0 backwords compat to calling actions
  // Wow, need to find a better way to test CLIs that start a server
  it('should it should start a server and accept requests', function(done) {
    var gh;
    getport(function(err, port) {
      if ( err ) { done(err); }

      // The pain difference in the following test is how actions (-a) are passed to githooked cli
      gh = cp.spawn(cli, ['-p', port, '-r', 'test', '-a', 'echo "THIS IS A TEST"']);

      var buf = '',
          started = false;

      gh.stdout.on('data', function(chunk) {
        buf += chunk;
        if ( !started && buf.match('githooked server started') ) {
          started = true;
          webhookCaller(port, done);
        }
      });

      gh.on('error', function(chunk) {
        done(new Error(chunk));
      });
    });

    // Cleanup
    after(function() {
      gh.kill();
    });
  });

  it('should support the action being undefined commander args', function(done) {
    var gh;
    getport(function(err, port) {
      if ( err ) { done(err); }

      gh = cp.spawn(cli, ['-p', port, '-r', 'test', 'echo "THIS IS A TEST"']);

      var buf = '',
          started = false;

      gh.stdout.on('data', function(chunk) {
        buf += chunk;
        if ( !started && buf.match('githooked server started') ) {
          started = true;
          webhookCaller(port, done);
        }
      });

      gh.on('error', function(chunk) {
        done(new Error(chunk));
      });
    });

    // Cleanup
    after(function() {
      gh.kill();
    });
  });
});

function webhookCaller(port, cb) {
  request
    .post('localhost:' + port + '/')
    .set('Content-Type', 'application/json')
    .send({ ref: 'test' })
    .end(function(err, res) {
      if ( res.status === 202 ) {
        cb();
      }
    });
}
