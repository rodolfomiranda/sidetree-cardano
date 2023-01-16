import CardanoBlockModel from './models/CardanoBlockModel';
import CardanoInputModel from './models/CardanoInputModel';
import CardanoMetadataModel from './models/CardanoMetadataModel';
import CardanoOutputModel from './models/CardanoOutputModel';
import CardanoProtocolParameters from './models/CardanoProtocolParameters';
import CardanoSidetreeTransactionModel from './models/CardanoSidetreeTransactionModel';
import CardanoTransactionModel from './models/CardanoTransactionModel';
import CardanoWallet from './CardanoWallet';
import ICardanoWallet from './interfaces/ICardanoWallet';
import Logger from '@k-solutions/sidetree/dist/lib/common/Logger';
import TransactionNumber from './TransactionNumber';
import axios from 'axios';
// import { resolve } from 'dns';

/**
 * Encapsulates functionality for reading/writing to the Cardano ledger
 * This implementation use Dandelion APIs to query the blockchain and submit transactions
 * This class can easily be adapted to use othe APIs to interact with Cardano
 */
export default class CardanoClient {

  private readonly cardanoWallet: ICardanoWallet;

  private readonly submitTxURL: string;
  private readonly graphQLURL: string;

  constructor (
    readonly cardanoWalletMnemonic: string,
    readonly blockfrostProjectId: string,
    readonly cardanoNetwork: 'mainnet' | 'testnet',
    readonly cardanoMetadataLabel: string
  ) {

    this.cardanoWallet = new CardanoWallet(cardanoWalletMnemonic, cardanoNetwork);

    this.submitTxURL = this.cardanoNetwork === 'testnet' ? 'https://submit-api.testnet.dandelion.link/api/submit/tx' : 'https://submit-api.mainnet.dandelion.link/api/submit/tx';
    this.graphQLURL = this.cardanoNetwork === 'testnet' ? 'https://graphql-api.testnet.dandelion.link/api/submit/tx' : 'https://graphql-api.mainnet.dandelion.link/api/submit/tx';

  }

  /**
   * Initialize this Cardano client.
   */
  public async initialize (): Promise<void> {

    Logger.info(`Wallet Address: ${this.cardanoWallet.getAddress()}`);

  }

  /**
   * Submit the signed transaction to Cardano
   * @param cardanoSidetreeTransaction The transaction object
   * @returns the transaction hash
   */
  public async submitSidetreeTransaction (cardanoSidetreeTransaction: CardanoSidetreeTransactionModel): Promise<string> {
    const txId = await axios.post(
      this.submitTxURL,
      cardanoSidetreeTransaction.txBytes,
      {
        headers: {
          'Content-Type': 'application/cbor'
        }
      });
    return txId.data;
  }

  /**
   * Generates a valid transaction and sign it
   * @returns the signed transaction
   */
  public async createSidetreeTransaction (transactionData: string): Promise<CardanoSidetreeTransactionModel> {
    const protoParams = await this.getLatestProtocolParameters();
    const ledgerTip = await this.getLedgetTip();
    const utxos = await this.getUtxos();
    const transaction = this.cardanoWallet.createAndSignTransaction(transactionData, this.cardanoMetadataLabel, protoParams, utxos, ledgerTip.slot);
    return transaction;
  }

