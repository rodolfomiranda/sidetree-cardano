/**
 * Encapsulates the data about a transaction which is used to store raw-data on the cardano. This
 * transaction is yet to be broadcasted.
 */
export default interface CardanoSidetreeTransactionModel {
  txHash: string;
  fees: number;
  txCBOR: string;
}
