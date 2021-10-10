/**
 * Encapsulates data for the inputs for a cardano transaction.
 */
export default interface CardanoInputModel {
  address: string;
  amount: number;
  txHash: string;
  index: number;
}
