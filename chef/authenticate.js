var exec = require('child_process').exec,
    hash = require('crypto').createHash,
    url = require('url'),
    tmp = require('tmp'),
    fs = require('fs'),
    pkey;

function sign_cmd(privateKey, plaintext, options, cb)
{
  if (fs.existsSync !== undefined && !fs.existsSync(options.opensslPath)) {
    return cb(new Error(options.opensslPath + ': No such file or directory'));
  }

  tmp.file(function(err, path) {
    if (err) {
      tmp.setGracefulCleanup();
      return cb(err);
    }

    fs.writeFileSync(path, plaintext);

    tmp.file(function(err, out_path) {
      if (err) {
        tmp.setGracefulCleanup();
        return cb(err);
      }

      var cmd = options.opensslPath + ' rsautl -sign -inkey ' + privateKey + ' -in ' + path + ' -out ' + out_path;

      exec(cmd, {
        maxBuffer: 2000 * 1024
      }, function (err, stdout, stderr) {
        fs.unlinkSync(path);
        if (err) {
          console.error(stdout, stderr);
          return cb(err);
        }
        return enc_cmd(out_path, options, cb);
      });
    });
  });
}

function enc_cmd(sig_path, options, cb)
{
  var cmd = options.opensslPath + ' enc -base64 -in ' + sig_path;

  exec(cmd, {
    maxBuffer: 2000 * 1024
  }, function (err, stdout, stderr) {
    fs.unlinkSync(sig_path);
    if(err){
      console.error(stdout, stderr);
      return cb(err);
    }
    return cb(null, stdout.replace(/\n/g, ''));
  });
}

// Create a base64 encoded SHA1 hash from a string
function sha1(str) {
  return hash('sha1').update(str).digest('base64');
}

// Hash the stringified body
function bodyHash(body) {
  return sha1(body ? JSON.stringify(body) : '');
}

// Hash the path of the uri
function pathHash(uri) {
  return sha1(url.parse(uri).path);
}

// Create signed key from key and canonical request
function sign(key, req, options, cb) {
  if(options.wrap_ssl){
    return sign_cmd(key, req, options, cb);
  }else{
    pkey = pkey || require('ursa').coercePrivateKey;
    var signature = pkey(key).privateEncrypt(req, 'utf8', 'base64');
    return cb(null, signature);
  }
}

// Generate a timestamp, formatted how Chef wants it
function timestamp() {
  return new Date().toISOString().slice(0, -5) + 'Z';
}

// Function used internally to build Chef authentication headers.
//
// Takes a client object and an options object. The client object must contain a
// user and key; the options object must include uri, method, and body.
//
// Returns an object that includes the required headers for authenticating with
// Chef.
module.exports.getHeaders = function(client, options, callback) {
  var bh = bodyHash(options.body),
    ph = pathHash(options.uri),
    ts = timestamp(),
    user = client.user,
    canonicalReq, headers;

  canonicalReq = 'Method:' + options.method + '\n' +
    'Hashed Path:' + ph + '\n' +
    'X-Ops-Content-Hash:' + bh + '\n' +
    'X-Ops-Timestamp:' + ts + '\n' +
    'X-Ops-UserId:' + user;

  headers = {
    'X-Chef-Version': '11.6.0',
    'X-Ops-Content-Hash': bh,
    'X-Ops-Sign': 'version=1.0',
    'X-Ops-Timestamp': ts,
    'X-Ops-UserId': user
  };

  return sign(client.key, canonicalReq, options, function(err, signature){
    if(err){
      return callback(err);
    }
    signature.match(/.{1,60}/g).forEach(function (hash, line) {
      headers['X-Ops-Authorization-' + (line + 1)] = hash;
    });
    return callback(null, headers);
  });
};
