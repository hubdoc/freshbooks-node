var request = require('request');
var easyxml = require('easyxml');
var xml2js = require('xml2js');
var domain = require('domain');

function Freshbooks(account, token, agent, showAttributes) {
    this.url = 'https://' + account + '.freshbooks.com/api/2.1/xml-in';
    this.token = token;
    this.agent = agent;
    this.parser = new xml2js.Parser({explicitArray: false, ignoreAttrs: showAttributes !== undefined ? (showAttributes ? false : true) : true, async: true});
    this.easyxml_parser = new easyxml({rootElement: 'request', manifest: true});
}

Freshbooks.prototype.call = function(method, json, callback) {
    var self = this;
    var xml;
    var d = domain.create();

    var _callback = callback;
    var call_callback = function(err, json) {
        if (callback) {
            callback = null;
            return _callback(err, (err ? undefined : json));
        }
    };
    d.on('error', function(err) {
        return call_callback(err);
    });

    d.run(function() {
        if (!json) {
            xml = '<?xml version=\'1.0\' encoding=\'utf-8\'?>\n<request>\n</request>\n'
        }
        else {
            try {
                xml = self.easyxml_parser.render(json);
            } catch (e) {
                return call_callback(e);
            }
        }
        xml = xml.replace('<request>', '<request method="' + method + '">');

        var options = {
            uri: self.url,
            method: "POST",
            headers: {
                'Authorization': 'Basic ' + new Buffer(self.token + ':X').toString('base64'),
                'User-Agent': self.agent
            },
            body: xml
        }

        request(options, function(err, res, body) {
            if (err) {
                return call_callback(err);
            } else if (res.statusCode !== 200) {
                return call_callback(new Error(res.statusCode));
            } else {
                try {
                    self.parser.parseString(body, function(err, json) {
                        if (err) return call_callback(err);
                        if (json && json.response && json.response.error) {
                            return call_callback(json);
                        } else {
                            return call_callback(null, json);
                        }
                    });
                } catch (e) {
                    return call_callback(e);
                }
            }
        });
    });
}

module.exports = Freshbooks;
