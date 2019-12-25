const config = require('./config');
const http = require('http');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;

const server = http.createServer((req,res)=>{
    const parseUrl = url.parse(req.url,true);
    const path = parseUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g,'');
    const queryScriptObject = parseUrl.query;
    const headers = req.headers;
    const method = req.method.toLowerCase();
    const decoder = new stringDecoder('utf-8');
    const buffer =  '';
    
    req.on('data',(data)=>{
        buffer += decoder.write(data);
    }); // request obj emits the event called "data" wheb payload from request streams in 
    
    req.on('end',()=>{
        buffer += decoder.end();
        const chosenHandler = typeof(router(trimmedPath)) !== 'undefined' ? router[trimmedPath] : handlers.notFound ;
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

});

server.listen(config.port,()=>{
    console.log(`Listening on port ${config.port} in ${config.envName} mode`)
});

const handlers = {};

handlers.sample = (data,callback)=>{
    callback(406,{'name':'sample handler'});
};

handlers.notFound = (data,callback)=>{
    callback(404);
};

const router = {
    'sample': handlers.sample
}