var expect = require('chai').expect,
    chef = require('../chef'),
    key = __dirname + '/fixtures/example.pem'; //require('fs').readFileSync(__dirname + '/fixtures/example.pem'),
    nock = require('nock');

describe('chef', function () {
   describe('createClient', function () {
        it('should be a function', function () {
            expect(chef.createClient).to.be.a('function');
        });
   });

   describe('Client', function () {
        describe('Base URI', function () {
            beforeEach(function () {
                this.client = chef.createClient('test', key, 'https://example.com', true, '/usr/bin/openssl');
                nock('https://example.com')
                    .get('/nodes').replyWithFile(200, __dirname + '/fixtures/nodes.json')
                    .get('/404').reply(404, {"error": "404 - Not Found: Sorry, I can't find what you are looking for."});
            });

            it('with uri should work', function (done) {
                this.client.get('/nodes', function(err, res, body){
                    expect(err).to.not.be.an.instanceof(Error);
                    expect(res.request.uri.href).to.eq('https://example.com/nodes');
                    expect(body).to.be.an.instanceof(Object);
                    done(null, true);
                });
            });

            it('with full url should work', function (done) {
                this.client.get('https://example.com/nodes', function(err, res, body){
                    expect(err).not.to.be.an('error');
                    expect(res.request.uri.href).to.eq('https://example.com/nodes');
                    expect(body).to.be.an('object');
                    expect(body["node1.org"]).to.be.an('string');
                    expect(body["error"]).not.to.be.an('string');
                    done(null, true);
                });
            });

            it('should be not found', function (done) {
                this.client.get('/404', function(err, res, body){
                    expect(err).not.to.be.an('error');
                    expect(res.request.uri.href).to.eq('https://example.com/404');
                    expect(body).to.be.an('object');
                    expect(body["error"]).to.be.an('string');
                    done(null, true);
                });
            });
        });
   });
});
