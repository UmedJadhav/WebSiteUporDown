//openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout key.pem -out cert.pem

const environment = {};

environment.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001, 
    'envName' : 'staging',
    'hashSecret' : 'UmedAppSecret',
    'maxChecks' : 5 ,
    'twilio' : {
        'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone' : '+15005550006'
      }
}

environment.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashSecret' : 'AlsoUmedAppSecret',
    'maxChecks' : 5 ,
    'twilio' : {
        'accountSid' : '' ,
        'authToken' : '' ,
        'fromPhone' : ''
    }
}

const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '' ;
const environmentToExport = typeof(environment[currentEnv]) == 'object' ? environment[currentEnv] : environment.staging ;

module.exports = environmentToExport;