/* eslint-disable camelcase */
/**
 * Encapsulates the cardano transaction returned by the blockfrost service.
 */
export default interface CardanoMetadataModel {
  tx_hash: string;
  json_metadata: string | null;
}
