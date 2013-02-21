/*
 * graphite.js: Producer event from Http / Https.
 *
 * @obazoud
 *
 *
 */

var utile       = require('utile'),
    https       = require('https'),
    http        = require('http'),
    path        = require('path');

godotPath       = path.dirname(require.resolve('godot'));
Producer        = require(godotPath + '/godot/producer').Producer;

//
// ### function Http (options)
// #### @options {Object} Options for fetching data from a url.
// ####   @options.event        {Object} Event stereotype.
// ####   @options.request      {Object} Request configuration to access url.
// ####   @options.parse        {Function} Function to parse http statusCode and body.
// ####   @options.fixedValue   {Object} Value you expected in body.
// ####   @options.rangeValues  {Object} Range values you expected in body.
// Constructor function for the Http object responsible
// for creating events to process.
//
var Http = module.exports = function Http(options) {
  if (!options || !options.event || !options.request) {
    throw new Error('options.event and options.request are required');
  }

  Producer.call(this, options);

  this.event       = options.event;
  this.request     = options.request;
  this.parse       = options.parser || this.parser;
  this.fixedValue  = options.fixedValue;
  this.rangeValues = options.rangeValues;
};

//
// Inherit from Producer.
//
utile.inherits(Http, Producer);

//
// ### function produce ()
// Emits the data for this instance
//
Http.prototype.produce = function () {
  var self = this;

  var data = {
    host:        this.event.host         || this.values.host,
    service:     this.event.service      || this.values.service,
    state:       this.event.state        || this.values.state,
    time:        Date.now(),
    description: this.event.description  || '',
    tags:        this.event.tags         || this.values.tags,
    metric:      this.event.metric       || this.values.metric,
    ttl:         this.event.ttl          || this.values.ttl
  };

  var httpModule = this.request.isSecure ? https : http;

  var request = httpModule.request(this.request, function(response) {
      var body = '';
      response.on('data', function(chunk) {
        body += chunk;
      });
      response.on('end', function () {
        self.parse(null, response, body, data);
        return self.emit('data', data);
      });
  })
  .on('error', function(error) {
    self.parser.parse(error, null, null, data);
    return self.emit('data', data);
  })
  .end();
}

Http.prototype.parser = function(error, response, body, data) {
  if (error) {
    data.state = 'critical';
    data.description = utile.format("message: %s, code: %s", e.message, e.code);
  } else {
    if (response.statusCode == 200) {
      data.state = "up";
    } else if (response.statusCode == 301 || response.statusCode == 302) {
      data.state = "unknown";
      data.description = utile.format("Redirected to %s", response.headers.location);
    } else if (response.statusCode == 503 || response.statusCode == 404) {
      data.state = "down";
    } else {
      data.state = "critical";
    }
    data.description = utile.format('%s status code: %s', data.description, response.statusCode);

    // value
    var value = ('' + body).substring(0, body.length);
    if (this.fixedValue) {
      if (this.fixedValue[value]) {
          data.state = this.fixedValue[value];
      } else {
          data.state = "critical";
          data.description = utile.format('expected one of <%s> got value: <%s>', Object.keys(this.fixedValue), value);
      }
    } else {
      // range
      if (this.rangeValues) {
        if (this.rangeValues.length === 0) {
          data.state = "critical";
          data.description = "No range defined!";
        } else {
          var found = false;
          for(var i = 0; i < this.rangeValues.length; i++) {
            var range = this.rangeValues[i];
            if (this.checkRange(range.min, range.max, parseInt(value, 10))) {
              data.state = range.status;
              found = true;
              break;
            }
          }
          if (!found) {
            data.state = "critical";
            data.description = "No range matches";
          }
        }
      }
    }
  }
}

Http.prototype.checkRange = function(min, max, value) {
  if (min && max && value >= min && value < max) {
    return true;
  } else if ( (min && value >= min) || (max && value < max) ) {
    return true;
  }
  return false;
}
