(async () => {
  const { IpfsClient } = await import('kubo-rpc-client');  // import { create } from 'kubo-rpc-client'

  // connect to the default API address http://localhost:5001
  // const client = IpfsClient.create();

  // connect to a different API
  const client = IpfsClient("http://127.0.0.1:5001/api/v0");

  // connect using a URL
  // const client = IpfsClient.create(new URL('http://127.0.0.1:5001'));

  // call Core API methods
  const { cid } = await client.add('Hello world!');
  
  console.log('CID is: ' + cid); 

})();
