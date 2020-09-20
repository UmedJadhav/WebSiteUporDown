//openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout key.pem -out cert.pem
const env  = require('./.env');
const environment = {};

environment.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001, 
    'envName' : 'staging',
    'hashSecret' : 'UmedAppSecret',
    'maxChecks' : 5 ,
    'twilio' : {...env.twilio_stag},
    'templateGlobals' : {
        'appName' :'SiteUporDown',
        'companyName' :'notaRealCompany.inc',
        'yearCreated': '2020',
    }
}
environment.staging['baseUrl']= `http://localhost:${environment.staging['httpPort']}/`

environment.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashSecret' : 'AlsoUmedAppSecret',
    'maxChecks' : 5 ,
    'twilio' : {...env.twilio_prod},
    'templateGlobals': {
        'appName': 'SiteUporDown',
        'companyName' :'notaRealCompany.inc',
        'yearCreated': '2020',
    }
}
environment.production['baseUrl']=`http://localhost:${environment.production['httpPort']}/`

const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '' ;
const environmentToExport = typeof(environment[currentEnv]) == 'object' ? environment[currentEnv] : environment.staging ;

module.exports = environmentToExport;
