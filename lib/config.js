//openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout key.pem -out cert.pem

const environment = {};

environment.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001, 
    'envName' : 'staging',
    'hashSecret' : 'UmedAppSecret'
}

environment.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashSecret' : 'AlsoUmedAppSecret'
}

const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '' ;
const environmentToExport = typeof(environment[currentEnv]) == 'object' ? environment[currentEnv] : environment.staging ;

module.exports = environmentToExport;