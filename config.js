const environment = {};

environment.staging = {
    'port' : 3000,
    'envName' : 'staging'
}

environment.production = {
    'port' : 5000,
    'envName' : 'production'
}

const currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '' ;
const environmentToExport = typeof(environment[currentEnv]) == 'object' ? environment[currentEnv] : environment.staging ;

module.exports = environmentToExport;