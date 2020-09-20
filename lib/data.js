const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

var lib = {};
lib.baseDir = path.join(__dirname,'/../.data') ;

lib.create = (dir,file,data,callback)=>{
    fs.open(path.join(lib.baseDir ,`/${dir}/${file}.json`),'wx' , (err,fileDescriptor)=>{
        if(!err && fileDescriptor){
            const stringData = JSON.stringify(data);
            fs.writeFile(fileDescriptor,stringData,(err)=>{
                if(!err){
                    fs.close(fileDescriptor , (err) => {
                        if (!err){
                            callback(false); // no error occured
                        }else{
                            callback('Error closng new file');
                        }
                    });
                }else {
                    callback('Error writing to the new file');
                }
            }) ;
        }else{
            callback('Could not create file, it may already exist');
        }
    });
}; // subdirs are like tables 

lib.read = (dir,file,callback)=>{
    fs.readFile(path.join(lib.baseDir, `/${dir}/${file}.json`),'utf-8',(err , data) => {
        if(!err && data){
        callback(err,helpers.parseJSON(data));
        }else{
            callback(err,data);
        }
    });
}

lib.update = (dir,file,data,callback)=>{
    fs.open(path.join(lib.baseDir, `/${dir}/${file}.json`),'r+',(err , fileDescriptor)=>{
        if(!err && fileDescriptor){
            data = JSON.stringify(data);
            fs.truncate(fileDescriptor, (err)=>{
                if(!err){
                    fs.writeFile(fileDescriptor,data,(err)=>{
                        if(!err){
                            fs.close(fileDescriptor,(err)=>{
                                if(!err){
                                    callback(false);
                                }else{
                                    callback('Couldnt close the file');
                                }
                            });
                        }else{
                            callback('Error writing to existing file');
                        }
                    });
                }else{
                    callback('Error truncating file');
                }
            });
        }else{
            console.log(err);
            callback('Couldnt not open the file for updating');
        }
    });
}; 

lib.delete = (dir,file,callback) => {
    fs.unlink(path.join(lib.baseDir, `/${dir}/${file}.json`),(err)=>{
        if(!err){   
            callback(false);
        }else{
            console.log(err);
            callback('Error deleting the file');
        }
    });
}

lib.list = (dir,callback)=>{
    fs.readdir(path.join(lib.baseDir, `/${dir}`),(err,data)=>{
        if(!err && data && data.length > 0){
            let trimmedFileName = [] ;
            data.forEach((fileName)=>{
              trimmedFileName.push(fileName.replace('.json',''));  
            });
            callback(false,trimmedFileName);
        }else{
            callback(err,data);
        }
    });
};

module.exports = lib;