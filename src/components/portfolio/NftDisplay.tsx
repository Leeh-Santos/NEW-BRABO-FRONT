import bronzeSvg from "../../assets/tiers/bronze.svg";
import goldSvg from "../../assets/tiers/gold.svg";
import silverSvg from "../../assets/tiers/silver.svg";
import { useUserData } from "../../hooks/useUserData";
import { NFT_TIER_BONUSES, NFT_TIER_NAMES } from "../../lib/tiers";

const TIER_IMAGES = [bronzeSvg, silverSvg, goldSvg];

export function NftDisplay() {
  const { hasNft, nftTier, nftTokenId } = useUserData();

  if (!hasNft) {
    return (
      <div className="nft-empty-state">
        <p>You don't own a Brabo Markets NFT yet. Fund at least $5 to mint one automatically.</p>
      </div>
    );
  }

  const tier = nftTier !== undefined ? Number(nftTier) : 0;
  const tierName = NFT_TIER_NAMES[tier] ?? "Bronze";
  const tierBonus = NFT_TIER_BONUSES[tier] ?? "+2%";

  return (
    <div className={`nft-card nft-card-${tierName.toLowerCase()}`}>
      <img src={TIER_IMAGES[tier] ?? bronzeSvg} alt={`${tierName} NFT`} className="nft-image" />
      <div className="nft-details">
        <span className="nft-tier-badge">{tierName}</span>
        <span className="nft-token-id">Token #{nftTokenId?.toString() ?? "--"}</span>
        <span className="nft-bonus">{tierBonus} $BRB bonus</span>
      </div>
    </div>
  );
}
