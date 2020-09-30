const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const handlers = {};
//JSON api Handlers

handlers.ping = (data,callback)=>{
    callback(200);
}

handlers.notFound = (data,callback)=>{
    callback(404);
};

handlers.users = (data,callback)=>{
    const acceptableMethods = ['get','post','put','delete'];
    if(acceptableMethods.indexOf(data.method) >= -1 ){
        handlers._users[data.method](data,callback);
    }else {
        callback(405); //405 - http method not allowed
    }
};


handlers._users = {};

handlers._users.post = (data,callback)=>{
    //Check required fields for the request
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false ;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false ;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false ;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false ;
    const tosAgrement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement === true ? true : false ;

    if(firstName && lastName && phone && password && tosAgrement){
        // Users existence in DB is based on having a unique phone number
        _data.read('users',phone,(err , data)=>{
            if(err){ // file doesn't exist. Unique phone number
                const hashPassword = helpers.hash(password);
                if (hashPassword){
                    const userObject = {
                        'firstName': firstName ,
                        'lastName' : lastName ,
                        'phone' : phone ,
                        'hashedPassword' : hashPassword,
                        'tosAgreement' : true
                    };
                    _data.create('users',phone,userObject,(err)=>{
                        if(!err){
                            callback(200);
                        }else{
                            console.log(err);
                            callback(500,{'Error':'Couldnt create the new user'});
                        }
                    });
                }else {
                    callback(500,{'Error':'Couldnt hash the user password'});
                }
            }else{
                //User with that phone number already exists
                callback(400,{'Error':`A user with ${phone} phone number already exists`});
            }
        });
    }else{
       callback(400,{'Error':'Missing required fields'}); 
    }
};

handlers._users.get = (data,callback)=>{
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false ;
    if(phone){
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false ;
        handlers._tokens.verifyTokens(token,phone,(tokenValid)=>{
            if(tokenValid){
                _data.read('users',phone,(err,data)=>{
                    console.log(err);
                  if(!err && data) {
                    delete data.hashedPassword ;
                    callback(200,data); // data used here is the data retrieved from the DB
                  }else{
                    callback(404);
                  }
                });
            }else{
                callback(403,{'Error':'Missing required token in header or token is invalid'});
            }
        });
    }else{
        callback(400,{"Error":"Missing required fields"});
    }
};

handlers._users.put = (data,callback)=>{
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false ;
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false ;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false ;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false ;
    if(phone){ 
        if(firstName || lastName || password){
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false ;
            handlers._tokens.verifyTokens(token,phone,(tokenValid)=>{
                if(tokenValid){
                    _data.read('users',phone,(err,userdata)=>{
                        if(!err && userdata){  
                            if(firstName){
                                userdata.firstName = firstName;
                            }
                            if(lastName){
                                userdata.lastName = lastName;
                            }
                            if(password){
                                userdata.hashedPassword = helpers.hash(password);
                            }
                            _data.update('users',phone,userdata,(err)=>{
                                if(!err){
                                    callback(200);
                                }else{
                                    console.log(err);
                                    callback(500,{'Error':'Couldnt update the user'});
                                }
                            });
                        }else{
                            callback(400,{'Error':'Specified user doesnt exist'});
                        }
                    });

                } else{
                    callback(403,{'Error':'Missing required token in header or token is invalid'});
                }});

        }else{
            callback(400,{'Error':'Missing fileds to update'});
        }
    }else{
        callback(400,{'Error':'Missing required field'});
    }
};

handlers._users.delete = (data,callback)=>{
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false ;
    if(phone){
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false ;
        handlers._tokens.verifyTokens(token,phone,(tokenValid)=>{
            if(tokenValid){
                _data.read('users',phone,(err,data)=>{
                    if(!err && data) {
                      _data.delete('users',phone,(err,userData)=>{
                          if(!err){
                                //Deleting each checks associated with it
                                const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [] ;
                                const checkToDeleteLenght = userChecks.length;
                                if(checkToDeleteLenght > 0){
                                    let checksDeleted = 0 ;
                                    let deletionErrors = false ;
                                    userChecks.forEach((checkId)=>{
                                        _data.delete('checks',checkId,(err)=>{
                                            if(err){
                                                deletionErrors = true;
                                            }
                                            checksDeleted ++ ;
                                            if(checksDeleted == checkToDeleteLenght){
                                                if(!deletionErrors){
                                                    callback(200);
                                                }else{
                                                    callback(500,{'Error':'Errors encountered while deleting all users checks . All checks may have not been deleted'});
                                                }
                                            }
                                        });
                                    });
                                }else{
                                    callback(200);
                                }     
                          }else{
                             callback(500,'Couldnt delete the specified user');
                          }
                      });
                    }else{
                      callback(400,{'Error':'Couldnt find the specified user'});
                    }
                  });
            }else{
                callback(403,{'Error':'Missing required token in header or token is invalid'}); 
            }});
    }else{
        callback(400,{"Error":"Missing required field"});
    }
};

