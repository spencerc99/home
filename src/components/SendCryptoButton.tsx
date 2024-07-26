import { copyLink } from "../scripts/helpers";

const WalletAddr = "0x6C8c8050a9C551B765aDBfe5bf02B8D8202Aa010";
export function SendCryptoButton() {
  return (
    <button
      className="button"
      id="cryptoBtn"
      onClick={() => {
        copyLink(WalletAddr);
      }}
    >
      Send crypto (click to copy)
      <span
        style={{
          display: "block",
          fontSize: "0.6em",
          fontWeight: "normal",
        }}
      >
        0x6C8c8050a9C551B765aDBfe5bf02B8D8202Aa010
      </span>
    </button>
  );
}
