//openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout key.pem -out cert.pem

const environment = {};

environment.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001, 
    'envName' : 'staging',
    'hashSecret' : 'UmedAppSecret',
    'maxChecks' : 5 ,
    'twilio' : {
        'accountSid' : 'ACf5f6cc456ece87cb751bc46dce943491',
        'authToken' : '309184b4c6e661f9c4c75061c18d2612',
        'fromPhone' : '+12563872608'
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