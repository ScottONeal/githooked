'use strict';

var assert    = require('assert'),
    supertest = require('supertest'),
    githooked = require('../lib'),
    crypto    = require('crypto');

process.env.NODE_ENV = 'test';

describe('githooked initialization', function() {

  var server, request;

  beforeEach(function() {
     server  = githooked('test', 'exit 1');
     request = supertest(server);
  });

  it('should have property githookedServer.ghRef', function() {
    assert.equal(server.ghRef, 'test');
  });

  it('should have property githookedServer.ghAction', function() {
    assert.equal(server.ghAction, 'exit 1');
  });

  it('should have property githookedServer.ghOptions', function() {
    var options = { json: '10mb', logFile: './goothoked.log' };
    var scopedServer = githooked('test', 'exit 1', options);
    assert.equal(scopedServer.ghOptions, options);
  });

  it('defaults action to first argument if only one argument sent', function() {
    var scopedServer = githooked('exit 1');
    assert(scopedServer);
  });

  it('should throw an error when if option argument is not an object', function() {
    assert.throws(function() {
      githooked('test', 'exit 1', []);
    }, Error);
  });

  it('should accept bodyParser.json middleware options', function(done) {
    var scopedServer = githooked('test', 'exit 1', { json: { limit: '1kb'}});
    var buf = new Buffer(1024);
    buf.fill('.');

    supertest(scopedServer)
      .post('/')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ str: buf.toString() }))
      .expect(413, done);
  });

  it('should accept a default payload size limit of 1mb', function(done) {
    var buf = new Buffer(999990);
    buf.fill('.');

    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ref: 'test', str: buf.toString() }))
      .expect(202, done);
  });

  it('should add a middleware function if options.middlware = function', function(done) {
    var middlewarePassed = false;

    var scopedServer = githooked('test', 'exit 1', { middleware:
       function(req, res, next) {
         middlewarePassed = true;
         next();
       }
    });

    supertest(scopedServer)
      .post('/')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ref: 'test' }))
      .end(function(err) {
        assert.equal(middlewarePassed, true);
        done(err);
      });
  });

  it('should accept an array of middleware functions, if optons.middleware = [function]', function(done) {
    var middleware1Passed = false,
        middleware2Passed = false;

    var scopedServer = githooked('test', 'exit 1', { middleware: [
       function(req, res, next) {
         middleware1Passed = true;
         next();
       },
       function(req, res, next) {
         middleware2Passed = true;
         next();
       },
    ]});

    supertest(scopedServer)
      .post('/')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ref: 'test' }))
      .end(function(err) {
        assert.equal(middleware1Passed, true);
        assert.equal(middleware2Passed, true);
        done(err);
      });

  });
});

describe('githooked secret validation', function() {

  it('should throw an error if secret is not a string', function() {
    assert.throws(function() {
      githooked('test', 'exit 1', { secret: [] });
    }, Error);
  });

  it('should emit an error if secret not sent from provider', function(done) {
    var scopedServer = githooked('test', 'exit 1', { secret: 'test-secret' });

    supertest(scopedServer)
      .post('/')
      .set('Content-Type', 'application/json')
      .send({ ref: 'test' })
      .expect(401)
      .end(function(err) {
        if ( err ) { done(err); }
      });

      scopedServer.on('error', function(msg) {
        assert.equal(msg, 'no provider signature');
        done();
      });
  });

  it('should send a 401 if signatures do not match', function(done) {
    var secret       = 'test-secret',
        body         = { ref: 'test'},
        scopedServer = githooked('test', 'exit 1', { secret: secret });

    supertest(scopedServer)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature', 'thisisabadsignature')
      .send(body)
      .expect(401)
      .end(function(err) {
        if ( err ) { done(err); }
      });

    scopedServer.on('error', function(msg) {
      assert.equal(msg, 'signature validation failed');
      done();
    });
  });

  it('should send a 202 if signature validations match', function(done) {
    var secret       = 'test-secret',
        body         = { ref: 'test'},
        scopedServer = githooked('test', 'exit 1', { secret: secret });

    supertest(scopedServer)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature', createSignature(secret, JSON.stringify(body)))
      .send(body)
      .expect(202, done);
  });
});

describe('githooked server', function() {

  var server, request;

  beforeEach(function() {
     server  = githooked('test', 'exit 1');
     request = supertest(server);
  });

  it('should send a 200 back for a PING event', function(done) {
    request
      .post('/')
      .set('X-GitHub-Event', 'ping')
      .set('Content-Type', 'application/json')
      .send({zen: 'thisisatest', hook_id: 'thisisatest', hook: 'thisisatest'})
      .expect(200, done);
  });

  it('should throw an error on invalid payload', function(done) {
    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send('asdf')
      .expect(400, done);
  });

  it('should emit an error on invalid payload', function(done) {
    server.on('error', function(msg) {
      assert.equal(msg, 'invalid ref');
      done();
    });

    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(400)
      .end(function(err) {
        assert(err instanceof Error);
      });
  });

  it('should get a create event', function(done) {
    server.on('create', function(payload) {
      assert(payload);
      done();
    });

    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send({ ref: 'test', created: true })
      .expect(202)
      .end(function(err) {
        assert(!err);
      });
  });

  it('should get a delete event', function(done) {
    server.on('delete', function(payload) {
      assert(payload);
      done();
    });

    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send({ ref: 'test', deleted: true })
      .expect(202)
      .end(function(err) {
        assert(!err);
      });
  });

  it('should get a push event if created and deleted are falsy', function(done) {
    server.on('push', function(payload) {
      assert(payload);
      done();
    });

    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send({ ref: 'test' })
      .expect(202)
      .end(function(err) {
        assert(!err);
      });
  });

  it('should get reference event with payload on hook', function(done) {
    server.on('test', function() {
      done();
    });

    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send({ ref: 'test' })
      .expect(202)
      .end(function(err) {
        assert(!err);
      });

  });

  it('should run command `exit 1` when running receiving a hook for reference "test"', function(done) {

    server.on('spawn', function(instance) {
      instance.on('close', function(code) {
        assert.equal(code, 1);
        done();
      });
    });

    request
      .post('/')
      .set('Content-Type', 'application/json')
      .send({ ref: 'test' })
      .expect(202)
      .end(function(err) {
        assert(!err);
      });
  });
});

function createSignature(secret, body) {
  return 'sha1=' + crypto.createHmac('sha1', secret).update(body).digest('hex');
}
