import CardanoClient from './CardanoClient';

/**
 * Monitor for the running Cardano service.
 */
export default class Monitor {

  public constructor (private cardanoClient: CardanoClient) { }

  /**
   * Gets the size of the operation queue.
   */
  public async getWalletBalance (): Promise<any> {
    const walletBalanceInLovelaces = await this.cardanoClient.getBalanceInLovelaces();
    const walletBalanceInAda = walletBalanceInLovelaces / 100000000;
    return { walletBalanceInAda };
  }
}
