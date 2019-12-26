const config = require('./config');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const _data = require('./lib/data');
const stringDecoder = require('string_decoder').StringDecoder;

_data.delete('test','newFile',(err)=>{
    console.log(err) ;
    //console.log(data);
});

const httpServer = http.createServer((req,res)=>{
   unifiedServer(req,res);
});

httpServer.listen(config.httpPort,()=>{
    console.log(`Listening on port ${config.httpPort} in ${config.envName} mode`)
});


const httpsServerOptions = {
    'key':fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};

httpsServer = https.createServer(httpsServerOptions,(req,res)=>{
    unifiedServer(req,res);
});

httpsServer.listen(config.httpsPort,()=>{
    console.log(`Listening on port ${config.httpsPort} in ${config.envName} mode`)
});

const handlers = {};

handlers.ping = (data,callback)=>{
    callback(200);
}

handlers.notFound = (data,callback)=>{
    callback(404);
};

const router = {
    'ping' : handlers.ping
}

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
            'payload' : buffer
        };

        chosenHandler(data,(statusCode , payload)=>{
            statusCode = typeof(statusCode) === 'Number' ? statusCode : 200 ;
            payload = typeof(payload) === 'Object' ? payload : {};
            const payloadString = JSON.stringify(payload) ; // this is not thr payload we recieved , it it the one we send to th user
            res.setHeader('Content-type','application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log(`Request recieved with ${statusCode} , ${payloadString}`);
        });
    }); // always get called even if there is no data payload incoming
}