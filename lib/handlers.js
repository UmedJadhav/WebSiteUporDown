const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

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
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false ;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false ;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false ;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false ;
    const tosAgrement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement === true ? true : false ;
    //Check required fields for the request
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
                      _data.delete('user',phone,(err,data)=>{
                          if(!err){
                              callback(200);
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

module.exports = handlers;