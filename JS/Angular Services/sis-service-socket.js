/*
A prototype service for handling websocket connections
*/

//Create your namespace
SIS.namespace("SIS.Services.Socket");

//Define your namespace
(function(namespace) {
    namespace.service = function() {
        return function(options) {
            //////////////
            //PRIVATE VARS
            var Socket = {},
                events = {},
                _ws, _wsurl;

            //TODO: set defaults here
            Socket.options = $.extend({}, options);

            //////////////
            //PRIVATE METHODS
            var _testBrowser = function(){
                var protocol = location.protocol === 'https:' ? 'wss' : 'ws',
                    protoBin;

                if ('WebSocket' in window) {
                    if (protoBin = 'binaryType' in WebSocket.prototype) {
                        return protoBin;
                    }
                    try {
                        return !!(new WebSocket(protocol + '://.').binaryType);
                    } catch (e) {

                    }
                }
                return false;
            };

            var _handleOpen = function(e) {
                Socket.options.onOpen && typeof Socket.options.onOpen === 'function' && Socket.options.onOpen(e);
                console.log("connection opened");
            };

            var _handleClose = function(e) {
                Socket.options.onClose && typeof Socket.options.onClose === 'function' && Socket.options.onClose(e);
                console.log("connection closed");
            };

            var _handleMessage = function(e) {
                Socket.options.onMessage && typeof Socket.options.onMessage === 'function' && Socket.options.onMessage(e);
                console.log("message recieved");
            };

            var _handleError = function(e) {
                Socket.options.onError && typeof Socket.options.onError === 'function' && Socket.options.onError(e);
                console.warn('error connecting to websocket');
            };

            //////////////
            //PUBLIC VARS

            //////////////
            //PUBLIC METHODS
            Socket.connect = function(url, callback) {
                if (!url || typeof url !== 'string') {
                    console.warn('Must specify a URL to conenct to');
                    _handleError();
                    return false;
                }
                _wsurl = url;
                _ws = new WebSocket(_wsurl);
                _ws.onopen = _handleOpen;
                _ws.onclose = _handleClose;
                _ws.onmessage = _handleMessage;
                _ws.onerror = _handleError;
                callback && typeof callback === 'function' && callback(_ws);

            };

            Socket.disconnect = function(reason, code) {
                code = code || 1000;
                _ws.close(code, reason);

            };

            Socket.send = function(data, callback) {
                if (!_ws || _ws.readyState !== 1) {
                    console.warn('Cannot send message: this socket is not connected yet');
                } else if (!data) {
                    console.warn('no data specified to send');
                } else {
                    data = typeof data === 'string' ? data : JSON.stringify(data);
                    _ws.send(data);
                    callback && typeof callback === 'function' && callback(_ws);
                }
            };

            // Accepts:
            //    function(Object events) - an object containing events as keys and handlers as values
            //    function(String event, Function handler)
            Socket.listenFor = function(event, handler) {
                if (!event) {
                    return false;
                }
            };
            
            //////////////
            //SETUP
            if (!_testBrowser()) {
                return undefined;
            } else {
                return Socket;
            }

        };
    }
})(SIS.Services.Socket);
