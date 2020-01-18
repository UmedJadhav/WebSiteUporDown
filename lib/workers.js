const path = require('path');
const fs = require('fs');
const _data = require('./data');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');

const workers = {};

workers.init = ()=>{
     workers.gatherAllChecks();
     workers.loop();
     workers.rotateLogs();
     workers.logRotation();
};

workers.logRotation = ()=>{
    setInterval(()=>{
        workers.rotateLogs();
    },1000*60*60*24);
} // ROtates once per day

workers.rotateLogs = ()=>{
    _logs.list(false,(err,logs)=>{
        if(!err && logs && logs.length > 0){
            logs.forEach((log)=>{
                const logId = log.replace('.log','');
                const CompressedId = `${logId}-${Date.now()}`;
                _logs.compress(logId,CompressedId,(err)=>{
                    if(!err){
                        _logs.truncate(logId,(err)=>{
                            if(!err){
                                console.log('Success truncating the log file');
                            }else{
                                console.log(`Error: Truncation of ${logId}.log File failed`);
                            }
                        });
                    }else{
                        console.log('Error compressing one of the log files',err);
                    }
                });
            });
        }else{
            console.log('Error:Couldnt find any logs to be rotated');
        }
    });
}

workers.loop = ()=>{  
    setInterval(()=>{
        workers.gatherAllChecks();
    },1000*5);
};

workers.gatherAllChecks = ()=>{
    _data.list('checks',(err,checks)=>{
        if(!err && checks && checks.length > 0 ){
            checks.forEach((check) => {
                _data.read('checks',check,(err,originalCheckData)=>{
                if(!err && originalCheckData){
                    workers.validateCheckData(originalCheckData);
                }else{
                    console.log('Error reading one of the checks data ');
                }
                });
            });
        }else{
            console.log('Error: couldnt find any checks to process')
        }
    });
};

workers.validateCheckData = (originalCheckData)=>{
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : false;
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.length === 20 ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.length === 10 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['https','http'].indexOf(originalCheckData.protocol) !== -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.length > 0 ? originalCheckData.url : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get','post','put','delete'].indexOf(originalCheckData.method) !== -1 ? originalCheckData.method : false;
    originalCheckData.successCodes =  typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds =  typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
    //if a url has never been checked we want to assume it is down,
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) !== -1 ? originalCheckData.state : 'down';  
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
    if(originalCheckData.id && originalCheckData.userPhone  && originalCheckData.protocol && originalCheckData.url &&originalCheckData.method &&  originalCheckData.successCodes && originalCheckData.timeoutSeconds ){
        workers.performCheck(originalCheckData);
    }else{
        console.log('Error: one of the checks is not properly formatted , Skipping it')
    }
};

workers.performCheck = (originalCheckData)=>{
    let checOutcome = {
        'error':  false ,
        'responseCode' : false 
    };
    let outcomeSent = false ; 
    const parsedUrl =  url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`,true);
    const hostName = parsedUrl.hostname ;
    const path = parsedUrl.path; //gives entire path with query string
    const requestDetails = {
        'protocol':`${originalCheckData.protocol}:` ,
        'hostname' : hostName ,
        'method' : originalCheckData.method.toUpperCase(),
        'path' : path ,
        'timeout' : originalCheckData.timeoutSeconds * 1000
    };

    const _moduleToUse = originalCheckData.protocol === 'http' ? http : https ;
    const request = _moduleToUse.request(requestDetails,(response)=>{
        const status = response.statusCode;
        checOutcome.responseCode = status ; 
        if (!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checOutcome);
            outcomeSent = true ;
        }
    });

    request.on('error',(err)=>{
        checOutcome.error = {
            'error' : true ,
            'value': err
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checOutcome);
            outcomeSent = true ;
        }
    });
    
    request.on('timeout',(timeout)=>{
        checOutcome.error = {
            'error' : true ,
            'value': timeout
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checOutcome);
            outcomeSent = true ;
        }
    });

    request.end(); 
};

workers.processCheckOutcome = (originalCheckData,checkOutcome)=>{
    const timeOfCheck = Date.now(); 
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome > -1) ? 'up' : 'down' ;
    const alertNeeded = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false ;
    const newCheckData = originalCheckData;
    newCheckData.state = state ;
    newCheckData.lastChecked = timeOfCheck; 
    workers._log(originalCheckData,checkOutcome,state,alertNeeded,timeOfCheck);
    
    _data.update('checks',newCheckData.id,newCheckData,(err)=>{
        if(!err){
            if(alertNeeded){
                workers.alertUsersToStatusChange(newCheckData);
            }else{
                console.log('Check outcome has not changed , no alert needed');
            }
        }else{
            console.log('Error: Failed to save updates to one of the checks');
        }
    }); 
};

workers.alertUsersToStatusChange = (newCheckData)=>{
    const message = `Alert!! Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    helpers.sendTwilioSms(newCheckData.userPhone,message,(err)=>{
        if(!err){
            console.log(`Success: User ${newCheckData.userPhone} was alerted to a status Change of ${newCheckData.state} ` , message);
        }else{
            console.log(`Error: User ${newCheckData.userPhone} couldnt be notified of state change alert `);
        }
    });
};

workers._log = (originalCheckData,checkOutcome,state,alertNeeded,timeOfCheck)=>{
    const logData = {
        'check' : originalCheckData ,
        'outcome' : checkOutcome ,
        'state' : state ,
        'alertNeeded' : alertNeeded ,
        'time' : timeOfCheck
    } 
    const logString = JSON.stringify(logData);
    const logFileName = originalCheckData.id ;
    _logs.append(logFileName,logString,(err)=>{
        if(!err){
            console.log('Logging to file Succeded'); 
        }else{
            console.log('Logging to file failed');
        }
    });
}

module.exports = workers;