  /**
   * Get enough UTXO from address to cover 1 ADA + fees = aprox 1.5 ADAS = 1500000 Lovelaces
   * @returns array of UTXOs
   */
  public async getUtxos (): Promise<CardanoInputModel[]> {
    const address = this.cardanoWallet.getAddress().toString();
    const resp = await axios.post(
      this.graphQLURL,
      {
        query: `query utxoSetForAddress (
            $address: String!
            ){
                utxos(
                    order_by: { value: asc }
                    where: { address: { _eq: $address }}
                ) {
                    address
                    index
                    txHash
                    value
                }
            }`,
        variables: {
          address: address
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    const utxos: CardanoInputModel[] = [];
    let totalValue = 0;
    for (const utxo of resp.data.data.utxos) {
      utxos.push({
        address: utxo.address,
        amount: +utxo.value,
        txHash: utxo.txHash,
        index: utxo.index
      });
      totalValue += +utxo.value;
      if (totalValue >= 1500000) { break; }
    }
    return utxos;
  }

  /**
   * Gets balance in Lovelaces for this node address
   * @returns the balance of the address in Lovelaces
   */
  public async getBalanceInLovelaces (): Promise<number> {

    const resp = await axios.post(
      this.graphQLURL,
      {
        query: `query utxoSetForAddress (
            $address: String!
            ){
                utxos(
                    order_by: { value: asc }
                    where: { address: { _eq: $address }}
                ) {
                    value
                }
            }`,
        variables: {
          address: this.cardanoWallet.getAddress().toString()
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    let totalValue = 0;
    for (const utxo of resp.data.data.utxos) {
      totalValue += +utxo.value;
    }
    Logger.info('Wallet balance: ' + totalValue);
    return totalValue;
  }

  /**
   * Gets the transaction fee paid in lovelaces.
   * @param transactionHash the hash of the target transaction.
   * @returns the transaction fee in Lovelaces.
   */
  public async getTransactionFeeInLovelaces (transactionHash: string): Promise<number> {
    const resp = await axios.post(
      this.graphQLURL,
      {
        query: `query getTransactionFee(
            $hash: Hash32Hex!
            ){
                transactions(
                    where: { hash: { _eq: $hashe }}
                ) {
                    fee
                    hash
                }
            }`,
        variables: {
          hash: transactionHash
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    return +resp.data.data.transactions[0].fee;

  }

  /**
   * Get the full transaction data from th blockchain
   * @param transactionHash The target transaction id.
   * @returns the full tramsaction
   */
  public async getTransaction (transactionHash: string): Promise<CardanoTransactionModel> {
    const respLB = await axios.post(
      this.graphQLURL,
      {
        query: `query latestBlock  {
                  blocks ( 
                      where: {number: {_gt: 0}},
                      limit: 1, 
                      offset: 0, 
                      order_by: { number: desc }) {
                          number
                  }
              }`
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    const resp = await axios.post(
      this.graphQLURL,
      {
        query: `query fullTransaction (
                  $hash: Hash32Hex!
              ){
                  transactions(
                      where: { hash: { _eq: $hash }}
                  ) {
                      fee
                      hash
                      blockIndex
                      metadata {
                          key
                          value
                      }    
                      block {
                          number
                          hash
                      }
                      inputs {
                          address
                          value
                          sourceTxHash
                          sourceTxIndex
                      } 
                      outputs {
                          address
                          value
                     }
                  }
              }`,
        variables: {
          hash: transactionHash
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    const inputs: CardanoInputModel[] = [];
    for (const i of resp.data.data.transactions[0].inputs) {
      inputs.push({
        address: i.address,
        amount: +i.value,
        txHash: i.sourceTxHash,
        index: i.sourceTxIndex
      });
    }
    const outputs: CardanoOutputModel[] = [];
    for (const o of resp.data.data.transactions[0].outputs) {
      outputs.push({
        address: o.address,
        amount: +o.value
      });
    }

    let txmeta = '';
    try {
      const jmeta = resp.data.data.transactions[0].metadata[0].value[0];
      const bmeta = Buffer.from(jmeta.replace('0x', ''), 'hex');
      txmeta = bmeta.toString();
    } catch (error) {
      txmeta = '';
    }
    return {
      outputs: outputs,
      inputs: inputs,
      hash: resp.data.data.transactions[0].hash,
      fees: +resp.data.data.transactions[0].fee,
      blockHash: resp.data.data.transactions[0].block.hash,
      blockHeight: resp.data.data.transactions[0].block.number,
      index: resp.data.data.transactions[0].blockIndex,
      metadata: txmeta,
      blockConfirmations: respLB.data.data.blocks[0].number - resp.data.data.transactions[0].block.number,
      transactionNumber: TransactionNumber.construct(resp.data.data.transactions[0].block.number, resp.data.data.transactions[0].blockIndex)
    };
  }

  /**
   * Get transaction metadata array
   * in a batch of batchSize size
   * from Page
   * ordered from newest to oldest
   * filtered by metadata label
   * @param page
   * @param batchSize
   */
  public async getTxMetadataPage (page: number, batchSize: number): Promise<CardanoMetadataModel[]> {
    const txMetadatas: CardanoMetadataModel[] = [];
    try {
      const resp = await axios.post(
        this.graphQLURL,
        {
          query: `query getMetadatas (
                    $label: String!
                    $count: Int!
                    $offset: Int!
                ){
                    transactions (
                        where: {metadata: {key: {_eq: $label}}},
                        offset: $offset
                        limit: $count,
                      order_by: {block: {number: desc}}
                      
                    ){
                        hash
                      block {
                        number
                      }
                      metadata  {
                        key
                        value
                      }
                    }
                    
                  }`,
          variables: {
            count: batchSize,
            offset: batchSize * (page - 1),
            label: this.cardanoMetadataLabel
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        });

      for (const tx of resp.data.data.transactions) {
        for (const meta of tx.metadata) {
          if (meta.key === this.cardanoMetadataLabel) {
            txMetadatas.push(
              {
                txHash: tx.hash,
                jsonMetadata: meta.value,
                cborMetadata: null
              }
            );
          }
        }
      }
      return txMetadatas;
    } catch (error) {
      return txMetadatas;
    }
  }

  /**
   * Get the latest cardano blockchain protocol parameters
   * @returns the protocol parameters
   */
  private async getLatestProtocolParameters (): Promise<CardanoProtocolParameters> {
    const resp = await axios.post(
      this.graphQLURL,
      {
        query: `query latestProtocolParams  {
          epochs ( 
              limit: 1  
              order_by: { number: desc }) {
                  number
                  protocolParams {
                    minFeeA
                  minFeeB
                    maxTxSize
                    keyDeposit
                    poolDeposit
                    minUTxOValue
                    maxValSize
                  }
          }
      }`
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    return {
      epoch: resp.data.data.epochs[0].number,
      minFeeA: resp.data.data.epochs[0].protocolParams.minFeeA,
      minFeeB: resp.data.data.epochs[0].protocolParams.minFeeB,
      maxTxSize: resp.data.data.epochs[0].protocolParams.maxTxSize,
      keyDeposit: resp.data.data.epochs[0].protocolParams.keyDeposit,
      poolDeposit: resp.data.data.epochs[0].protocolParams.poolDeposit,
      minUtxo: resp.data.data.epochs[0].protocolParams.minUTxOValue,
      maxValSize: resp.data.data.epochs[0].protocolParams.maxValSize!
    };
  }

  /**
   * Get the latest block in Cardano
   * @returns the latest block
   */
  public async getLedgetTip (): Promise<CardanoBlockModel> {
    const resp = await axios.post(
      this.graphQLURL,
      {
        query: `query latestBlock  {
          blocks ( 
              where: {number: {_gt: 0}},
              limit: 1, 
              offset: 0, 
              order_by: { number: desc }) {
                  forgedAt
                  number
                  hash
                  slotNo
                  epochNo
                  size
                  forgedAt
              }
            }`
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    return {
      time: new Date(resp.data.data.blocks[0].forgedAt).getTime() / 1000,
      height: resp.data.data.blocks[0].number,
      hash: resp.data.data.blocks[0].hash,
      slot: resp.data.data.blocks[0].slotNo,
      epoch: resp.data.data.blocks[0].epochNo,
      size: resp.data.data.blocks[0].size,
      confirmations: 0
    };
  }

}
