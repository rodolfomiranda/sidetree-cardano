/* eslint-disable sort-imports */
import * as semver from 'semver';
import * as timeSpan from 'time-span';
import { ISidetreeEventEmitter, ISidetreeLogger } from '@k-solutions/sidetree/lib';
import CardanoClient from './CardanoClient';
import CardanoServiceStateModel from './models/CardanoServiceStateModel';
import CardanoTransactionModel from './models/CardanoTransactionModel';
import ErrorCode from './ErrorCode';
import EventCode from './EventCode';
import EventEmitter from '@k-solutions/sidetree/dist/lib/common/EventEmitter';
import ICardanoConfig from './ICardanoConfig';
import LogColor from '@k-solutions/sidetree/dist/lib//common/LogColor';
import Logger from '@k-solutions/sidetree/dist/lib//common/Logger';
import MongoDbTransactionMetadataStore from './MongoDbTransactionMetadataStore';
import MongoDbServiceStateStore from '@k-solutions/sidetree/dist/lib/common/MongoDbServiceStateStore';
import MongoDbTransactionStore from '@k-solutions/sidetree/dist/lib/common/MongoDbTransactionStore';
import Monitor from './Monitor';
import RequestError from './RequestError';
import ResponseStatus from '@k-solutions/sidetree/dist/lib/common/enums/ResponseStatus';
import ServiceInfoProvider from '@k-solutions/sidetree/dist/lib/common/ServiceInfoProvider';
import ServiceVersionModel from '@k-solutions/sidetree/dist/lib/common/models/ServiceVersionModel';
import SharedErrorCode from '@k-solutions/sidetree/dist/lib//common/SharedErrorCode';
import SidetreeError from '@k-solutions/sidetree/dist/lib//common/SidetreeError';
import TransactionFeeModel from '@k-solutions/sidetree/dist/lib/common/models/TransactionFeeModel';
import TransactionModel from '@k-solutions/sidetree/dist/lib/common/models/TransactionModel';
import ValueTimeLockModel from '@k-solutions/sidetree/dist/lib/common/models/ValueTimeLockModel';

/**
 * Object representing a blockchain time and hash
 */
export interface IBlockchainTime {
  /** The logical blockchain time = slot number in Cardano */
  time: number;
  /** The hash associated with the blockchain time = block hash at the given slot */
  hash: string;
}

/**
 * Processor for Cardano REST API calls
 */
export default class CardanoProcessor {

  /** Monitor of the running Cardano service. */
  public monitor: Monitor;

  /** Store for the state of sidetree transactions. */
  private readonly transactionStore: MongoDbTransactionStore;

  // private static readonly pageSizeInTransactions = 100;

  private pollTimeoutId: number | undefined;

  private serviceInfoProvider: ServiceInfoProvider;

  private cardanoClient: CardanoClient;

  private minConfirmations: Number;

  // private spendingMonitor: SpendingMonitor;

  private serviceStateStore: MongoDbServiceStateStore<CardanoServiceStateModel>;

  private transactionMetadataStore: MongoDbTransactionMetadataStore;

  public constructor (private config: ICardanoConfig) {
    this.serviceStateStore = new MongoDbServiceStateStore(config.mongoDbConnectionString, config.databaseName);
    this.transactionMetadataStore = new MongoDbTransactionMetadataStore(config.mongoDbConnectionString, config.databaseName);
    this.transactionStore = new MongoDbTransactionStore(config.mongoDbConnectionString, config.databaseName);
    // this.spendingMonitor = new SpendingMonitor(config.cardanoFeeSpendingCutoffInLovelaces, this.transactionStore);

    this.serviceInfoProvider = new ServiceInfoProvider('cardano');

    this.minConfirmations = config.minimunConfirmationToValidateTransaction;

    this.cardanoClient =
      new CardanoClient(
        config.cardanoWalletMnemonic,
        config.blockfrostProjectId,
        config.cardanoNetwork,
        config.cardanoMetadataLabel
      );

    this.monitor = new Monitor(this.cardanoClient);
  }

