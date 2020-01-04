const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');
const helpers = {};

helpers.hash = (str)=>{
    if(typeof(str) == 'string' && str.trim().length > 0){
        return crypto.createHmac('sha256',config.hashSecret).update(str).digest('hex');
    }else{
        return false;
    }
};

helpers.parseJSON = (str)=>{
    try{
        var obj = JSON.parse(str);
        return obj;
    }catch(e){
         return {};
    }
};

helpers.createRandomString = (length)=>{
    length = typeof(length) == 'number' && length > 0 ? length : false ;
    if(length){
        const possibleChars = 'abcdefghijklmnopqrstuvwxyz1234567890'
        let string = '';
        for(let i = 0; i < length ; i++){
            string += possibleChars.charAt(Math.floor(Math.random()*possibleChars.length));
        }
        return string
    }else{
        return false;
    }
};

helpers.sendTwilioSms = (phone,msg,callback)=>{
    phone = typeof(phone) == 'string' && phone.trim().length ==10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false; 

    if (phone && msg){
        const payload = {
            'from' : config.twilio.fromPhone ,
            'to' : '+1'+ phone,
            'body' : msg
        };

        const stringPayload = querystring.stringify(payload); //since twilio api isnt json based

        const requestDetails = {
             'protocol' :'https:' ,
             'hostname' : 'api.twilio.com',
             'method' :'POST' ,
             'path' : `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
             'auth' : `${config.twilio.accountSid}:${config.twilio.authToken}` ,
             'headers': {
                'Content-type' : 'application/x-www-form-urlencoded',
                'Content-length' : Buffer.byteLength(stringPayload)
             }
        };
        const request = https.request(requestDetails,(response)=>{
            const status = response.statusCode;
            if(status === 200 || status === 201){
                callback(false);
            }else{
                console.log(response)
                callback(`Status code returned was ${status}`);
            }
        });

        request.on('error',(err)=>{
            callback(err);
        });
        request.write(stringPayload);
        request.end(); //sends the request
    }else{
        callback('Given parameters were missing or invalid');
    }
};  

module.exports = helpers;
