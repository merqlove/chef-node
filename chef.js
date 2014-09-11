var authenticate = require('./chef/authenticate'),
    request = require('request'),
    methods = ['delete', 'get', 'post', 'put'];

function Chef(user, key, base, wrap_ssl, opensslPath) {
    this.user = user;
    this.key = key;
    this.base = base || '';
    this.wrap_ssl = wrap_ssl || false;
    this.opensslPath = opensslPath || '/usr/bin/openssl';
}

function req(method, uri, body, callback) {
    method = method.toUpperCase();

    // Add the base property of the client if the request does not specify the
    // full URL.
    if (uri.indexOf(this.base) !== 0) { uri = this.base + uri; }

    // Use the third parameter as the callback if a body was not given (like for
    // a GET request.)
    if (typeof body === 'function') { callback = body; body = undefined; }

    return authenticate.getHeaders(this, { body: body, method: method, uri: uri, wrap_ssl: this.wrap_ssl, opensslPath: this.opensslPath },
      function(err, headers){
        if(err){
          return callback(err);
        }
        return request({
          body: body,
          headers: headers,
          json: true,
          method: method,
          uri: uri
        }, callback);
    });
}

methods.forEach(function (method) {
    Chef.prototype[method] = function (uri, body, callback) {
        return req.call(this, method, uri, body, callback);
    };
});

exports.createClient = function (user, key, server, wrap_ssl, opensslPath) {
    return new Chef(user, key, server, wrap_ssl, opensslPath);
};