  /**
   * Initializes the Cardano processor
   */
  public async initialize (customLogger?: ISidetreeLogger, customEventEmitter?: ISidetreeEventEmitter) {
    Logger.initialize(customLogger);
    EventEmitter.initialize(customEventEmitter);

    await this.serviceStateStore.initialize();
    await this.transactionMetadataStore.initialize();
    await this.transactionStore.initialize();
    await this.cardanoClient.initialize();
    await this.upgradeDatabaseIfNeeded();

    // Only observe transactions if polling is enabled.
    if (this.config.transactionPollPeriodInSeconds > 0) {
      Logger.warn(LogColor.yellow(`Transaction observer is enabled.`));
      // Intentionally not await on the promise.
      this.periodicPoll();
    } else {
      Logger.warn(LogColor.yellow(`Transaction observer is disabled.`));
    }
  }

  private async upgradeDatabaseIfNeeded () {
    const expectedDbVersion = '1.0.0';
    const savedServiceState = await this.serviceStateStore.get();
    const actualDbVersion = savedServiceState.databaseVersion;

    if (expectedDbVersion === actualDbVersion) {
      return;
    }

    // Throw if attempting to downgrade.
    if (actualDbVersion !== undefined && semver.lt(expectedDbVersion, actualDbVersion)) {
      Logger.error(
        LogColor.red(`Downgrading DB from version ${LogColor.green(actualDbVersion)} to  ${LogColor.green(expectedDbVersion)} is not allowed.`)
      );
      throw new SidetreeError(ErrorCode.DatabaseDowngradeNotAllowed);
    }

    // TODO Add DB upgrade code below.

    Logger.warn(LogColor.yellow(`Upgrading DB from version ${LogColor.green(actualDbVersion)} to ${LogColor.green(expectedDbVersion)}...`));

    // Current upgrade action is simply clearing/deleting existing DB such that initial sync can occur from genesis block.
    const timer = timeSpan();

    await this.serviceStateStore.put({ databaseVersion: expectedDbVersion });

    Logger.warn(LogColor.yellow(`DB upgraded in: ${LogColor.green(timer.rounded())} ms.`));
  }

  /**
   * Process the sidetree transactions and add it to the store
   * @param transaction the cardano transaction
   */
  private async processSidetreeTransaction (transaction: CardanoTransactionModel) {

    try {
      const sidetreeTx = {
        transactionNumber: transaction.transactionNumber,
        transactionTime: transaction.blockHeight,
        transactionTimeHash: transaction.blockHash,
        anchorString: transaction.metadata!.replace(this.config.sidetreeTransactionPrefix, ''),
        transactionFeePaid: transaction.fees,
        writer: transaction.inputs[0].address
      };
      Logger.info(LogColor.lightBlue(`Sidetree transaction found; adding ${LogColor.green(JSON.stringify(sidetreeTx))}`));
      await this.transactionStore.addTransaction(sidetreeTx);
    } catch (e) {
      Logger.info(
        `An error happened when trying to add sidetree transaction to the store. Moving on to the next transaction. ` +
        `Full error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`
      );
      throw e;
    }
  }

  /**
   * Gets the blockchain time of the given time hash.
   * Gets the latest logical blockchain time if time hash is not given.
   * @param hash Blockchain time hash.
   * @returns the current or associated blockchain time of the given time hash.
   */
  public async time (hash?: string): Promise<IBlockchainTime> {
    Logger.info(`Getting time ${hash ? 'of time hash ' + hash : ''}`);
    if (!hash) {
      const latestBLock = await this.cardanoClient.getLedgetTip();
      return {
        time: latestBLock.height,
        hash: latestBLock.hash
      };
    }
    const tx = await this.cardanoClient.getTransaction(hash);
    return {
      hash: hash,
      time: tx.blockHeight
    };
  }

  /**
   * Writes a Sidetree transaction to the underlying Cardano's blockchain.
   * @param anchorString The string to be written as part of the transaction.
   */
  public async writeTransaction (anchorString: string) {
    const sidetreeTransactionString = `${this.config.sidetreeTransactionPrefix}${anchorString}`;
    const sidetreeTransaction = await this.cardanoClient.createSidetreeTransaction(sidetreeTransactionString);
    const transactionFee = sidetreeTransaction.fees;
    Logger.info(`Fee: ${transactionFee}. Anchoring string ${anchorString}`);

    const totalLovelaces = await this.cardanoClient.getBalanceInLovelaces();
    if (totalLovelaces < transactionFee + 1000000) {
      const error = new Error(`Not enough lovelaces to submit transaction. Failed to broadcast anchor string ${anchorString}`);
      Logger.error(error);
      throw new RequestError(ResponseStatus.BadRequest, SharedErrorCode.NotEnoughBalanceForWrite);
    }

    const transactionHash = await this.cardanoClient.submitSidetreeTransaction(sidetreeTransaction);
    Logger.info(LogColor.lightBlue(`Successfully submitted transaction [hash: ${LogColor.green(transactionHash)}]`));
    // this.spendingMonitor.addTransactionDataBeingWritten(anchorString);
  }

