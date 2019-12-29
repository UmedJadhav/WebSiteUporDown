const crypto = require('crypto');
const config = require('./config');

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

module.exports = helpers;
