(async () => {

  const ION = require('@decentralized-identity/ion-tools')
  let authnKeys = await ION.generateKeyPair();
  console.log(authnKeys.publicJwk);


  let did = new ION.DID({
    content: {
      publicKeys: [
        {
          id: 'key-1',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyJwk: authnKeys.publicJwk,
          purposes: [ 'authentication' ]
        }
      ],
      services: [
        {
          id: 'domain-1',
          type: 'LinkedDomains',
          serviceEndpoint: 'https://foo.example.com'
        }
      ]
    }
  });
  // let shortFormURI = await did.getURI('short');
  // let longFormURI = await did.getURI();
  // console.log(shortFormURI)
  // console.log(longFormURI)

  // let suffix = await did.getSuffix();
  // console.log(suffix)


  let createRequest = await did.generateRequest(0)
  console.log(JSON.stringify(createRequest))


  // let operations = await did.getAllOperations();
  // console.log(operations)

  // const request = new ION.AnchorRequest(createRequest);
  // console.log(JSON.stringify(request))
})();
