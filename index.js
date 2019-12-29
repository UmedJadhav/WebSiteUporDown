const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const stringDecoder = require('string_decoder').StringDecoder;

const httpServer = http.createServer((req,res)=>{
   unifiedServer(req,res);
});

httpServer.listen(config.httpPort,()=>{
    console.log(`Listening http requests on port ${config.httpPort} in ${config.envName} mode`)
});


const httpsServerOptions = {
    'key':fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};

httpsServer = https.createServer(httpsServerOptions,(req,res)=>{
    unifiedServer(req,res);
});

httpsServer.listen(config.httpsPort,()=>{
    console.log(`Listening https requests on port ${config.httpsPort} in ${config.envName} mode`)
});

const unifiedServer = (req,res)=>{
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
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound ;
        const data = {
            'trimmedPath': trimmedPath , 
            'queryStringObject' : queryScriptObject ,
            'method' : method , 
            'headers' : headers ,
            'payload' : helpers.parseJSON(buffer)
        };

        //Sets the statusCode and the accompanying message(payload)
        chosenHandler(data,(statusCode , payload)=>{
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200 ;
            payload = typeof(payload) == 'object' ? payload : {};
            const payloadString = JSON.stringify(payload) ; // this is not thr payload we recieved , it it the one we send to th user
            res.setHeader('Content-type','application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log(`Request recieved with ${statusCode} , ${payloadString}`);
        });
    }); // always get called even if there is no data payload incoming
}

const router = {
    'ping' : handlers.ping ,
    'users' : handlers.users,
    'tokens' : handlers.tokens ,
    'checks' : handlers.checks
}