/**
 * Encapsulates a Cardano block data
 */
export default interface CardanoBlockModel {
    time: number,
    height: number,
    hash: string,
    slot: number | null,
    epoch: number | null,
    size: number,
    confirmations: number
}
