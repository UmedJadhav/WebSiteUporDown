const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const stringDecoder = require('string_decoder').StringDecoder;
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

const server = {};

server.httpServer = http.createServer((req,res)=>{
   server.unifiedServer(req,res);
});

server.httpsServerOptions = {
    'key':fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions,(req,res)=>{
    server.unifiedServer(req,res);
});

server.unifiedServer = (req,res)=>{
    const parseUrl = url.parse(req.url,true);
    const path = parseUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g,'');
    const queryScriptObject = parseUrl.query;
    const headers = req.headers;
    const method = req.method.toLowerCase();
    const decoder = new stringDecoder('utf-8');
    let buffer =  '';
    
    req.on('data',(data)=>{
        buffer += decoder.write(data);
    }); // request obj emits the event called "data" wheb payload from request streams in 
    
    req.on('end',()=>{
        buffer += decoder.end();
        const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound ;
        const data = {
            'trimmedPath': trimmedPath , 
            'queryStringObject' : queryScriptObject ,
            'method' : method , 
            'headers' : headers ,
            'payload' : helpers.parseJSON(buffer)
        };

        //Sets the statusCode and the accompanying message(payload)
        chosenHandler(data,(statusCode , payload, contentType)=>{
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200 ;
            contentType = typeof(contentType) == 'string'? contentType : 'json' ;
            let payloadString = '';// this is not thr payload we recieved , it it the one we send to th user
            
            if(contentType == 'json'){
                res.setHeader('Content-type','application/json');
                payload = typeof(payload) == 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }else if(contentType == 'html'){
                res.setHeader('Content-type','text/html');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }else if(contentType == 'favicon'){
                res.setHeader('Content-type','image/x-icon');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }else if(contentType == 'css'){
                res.setHeader('Content-type','text/css');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }else if(contentType == 'png'){
                res.setHeader('Content-type','img/png');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }else if(contentType == 'jpg'){
                res.setHeader('Content-type','text/jpeg');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }else if(contentType == 'plain'){
                res.setHeader('Content-type','text/plain');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }
            
            res.writeHead(statusCode);
            res.end(payloadString);
            if(statusCode == 200){
                debug('\x1b[32m%s\x1b[0m',`${method.toUpperCase()}/ ${trimmedPath} ${statusCode}`);
            }else{
                debug('\x1b[31m%s\x1b[0m',`${method.toUpperCase()}/ ${trimmedPath} ${statusCode}`);
            }
        });
    }); // always get called even if there is no data payload incoming
}

server.router = {
    '': handlers.index,
    'account/create':handlers.accountCreate,
    'account/edit' :handlers.accountEdit,
    'account/deleted':handlers.accountDeleted,
    'session/create':handlers.sessionCreate,
    'session/deleted':handlers.sessionDeleted,
    'checks/all':handlers.checksList,
    'checks/create':handlers.checksCreate,
    'checks/edit':handlers.checksEdit, 
    'ping' : handlers.ping ,
    'api/users' : handlers.users,
    'api/tokens' : handlers.tokens ,
    'api/checks' : handlers.checks,
    'favicon.ico': handlers.favicon,
    'public': handlers.public 
}

server.init = ()=>{
    server.httpServer.listen(config.httpPort,()=>{
        console.log('\x1b[36m%s\x1b[0m',`Listening http requests on port ${config.httpPort} in ${config.envName} mode`)
    });

    server.httpsServer.listen(config.httpsPort,()=>{
        console.log('\x1b[35m%s\x1b[0m',`Listening https requests on port ${config.httpsPort} in ${config.envName} mode`)
    });
};

module.exports = server;