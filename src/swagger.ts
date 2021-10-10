var express = require('express');

const root = __dirname.substring(0, __dirname.lastIndexOf('/'));

// use the application off of express.
var app = express();

// define the route for "/"
app.get('/', function (_request: any, response: { sendFile: (arg0: string) => void; }) {
  response.sendFile(root + '/www/swagger/index.html');
});

app.get('/api.yml', function (_request: any, response: { sendFile: (arg0: string) => void; }) {
  response.sendFile(root + '/www/swagger/api.yml');
});

// Start the server
app.listen(8080);

console.log('Access Swagger at http://localhost:8080');
