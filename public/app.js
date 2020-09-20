var app = {}

app.config = {
  sessionToken: false
}

// Ajax client 
app.client = {}
app.client.request = (headers, path, method, queryString, payload, callback)=> {
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST', 'PUT', 'GET', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
  queryString = typeof(queryString) == 'object' && queryString !== null ? queryString : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;
  
  let requestPath = `${path}?`;
  let counter = 0 ;
  for( let queryKey in queryString ) {
    if(queryString.hasOwnProperty(queryKey)){
      counter ++ ;
      if (counter > 1){
        requestPath += '&';
      }
      requestPath += `${queryKey}=${queryString[queryKey]}`
    }
  };
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestPath , true);
  xhr.setRequestHeader('Content-Type', 'application/json');

for(let header in headers) {
  if(headers.hasOwnProperty(header)){
    xhr.setRequestHeader(header, headers[header]);
  }
};

if(app.config.sessionToken){
  xhr.setRequestHeader('token', app.config.sessionToken.id);
}

xhr.onreadystatechange = () => {
  if( xhr.readyState == XMLHttpRequest.DONE ){
    const statusCode = xhr.status;
    const response = xhr.responseText;

    if(callback){
      try{
        const parsedResponse = JSON.parse(response);
        callback(statusCode, parsedResponse);
      }catch(e){
        callback(statusCode, false);
      }
    }
  }
};

const payloadString = JSON.stringify(payload);
xhr.send(payloadString);

}