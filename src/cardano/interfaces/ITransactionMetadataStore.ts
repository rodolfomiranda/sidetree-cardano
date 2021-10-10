import CardanoTransactionModel from '../models/CardanoTransactionModel';

/**
 * An abstraction for the persistence of transaction metadata.
 */
export default interface ITransactionMetadataStore {

  /**
   * Adds the given transaction metadata to the store. Idempotent operation.
   */
  add (transactionMetadata: CardanoTransactionModel[]): Promise<void>;

  /**
   * Removes all the transaction metadata with transactionNumber greater than the given transactionNumber.
   * If no transactionNumber is given, all data is removed.
   */
  removeLaterThan (transactionNumber?: number): Promise<void>;

  /**
   * Gets the transaction metadata in the specified range of transactionNumber in ascending  order.
   */
  get (fromInclusiveTransactionNumber: number, toExclusiveTransactionNumbert: number): Promise<CardanoTransactionModel[]>;

  /**
   * Gets the metadata of the last transaction.
   */
  getLast (): Promise<CardanoTransactionModel | undefined>;

}
