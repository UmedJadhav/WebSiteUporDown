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

app.bindLogoutButton = () => {
  document.getElementById("logoutButton").addEventListener("click", (e) => {
    e.preventDefault();
    app.logUserOut();
  });
};

app.logUserOut = () => {
  const tokenId = typeof(app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;

  const queryStringObject = {
    'id' : tokenId
  };

  app.client.request(undefined,'/api/tokens','DELETE',queryStringObject,undefined,(statusCode,responsePayload)=>{
    // Set the app.config token as false
    app.setSessionToken(false);

    window.location = '/session/deleted';

  });
};

app.bindForms = () => {
  const a = document.querySelector("form");
  if(document.querySelector("form")){
    Array.from(document.querySelectorAll("form")).forEach( function(form){
      form.addEventListener("submit", function(e){

        e.preventDefault();
        const formId = this.id;
        const path = this.action;
        let method = this.method.toUpperCase();
  
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
    });
  }
};

app.formResponseProcessor = (formId,requestPayload,responsePayload) => {
  let functionToCall = false;
  if(formId == 'accountCreate'){
    const newPayload = {
      'phone': requestPayload.phone,
      'password': requestPayload.password
    };
    console.table(newPayload);

    app.client.request(undefined, '/api/tokens', 'POST', undefined, newPayload, (newStatusCode, newResponsePayload) => {
      if(newStatusCode !== 200){
        document.querySelector(`#${formId} .formError`).innerHTML = 'Sorry, an error has occured. Please try again.';
        document.querySelector(`#${formId} .formError`).style.display = 'block';
      }else {
        // If successful, set the token and redirect the user
        app.setSessionToken(newResponsePayload);
        window.location = '/checks/all';
      }
    });
  }

  if(formId == 'sessionCreate'){
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }

  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
  if(formsWithSuccessMessages.indexOf(formId) > -1){
      document.querySelector("#"+formId+" .formSuccess").style.display = 'block';
  }

};

app.getSessionToken = () => {
  const tokenString = localStorage.getItem('token');
  if(typeof(tokenString) == 'string'){
    try{
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if(typeof(token) == 'object'){
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    }catch(e){
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

app.setLoggedInClass = (add) => {
  const target = document.querySelector("body");
  if(add){
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

app.setSessionToken = (token) => {
  app.config.sessionToken = token;
  const tokenString = JSON.stringify(token);
  localStorage.setItem('token',tokenString);
  if(typeof(token) == 'object'){
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

app.renewToken = (callback) => {
  const currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
  if(currentToken){
    // Update the token with a new expiration
    const payload = {
      'id' : currentToken.id,
      'extend' : true,
    };
    app.client.request(undefined,'api/tokens','PUT',undefined,payload,(statusCode,responsePayload) => {
      // Display an error on the form if needed
      if(statusCode == 200){
        const queryStringObject = {'id' : currentToken.id};
        app.client.request(undefined,'api/tokens','GET',queryStringObject,undefined,(statusCode,responsePayload) => {
          // Display an error on the form if needed
          if(statusCode == 200){
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

app.tokenRenewalLoop = () => {
  setInterval(function(){
    app.renewToken(function(err){
      if(!err){
        console.log("Token renewed successfully @ "+Date.now());
      }
    });
  },1000 * 60);
};

app.loadDataOnPage = function(){
  var bodyClasses = document.querySelector("body").classList;
  var primaryClass = typeof(bodyClasses[0]) == 'string' ? bodyClasses[0] : false;
  if(primaryClass == 'accountEdit'){
    app.loadAccountEditPage();
  }
};

app.loadAccountEditPage = function(){
  var phone = typeof(app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;
  if(phone){
    var queryStringObject = {
      'phone' : phone
    };
    app.client.request(undefined,'/api/users','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){

        document.querySelector("#accountEdit1 .firstNameInput").value = responsePayload.firstName;
        document.querySelector("#accountEdit1 .lastNameInput").value = responsePayload.lastName;
        document.querySelector("#accountEdit1 .displayPhoneInput").value = responsePayload.phone;

        var hiddenPhoneInputs = document.querySelectorAll("input.hiddenPhoneNumberInput");
        for(var i = 0; i < hiddenPhoneInputs.length; i++){
            hiddenPhoneInputs[i].value = responsePayload.phone;
        }

      } else {
        // If the request comes back as something other than 200, logout user (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
};

app.init = function(){
  app.bindForms();
  app.bindLogoutButton();
  app.getSessionToken();
  app.tokenRenewalLoop();
  app.loadDataOnPage();
};

window.onload = function(){
  app.init();
};