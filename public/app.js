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

app.bindForms = () => {
  document.querySelector("form").addEventListener("submit", function(e){

    e.preventDefault();
    const formId = this.id;
    const path = this.action;
    const method = this.method.toUpperCase();

    // Hide the error message (if it's currently shown due to a previous error)
    document.querySelector("#"+formId+" .formError").style.display = 'hidden';
    const payload = {};
    const elements = this.elements;
    for(let i = 0; i < elements.length; i++){
      if(elements[i].type !== 'submit'){
        const valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
        payload[elements[i].name] = valueOfElement;
      }
    }

    app.client.request(undefined,path,method,undefined,payload,(statusCode,responsePayload) => {
      if(statusCode !== 200){
        const error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';
        document.querySelector("#"+formId+" .formError").innerHTML = error;
        document.querySelector("#"+formId+" .formError").style.display = 'block';

      } else {
        app.formResponseProcessor(formId,payload,responsePayload);
      }

    });
  });
};

app.formResponseProcessor = (formId,requestPayload,responsePayload) => {
  const functionToCall = false;
  if(formId == 'accountCreate'){
    console.log('Account created')
  }
};

app.init = function(){
  app.bindForms();
};

window.onload = function(){
  app.init();
};