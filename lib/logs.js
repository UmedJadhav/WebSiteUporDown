const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};
lib.baseDir = path.join(__dirname,'/../.logs');

lib.append = (file,str,callback)=>{
    fs.open(lib.baseDir + `\\${file}.log`,'a',(err,fileDescriptor)=>{
        if(!err && fileDescriptor){
            fs.appendFile(fileDescriptor,`${str}\n`,(err)=>{
                if(!err){
                    fs.close(fileDescriptor,(err)=>{
                        if(!err){
                            callback(false);
                        }else{
                            callback('Error closing file which was being appended');
                        }
                    });
                }else{
                    callback('Error appending the file')
                }
            });
        }else{
            callback('Could not open file for appending');
        }
    });
};

lib.list = (showCompressedLogs,callback)=>{
    //lists all the logs . Can show compressed logs too based on Flag
    fs.readdir(lib.baseDir, (err,data)=>{
        if(!err && data && data.length > 0){
            let trimmedFileNames = [];
            data.forEach((fileName)=>{
                if(fileName.indexOf('.log')>-1){ //if Filename includes .log 
                    trimmedFileNames.push(fileName.replace('.log',''));
                }

                 if(fileName.indexOf('.gz.b64') > -1 && showCompressedLogs){
                    trimmedFileNames.push(fileName.replace('.gz.b64',''));
                 }
                 callback(false,trimmedFileNames);
            });
        }else{
            callback(err,data);
        }
    });
};

lib.compress = (logId, newFileId,callback)=>{
    const sourceFile = `${logId}.log`;
    const destinationFile = `${newFileId}.gz.b64`;
    fs.readFile(lib.baseDir+ `\\${sourceFile}`,'utf-8',(err,inputString)=>{
        if(!err && inputString){
            zlib.gzip(inputString,(err,buffer)=>{
                if(!err && buffer){
                    fs.open(lib.baseDir + `\\${destinationFile}`,'wx',(err,fileDescriptor)=>{
                        if(!err && fileDescriptor){
                            fs.writeFile(fileDescriptor,buffer.toString('base64'),(err)=>{
                                if(!err){
                                    fs.close(fileDescriptor,(err)=>{
                                        if(!err){
                                            callback(false)
                                        }else{
                                            callback(err);
                                        }
                                    });
                                }else{
                                    callback(err);
                                }
                            });
                        }else{
                            callback(err);
                        }
                    });
                }else{
                    callback(err);
                }
            });
        }else{
            callback(err);
        }
    });
};

lib.decompress = (fileId,callback)=>{
    const fileName = `${fileId}.gz.b64` ;
    fs.readFile(lib.baseDir+ `\\${fileName}`,'utf-8',(err,str)=>{
        if(!err && str){
            const inputBuffer = Buffer.from(str,'base-64');
            zlib.unzip(inputBuffer,(err,outputBuffer)=>{
                if(!err && outputBuffer){
                    const str = outputBuffer.toString();
                    callback(false,str);
                }else{
                    callback(err);
                }
            });
        }else{
            callback(err);
        }
    });
};

lib.truncate = (logId,callback)=>{
    fs.truncate(lib.baseDir+ `\\${logId}.log`,0,(err)=>{
        if(!err){
            callback(false);
        }else{
            callback(err);
        }
    });
}

module.exports = lib;
