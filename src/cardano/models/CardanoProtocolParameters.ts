/**
 * Encapsulates Cardano protocol parameters
 */
export default interface CardanoProtocolParameters {
    epoch: number;
    minFeeA: number;
    minFeeB: number;
    maxTxSize: number;
    keyDeposit: number;
    poolDeposit: number;
    minUtxo: number;
    maxValSize: number;
}
