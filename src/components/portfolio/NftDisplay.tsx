import { useUserData } from "../../hooks/useUserData";
import { NFT_TIER_BONUSES, NFT_TIER_NAMES } from "../../lib/tiers";
import { NFT_TIER_ART, TIER_ART } from "../../lib/tierArt";

export function NftDisplay() {
  const { hasNft, nftTier, nftTokenId } = useUserData();

  if (!hasNft) {
    // Show the Bronze medallion the visitor is working toward, dimmed. An empty
    // state that shows the reward reads as a goal; a paragraph of text alone
    // reads as an error.
    return (
      <div className="nft-empty-state">
        <img
          src={TIER_ART.bronze}
          className="nft-image nft-image-locked"
          alt=""
          width={72}
          height={72}
          loading="lazy"
        />
        <div className="nft-empty-copy">
          <p>You don't own a Brabo Markets NFT yet.</p>
          <p className="nft-empty-hint">Fund at least $5 and Bronze mints automatically.</p>
        </div>
      </div>
    );
  }

  const tier = nftTier !== undefined ? Number(nftTier) : 0;
  const tierName = NFT_TIER_NAMES[tier] ?? "Bronze";
  const tierBonus = NFT_TIER_BONUSES[tier] ?? "+2%";

  return (
    <div className={`nft-card nft-card-${tierName.toLowerCase()}`}>
      <img
        src={NFT_TIER_ART[tier] ?? NFT_TIER_ART[0]}
        alt={`${tierName} tier NFT`}
        className="nft-image"
        width={72}
        height={72}
      />
      <div className="nft-details">
        <span className="nft-tier-badge">{tierName}</span>
        <span className="nft-token-id">Token #{nftTokenId?.toString() ?? "--"}</span>
        <span className="nft-bonus">{tierBonus} $BRB bonus</span>
      </div>
    </div>
  );
}
