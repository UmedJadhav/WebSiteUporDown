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
  if(document.querySelector("form")){
    console.log('Entering binding forms')
    const allForms = document.querySelectorAll("form");
    for(let i = 0; i < allForms.length; i++){
        allForms[i].addEventListener("submit", (e) => {

        e.preventDefault();
        const formId = this.id;
        const path = this.action;
        const method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector("#"+formId+" .formError").style.display = 'none';

        // Hide the success message (if it's currently shown due to a previous error)
        if(document.querySelector("#"+formId+" .formSuccess")){
          document.querySelector("#"+formId+" .formSuccess").style.display = 'none';
        }

        const payload = {};
        const elements = this.elements;
        for(let i = 0; i < elements.length; i++){
          if(elements[i].type !== 'submit'){
            var classOfElement = typeof(elements[i].classList.value) == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
            var valueOfElement = elements[i].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? elements[i].checked : classOfElement.indexOf('intval') == -1 ? elements[i].value : parseInt(elements[i].value);
            var elementIsChecked = elements[i].checked;
            var nameOfElement = elements[i].name;
            if(nameOfElement == '_method'){
              method = valueOfElement;
            } else {
              if(nameOfElement == 'httpmethod'){
                nameOfElement = 'method';
              }
              if(nameOfElement == 'uid'){
                nameOfElement = 'id';
              }
              if(classOfElement.indexOf('multiselect') > -1){
                if(elementIsChecked){
                  payload[nameOfElement] = typeof(payload[nameOfElement]) == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                  payload[nameOfElement].push(valueOfElement);
                }
              } else {
                payload[nameOfElement] = valueOfElement;
              }

            }
          }
        }

        // If the method is DELETE, the payload should be a queryStringObject instead
        var queryStringObject = method == 'DELETE' ? payload : {};

        // Call the API
        app.client.request(undefined,path,method,queryStringObject,payload,(statusCode,responsePayload) => {
          // Display an error on the form if needed
          console.log('From frontend', statusCode)
          if(statusCode !== 200){

            if(statusCode == 403){
              // log the user out
              app.logUserOut();

            } else {

              // Try to get the error from the api, or set a default error message
              var error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';

              // Set the formError field with the error text
              document.querySelector("#"+formId+" .formError").innerHTML = error;

              // Show (unhide) the form error field on the form
              document.querySelector("#"+formId+" .formError").style.display = 'block';
            }
          } else {
            app.formResponseProcessor(formId,payload,responsePayload);
          }

        });
      });
    }
  }
};

app.formResponseProcessor = (formId,requestPayload,responsePayload) => {
  var functionToCall = false;
  // If account creation was successful, try to immediately log the user in
  if(formId == 'accountCreate'){
    console.log('Account create form was success')
  }

};

app.init = () => {
  app.bindForms();
}

app.onload = () => {
  app.init();
}