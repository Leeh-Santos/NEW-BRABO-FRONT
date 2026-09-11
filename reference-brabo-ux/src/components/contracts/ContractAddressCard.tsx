import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";

interface ContractAddressCardProps {
  icon: string;
  name: string;
  description: string;
  address: string;
  explorerUrl: string;
}

export function ContractAddressCard({
  icon,
  name,
  description,
  address,
  explorerUrl,
}: ContractAddressCardProps) {
  const { copy, copiedKey } = useCopyToClipboard();

  return (
    <div className="contract-card">
      <div className="contract-header">
        <span className="contract-icon">{icon}</span>
        <span className="status-badge verified">✓ Verified</span>
      </div>
      <h4 className="contract-name">{name}</h4>
      <p className="contract-description">{description}</p>
      <div className="contract-address-section">
        <div className="address-label">Contract Address</div>
        <div className="address-display">
          <code className="contract-address">{address}</code>
          <button type="button" className="copy-btn" onClick={() => copy(address, name)}>
            {copiedKey === name ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <a href={explorerUrl} target="_blank" rel="noreferrer" className="contract-link primary">
        View on BaseScan →
      </a>
    </div>
  );
}