handlers.tokens = (data,callback)=>{
    const acceptableMethods = ['get','post','put','delete'];
    if(acceptableMethods.indexOf(data.method) >= -1 ){
        handlers._tokens[data.method](data,callback);
    }else {
        callback(405); //405 - http method not allowed
    }
};

handlers._tokens = {};

handlers._tokens.get = (data,callback)=>{

    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false ;
    console.log(typeof(data.queryStringObject.id), data.queryStringObject.id)
    if(id){
        _data.read('tokens',id,(err,tokenData)=>{
            console.log(err);
          if(!err && tokenData) {
            callback(200,tokenData); // data used here is the data retrieved from the DB
          }else{
            callback(404);
          }
        });
    }else{
        callback(400,{"Error":"Missing required fields"});
    }
};

handlers._tokens.post = (data,callback)=>{
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false ;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false ;
    if(phone && password){ //Required fields 
        _data.read('users',phone,(err,userdata)=>{
            if(!err && userdata){
                const  hashedPassword = helpers.hash(password);
                console.log(userdata);
                if(hashedPassword === userdata.hashedPassword){
                    const tokenId = helpers.createRandomString(20);
                    const expiry = Date.now() + 1000*60*60 ; // 1 h our from setting the token
                    const tokenObj = {
                        'phone' : phone,
                        'id' : tokenId,
                        'expiries':expiry
                    };
                    _data.create('tokens',tokenId,tokenObj,(err)=>{
                        if(!err){
                            callback(200,tokenObj);
                        }else{
                            callback(500,{'Error':'Couldnt create the new token'});
                        }
                    });
                }else{
                    callback(400,{'Error':'Password for the user didnt match'});
                }
            }else{
                callback(400,{'Error':'Couldnt find the specified user'});
            }
        });

    }else{
        callback(400,{'Error':'Missing required fields'});
    }
};

handlers._tokens.put = (data,callback)=>{
    // The only thing to modify in the token is to extend its expiration date
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false ;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend === true ? true : false ;
    if(id && extend){
        _data.read('tokens',id,(err,tokenData)=>{
            if(!err && tokenData){
                if(tokenData.expiries > Date.now()){
                    tokenData.expiries = Date.now() + 1000*60*60 ;
                    _data.update('tokens',id,tokenData,(err)=>{
                       if(!err){
                           callback(200);
                       } else{
                           callback(500,{'Error':'Couldnt update tokens expiration'});
                       }
                    });

                }else{
                    callback(400,{'Error':'Token has already expired'});
                }
            }else{
                callback(400,{'Error':"Specified token doesnt exist"});
            }
        });
    }else{
        callback(400,{'Error':'Missing fields or invalid fields'});
    }
};

handlers._tokens.delete = (data,callback)=>{
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false ;
    if(id){
        _data.read('tokens',id,(err,data)=>{
          if(!err && data) {
            _data.delete('tokens',id,(err,data)=>{
                if(!err){
                    callback(200);
                }else{
                   callback(500,'Couldnt delete the specified token');
                }
            });
          }else{
            callback(400,{'Error':'Couldnt find the specified token'});
          }
        });
    }else{
        callback(400,{"Error":"Missing required field"});
    }
};

handlers._tokens.verifyTokens = (id,phone,callback)=>{
    _data.read('tokens',id,(err,tokenData)=>{
        if(!err && tokenData){
            if(tokenData.phone === phone && tokenData.expiries > Date.now()){
                callback(true);
            }else{
                callback(false);
            }
        }else{
            return false;
        }
    });
};

handlers.checks = (data,callback)=>{
    const acceptableMethods = ['get','post','put','delete'];
    if(acceptableMethods.indexOf(data.method) >= -1 ){
        handlers._checks[data.method](data,callback);
    }else {
        callback(405); //405 - http method not allowed
    }
};

handlers._checks = {} ;

