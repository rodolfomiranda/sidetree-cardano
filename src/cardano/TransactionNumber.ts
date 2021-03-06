/**
 * Defines the TransactionNumber as a combination of blockNumber and position within the block
 */
export default class TransactionNumber {

    /* We set blockNumber and position to be 64 bits each */
    private static readonly bitWidth = 32;

    /**
     * Constructs the transaction number given the block number and position of the transaction in the block.
     */
    public static construct (blockNumber: number, position: number) {
      const transactionNumber =
        blockNumber * (2 ** this.bitWidth) +
        position;

      return transactionNumber;
    }

    /**
     * Constructs the transaction number of the last possible transaction of the specified block.
     */
    public static lastTransactionOfBlock (blockHeight: number) {
      return TransactionNumber.construct(blockHeight + 1, 0) - 1;
    }

    /**
     * Returns the block number component of transactionNumber
     */
    public static getBlockNumber (transactionNumber: number) {
      const blockNumber = Math.floor(transactionNumber / (2 ** this.bitWidth));
      return blockNumber;
    }

    /**
     * Returns the position component of transactionNumber
     */
    public static getPosition (transactionNumber: number) {
      const mask = 2 ** TransactionNumber.bitWidth - 1;
      return (transactionNumber & mask);
    }
}
