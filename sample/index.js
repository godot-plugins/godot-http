var godot       = require('godot'),
    http        = require('godot-http');

godot.createServer({
  type: 'tcp',
  multiplex: false,
  reactors: [
    godot.reactor()
      .console()
  ]
}).listen(1337);

// client
godot.createClient({
  type: 'tcp',
  producers: [
    new http.producer({
      event: {
        host: 'google.com',
        service: 'google.com/health/healthCheck',
      },
      request: {
        host: 'www.google.fr',
        path: '/',
        method: 'GET'
      }
    }).ttl(1000 * 3),
    new http.producer({
      event: {
        host: 'blog.bazoud.com',
        service: 'blog.bazoud.com/health/healthCheck',
      },
      request: {
        host: 'blog.bazoud.com',
        path: '/healthCheck',
        method: 'GET'
      }
    }).ttl(1000 * 3),
    new http.producer({
      event: {
        host: 'blog.bazoud.com',
        service: 'blog.bazoud.com/health/healthCheckOK',
      },
      request: {
        host: 'blog.bazoud.com',
        path: '/healthCheck',
        method: 'GET'
      },
      fixedValue: {
        'ok': 'up'
      }
    }).ttl(1000 * 3),
    new http.producer({
      event: {
        host: 'blog.bazoud.com',
        service: 'blog.bazoud.com/health/healthCheckRange',
      },
      request: {
        host: 'blog.bazoud.com',
        path: '/healthCheckRange',
        method: 'GET'
      },
      rangeValues: [
        { 'status': 'up', 'min': 0, 'max': 10 },
        { 'status': 'critical', 'min': 10 }
      ]
    }).ttl(1000 * 3)
  ]
}).connect(1337);

