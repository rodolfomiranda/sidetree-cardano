/** Swager UI webservice */

var express = require('express');
// ugly remove last path
const root = __dirname.substring(0, __dirname.lastIndexOf('/'));

// use the application off of express
var app = express();

// define the route for "/"
app.get('/', function (_request: any, response: { sendFile: (arg0: string) => void; }) {
  response.sendFile(root + '/www/swagger/index.html');
});
// route api.yml
app.get('/api.yml', function (_request: any, response: { sendFile: (arg0: string) => void; }) {
  response.sendFile(root + '/www/swagger/api.yml');
});

// Start webserver on port 8080
app.listen(8090);

console.log('Access Swagger at http://localhost:8090');
