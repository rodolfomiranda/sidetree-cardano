import CardanoInputModel from '../models/CardanoInputModel';
import CardanoProtocolParameters from '../models/CardanoProtocolParameters';
import CardanoSidetreeTransactionModel from '../models/CardanoSidetreeTransactionModel';

/**
 * Represents a simple cardano wallet.
 */
export default interface ICardanoWallet {

  /**
   * Gets the address object associated with this wallet.
   */
  getAddress (): String;

  /**
   * Create and sign a transaction.
   *
   * @param transaction The transaction.
   *
   * @returns The signed transaction.
   */
   createAndSignTransaction (
     anchorString: String,
     metadataLabel: String,
     protocolParameters: CardanoProtocolParameters,
     utxos: CardanoInputModel[],
     ledgerTip: number | null
     ): CardanoSidetreeTransactionModel;

    /**
   * Generate a random mnemonic.
   *
   * @returns The generated mnemonic.
   */
  generateMnmonic (): String;

 }
