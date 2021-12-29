# Sidetree-Cardano

**Sidetree-Cardano** is an implementation of [Sidetree protocol](https://identity.foundation/sidetree/spec/) on top of Cardano Blockchain and IPFS. It is based on the [reference framework](https://github.com/decentralized-identity/sidetree) provided by Decentralized Identity Foundation (DIF).

**Sidetree-Cardano** nodes provide a public, permissionless, Decentralized Identifier (DID) Layer 2 network that support scalable DIDs/DPKI operations.

This develpment is also part of my proposal [Interoperability as Growth Driver](https://cardano.ideascale.com/a/dtd/Interoperability-as-growth-driver/368705-48088) submitted to Fund 6 of Cardano Catalyst and that **got funded**. Thanks for voting!!! [Here]() is a list of my proposals for Fund 7.

Take note that this project is in Beta phase and improving is underway. Testing and collaboration are welcomed!

## Install & Run
1. Install and run [mongodb](https://www.mongodb.com/try/download/community)
2. Install and run [IPFS](https://docs.ipfs.io/install/)
3. Clone the repo `git clone git@github.com:rodolfomiranda/sidetree-cardano.git`
4. Install required packages `npm install`
5. Configure wallet mnemonic ([with funds](https://testnets.cardano.org/en/testnets/cardano/tools/faucet/))
6. Build `yarn build`
7. Run `yarn start`

## Try out some DID operations
Sidetree-Cardano expose a [REST API](https://identity.foundation/sidetree/api/) to interact with it. At start up a swagger UI is deployed at `http://localhost:8080` that help with API requests (you can remove it from `start` script if you won't use it). 

Additionally, and in order to facilitate and ilustrate DID operations, the folder `examples` contains snippets to create, update, recover, deactivate and resolve DIDs. For the example we use the handy [ion-sdk](https://github.com/decentralized-identity/ion-sdk) for operation generation.

## TODO's
* Improve error handling
* Implement spending monitor (control wallet balance and spending rate limits)
* Implement versioning manager
* Add unit tests

## Sidetree-Cardano's conventions
Sidetree transactions anchored in Cardano blockchain follow these rules:
1. Sidetree transactions are stored in Cardano blockchain as transaction metadata.
2. It uses a specific metadata top-level key to simplify the queries within the blockchain. We arbitrarily selected the key  **74338733** ('sidetree' in T9 encoding).
3. Sidetree specification requires to assign a Transaction Number to each sidetree transaction stored in the ledger, that must be a monotonically increasing number deterministically ordered. For the Transaction Number we use the block number and the index of the transaction in the block in the same way it is used in bitcoin sidetree implementation `transactionNumber = blockNumber * (2 ** 32) + txIndex`.
4. The metadata stored in Cardano is a string attacched to the top-level key defined above. The string follows the format `"sidetree:"+{anchor string as defined in sidetree protocol}`
5. DID method: `did:ada`
6. A complete sidetree transaction is composed as follows:
```
{
    "transactionNumber": as described in above
    "transactionTime": block number
    "transactionTimeHash": the hash of the block
    "anchorString": as defined in sidetree protocol
    "transactionFeePaid": Fees of transaction in Lovelaces
    "normalizedTransactionFee": not used (null)
    "writer": wallet address of sidetree-cardano node
}
```
7. Tranasction: it use the first derived shelley address from mnemonics to transfer 1 ADA to itself and write metadata. The only cost is the tranasction fee that is around 0.17 - 0.18 ADA.
8. Interaction with Cardano blockchain is provided by Gimbalabs [Dandelion API](https://gimbalabs.com/dandelion) or by [Blockfrost](https://blockfrost.io). You need select correct import in src/CardanoClient.ts (if you use Bockfrost also need to configure your projectId in json/testnet-cardano-config.json)
9. The protocol waits for a minumun block confirmations until we accepts the transactions as valid. The greated the safer, but it takes longer to have the DID published in blockchain.
10. Proof of fee and Value Locking are not implememted.
## DIF Specifications

* See the [latest spec](https://identity.foundation/sidetree/spec/) for the full Sidetree specification.
* See the [API spec](https://identity.foundation/sidetree/api/) for the full API specification to interact with a Sidetree node.

## Bugs, questions, ideas
Please, [open a github issue](https://github.com/rodolfomiranda/sidetree-cardano/issues) in this repo.

