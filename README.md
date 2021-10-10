# Sidetree-Cardano

This repository is a fork of [DIF Sidetree reference implementation](https://github.com/decentralized-identity/sidetree) adapted to use Cardano blockchain as descentralized ledger and IPFS as CAS (Content Addressable Storage)

## Specification

See the [latest spec](https://identity.foundation/sidetree/spec/) for the full Sidetree specification.

See the [API spec](https://identity.foundation/sidetree/api/) for the full API specification to interact with a Sidetree node.


## Cardano's specific definitions
Sidetree transactions anchored in Cardano blockchain follow those rules:
1- Sidetree transactions are stored as Cardano transaction metadata
2- We use an specific metadata top-level key to simplify the queries within the blockchain. We arbitrarily selected the key 3141592653589793238 (first 19 digit of Pi, that is the maximun integer allowed as metadata key 2^64-1)
3- Sidetree specification requires to assign a Transaction Number to each sidetree transaction sored in the ledger, that must be a monotonically increasing number deterministically ordered. For the Transaction Number we use the block number and the index of the transaction in the block in the same way it is used in bitcoin sidetree implementation:
    transactionNumber = blockNumber * (2 ** 32) + txIndex
    blockNumber = Math.floor(transactionNumber / (2 ** 64))
    const mask = 2 ** 32 - 1
    txIndex =  transactionNumber & mask
4- The metadata stored in Cardano is a string attacched to the top-level key defined above. The string follows the format "side-tree"+{anchor string as defined in sidetree protocol}
5- A complete sidetree transaction is composed as follows:
{
      "transactionNumber": as described in above,
      "transactionTime": block number,
      "transactionTimeHash": the hash of the block,
      "anchorString": from sidetree protocol,
      "transactionFeePaid": "Fees of transaction in Lovelaces",
      "normalizedTransactionFee": "A number representing the normalized transaction fee used for proof-of-fee calculation.",
      "writer": "A string representing the writer of the transaction. Used in the value time lock calculations."
    }

6- Proof of fee: we do not implement 
Base fee variable: define
Per-Operation fee: define
Value locking: not implemented

7- DID prefix ada:testnet y ada:mainnet


spnding monitor not implemnted yet
versioning not implemented yet


## Wallet
from mnemonic
use first derived address shelley for both input and change
trasnfer 1 ADA to same address. Spend only fees of aprox x ada


## MetadataStore & Transaction store
MongoDB


## Interaction with Cardano
Light: Blockfrost
Full: ogmios + mongoDB TBD

## MongoDB


mongosh ada-testnet-core
mongosh sidetree-cardano-testnet


# run
yarn start

  


