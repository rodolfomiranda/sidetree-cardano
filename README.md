# Sidetree-Cardano

**Sidetree-Cardano** is an implementation of [Sidetree protocol](https://identity.foundation/sidetree/spec/) on top of Cardano Blockchain and IPFS. It is based on the [reference framework](https://github.com/decentralized-identity/sidetree) provided by the Decentralized Identity Foundation (DIF).

**Sidetree-Cardano** nodes provide a public, permissionless, Decentralized Identifier (DID) Layer 2 network that support scalable DIDs/DPKI operations.

This development is part of my proposal [Interoperability as Growth Driver](https://cardano.ideascale.com/a/dtd/Interoperability-as-growth-driver/368705-48088) submitted to Project Catalyst Fund 6  that finally  **got funded**. Thanks for voting!!! See the [list](https://github.com/rodolfomiranda/sidetree-cardano/wiki/Project-Catalyst-Proposals) of my new proposals for Fund 7.

Take note that this project is in Beta phase and improving is underway. Testing and collaboration are welcomed!

## Install & Run
1. Install and run [mongodb](https://www.mongodb.com/try/download/community)
2. Install and run [IPFS](https://docs.ipfs.io/install/)
3. Clone the repo `git clone git@github.com:rodolfomiranda/sidetree-cardano.git`
4. Install required packages `npm install`
5. Configure wallet mnemonic ([with funds](https://testnets.cardano.org/en/testnets/cardano/tools/faucet/)) in json config files
6. Build `yarn build`
7. Run `yarn start`

## Try out some DID operations
Sidetree-Cardano exposes a [REST API](https://identity.foundation/sidetree/api/) at `http://localhost:3000` that receives DID operations, and there's also a swagger UI deployed at `http://localhost:8080` (you can remove it from `start` script if you won't use it). However, if you don't want to build and run the node, you can use a testnet node located at `https://testnet.sidetree-cardano.com`.

Either way, and in order to facilitate and ilustrate DID operations, you'll find several snippets in the folder `examples`  that you can run to create, update, recover, deactivate and resolve DIDs. In the examples we use the handy [ion-sdk](https://github.com/decentralized-identity/ion-sdk) to generate the body of the operations. See the walk-in guide [here](https://github.com/rodolfomiranda/sidetree-cardano/blob/master/examples/examples.MD).

## TODO's
* Improve error handling
* Implement spending monitor (control wallet balance and spending rate limits)
* Implement versioning manager
* Add unit tests

## Sidetree-Cardano's conventions
Sidetree transactions anchored in Cardano blockchain follow these rules:
1. Sidetree transactions are stored in Cardano blockchain as transaction metadata.
2. It uses a specific metadata top-level key to simplify the queries within the blockchain. We arbitrarily selected the key  **74338733** ('sidetree' in T9 encoding).
3. DID method: `did:ada`
4. Sidetree specification requires to assign a Transaction Number to each sidetree transaction stored in the ledger, that must be a monotonically increasing number deterministically ordered. For the Transaction Number we use the block number and the index of the transaction in the block in the same way it is used in bitcoin sidetree implementation `transactionNumber = blockNumber * (2 ** 32) + txIndex`.
5. The metadata stored in Cardano is a string attacched to the top-level key defined above. The string follows the format `"sidetree:"+{anchor string as defined in sidetree protocol}`
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
7. Metadata transaction: it use the first derived Shelley address from mnemonics to transfer 1 ADA to itself and write metadata. The only cost is the tranasction fee that is around 0.17 - 0.18 ADA.
8. Interaction with Cardano blockchain is provided by Gimbalabs [Dandelion API](https://gimbalabs.com/dandelion) or by [Blockfrost](https://blockfrost.io). You need to select correct import in `src/CardanoClient.ts` (if you use Bockfrost also need to configure your projectId in `json/testnet-cardano-config.json`)
9. The protocol waits for a minumun block confirmations until we accepts the transactions as valid. The greated the safer, but it takes longer to have the DID published in blockchain and able to be resolved.
10. Proof of fee and Value Locking were not implememted.
## DIF Specifications

* See the [latest spec](https://identity.foundation/sidetree/spec/) for the full Sidetree specification.
* See the [API spec](https://identity.foundation/sidetree/api/) for the full API specification to interact with a Sidetree node.

## Sidetree-Cardano vs Atala PRISM
| Sidetree-Cardano protocol                                                            | Atala PRISM protocol                                                                    |
|--------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| available now                                                                        | not avaliable yet. Only for  Atala Prism Pioneer Program                                |
| open source                                                                          | will be open source, but not timeframe given                                            |
| fully complies with W3C DID Document V1 specs                                        | does not comply with W3C DID specs yet. Only stores master, issuing and revocation keys |
| does not deal with verifiable credentials                                            | verifiable credential hashes are stored in ledger allowing revocations                  |
| protocol reliability confirmed in ion(bitcoin) and element(ethereum) implementations | newer protocol, need testing                                                            |
| available in many open source frameworks                                             | open source tools and framework will be developed by the community                      |

## Bugs, questions, ideas
Please, [open a github issue](https://github.com/rodolfomiranda/sidetree-cardano/issues) in this repo.

