// Example on how to resolve a DID
(async () => {
  const request = require('request');
  const util = require('util');
  const requestPromise = util.promisify(request);

  // DID to resolve
  const did = 'did:ada:EiBxybhTu8_RJJzmL07edduRbt6wqHCuwvW4lM2wKuy3Fw';

  // GET resolution from Sidetree-Cardano node
  // if you received a did_not_found, noote that
  // it may take some time for the transaction to be confirmed
  // in blockchain and confirmed by sidetree
  const resp = await requestPromise('http://localhost:3000/identifiers/' + did);
  const respBody = JSON.parse(JSON.stringify(resp.body));
  console.log(respBody);

})();