  /**
   * Handles the get version operation.
   */
  public async getServiceVersion (): Promise<ServiceVersionModel> {
    return this.serviceInfoProvider.getServiceVersion();
  }

  /**
   * Will process transactions every interval seconds.
   * @param interval Number of seconds between each query
   */
  private async periodicPoll (interval: number = this.config.transactionPollPeriodInSeconds) {

    try {
      // Defensive programming to prevent multiple polling loops even if this method is externally called multiple times.
      if (this.pollTimeoutId) {
        clearTimeout(this.pollTimeoutId);
      }

      await this.processTransactions();

      EventEmitter.emit(EventCode.CardanoObservingLoopSuccess);
    } catch (error) {
      EventEmitter.emit(EventCode.CardanoObservingLoopFailure);
      Logger.error(error);
    } finally {
      this.pollTimeoutId = setTimeout(this.periodicPoll.bind(this), 1000 * interval, interval);
    }
  }

  /**
   * Processes transaction metadata from new to last processd transaction
   */
  private async processTransactions () {
    Logger.info(`Starting processTransaction at: ${Date.now()}`);

    const txMetadatas = await this.getTransactionMetadatas();
    Logger.info(`Processing ${txMetadatas.length} new transactions`);

    for (const txm of txMetadatas) {
      const cardanoTransaction = await this.cardanoClient.getTransaction(txm.toString());
      if (this.validateTransaction(cardanoTransaction)) {
        this.transactionMetadataStore.add([cardanoTransaction]);
        this.processSidetreeTransaction(cardanoTransaction);
      }
    }

    Logger.info(`Finished processing ${txMetadatas.length} transactions`);
  }

  /**
   * Validate cardano transaction metadata
   * @param cardanoTransaction
   */
  private validateTransaction (cardanoTransaction: CardanoTransactionModel) : Boolean {
    Logger.info('transaction: ' + cardanoTransaction);
    let validated = true;
    // Validate that cardano metadata starts with the configured prefix
    if (cardanoTransaction.metadata == null || !cardanoTransaction.metadata.startsWith(this.config.sidetreeTransactionPrefix)) {
      validated = false;
    }
    // validate that input address = output address
    if (cardanoTransaction.inputs[0].address !== cardanoTransaction.outputs[0].address) {
      validated = false;
    }
    // validate that block confirmations are greater that 6
    if (cardanoTransaction.blockConfirmations < this.minConfirmations) {
      validated = false;
    }
    return validated;
  }

  /**
   * Get transaction metadata from new to last processed transaction
   */
  private async getTransactionMetadatas (): Promise<String[]> {
    const lastProcessedTransaction = await this.transactionMetadataStore.getLast();
    let lastTransactionFound = false;
    // start retrieving batch of 10 metadatas from page 1
    let batchSize = 10;
    let page = 1;
    const metadataArray = [];

    while (!lastTransactionFound) {
      const txMetadatas = await this.cardanoClient.getTxMetadataPage(page, batchSize);
      for (const txMeta of txMetadatas) {
        if (txMeta.txHash === lastProcessedTransaction?.hash) {
          lastTransactionFound = true;
          break;
        } else {
          metadataArray.push(txMeta.txHash);
        }
      }
      if (txMetadatas.length < batchSize) { lastTransactionFound = true; }
      // if lastProcessedTransaction not  ound and batchSize = 10, incrent batchSize to 100 for fast procesing
      if (lastTransactionFound === false && batchSize === 10) {
        batchSize = 100;
      }
      // if lastProcessedTransaction not found, move to next page
      if (lastTransactionFound === false && batchSize === 100) {
        page++;
      }
    }
    return metadataArray.reverse();
  }

