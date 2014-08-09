var authenticate = require('./chef/authenticate'),
    request = require('request'),
    methods = ['delete', 'get', 'post', 'put'];

function Chef(user, key, base, how) {
    this.user = user;
    this.key = authenticate.getKey(key, { how: how });
    this.base = base ? base : '';
    this.how = how ? how : '';
}

function req(method, uri, body, callback) {
    method = method.toUpperCase();

    // Add the base property of the client if the request does not specify the
    // full URL.
    if (uri.indexOf(this.base) !== 0) { uri = this.base + uri; }

    // Use the third parameter as the callback if a body was not given (like for
    // a GET request.)
    if (typeof body === 'function') { callback = body; body = undefined; }

    return request({
        body: body,
        headers: authenticate.getHeaders(this, { body: body, method: method, uri: uri, how: this.how }),
        json: true,
        method: method,
        uri: uri
    }, callback);
}

methods.forEach(function (method) {
    Chef.prototype[method] = function (uri, body, callback) {
        return req.call(this, method, uri, body, callback);
    };
});

exports.createClient = function (user, key, server, how) {
    return new Chef(user, key, server, how);
};
