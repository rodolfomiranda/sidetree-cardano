/**
 * Encapsulates UTXO inputs for a Cardano transaction.
 */
export default interface CardanoInputModel {
  address: string;
  amount: number;
  txHash: string;
  index: number;
}
