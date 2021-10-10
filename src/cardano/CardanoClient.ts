import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import CardanoInputModel from './models/CardanoInputModel';
import CardanoMetadataModel from './models/CardanoMetadataModel';
import CardanoOutputModel from './models/CardanoOutputModel';
import CardanoSidetreeTransactionModel from './models/CardanoSidetreeTransactionModel';
import CardanoTransactionModel from './models/CardanoTransactionModel';
import CardanoWallet from './CardanoWallet';
import ICardanoWallet from './interfaces/ICardanoWallet';
import Logger from '@decentralized-identity/sidetree/dist/lib/common/Logger';
import TransactionNumber from './TransactionNumber';

/**
 * Encapsulates functionality for reading/writing to the Cardano ledger.
 */
export default class CardanoClient {

  /** Blockfrost API Key */
  // private readonly blockfrostProjectId?: string;

  private readonly cardanoWallet: ICardanoWallet;

  private readonly blockfrostAPI: BlockFrostAPI;

  constructor (
    readonly cardanoWalletMnemonic: string,
    readonly blockfrostProjectId: string,
    readonly cardanoNetwork: 'mainnet' | 'testnet',
    readonly cardanoMetadataLabel: string
  ) {

    Logger.info('Creating cardano wallet using the import mnemonic passed in.');
    this.cardanoWallet = new CardanoWallet(cardanoWalletMnemonic, cardanoNetwork);

    this.blockfrostAPI = new BlockFrostAPI({ projectId: blockfrostProjectId, isTestnet: (this.cardanoNetwork === 'testnet') });

  }

  /**
   * Initialize this Cardano client.
   */
  public async initialize (): Promise<void> {

    Logger.info(`Wallet loaded with address ${this.cardanoWallet.getAddress()}`);

  }

  /**
   * Submit the specified data transaction.
   * @param cardanoSidetreeTransaction The transaction object.
   */
  public async submitSidetreeTransaction (cardanoSidetreeTransaction: CardanoSidetreeTransactionModel): Promise<string> {
    const txId = await this.blockfrostAPI.txSubmit(cardanoSidetreeTransaction.txCBOR);
    Logger.info(txId);
    return txId;
  }

  /**
   * Creates (and NOT broadcasts) a transaction to write data to the Cardano.
   *
   * @param transactionData The metadadata to write in the transaction.
   */
  public async createSidetreeTransaction (transactionData: string): Promise<CardanoSidetreeTransactionModel> {
    const protoParams = await this.getLatestProtocolParameters();
    const ledgerTip = await this.getLedgetTip();
    const utxos = await this.getUtxos();
    Logger.info(utxos);
    const transaction = this.cardanoWallet.createAndSignTransaction(transactionData, this.cardanoMetadataLabel, protoParams, utxos, ledgerTip.slot);

    return transaction;
  }

  /**
   * Get UTXO from address to cover 1 ADA + fees = aprox 2 ADAS = 2000000 Lovelaces
   *
   */
  public async getUtxos (): Promise<CardanoInputModel[]> {
    Logger.info('getting utxos');
    const address = this.cardanoWallet.getAddress().toString();
    Logger.info('getting utxos for address ' + address);
    const addressUtxos = await this.blockfrostAPI.addressesUtxos(address);
    Logger.info(addressUtxos);
    const utxos: CardanoInputModel[] = [];
    let totalValue = 0;
    for (const utxo of addressUtxos) {
      Logger.info(utxo);
      utxos.push({
        address: address,
        amount: +utxo.amount[0].quantity,
        txHash: utxo.tx_hash,
        index: utxo.tx_index
      });
      totalValue += +utxo.amount[0].quantity;
      if (totalValue >= 2000000) { break; }
    }
    Logger.info(utxos);
    return utxos;
  }

  /**
   * Gets balance in Lovelaces from address
   * @returns the balance of the address in Lovelaces
   */
  public async getBalanceInLovelaces (): Promise<number> {

    const address = await this.blockfrostAPI.addresses(this.cardanoWallet.getAddress().toString());
    Logger.info(address);
    return +address.amount[0].quantity; // TODO check if that allways valid

  }

  /**
   * Gets the transaction fee of a transaction in lovelaces.
   * @param transactionHash the hash of the target transaction.
   * @returns the transaction fee in Lovelaces.
   */
  public async getTransactionFeeInLovelaces (transactionHash: string): Promise<number> {

    const tx = await this.blockfrostAPI.txs(transactionHash);
    Logger.info(tx);
    return +tx.fees;
  }

  /**
   * Get full transaction data.
   * @param transactionHash The target transaction id.
   */
  public async getTransaction (transactionHash: string): Promise<CardanoTransactionModel> {
    const tx = await this.blockfrostAPI.txs(transactionHash);
    const block = await this.blockfrostAPI.blocks(tx.block);
    const metadata = await this.blockfrostAPI.txsMetadata(transactionHash);
    const txUTXO = await this.blockfrostAPI.txsUtxos(transactionHash);
    const inputs: CardanoInputModel[] = [];
    for (const i of txUTXO.inputs) {
      inputs.push({
        address: i.address,
        amount: +i.amount[0].quantity,
        txHash: i.tx_hash,
        index: i.output_index
      });
    }
    const outputs: CardanoOutputModel[] = [];
    for (const o of txUTXO.outputs) {
      outputs.push({
        address: o.address,
        amount: +o.amount[0].quantity
      });
    }
    let txmeta = '';
    try {
      const jmeta:string = metadata[0].json_metadata![0];
      const bmeta = Buffer.from(jmeta.replace('0x', ''), 'hex');
      txmeta = bmeta.toString();
    } catch (error) {
      txmeta = '';
    }
    Logger.info(txmeta);
    return {
      outputs: outputs,
      inputs: inputs,
      hash: tx.hash,
      fees: +tx.fees,
      blockHash: tx.block,
      blockHeight: tx.block_height,
      index: tx.index,
      metadata: txmeta,
      blockConfirmations: block.confirmations,
      transactionNumber: TransactionNumber.construct(tx.block_height, tx.index)
    };
  }

  /**
   * Get transaction metadata array
   * in a batch of batcSize size
   * from Page
   * ordered from newest to oldest
   * filtered by metadata label
   * @param page
   * @param batchSize
   */
  public async getTxMetadataPage (page: number, batchSize: number): Promise<CardanoMetadataModel[]> {
    const txMetadatas: CardanoMetadataModel[] = [];
    try {
      const txMetadatas = await this.blockfrostAPI.metadataTxsLabel(this.cardanoMetadataLabel, { page: page, order: 'desc', count: batchSize });
      return txMetadatas;
    } catch (error) {
      return txMetadatas;
    }

  }

  private async getLatestProtocolParameters (): Promise<any> {
    Logger.info('Getting protocol parameters');
    const latestEpoch = await this.blockfrostAPI.epochsLatest();
    Logger.info(latestEpoch);
    const protocolParams = await this.blockfrostAPI.epochsParameters(latestEpoch.epoch);
    Logger.info(protocolParams);
    return protocolParams;
  }

  public async getLedgetTip (): Promise<any> {
    const latestBlock = await this.blockfrostAPI.blocksLatest();
    return latestBlock;
  }

}
