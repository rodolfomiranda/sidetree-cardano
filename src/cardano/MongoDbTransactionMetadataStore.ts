import CardanoTransactionModel from './models/CardanoTransactionModel';
import { Cursor } from 'mongodb';
import ITransactionMetadataStore from './interfaces/ITransactionMetadataStore';
import MongoDbStore from '@k-solutions/sidetree/dist/lib/common/MongoDbStore';

/**
 * Implementation of ITransactionMetadataStore using MongoDB database.
 */
export default class MongoDbTransactionMetadataStore extends MongoDbStore implements ITransactionMetadataStore {
  /** Collection name for storing transaction metadata. */
  public static readonly collectionName = 'txmetadata';

  /** Query option to exclude `_id` field from being returned. */
  // private static readonly optionToExcludeIdField = { fields: { _id: 0 } };

  /**
   * Constructs a `MongoDbTransactionMetadataStore`;
   */
  constructor (serverUrl: string, databaseName: string) {
    super(serverUrl, MongoDbTransactionMetadataStore.collectionName, databaseName);
  }

  public async createIndex () {
    // Create unique index, so duplicate inserts are rejected.
    await this.collection.createIndex({ transactionNumber: 1 }, { unique: true });
  }

  public async add (arrayOfTransactionMetadata: CardanoTransactionModel[]): Promise<void> {
    const bulkOperations = this.collection!.initializeOrderedBulkOp();

    arrayOfTransactionMetadata.sort((a, b) => a.transactionNumber - b.transactionNumber);
    for (const transactionMetadata of arrayOfTransactionMetadata) {
      bulkOperations.find({ height: transactionMetadata.transactionNumber }).upsert().replaceOne(transactionMetadata);
    }

    await bulkOperations.execute();
  }

  public async removeLaterThan (transactionNumber?: number) {
    // If block height is not given, remove all.
    if (transactionNumber === undefined) {
      await this.clearCollection();
      return;
    }

    await this.collection!.deleteMany({ transactionNumber: { $gt: transactionNumber } });
  }

  public async get (fromInclusiveTransactionNumber: number, toExclusiveTransactionNumber: number): Promise<CardanoTransactionModel[]> {
    let dbCursor: Cursor<CardanoTransactionModel>;

    // Add filter to query.
    dbCursor = this.collection!.find({
      $and: [
        { transactionNumber: { $gte: fromInclusiveTransactionNumber } },
        { transactionNumber: { $lt: toExclusiveTransactionNumber } }
      ]
    });

    // Add sort to query.
    dbCursor = dbCursor.sort({ transactionNumber: 1 });

    // Execute the query.
    const blocks = await dbCursor.toArray();
    return blocks;
  }

  public async getLast (): Promise<CardanoTransactionModel | undefined> {
    const txs = await this.collection!.find().sort({ transactionNumber: -1 }).limit(1).toArray();
    if (txs.length === 0) {
      return undefined;
    }

    const lastBlockMetadata = txs[0];
    return lastBlockMetadata;
  }

  /**
   * Gets the first transaction (older).
   */
  // private async getFirst (): Promise<CardanoTransactionModel | undefined> {
  //   const txs = await this.collection!.find().sort({ transactionNumber: 1 }).limit(1).toArray();
  //   if (txs.length === 0) {
  //     return undefined;
  //   }

  //   const lastBlockMetadata = txs[0];
  //   return lastBlockMetadata;
  // }

}