  /**
 * Fetches Sidetree transactions in chronological order from since or genesis.
 * @param since A transaction number
 * @param hash The associated transaction time hash
 * @returns Transactions
 */
  public async transactions (since?: number, hash?: string): Promise<{
    moreTransactions: boolean,
    transactions: TransactionModel[]
  }> {
    Logger.info(LogColor.lightBlue(`Transactions request: since transaction number ${LogColor.green(since)}, block hash '${LogColor.green(hash)}'...`));

    if ((since && !hash) ||
        (!since && hash)) {
      throw new RequestError(ResponseStatus.BadRequest);
    }
    // const transactions = await this.transactionStore.getTransactions();
    let transactions: TransactionModel[];
    if (!since) {
      transactions = await this.transactionStore.getTransactions();
    } else {
      transactions = await this.transactionStore.getTransactionsLaterThan(since, undefined);
    }

    const moreTransactions = false;
    // const transactions: TransactionModel[] = await this.transactionStore.getTransactionsStartingFrom(
    //   inclusiveBeginTransactionTime, exclusiveEndTransactionTime);

    // const [transactions, lastBlockSeen] = await this.getTransactionsSince(since, lastProcessedBlock.blockNumber);

    // if last processed block has not been seen, then there are more transactions
    // const moreTransactions = lastBlockSeen < lastProcessedBlock.blockNumber;

    return {
      transactions,
      moreTransactions
    };
  }

  /**
   * Return transactions since transaction number and the last block seen
   * @param since Transaction number to query since
   * @param maxBlockHeight The last block height to consider included in transactions
   * @returns a tuple of [transactions, lastBlockSeen]
   */
  // private async getTransactionsSince (since: number | undefined, maxBlockHeight: number): Promise<[TransactionModel[], number]> {
  //   // test against undefined because 0 is falsy and this helps differentiate the behavior between 0 and undefined
  //   let inclusiveBeginTransactionTime = since === undefined ? this.genesisBlockNumber : TransactionNumber.getBlockNumber(since);

  //   const transactionsToReturn: TransactionModel[] = [];

  //   // while need more blocks and have not reached the processed block
  //   while (transactionsToReturn.length === 0 && inclusiveBeginTransactionTime <= maxBlockHeight) {
  //     const exclusiveEndTransactionTime = inclusiveBeginTransactionTime + CardanoProcessor.pageSizeInBlocks;
  //     let transactions: TransactionModel[] = await this.transactionStore.getTransactionsStartingFrom(
  //       inclusiveBeginTransactionTime, exclusiveEndTransactionTime);

  //     transactions = transactions.filter((transaction) => {
  //       // filter anything greater than the last processed block because they are not complete
  //       return transaction.transactionTime <= maxBlockHeight &&
  //         // if there is a since, filter transactions that are less than or equal to since (the first block will have undesired transactions)
  //         (since === undefined || transaction.transactionNumber > since);
  //     });

  //     inclusiveBeginTransactionTime = exclusiveEndTransactionTime;
  //     transactionsToReturn.push(...transactions);
  //   }

  //   // the -1 makes the last seen transaction time inclusive because the variable is set to the exclusive one every loop
  //   return [transactionsToReturn, inclusiveBeginTransactionTime - 1];
  // }

  /**
 * Calculate and return proof-of-fee value for a particular block.
 * @param _block The block height to get normalized fee for
 */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getNormalizedFee (_block: number | string): Promise<TransactionFeeModel> {

    return { normalizedTransactionFee: 1 };
  }

  /**
   * Gets the lock information which is currently held by this node. It throws an RequestError if none exist.
   */
  public async getActiveValueTimeLockForThisNode (): Promise<ValueTimeLockModel> {
    let currentLock: ValueTimeLockModel | undefined;
    // TODO
    // try {
    //   currentLock = await this.lockMonitor.getCurrentValueTimeLock();
    // } catch (e) {

    //   if (e instanceof SidetreeError && e.code === ErrorCode.LockMonitorCurrentValueTimeLockInPendingState) {
    //     throw new RequestError(ResponseStatus.NotFound, ErrorCode.ValueTimeLockInPendingState);
    //   }

    //   Logger.error(`Current value time lock retrieval failed with error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
    //   throw new RequestError(ResponseStatus.ServerError);
    // }

    if (!currentLock) {
      throw new RequestError(ResponseStatus.NotFound, SharedErrorCode.ValueTimeLockNotFound);
    }

    return currentLock;
  }
}
