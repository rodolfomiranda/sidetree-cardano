// import * as bip39 from 'bip39-light';
import * as cardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoInputModel from './models/CardanoInputModel';
import CardanoProtocolParameters from './models/CardanoProtocolParameters';
import CardanoSidetreeTransactionModel from './models/CardanoSidetreeTransactionModel';
import ErrorCode from './ErrorCode';
import ICardanoWallet from './interfaces/ICardanoWallet';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
const bip39 = require('bip39-light');
/**
 * Represents a Cardano wallet.
 * // TODO error handling
 */
export default class CardanoWallet implements ICardanoWallet {

  private readonly baseAddress: cardanoWasm.BaseAddress;
  private readonly walletAddress: String;
  private readonly privateKey: cardanoWasm.PrivateKey;

  constructor (cardanoWalletMnemonic: string, cardanoNetwork: string) {
    if (!bip39.validateMnemonic(cardanoWalletMnemonic)) {
      throw SidetreeError.createFromError(ErrorCode.CardanoWalletIncorrectImportString, new Error('Invalid mnemonic'));
    }

    const entropy2 = bip39.mnemonicToEntropy(cardanoWalletMnemonic);
    const rootKey = cardanoWasm.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy2, 'hex'),
      Buffer.from('')
    );

    const cip1852Account = rootKey
      .derive(1852 | 0x80000000) // hardened  Purpose.CIP1852
      .derive(1815 | 0x80000000) // hardened  CoinTypes.CARDANO
      .derive(0 | 0x80000000); // hardened account #0

    const utxoPrivateKey = cip1852Account
      .derive(0) // 0=external 1=change (from BIP44)
      .derive(0); // addr index

    const utxoPubKey = utxoPrivateKey.to_public();

    const stakeKey = cip1852Account
      .derive(2) // from CIP1852
      .derive(0)
      .to_public();

    const netid = cardanoNetwork === 'mainnet' ? cardanoWasm.NetworkInfo.mainnet().network_id() : cardanoWasm.NetworkInfo.testnet().network_id();

    this.baseAddress = cardanoWasm.BaseAddress.new(
      netid,
      cardanoWasm.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
      cardanoWasm.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
    );

    this.walletAddress = this.baseAddress.to_address().to_bech32();
    this.privateKey = utxoPrivateKey.to_raw_key();
  }

  public getAddress (): String {
    return this.walletAddress;
  }

  public generateMnmonic (): String {
    return bip39.generateMnemonic((32 * 15) / 3);
  }

  public createAndSignTransaction (
    anchorString: String,
    metadataLabel: String,
    protocolParameters: CardanoProtocolParameters,
    utxos: CardanoInputModel[],
    ledgerTip: number | null): CardanoSidetreeTransactionModel {
    const txBuilder = cardanoWasm.TransactionBuilder.new(
      cardanoWasm.LinearFee.new(
        cardanoWasm.BigNum.from_str(protocolParameters.minFeeA.toString()),
        cardanoWasm.BigNum.from_str(protocolParameters.minFeeB.toString())
      ),
      cardanoWasm.BigNum.from_str(protocolParameters.minUtxo.toString()),
      cardanoWasm.BigNum.from_str(protocolParameters.poolDeposit.toString()),
      cardanoWasm.BigNum.from_str(protocolParameters.keyDeposit.toString()),
      protocolParameters.maxValSize,
      protocolParameters.maxTxSize
    );
    // add all inputs with address, utxos and value
    for (const utxo of utxos) {
      txBuilder.add_input(
        this.baseAddress.to_address(),
        cardanoWasm.TransactionInput.new(
          cardanoWasm.TransactionHash.from_bytes(
            Buffer.from(utxo.txHash, 'hex')), // tx hash obtenido del query utxo
          utxo.index // index
        ),
        cardanoWasm.Value.new(cardanoWasm.BigNum.from_str(utxo.amount.toString()))
      );
    }
    // add output to address and value
    txBuilder.add_output(
      cardanoWasm.TransactionOutput.new(
        this.baseAddress.to_address(),
        cardanoWasm.Value.new(cardanoWasm.BigNum.from_str('1000000'))
      )
    );
    // add metadata
    const auxData = cardanoWasm.AuxiliaryData.new();
    // const metadata = cardanoWasm.encode_json_str_to_metadatum(
    //   anchorString.toString(),
    //   cardanoWasm.MetadataJsonSchema.NoConversions
    // );
    var uint8array = new TextEncoder().encode(anchorString.toString());
    const metadata = cardanoWasm.encode_arbitrary_bytes_as_metadatum(uint8array);
    const transactionMetadata = cardanoWasm.GeneralTransactionMetadata.new();
    transactionMetadata.insert(cardanoWasm.BigNum.from_str(metadataLabel.toString()), metadata);
    auxData.set_metadata(transactionMetadata);
    txBuilder.set_auxiliary_data(auxData);
    // add TTL in slots (secs)
    txBuilder.set_ttl(ledgerTip! + 600);
    // calculate min fee and return change to address
    txBuilder.add_change_if_needed(this.baseAddress.to_address());
    // build transactiion
    const txBody = txBuilder.build();
    const txHash = cardanoWasm.hash_transaction(txBody);
    // add keyhash witnesses
    const witnesses = cardanoWasm.TransactionWitnessSet.new();
    const vkeyWitnesses = cardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = cardanoWasm.make_vkey_witness(txHash, this.privateKey);
    vkeyWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeyWitnesses);
    // serialize CBOR transaction
    const transaction = cardanoWasm.Transaction.new(
      txBody,
      witnesses,
      auxData // transaction metadata
    );

    return {
      txCBOR: this.toHexString(transaction.to_bytes()),
      txBytes: transaction.to_bytes(),
      txHash: this.toHexString(txHash.to_bytes()),
      fees: +(txBuilder.get_fee_if_set()?.to_str() || 0)
    };

  }

  private toHexString (byteArray: Uint8Array) {
    return Array.from(byteArray, (byte) => {
      return (`0${(byte & 0xFF).toString(16)}`).slice(-2);
    }).join('');
  }

}
