// Example on how to create a DID
(async () => {
  const IonSdk = require('@decentralized-identity/ion-sdk');
  const randomBytes = require('randombytes');
  const ed25519 = require('@transmute/did-key-ed25519');
  const secp256k1 = require('@transmute/did-key-secp256k1');
  const request = require('request');
  const util = require('util');
  const requestPromise = util.promisify(request);

  // Generate update and recovery keys for sidetree protocol
  // Should be stored somewhere, you'll need the to updates and recovery of your DID
  const updateKey = await generateKeyPair('secp256k1'); // also supports Ed25519
  console.log('Your update key:');
  console.log(updateKey);
  const recoveryKey = await generateKeyPair('secp256k1'); // also supports Ed25519
  console.log('Your recovery key:');
  console.log(recoveryKey);

  // Generate authentication key for W3C DID Document
  // Should be stored somewhere, you'll need it for your Verifiable Credentials
  const authnKeys = await generateKeyPair('secp256k1'); // also supports Ed25519
  console.log('Your DID authentication key:');
  console.log(authnKeys);

  // Create you W3C DID document
  const didDocument = {
    publicKeys: [
      {
        id: 'key-1',
        type: 'EcdsaSecp256k1VerificationKey2019',
        publicKeyJwk: authnKeys.publicJwk,
        purposes: ['authentication']
      }
    ],
    services: [
      {
        id: 'domain-1',
        type: 'LinkedDomains',
        serviceEndpoint: 'https://foo.example.com'
      }
    ]
  };

  // Create request body ready to be posted in /operations of Sidetree API
  const createRequest = await IonSdk.IonRequest.createCreateRequest({
    recoveryKey: recoveryKey.publicJwk,
    updateKey: updateKey.publicJwk,
    document: didDocument
  });
  console.log('POST operation: ' + JSON.stringify(createRequest));

  // POST boddy to Sidetree-Cardano node
  const resp = await requestPromise({
    url: 'http://localhost:3000/operations',
    method: 'POST',
    body: JSON.stringify(createRequest)
  });
  const respBody = JSON.parse(resp.body);
  console.log(respBody);

  // Helper function to generate keys
  // type: secp256k1 | Ed25519
  async function generateKeyPair (type) {
    let keyGenerator = secp256k1.Secp256k1KeyPair;
    if (type === 'Ed25519') { keyGenerator = ed25519.Ed25519KeyPair; };
    const keyPair = await keyGenerator.generate({
      secureRandom: () => randomBytes(32)
    });
    const { publicKeyJwk, privateKeyJwk } = await keyPair.toJsonWebKeyPair(true);
    return {
      publicJwk: publicKeyJwk,
      privateJwk: privateKeyJwk
    };
  }

})();