handlers._checks.post = (data,callback)=>{
    const protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false ;
    const url  = typeof(data.payload.url) == 'string' && data.payload.protocol.length > 0 ? data.payload.url : false ;
    const method = typeof(data.payload.method) == 'string' && ['get','post','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false ;
    const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0 ? data.payload.successCodes : false ;
    const timeoutSeconds  = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false ;
    if(protocol && url && method && successCodes && timeoutSeconds){ //Required Data
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        _data.read('tokens',token,(err,tokenData)=>{
            if(!err && tokenData){
                const userPhone = tokenData.phone;
                _data.read('users',userPhone,(err,userData)=>{
                    if(!err && userData){
                       const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [] ;
                        if (userChecks.length < config.maxChecks){
                            const checkId = helpers.createRandomString(20);
                            const checkObj = {
                                'id':checkId,
                                'userPhone':userPhone,
                                'protocol':protocol,
                                'url':url,
                                'method':method,
                                'successCodes':successCodes,
                                'timeoutSeconds':timeoutSeconds
                            };//Storing each check with the referernce to the creator and creators also have a reference to check in its obj
                            _data.create('checks',checkId,checkObj,(err)=>{
                                if(!err){
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                    _data.update('users',userPhone,userData,(err)=>{
                                        if(!err){
                                            callback(200,checkObj);
                                        }else{
                                            callback(500,{'Error':'Couldnt update the user with the new check'});
                                        }
                                    });
                                }else{
                                    callback(500,{'Error':'Couldnt create the new check'});
                                }
                            });
                        }else{
                            callback(400,{'Error':`The user already has max number of checks viz. ${config.maxChecks}`});
                        }
                    }else{
                        callback(403);
                    }
                });
            }else{
                callback(403)
            }
        });
    }else{
        callback(400,{'Error':'Missing required inputs or inputs are invalid'});
    }
};

handlers._checks.get = (data,callback)=>{
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false ;
    if(id){ //Required data
        _data.read('checks',id,(err,checkData)=>{
            if(!err && checkData){
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false ;
                handlers._tokens.verifyTokens(token,checkData.userPhone,(tokenValid)=>{
                    if(tokenValid){
                        callback(200,checkData);
                    }else{
                        callback(403,{'Error':'Missing required token in header or token is invalid'});
                    }
                });
            }else{
                callback(404);
            }
        });
       
    }else{
        callback(400,{"Error":"Missing required fields"});
    }
};
handlers._checks.put = (data,callback)=>{
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false ;
    const protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false ;
    const url  = typeof(data.payload.url) == 'string' && data.payload.protocol.length > 0 ? data.payload.url : false ;
    const method = typeof(data.payload.method) == 'string' && ['get','post','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false ;
    const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0 ? data.payload.successCodes : false ;
    const timeoutSeconds  = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false ;
    if(id){
        if(protocol || method || url || successCodes || timeoutSeconds){
            _data.read('checks',id,(err,checkData)=>{
                if(!err && checkData){
                    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false ;
                    handlers._tokens.verifyTokens(token,checkData.userPhone,(tokenValid)=>{
                        if(tokenValid){
                            if(protocol){
                                checkData.protocol = protocol;
                            }
                            if(url){
                                checkData.url = url;
                            }
                            if(method){
                                checkData.method = method;
                            }
                            if(successCodes){
                                 checkData.successCodes = successCodes;
                            }
                            if(timeoutSeconds){
                                checkData.timeoutSeconds = timeoutSeconds;
                            }
                            _data.update('checks',id,checkData,(err)=>{
                                if(!err){
                                    callback(200);
                                }else{
                                    callback(500,{'Error':'Couldnt update the check'});
                                }
                            });
                        }else{
                            callback(403);
                        }
                    });    
                }else{
                    callback(400,{'Error':'Check id didnt exist'});
                }
            });
        }else{
            callback(400,{'Error':'Missing fields to update'});
        }
    }else{
        callback(400,{'Error':'Missing required field'});
    }
    
};

handlers._checks.delete = (data,callback)=>{
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false ;
    if(id){
        _data.read('checks',id,(err,checkData)=>{
            if(!err && checkData){
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false ;
                handlers._tokens.verifyTokens(token,checkData.userPhone,(tokenValid)=>{
                    if(tokenValid){
                        _data.delete('checks',id,(err)=>{
                            if(!err){
                                _data.read('users',checkData.userPhone,(err,userData)=>{
                                    if(!err && userData) {
                                        const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [] ;
                                        const checkPosition = userChecks.indexOf(id);
                                        if(checkPosition > -1){
                                            userChecks.splice(checkPosition,1);  
                                          _data.update('users',checkData.userPhone,userData,(err)=>{
                                            if(!err){
                                                callback(200);
                                            }else{
                                               callback(500,'Couldnt update the specified user');
                                            }
                                        });
                                        }else{
                                            callback(500,{'Error':'Couldnt find the check on user Object'});
                                        }
                                    }else{
                                      callback(500,{'Error':'Couldnt find the user that created the check.Didnt delete the check'});
                                    }
                                  });
                            }else{
                                callback(500,{"Error":"Couldnt delete the check data"});
                            }
                        });

                    }else{
                        callback(403); 
                    }});
            }else{
                callback(400,{'Error':'Specified check ID doesnt exist'});
            }
        });


    }else{
        callback(400,{"Error":"Missing required field"});
    }
};

//HTML handlers

handlers.index = (data,callback)=>{
    if(data.method === 'get'){
        const templateData = {
            'head.title': 'Uptime Monitoring' ,
            'head.description':'A free uptime monitoring service that lets you know then your http/ https site goes down',
            'body.class': 'index'
        };
        helpers.getTemplate('index',templateData,(err,str)=>{
            if(!err && str){
                helpers.addUniversalTemplates(str,templateData,(err,fullStr)=>{
                    if(!err && fullStr){
                        callback(200,fullStr,'html');
                    }else{
                        callback(500,undefined,'html');
                    }
                });
                
            }else{
                callback(500,undefined,'html');
            }
        });
    }else{
        callback(405,undefined,'html');
    }
};

handlers.favicon = (data, callback) => {
    if(data.method === 'get'){
        helpers.getStaticAssets('favicon.ico', (err, data) => {
            if(!err & data){
                callback(200, data, 'favicon'); // here favicon is the type of the data
            }else{
                callback(404);
            }
        })
    }else{
        callback(405);
    }
};

handlers.public = (data, callback) => {
    if(data.method === 'get'){
        const trimmedAssets = data.trimmedPath.replace('public/', '').trim();
        if(trimmedAssets.length > 0){
            helpers.getStaticAssets(trimmedAssets , (err, data) => {
                if(!err && data){
                    let contentType = 'plain';
                    if (trimmedAssets.indexOf('.css') > -1){
                        contentType = 'css';
                    }
                    if (trimmedAssets.indexOf('.ico') > -1){
                        contentType = 'favicon'
                    }
                    if (trimmedAssets.indexOf('.jpg') > -1){
                        contentType = 'jpg'
                    }
                    if (trimmedAssets.indexOf('.png') > -1){
                        contentType = 'png'
                    }
                    callback(200, data, contentType);
                }else{
                    callback(404);
                }
            })
        }else{
            callback(404);
        }
    }else{
        callback(405)
    }
}

handlers.accountCreate = (data, callback)=>{
    if(data.method == 'get'){
        const templateData = {
            'head.title': 'Create an account' ,
            'head.description':'Sign up is easy and quick',
            'body.class': 'accountCreate'
        };
        helpers.getTemplate('account_create',templateData,(err,str)=>{
            if(!err && str){
                helpers.addUniversalTemplates(str,templateData,(err,fullStr)=>{
                    if(!err && fullStr){
                        callback(200,fullStr,'html');
                    }else{
                        callback(500,undefined,'html');
                    }
                });
                
            }else{
                callback(500,undefined,'html');
            }
        });
    }else{
        callback(405,undefined,'html');
    }
};


handlers.accountEdit = (data, callback)=>{
    if(data.method == 'get'){
        const templateData = {
            'head.title': 'Account Settings' ,
            'body.class': 'accountEdit'
        };
        helpers.getTemplate('account_edit',templateData,(err,str)=>{
            if(!err && str){
                helpers.addUniversalTemplates(str,templateData,(err,fullStr)=>{
                    if(!err && fullStr){
                        callback(200,fullStr,'html');
                    }else{
                        callback(500,undefined,'html');
                    }
                });
                
            }else{
                callback(500,undefined,'html');
            }
        });
    }else{
        callback(405,undefined,'html');
    }
};

handlers.sessionCreate = (data, callback)=>{
    if(data.method == 'get'){
        const templateData = {
            'head.title': 'Login to your account' ,
            'head.description':'Please enter your phone number and password to access the account',
            'body.class': 'sessionCreate'
        };
        helpers.getTemplate('session_create',templateData,(err,str)=>{
            if(!err && str){
                helpers.addUniversalTemplates(str,templateData,(err,fullStr)=>{
                    if(!err && fullStr){
                        callback(200,fullStr,'html');
                    }else{
                        callback(500,undefined,'html');
                    }
                });
                
            }else{
                callback(500,undefined,'html');
            }
        });
    }else{
        callback(405,undefined,'html');
    }
};

handlers.sessionDeleted = (data, callback)=>{
    if(data.method == 'get'){
        const templateData = {
            'head.title': 'Logged out' ,
            'head.description':'You have been logged out of your account',
            'body.class': 'sessionDeleted'
        };
        helpers.getTemplate('session_deleted',templateData,(err,str)=>{
            if(!err && str){
                helpers.addUniversalTemplates(str,templateData,(err,fullStr)=>{
                    if(!err && fullStr){
                        callback(200,fullStr,'html');
                    }else{
                        callback(500,undefined,'html');
                    }
                });
                
            }else{
                callback(500,undefined,'html');
            }
        });
    }else{
        callback(405,undefined,'html');
    }
};

module.exports = handlers;