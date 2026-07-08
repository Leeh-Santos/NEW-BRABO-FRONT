import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.8.0/+esm';
import { CONTRACT_ADDRESSES, FUNDME_ABI, NFT_ABI } from './constants.js';
import './getprice.js';

// ==================== STATE MANAGEMENT ====================
const state = {
    provider: null,
    signer: null,
    userAddress: null,
    fundMeContract: null,
    nftContract: null,
    currentQuote: null,
    isConnected: false
};

// ==================== DOM ELEMENTS ====================
const elements = {
    connectWalletBtn: document.getElementById('connectWalletBtn'),
    walletDropdown: document.getElementById('walletDropdown'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    ethInput: document.getElementById('ethInput'),
    ethInputUsd: document.getElementById('ethInputUsd'),
    fundBtn: document.getElementById('fundBtn'),
    addLiquidityBtn: document.getElementById('addLiquidityBtn'),
    refreshQuote: document.getElementById('refreshQuote'),

    // Stats
    totalEthFunded: document.getElementById('totalEthFunded'),
    totalEthFundedUsd: document.getElementById('totalEthFundedUsd'),
    totalFunders: document.getElementById('totalFunders'),
    brbMarketCap: document.getElementById('brbMarketCap'),
    totalPicaInContract: document.getElementById('totalPicaInContract'),
    picaPriceUsd: document.getElementById('picaPriceUsd'),
    userTier: document.getElementById('userTier'),
    tierBonus: document.getElementById('tierBonus'),

    // Breakdown
    buybackAmount: document.getElementById('buybackAmount'),
    buybackPica: document.getElementById('buybackPica'),
    batchAmount: document.getElementById('batchAmount'),
    compensationPica: document.getElementById('compensationPica'),
    bonusPercentage: document.getElementById('bonusPercentage'),
    tierName: document.getElementById('tierName'),
    bonusPica: document.getElementById('bonusPica'),
    totalPica: document.getElementById('totalPica'),
    contractBatchAmount: document.getElementById('contractBatchAmount'),

    // Position
    positionCard: document.getElementById('positionCard'),
    userFundedEth: document.getElementById('userFundedEth'),
    userFundedUsd: document.getElementById('userFundedUsd'),
    userNftStatus: document.getElementById('userNftStatus'),
    nextTierProgress: document.getElementById('nextTierProgress'),

    // Liquidity Section
    availableBatchAmount: document.getElementById('availableBatchAmount'),
    minLiquidityAmount: document.getElementById('minLiquidityAmount'),
    liquidityStatus: document.getElementById('liquidityStatus'),

    // Loading & Toast
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

// ==================== CONSTANTS ====================
const MINIMUM_USD = 0.2; // Contract minimum: 2 * 10^17 wei = $0.20 USD
const NFT_MINT_THRESHOLD = 5; // 5 * 10^18 wei = $5.00 USD
const TIER_THRESHOLDS = {
    BRONZE: 5,    // Initial NFT mint at $5.00 USD (5 * 10^18 wei)
    SILVER: 50,   // Upgrade to Silver at $50.00 USD (50 * 10^18 wei)
    GOLD: 100     // Upgrade to Gold at $100.00 USD (100 * 10^18 wei)
};

// Cache for ETH price
let ethPriceUSD = null;
let lastPriceFetch = 0;
const PRICE_CACHE_DURATION = 60000; // 1 minute

// ==================== UTILITY FUNCTIONS ====================
async function getEthPriceUSD() {
    // Return cached price if still valid
    const now = Date.now();
    if (ethPriceUSD && (now - lastPriceFetch) < PRICE_CACHE_DURATION) {
        return ethPriceUSD;
    }

    try {
        // Using CoinGecko API (free, no API key needed)
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        ethPriceUSD = data.ethereum.usd;
        lastPriceFetch = now;
        return ethPriceUSD;
    } catch (error) {
        console.error('Error fetching ETH price:', error);
        // Fallback: return last known price or estimate
        return ethPriceUSD || 3000; // Fallback to $3000 if never fetched
    }
}

// Cache for Market Cap
let brbMarketCap = null;
let lastMarketCapFetch = 0;
const MARKET_CAP_CACHE_DURATION = 30000; // 30 seconds

async function getBRBMarketCap() {
    // Return cached market cap if still valid
    const now = Date.now();
    if (brbMarketCap && (now - lastMarketCapFetch) < MARKET_CAP_CACHE_DURATION) {
        return brbMarketCap;
    }

    const POOL_ADDRESS = '0x224978d8428b56119c4C2BcE1d8D64B1Af5FAC29';

    try {
        console.log('Fetching BRB market cap from GeckoTerminal...');
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/base/pools/${POOL_ADDRESS}`);
        const data = await response.json();

        console.log('GeckoTerminal market cap response:', data);

        if (data && data.data && data.data.attributes) {
            const poolData = data.data.attributes;

            // Try to get fully diluted valuation first, then fall back to market cap
            const fdv = poolData.fdv_usd ? parseFloat(poolData.fdv_usd) : null;
            const marketCap = poolData.market_cap_usd ? parseFloat(poolData.market_cap_usd) : null;

            const capValue = fdv || marketCap;

            console.log('Market cap from GeckoTerminal:', capValue);

            if (capValue && capValue > 0 && capValue < 1000000000000) { // Sanity check (less than $1T)
                brbMarketCap = capValue;
                lastMarketCapFetch = now;
                console.log('Final market cap:', formatMarketCap(brbMarketCap));
                return brbMarketCap;
            } else {
                console.warn('Market cap from GeckoTerminal seems invalid:', capValue);
            }
        }

        console.log('Could not fetch market cap from GeckoTerminal');
        return null;

    } catch (error) {
        console.error('Error fetching BRB market cap from GeckoTerminal:', error);
        return null;
    }
}

function formatMarketCap(marketCap) {
    if (!marketCap || marketCap === 0) return '$0.00';

    if (marketCap >= 1000000) {
        // Format as millions (M)
        return `$${(marketCap / 1000000).toFixed(2)}M`;
    } else if (marketCap >= 1000) {
        // Format as thousands (K)
        return `$${(marketCap / 1000).toFixed(2)}K`;
    } else {
        // Format as regular number
        return `$${marketCap.toFixed(2)}`;
    }
}

function formatNumber(num, decimals = 2) {
    if (!num || isNaN(num)) return '0.00';
    return parseFloat(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatTokenAmount(amount, decimals = 18) {
    if (!amount) return '0.00';
    const formatted = ethers.formatUnits(amount, decimals);
    return formatNumber(formatted, 2);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    } else {
        console.log('Toast:', message);
    }
}

function showLoading(show = true) {
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// ==================== WALLET CONNECTION ====================
async function connectWallet(silent = false) {
    try {
        if (!window.ethereum) {
            if (!silent) {
                showToast('Please install MetaMask or another Web3 wallet', 'error');
            }
            return;
        }

        if (!silent) {
            showLoading(true);
        }

        // Request account access
        const accounts = await window.ethereum.request({
            method: silent ? 'eth_accounts' : 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
            if (!silent) {
                showLoading(false);
            }
            return;
        }

        // Setup provider and signer
        state.provider = new ethers.BrowserProvider(window.ethereum);
        state.signer = await state.provider.getSigner();
        state.userAddress = accounts[0];

        // Initialize contracts
        state.fundMeContract = new ethers.Contract(
            CONTRACT_ADDRESSES.FUNDME,
            FUNDME_ABI,
            state.signer
        );

        state.nftContract = new ethers.Contract(
            CONTRACT_ADDRESSES.NFT,
            NFT_ABI,
            state.provider
        );

        state.isConnected = true;

        // Save connection state to localStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', state.userAddress);

        // Update UI
        updateWalletButton();

        // Load data only if the required functions exist
        try {
            if (typeof loadUserData === 'function') {
                await loadUserData();
            }
            if (typeof loadContractStats === 'function') {
                await loadContractStats();
            }
        } catch (dataError) {
            console.log('Error loading data (non-critical):', dataError);
        }

        // Only show success message if not silent (user-initiated connection)
        if (!silent) {
            showToast('Wallet connected successfully!', 'success');
        }

        if (!silent) {
            showLoading(false);
        }

        // Listen for account and network changes (only add listeners once)
        if (window.ethereum && !window.ethereum._eventListenersAdded) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => window.location.reload());
            window.ethereum._eventListenersAdded = true;
        }

    } catch (error) {
        console.error('Error connecting wallet:', error);
        if (!silent) {
            showToast('Failed to connect wallet', 'error');
            showLoading(false);
        }
    }
}

function disconnectWallet() {
    // Reset state
    state.provider = null;
    state.signer = null;
    state.userAddress = null;
    state.fundMeContract = null;
    state.nftContract = null;
    state.currentQuote = null;
    state.isConnected = false;

    // Clear localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');

    // Reset UI - query elements dynamically
    updateWalletButton();

    // Close dropdown if open
    const walletDropdown = document.getElementById('walletDropdown');
    if (walletDropdown) {
        walletDropdown.classList.remove('show');
    }

    // Hide position card if it exists
    const positionCard = document.getElementById('positionCard');
    if (positionCard) {
        positionCard.style.display = 'none';
    }

    // Reset stats if elements exist
    const userTier = document.getElementById('userTier');
    const tierBonus = document.getElementById('tierBonus');
    if (userTier) userTier.textContent = '--';
    if (tierBonus) tierBonus.textContent = 'No NFT';

    // Clear input and breakdown if elements exist
    const ethInput = document.getElementById('ethInput');
    if (ethInput) ethInput.value = '';
    if (typeof clearBreakdown === 'function') {
        clearBreakdown();
    }

    // Reinitialize read-only provider for contract stats
    if (typeof initializeReadOnlyProvider === 'function') {
        initializeReadOnlyProvider();
    }

    showToast('Wallet disconnected', 'success');
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
    } else if (accounts[0] !== state.userAddress) {
        // User switched accounts
        window.location.reload();
    }
}

function updateWalletButton() {
    // Query element fresh each time to ensure it exists
    const connectWalletBtn = document.getElementById('connectWalletBtn');

    if (!connectWalletBtn) {
        console.warn('Connect wallet button not found');
        return;
    }

    if (state.isConnected && state.userAddress) {
        const shortAddress = `${state.userAddress.slice(0, 6)}...${state.userAddress.slice(-4)}`;
        connectWalletBtn.innerHTML = `
            <span class="wallet-icon">✓</span>
            <span class="wallet-text">${shortAddress}</span>
            <svg class="dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
        `;
        connectWalletBtn.classList.add('connected');
    } else {
        connectWalletBtn.innerHTML = `
            <span class="wallet-icon">👛</span>
            <span class="wallet-text">Connect Wallet</span>
        `;
        connectWalletBtn.classList.remove('connected');
    }
}

function handleWalletButtonClick() {
    if (state.isConnected) {
        // Toggle dropdown
        const walletDropdown = document.getElementById('walletDropdown');
        if (walletDropdown) {
            walletDropdown.classList.toggle('show');
        }
    } else {
        // Show wallet selection modal instead of connecting immediately
        showWalletModal();
    }
}

function showWalletModal() {
    const modal = document.getElementById('walletModalOverlay');
    if (modal) {
        modal.classList.add('show');
    }
}

function hideWalletModal() {
    const modal = document.getElementById('walletModalOverlay');
    if (modal) {
        modal.classList.remove('show');
    }
}

function detectWalletProvider(provider) {
    // Trust Wallet detection (highest priority, as it also sets isMetaMask)
    if (provider.isTrust || provider.isTrustWallet) {
        return 'trust';
    }
    // Coinbase Wallet detection
    if (provider.isCoinbaseWallet || provider.isWalletLink) {
        return 'coinbase';
    }
    // MetaMask detection (check it's not Brave or other wallets)
    if (provider.isMetaMask && !provider.isBraveWallet && !provider.isTrust) {
        return 'metamask';
    }
    // Fallback
    return 'unknown';
}

async function connectWithProviderSilent(providerType) {
    // Silent version of connectWithProvider for auto-reconnection
    // CRITICAL: This function MUST NOT trigger wallet popups!
    // Only check for already-authorized accounts using eth_accounts
    try {
        console.log('🔇 Silent reconnect attempt for:', providerType);

        if (!window.ethereum) {
            console.log('  ↳ No window.ethereum, skipping silent reconnect');
            return;
        }

        if (providerType === 'walletconnect') {
            console.log('  ↳ WalletConnect not supported for silent reconnect');
            return;
        }

        // Find the correct provider WITHOUT triggering popups
        let selectedProvider = null;
        let actualWallet = null;

        // METAMASK - Use same logic as connectWithProvider
        if (providerType === 'metamask') {
            if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                selectedProvider = window.ethereum.providers.find(p => {
                    const isMetaMask = p.isMetaMask === true;
                    const hasMetaMaskObject = p._metamask !== undefined && p._metamask !== null;
                    const metamaskIsObject = typeof p._metamask === 'object' && p._metamask !== null;
                    const hasMetaMaskMethods = typeof p._handleAccountsChanged === 'function';
                    const notCoinbase = p.isCoinbaseWallet !== true && p.isCoinbaseBrowser !== true;
                    const notPhantom = p.isPhantom !== true;
                    return isMetaMask && hasMetaMaskObject && metamaskIsObject && hasMetaMaskMethods && notCoinbase && notPhantom;
                });
                if (selectedProvider) actualWallet = 'metamask';
            }
        }
        // PHANTOM - Check providers array first, then fallback to window.phantom.ethereum
        else if (providerType === 'phantom') {
            // Try providers array first
            if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                selectedProvider = window.ethereum.providers.find(p =>
                    p.isPhantom === true &&
                    p.isMetaMask !== true &&
                    p.isCoinbaseWallet !== true
                );
                if (selectedProvider) actualWallet = 'phantom';
            }

            // Fallback: Check window.phantom.ethereum
            // NOTE: Accessing this doesn't trigger popup if we only use eth_accounts (not eth_requestAccounts)
            if (!selectedProvider && window.phantom?.ethereum) {
                selectedProvider = window.phantom.ethereum;
                actualWallet = 'phantom';
                console.log('  ↳ Using window.phantom.ethereum for silent reconnect');
            }
        }
        // COINBASE - Check providers array first, then fallback to window.coinbaseWalletExtension
        else if (providerType === 'coinbase') {
            // Try providers array first
            if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                selectedProvider = window.ethereum.providers.find(p =>
                    (p.isCoinbaseWallet === true || p.isCoinbaseBrowser === true) &&
                    p._metamask === undefined
                );
                if (selectedProvider) actualWallet = 'coinbase';
            }

            // Fallback: Check window.coinbaseWalletExtension
            // NOTE: Accessing this doesn't trigger popup if we only use eth_accounts (not eth_requestAccounts)
            if (!selectedProvider && window.coinbaseWalletExtension) {
                selectedProvider = window.coinbaseWalletExtension;
                actualWallet = 'coinbase';
                console.log('  ↳ Using window.coinbaseWalletExtension for silent reconnect');
            }
        }
        // TRUST - Check providers array first, then fallback to window.trustWallet
        else if (providerType === 'trust') {
            // Try providers array first
            if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                selectedProvider = window.ethereum.providers.find(p =>
                    (p.isTrust === true || p.isTrustWallet === true) &&
                    p.isMetaMask !== true
                );
                if (selectedProvider) actualWallet = 'trust';
            }

            // Fallback: Check window.trustWallet
            // NOTE: Accessing this doesn't trigger popup if we only use eth_accounts (not eth_requestAccounts)
            if (!selectedProvider && window.trustWallet) {
                selectedProvider = window.trustWallet;
                actualWallet = 'trust';
                console.log('  ↳ Using window.trustWallet for silent reconnect');
            }
        }
        // INJECTED - Use whatever is available
        else if (providerType === 'injected') {
            selectedProvider = window.ethereum;
            actualWallet = detectWalletProvider(window.ethereum);
        }

        if (!selectedProvider) {
            console.log('  ↳ Provider not found for', providerType, '- skipping silent reconnect');
            return;
        }

        console.log('  ↳ Found provider, checking for authorized accounts...');

        // CRITICAL: Use eth_accounts (NOT eth_requestAccounts!)
        // eth_accounts returns already-authorized accounts without triggering popup
        const accounts = await selectedProvider.request({
            method: 'eth_accounts'
        });

        if (accounts.length === 0) {
            console.log('  ↳ No authorized accounts - user needs to reconnect manually');
            return;
        }

        console.log('  ↳ Found authorized account, reconnecting silently...');

        // Setup ethers with the selected provider
        state.provider = new ethers.BrowserProvider(selectedProvider);
        state.signer = await state.provider.getSigner();
        state.userAddress = accounts[0];

        // Initialize contracts
        state.fundMeContract = new ethers.Contract(
            CONTRACT_ADDRESSES.FUNDME,
            FUNDME_ABI,
            state.signer
        );

        state.nftContract = new ethers.Contract(
            CONTRACT_ADDRESSES.NFT,
            NFT_ABI,
            state.provider
        );

        state.isConnected = true;

        // Update UI
        updateWalletButton();

        // Load data
        try {
            if (typeof loadUserData === 'function') {
                await loadUserData();
            }
            if (typeof loadContractStats === 'function') {
                await loadContractStats();
            }
        } catch (dataError) {
            console.log('Error loading data (non-critical):', dataError);
        }

        console.log('Wallet reconnected silently:', actualWallet);

    } catch (error) {
        console.error('Error in connectWithProviderSilent:', error);
        // Silent mode - don't show errors to user
    }
}

async function connectWithProvider(providerType) {
    console.log('🔵 connectWithProvider called with:', providerType);

    try {
        hideWalletModal();

        // Check if any Web3 provider is available
        if (!window.ethereum) {
            console.error('❌ No window.ethereum detected');
            showToast('No Web3 wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet.', 'error');
            return;
        }

        console.log('✅ window.ethereum exists, proceeding...');

        // ===================================================================
        // COMPREHENSIVE DEBUGGING - DUMP ALL WALLET INFORMATION
        // ===================================================================
        console.log('');
        console.log('███████████████████████████████████████████████████████████');
        console.log('🔍 COMPREHENSIVE WALLET DETECTION DEBUG');
        console.log('███████████████████████████████████████████████████████████');
        console.log('');
        console.log('📋 User requested wallet:', providerType);
        console.log('');
        console.log('🌐 window.ethereum Status:');
        console.log('  - window.ethereum exists:', !!window.ethereum);
        console.log('  - window.ethereum type:', typeof window.ethereum);
        console.log('  - window.ethereum is null:', window.ethereum === null);
        console.log('  - window.ethereum is undefined:', window.ethereum === undefined);
        console.log('');

        if (window.ethereum) {
            console.log('🏷️  window.ethereum FLAGS:');
            console.log('  - isMetaMask:', window.ethereum.isMetaMask);
            console.log('  - isTrust:', window.ethereum.isTrust);
            console.log('  - isTrustWallet:', window.ethereum.isTrustWallet);
            console.log('  - isCoinbaseWallet:', window.ethereum.isCoinbaseWallet);
            console.log('  - isWalletLink:', window.ethereum.isWalletLink);
            console.log('  - isBraveWallet:', window.ethereum.isBraveWallet);
            console.log('');

            console.log('📦 window.ethereum.providers Array:');
            console.log('  - providers exists:', !!window.ethereum.providers);
            console.log('  - providers is array:', Array.isArray(window.ethereum.providers));
            console.log('  - providers length:', window.ethereum.providers?.length || 0);
            console.log('');

            if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
                console.log('🔎 DETAILED PROVIDERS ARRAY INSPECTION:');
                window.ethereum.providers.forEach((provider, index) => {
                    console.log(`  ┌─ Provider [${index}]:`);
                    console.log(`  │  - isMetaMask: ${provider.isMetaMask}`);
                    console.log(`  │  - isTrust: ${provider.isTrust}`);
                    console.log(`  │  - isTrustWallet: ${provider.isTrustWallet}`);
                    console.log(`  │  - isCoinbaseWallet: ${provider.isCoinbaseWallet}`);
                    console.log(`  │  - isWalletLink: ${provider.isWalletLink}`);
                    console.log(`  │  - isBraveWallet: ${provider.isBraveWallet}`);
                    console.log(`  │  - Provider object:`, provider);
                    console.log(`  └─ Detected as: ${detectWalletProvider(provider)}`);
                    console.log('');
                });
            } else {
                console.log('  ⚠️  No providers array found or not an array');
                console.log('');
            }

            console.log('🔧 Alternative Detection Methods:');
            console.log('  - window.ethereum._metamask:', !!window.ethereum._metamask);
            console.log('  - window.ethereum.providerMap:', !!window.ethereum.providerMap);
            console.log('');

            if (window.ethereum.providerMap) {
                console.log('  📍 providerMap contents:');
                try {
                    window.ethereum.providerMap.forEach((provider, key) => {
                        console.log(`    - ${key}:`, provider);
                    });
                } catch (e) {
                    console.log('    - Could not iterate providerMap:', e.message);
                }
                console.log('');
            }

            console.log('🌍 Global Namespace Checks:');
            console.log('  - window.coinbaseWalletExtension:', !!window.coinbaseWalletExtension);
            console.log('  - window.trustWallet:', !!window.trustWallet);
            console.log('  - window.ethereum.selectedProvider:', window.ethereum.selectedProvider);
            console.log('');

            console.log('📊 Provider Constructor Names:');
            console.log('  - window.ethereum constructor:', window.ethereum.constructor?.name);
            if (window.ethereum.providers) {
                window.ethereum.providers.forEach((p, i) => {
                    console.log(`  - Provider [${i}] constructor:`, p.constructor?.name);
                });
            }
            console.log('');
        }

        console.log('███████████████████████████████████████████████████████████');
        console.log('🔍 END COMPREHENSIVE DEBUG - ANALYZING RESULTS...');
        console.log('███████████████████████████████████████████████████████████');
        console.log('');

        // Handle WalletConnect separately (requires library)
        if (providerType === 'walletconnect') {
            showToast('WalletConnect support coming soon. Please use browser wallet for now.', 'error');
            return;
        }

        // Find the correct provider
        let selectedProvider = null;
        let actualWallet = null;

        // Old diagnostic logs (keeping for backward compatibility)
        console.log('==========================================');
        console.log('🔍 WALLET DETECTION DIAGNOSTICS');
        console.log('==========================================');
        console.log('window.ethereum exists:', !!window.ethereum);
        console.log('window.ethereum.providers exists:', !!window.ethereum?.providers);

        // Check all possible provider arrays
        const allProviders = [];

        // Method 1: Check window.ethereum.providers (EIP-5749)
        if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
            console.log('✅ Found window.ethereum.providers array:', window.ethereum.providers.length);
            allProviders.push(...window.ethereum.providers);
        }

        // Method 2: Check for individual wallet injections
        if (window.ethereum) {
            console.log('window.ethereum properties:');
            console.log('  - isMetaMask:', window.ethereum.isMetaMask);
            console.log('  - isTrust:', window.ethereum.isTrust);
            console.log('  - isCoinbaseWallet:', window.ethereum.isCoinbaseWallet);
            console.log('  - _metamask:', !!window.ethereum._metamask);

            // If no providers array exists, create one from window.ethereum
            if (allProviders.length === 0) {
                allProviders.push(window.ethereum);
            }
        }

        // Method 3: Check for MetaMask at window.ethereum (before Trust Wallet overrides)
        if (typeof window.ethereum !== 'undefined' && !window.ethereum.providers) {
            // Try to find if both Trust and MetaMask exist by checking for specific APIs
            const hasMetaMaskAPI = window.ethereum._metamask !== undefined;
            const hasTrustAPI = window.ethereum.isTrust === true;

            if (hasMetaMaskAPI && hasTrustAPI) {
                console.log('⚠️ Detected: Both MetaMask and Trust Wallet APIs present');
                console.log('Trust Wallet is overriding window.ethereum but MetaMask API still exists');
            }
        }

        console.log('Total providers found:', allProviders.length);
        console.log('==========================================');

        // Try to find the specific wallet the user requested
        console.log('🔍 SEARCHING FOR REQUESTED WALLET:', providerType);
        console.log('');

        selectedProvider = null;
        actualWallet = null;

        // ===================================================================
        // 🚨 CRITICAL LOGGING - INSPECT ALL PROVIDERS FIRST
        // ===================================================================
        console.log('');
        console.log('🔍 INSPECTING ALL PROVIDERS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
            window.ethereum.providers.forEach((p, index) => {
                console.log(`Provider [${index}]:`, {
                    isMetaMask: p.isMetaMask,
                    hasMetaMaskObject: p._metamask !== undefined && p._metamask !== null,
                    isCoinbaseWallet: p.isCoinbaseWallet,
                    isCoinbaseBrowser: p.isCoinbaseBrowser,
                    isPhantom: p.isPhantom,
                    isTrust: p.isTrust,
                    isTrustWallet: p.isTrustWallet,
                    constructor: p.constructor?.name
                });
            });
        } else {
            console.log('No providers array found, checking window.ethereum directly:', {
                isMetaMask: window.ethereum?.isMetaMask,
                hasMetaMaskObject: window.ethereum?._metamask !== undefined && window.ethereum?._metamask !== null,
                isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
                isPhantom: window.ethereum?.isPhantom,
                isTrust: window.ethereum?.isTrust
            });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        // METAMASK - Use _metamask object to identify REAL MetaMask
        if (providerType === 'metamask') {
            console.log('🦊 Searching for MetaMask...');
            console.log('  Strategy: Look for _metamask object (Coinbase lacks this)');
            console.log('');

            // CRITICAL: Check the providers array FIRST (EIP-5749)
            if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                console.log('📦 Searching in window.ethereum.providers array...');
                console.log('  Total providers:', window.ethereum.providers.length);
                console.log('');

                // ================================================================
                // 🚨 ULTRA-DETAILED DEBUGGING - INSPECT EVERY PROVIDER
                // ================================================================
                console.log('🔍 DETAILED METAMASK SEARCH:');
                console.log('═══════════════════════════════════════════════════════════');
                window.ethereum.providers.forEach((p, i) => {
                    console.log(`━━━ Provider [${i}] ━━━`);
                    console.log('  isMetaMask:', p.isMetaMask);
                    console.log('  isCoinbaseWallet:', p.isCoinbaseWallet);
                    console.log('  isCoinbaseBrowser:', p.isCoinbaseBrowser);
                    console.log('  isPhantom:', p.isPhantom);
                    console.log('  isTrust:', p.isTrust);
                    console.log('  isBraveWallet:', p.isBraveWallet);
                    console.log('  _metamask:', p._metamask);
                    console.log('  _metamask === undefined:', p._metamask === undefined);
                    console.log('  _metamask !== undefined:', p._metamask !== undefined);
                    console.log('  _metamask !== null:', p._metamask !== null);
                    console.log('  typeof _metamask:', typeof p._metamask);
                    console.log('  constructor.name:', p.constructor?.name);
                    console.log('  Has _handleAccountsChanged:', typeof p._handleAccountsChanged);
                    console.log('  Has isConnected method:', typeof p.isConnected);
                    console.log('');

                    // Check the exact logic we're using
                    const isMetaMask = p.isMetaMask === true;
                    const hasMetaMaskObject = p._metamask !== undefined && p._metamask !== null;
                    const metamaskIsObject = typeof p._metamask === 'object' && p._metamask !== null;
                    const hasMetaMaskMethods = typeof p._handleAccountsChanged === 'function';
                    const notCoinbase = p.isCoinbaseWallet !== true && p.isCoinbaseBrowser !== true;
                    const notPhantom = p.isPhantom !== true;
                    const notTrust = p.isTrust !== true && p.isTrustWallet !== true;
                    const notBrave = p.isBraveWallet !== true;

                    console.log('  🧮 Logic check:');
                    console.log('    isMetaMask (p.isMetaMask === true):', isMetaMask);
                    console.log('    hasMetaMaskObject (_metamask exists):', hasMetaMaskObject);
                    console.log('    🚨 metamaskIsObject (typeof === object):', metamaskIsObject, '← KEY CHECK');
                    console.log('    🚨 hasMetaMaskMethods (_handleAccountsChanged):', hasMetaMaskMethods, '← KEY CHECK');
                    console.log('    notCoinbase (NOT Coinbase flags):', notCoinbase);
                    console.log('    notPhantom:', notPhantom);
                    console.log('    notTrust:', notTrust);
                    console.log('    notBrave:', notBrave);
                    console.log('');
                    console.log('  🎯 Would select this provider?:',
                        isMetaMask && hasMetaMaskObject && metamaskIsObject && hasMetaMaskMethods && notCoinbase && notPhantom && notTrust && notBrave ?
                        '✅ YES - THIS IS THE REAL ONE' : '❌ NO (wrapper or other wallet)');
                    console.log('');
                });
                console.log('═══════════════════════════════════════════════════════════');
                console.log('');

                // Now run the actual find logic
                console.log('🔎 Running provider.find() with MetaMask criteria...');
                console.log('');
                console.log('🎯 KEY FIX: Checking for REAL MetaMask provider:');
                console.log('  - _metamask must be an OBJECT (not boolean)');
                console.log('  - Must have _handleAccountsChanged method');
                console.log('  - This excludes wrapper/multiplexer providers');
                console.log('');

                let providerIndex = 0;
                selectedProvider = window.ethereum.providers.find(p => {
                    const isMetaMask = p.isMetaMask === true;
                    const hasMetaMaskObject = p._metamask !== undefined && p._metamask !== null;
                    const notCoinbase = p.isCoinbaseWallet !== true && p.isCoinbaseBrowser !== true;
                    const notPhantom = p.isPhantom !== true;
                    const notTrust = p.isTrust !== true && p.isTrustWallet !== true;
                    const notBrave = p.isBraveWallet !== true;

                    // 🚨 KEY FIX: Check that _metamask is an OBJECT, not just a boolean
                    // The wrapper has _metamask: true (boolean)
                    // Real MetaMask has _metamask: Proxy(Object)
                    const metamaskIsObject = typeof p._metamask === 'object' && p._metamask !== null;

                    // 🚨 KEY FIX: Check for MetaMask-specific methods
                    // Only the real MetaMask provider has these internal methods
                    const hasMetaMaskMethods = typeof p._handleAccountsChanged === 'function';

                    const isRealMetaMask = isMetaMask &&
                                          hasMetaMaskObject &&
                                          metamaskIsObject &&        // Must be object, not boolean
                                          hasMetaMaskMethods &&      // Must have MetaMask methods
                                          notCoinbase &&
                                          notPhantom &&
                                          notTrust &&
                                          notBrave;

                    console.log(`  ↳ Provider [${providerIndex}]:`, {
                        isMetaMask,
                        hasMetaMaskObject,
                        metamaskIsObject,
                        hasMetaMaskMethods,
                        notCoinbase,
                        result: isRealMetaMask ? '✅ REAL METAMASK - SELECTED' : '❌ Rejected'
                    });

                    providerIndex++;
                    return isRealMetaMask;
                });

                console.log('');
                if (selectedProvider) {
                    actualWallet = 'metamask';
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('✅ FINAL SELECTION - Found provider for MetaMask');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('  Selected provider properties:');
                    console.log('    - Has _metamask object:', !!selectedProvider._metamask);
                    console.log('    - isMetaMask:', selectedProvider.isMetaMask);
                    console.log('    - isCoinbaseWallet:', selectedProvider.isCoinbaseWallet);
                    console.log('    - isCoinbaseBrowser:', selectedProvider.isCoinbaseBrowser);
                    console.log('    - isPhantom:', selectedProvider.isPhantom);
                    console.log('    - constructor.name:', selectedProvider.constructor?.name);
                    console.log('');
                    console.log('  🔐 This provider will be used to request accounts');
                    console.log('  👉 If Coinbase popup appears, this provider is WRONG!');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('');
                } else {
                    console.log('');
                    console.log('❌ Real MetaMask not found in providers array');
                    console.log('  None of the providers passed the MetaMask criteria');
                    console.log('');
                }
            }
            // Fallback: Check window.ethereum directly (if no providers array)
            else {
                const hasMetaMaskObject = window.ethereum?._metamask !== undefined && window.ethereum?._metamask !== null;
                const isMetaMask = window.ethereum?.isMetaMask === true;
                const notCoinbase = window.ethereum?.isCoinbaseWallet !== true;
                const notPhantom = window.ethereum?.isPhantom !== true;
                const notTrust = window.ethereum?.isTrust !== true;

                if (isMetaMask && hasMetaMaskObject && notCoinbase && notPhantom && notTrust) {
                    selectedProvider = window.ethereum;
                    actualWallet = 'metamask';
                    console.log('✅ Found REAL MetaMask via window.ethereum (has _metamask object)');
                } else {
                    console.log('❌ MetaMask not found or hijacked by another wallet');
                    console.log('  Wallet check:', {
                        isMetaMask,
                        hasMetaMaskObject,
                        notCoinbase,
                        notPhantom,
                        notTrust
                    });
                }
            }
        }

        // PHANTOM WALLET - Check window.phantom.ethereum first, then providers array
        else if (providerType === 'phantom') {
            console.log('👻 Searching for Phantom...');
            console.log('');

            // Try window.phantom.ethereum first (Phantom's preferred namespace)
            if (window.phantom?.ethereum) {
                selectedProvider = window.phantom.ethereum;
                actualWallet = 'phantom';
                console.log('✅ Found Phantom via window.phantom.ethereum');
            }
            // Fallback to providers array
            else if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                console.log('📦 Searching in window.ethereum.providers array...');
                selectedProvider = window.ethereum.providers.find(p =>
                    p.isPhantom === true &&
                    p.isMetaMask !== true &&
                    p.isCoinbaseWallet !== true &&
                    p.isTrust !== true
                );
                if (selectedProvider) {
                    actualWallet = 'phantom';
                    console.log('✅ Found Phantom in providers array');
                } else {
                    console.log('❌ Phantom not found in providers array');
                }
            }
            // Last resort: check window.ethereum directly
            else if (window.ethereum?.isPhantom) {
                selectedProvider = window.ethereum;
                actualWallet = 'phantom';
                console.log('✅ Found Phantom via window.ethereum');
            } else {
                console.log('❌ Phantom not found');
            }
        }

        // COINBASE WALLET - Check window.coinbaseWalletExtension first, then providers array
        else if (providerType === 'coinbase') {
            console.log('🔵 Searching for Coinbase Wallet...');
            console.log('');

            // Try window.coinbaseWalletExtension first
            if (window.coinbaseWalletExtension) {
                selectedProvider = window.coinbaseWalletExtension;
                actualWallet = 'coinbase';
                console.log('✅ Found Coinbase Wallet via window.coinbaseWalletExtension');
            }
            // Fallback to providers array
            else if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                console.log('📦 Searching in window.ethereum.providers array...');
                selectedProvider = window.ethereum.providers.find(p =>
                    (p.isCoinbaseWallet === true || p.isCoinbaseBrowser === true) &&
                    p._metamask === undefined // Exclude fake MetaMask
                );
                if (selectedProvider) {
                    actualWallet = 'coinbase';
                    console.log('✅ Found Coinbase Wallet in providers array');
                } else {
                    console.log('❌ Coinbase Wallet not found in providers array');
                }
            }
            // Last resort: check window.ethereum
            else if (window.ethereum?.isCoinbaseWallet || window.ethereum?.isWalletLink) {
                selectedProvider = window.ethereum;
                actualWallet = 'coinbase';
                console.log('✅ Found Coinbase Wallet via window.ethereum flags');
            } else {
                console.log('❌ Coinbase Wallet not found');
            }
        }

        // TRUST WALLET - Check global window.trustWallet or window.ethereum
        else if (providerType === 'trust') {
            console.log('🛡️ Searching for Trust Wallet...');
            console.log('');

            if (window.trustWallet) {
                selectedProvider = window.trustWallet;
                actualWallet = 'trust';
                console.log('✅ Found Trust Wallet via window.trustWallet');
            } else if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                console.log('📦 Searching in window.ethereum.providers array...');
                selectedProvider = window.ethereum.providers.find(p =>
                    (p.isTrust === true || p.isTrustWallet === true) &&
                    p.isMetaMask !== true &&
                    p.isCoinbaseWallet !== true
                );
                if (selectedProvider) {
                    actualWallet = 'trust';
                    console.log('✅ Found Trust Wallet in providers array');
                } else {
                    console.log('❌ Trust Wallet not found in providers array');
                }
            } else if (window.ethereum?.isTrust || window.ethereum?.isTrustWallet) {
                selectedProvider = window.ethereum;
                actualWallet = 'trust';
                console.log('✅ Found Trust Wallet via window.ethereum');
            } else {
                console.log('❌ Trust Wallet not found');
            }
        }

        // BROWSER WALLET / INJECTED - Use whatever is available
        else if (providerType === 'injected') {
            console.log('🔍 Using any available wallet...');

            if (window.ethereum) {
                selectedProvider = window.ethereum;
                actualWallet = detectWalletProvider(window.ethereum);
                console.log('✅ Using Browser Wallet:', actualWallet);
            } else {
                console.log('❌ No wallet provider found');
            }
        }

        console.log('');

        // Final fallback: If still not found, show error
        if (!selectedProvider) {
            const walletNames = {
                'metamask': 'MetaMask',
                'trust': 'Trust Wallet',
                'coinbase': 'Coinbase Wallet',
                'injected': 'Browser Wallet'
            };

            const requestedWallet = walletNames[providerType] || providerType;

            console.error('==========================================');
            console.error('❌ WALLET NOT FOUND');
            console.error('==========================================');
            console.error('Requested:', requestedWallet);
            console.error('');

            // Special message for MetaMask when Trust Wallet conflict exists
            if (providerType === 'metamask' && window.ethereum?.isMetaMask && window.ethereum?.isTrust) {
                console.error('⚠️  WALLET CONFLICT DETECTED');
                console.error('');
                console.error('Trust Wallet has taken over the window.ethereum object');
                console.error('and is preventing MetaMask from being accessed.');
                console.error('');
                console.error('To use MetaMask:');
                console.error('  Option 1: Disable Trust Wallet extension');
                console.error('    1. Go to chrome://extensions/');
                console.error('    2. Find "Trust Wallet" and toggle it OFF');
                console.error('    3. Refresh this page');
                console.error('    4. Click "MetaMask" button again');
                console.error('');
                console.error('  Option 2: Use the Browser Wallet button');
                console.error('    • Click "Browser Wallet" to connect with Trust Wallet');
                console.error('');
                console.error('  Option 3: Use MetaMask mobile with WalletConnect');
                console.error('    • (Coming soon)');
                console.error('==========================================');

                showToast('MetaMask is blocked by Trust Wallet. Please disable Trust Wallet extension temporarily, or use the "Browser Wallet" button.', 'error');
            } else {
                console.error('The wallet you requested could not be detected.');
                console.error('');
                console.error('Possible reasons:');
                console.error(`  • ${requestedWallet} is not installed`);
                console.error('  • The wallet extension is disabled');
                console.error('  • The wallet is not properly initialized');
                console.error('');
                console.error('To fix:');
                console.error(`  1. Install ${requestedWallet} from the official store`);
                console.error('  2. Make sure the extension is enabled');
                console.error('  3. Refresh this page (F5)');
                console.error(`  4. Click "${requestedWallet}" again`);
                console.error('==========================================');

                showToast(`${requestedWallet} not found. Please install it and refresh the page.`, 'error');
            }

            showLoading(false);
            return;
        }

        console.log('==========================================');
        console.log('✅ FINAL SELECTION');
        console.log('  - User requested:', providerType);
        console.log('  - Selected wallet:', actualWallet);
        console.log('  - Provider object:', selectedProvider ? 'Found' : 'Not found');
        console.log('==========================================');

        // Store the selected wallet type and actual wallet detected
        localStorage.setItem('selectedWallet', providerType);
        localStorage.setItem('actualWallet', actualWallet);

        console.log('Connecting with:', actualWallet);

        // IMPORTANT: Request accounts from the SPECIFIC provider, not window.ethereum
        showLoading(true);

        // ===================================================================
        // 🚨 CRITICAL LOGGING - RIGHT BEFORE WALLET CONNECTION REQUEST
        // ===================================================================
        console.log('');
        console.log('███████████████████████████████████████████████████████████');
        console.log('🚨 ABOUT TO CONNECT TO WALLET:');
        console.log('███████████████████████████████████████████████████████████');
        console.log('  User requested:', providerType);
        console.log('  Selected provider:', selectedProvider ? 'Found' : 'NOT FOUND');
        console.log('  Detected wallet type:', actualWallet);
        console.log('');
        console.log('  Provider flags:');
        console.log('    - isMetaMask:', selectedProvider?.isMetaMask);
        console.log('    - isPhantom:', selectedProvider?.isPhantom);
        console.log('    - isCoinbaseWallet:', selectedProvider?.isCoinbaseWallet);
        console.log('    - isTrust:', selectedProvider?.isTrust);
        console.log('    - isTrustWallet:', selectedProvider?.isTrustWallet);
        console.log('    - isBraveWallet:', selectedProvider?.isBraveWallet);
        console.log('');
        console.log('  Provider object type:', typeof selectedProvider);
        console.log('  Provider constructor:', selectedProvider?.constructor?.name);
        console.log('');
        console.log('🔐 Now requesting accounts from this provider...');
        console.log('███████████████████████████████████████████████████████████');
        console.log('');

        try {
            // Use the specific provider to request accounts
            const accounts = await selectedProvider.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                showLoading(false);
                return;
            }

            // Now setup ethers with the selected provider
            state.provider = new ethers.BrowserProvider(selectedProvider);
            state.signer = await state.provider.getSigner();
            state.userAddress = accounts[0];

            // Initialize contracts
            state.fundMeContract = new ethers.Contract(
                CONTRACT_ADDRESSES.FUNDME,
                FUNDME_ABI,
                state.signer
            );

            state.nftContract = new ethers.Contract(
                CONTRACT_ADDRESSES.NFT,
                NFT_ABI,
                state.provider
            );

            state.isConnected = true;

            // Save connection state to localStorage
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', state.userAddress);

            // Update UI
            updateWalletButton();

            // Load data
            try {
                if (typeof loadUserData === 'function') {
                    await loadUserData();
                }
                if (typeof loadContractStats === 'function') {
                    await loadContractStats();
                }
            } catch (dataError) {
                console.log('Error loading data (non-critical):', dataError);
            }

            showToast('Wallet connected successfully!', 'success');
            showLoading(false);

        } catch (connectError) {
            console.error('Error during wallet connection:', connectError);
            if (connectError.code === 4001) {
                showToast('Connection rejected by user', 'error');
            } else {
                showToast('Failed to connect wallet', 'error');
            }
            showLoading(false);
        }

    } catch (error) {
        console.error('Error in connectWithProvider:', error);
        showToast('Failed to connect wallet', 'error');
        showLoading(false);
    }
}

function closeDropdown() {
    elements.walletDropdown.classList.remove('show');
}

// ==================== DATA LOADING ====================
async function loadContractStats() {
    if (!state.fundMeContract) return;

    try {
        // Get total ETH funded
        const totalEthBigInt = await state.fundMeContract.totalEthFunded();
        const totalEth = ethers.formatEther(totalEthBigInt);
        const totalEthFundedElem = document.getElementById('totalEthFunded');
        if (totalEthFundedElem) {
            totalEthFundedElem.textContent = formatNumber(totalEth, 4);
        }

        // Calculate and display USD value for total ETH funded
        const totalEthFundedUsdElem = document.getElementById('totalEthFundedUsd');
        if (totalEthFundedUsdElem) {
            try {
                const ethPrice = await getEthPriceUSD();
                const totalEthUsd = parseFloat(totalEth) * ethPrice;
                totalEthFundedUsdElem.textContent = `$${formatNumber(totalEthUsd, 2)}`;
            } catch (error) {
                console.error('Error calculating total ETH USD value:', error);
                totalEthFundedUsdElem.textContent = '$-.--';
            }
        }

        // Get total funders
        const totalFunders = await state.fundMeContract.totalFunders();
        const totalFundersElem = document.getElementById('totalFunders');
        if (totalFundersElem) {
            totalFundersElem.textContent = totalFunders.toString();
        }

        // Get total BRB tokens in contract
        const totalPicaInContractElem = document.getElementById('totalPicaInContract');
        if (totalPicaInContractElem) {
            try {
                const picaBalance = await state.fundMeContract.getPicaTokenBalance();
                console.log('BRB Balance (raw):', picaBalance.toString());
                const picaBalanceFormatted = ethers.formatUnits(picaBalance, 18);
                console.log('BRB Balance (formatted):', picaBalanceFormatted);

                // Format with commas for large numbers
                const formattedWithCommas = formatNumber(picaBalanceFormatted, 2);
                totalPicaInContractElem.textContent = formattedWithCommas;

                // Check if contract has low BRB balance and warn user
                const picaBalanceNum = parseFloat(picaBalanceFormatted);
                const statCard = totalPicaInContractElem.closest('.stat-card');
                if (statCard) {
                    if (picaBalanceNum < 1000) {
                        statCard.style.borderColor = 'var(--error-color)';
                        statCard.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)';
                    } else if (picaBalanceNum < 10000) {
                        statCard.style.borderColor = 'var(--warning-color)';
                        statCard.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)';
                    } else {
                        statCard.style.borderColor = '';
                        statCard.style.background = '';
                    }
                }
            } catch (error) {
                console.error('Error fetching BRB balance:', error);
                totalPicaInContractElem.textContent = 'Error';
            }
        }

        // Get BRB price in USD using DexScreener API
        await updateBRBPrice();

        // Get BRB Market Cap from DexScreener API
        const brbMarketCapElem = document.getElementById('brbMarketCap');
        if (brbMarketCapElem) {
            try {
                const marketCap = await getBRBMarketCap();
                if (marketCap) {
                    brbMarketCapElem.textContent = formatMarketCap(marketCap);
                    console.log('BRB Market Cap:', formatMarketCap(marketCap));
                } else {
                    brbMarketCapElem.textContent = '$--';
                }
            } catch (error) {
                console.error('Error fetching market cap:', error);
                brbMarketCapElem.textContent = '$--';
            }
        }

        // Get contract batch amount (accumulated 20% for liquidity)
        const contractBatchAmountElem = document.getElementById('contractBatchAmount');
        if (contractBatchAmountElem) {
            const batchAmountBigInt = await state.fundMeContract.batchAmount();
            const batchAmountEth = ethers.formatEther(batchAmountBigInt);
            contractBatchAmountElem.textContent = `${formatNumber(batchAmountEth, 4)} ETH`;
        }

        // Update liquidity section if it exists
        if (typeof updateLiquidityStatus === 'function') {
            await updateLiquidityStatus();
        }

    } catch (error) {
        console.error('Error loading contract stats:', error);
    }
}

async function updateBRBPrice() {
    const BRB_TOKEN_ADDRESS = '0x07f6A4932e8be5Be7a0aC1bfCAB5EF6b95B0b1a2';
    const POOL_ADDRESS = '0x224978d8428b56119c4C2BcE1d8D64B1Af5FAC29';

    try {
        // Use GeckoTerminal API (CoinGecko's DEX aggregator)
        console.log('Fetching BRB price from GeckoTerminal...');
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/base/pools/${POOL_ADDRESS}`);
        const data = await response.json();

        console.log('GeckoTerminal response:', data);

        if (data && data.data && data.data.attributes) {
            const poolData = data.data.attributes;
            const priceUsd = parseFloat(poolData.base_token_price_usd);

            console.log('Price from GeckoTerminal:', priceUsd);

            if (priceUsd && priceUsd > 0 && priceUsd < 1000000) { // Sanity check
                // Format USD price based on magnitude
                let formattedUsdPrice;
                if (priceUsd < 0.000001) {
                    formattedUsdPrice = `$${priceUsd.toExponential(4)}`;
                } else if (priceUsd < 0.01) {
                    formattedUsdPrice = `$${formatNumber(priceUsd, 8)}`;
                } else if (priceUsd < 1) {
                    formattedUsdPrice = `$${formatNumber(priceUsd, 6)}`;
                } else {
                    formattedUsdPrice = `$${formatNumber(priceUsd, 4)}`;
                }

                const picaPriceUsdElem = document.getElementById('picaPriceUsd');
                if (picaPriceUsdElem) {
                    picaPriceUsdElem.textContent = formattedUsdPrice;
                }
                return; // Success, exit function
            } else {
                console.warn('Price from GeckoTerminal seems invalid:', priceUsd);
            }
        }

        // If GeckoTerminal fails, show placeholder
        console.log('Could not fetch price from GeckoTerminal');
        const picaPriceUsdElem = document.getElementById('picaPriceUsd');
        if (picaPriceUsdElem) {
            picaPriceUsdElem.textContent = '$-.----';
        }
    } catch (error) {
        console.error('Error fetching BRB price from GeckoTerminal:', error);
        const picaPriceUsdElem = document.getElementById('picaPriceUsd');
        if (picaPriceUsdElem) {
            picaPriceUsdElem.textContent = '$-.----';
        }
    }
}

async function calculateBRBPriceOnChain() {
    try {
        console.log('=== ON-CHAIN PRICE CALCULATION ===');

        // Try to get the pool address and read directly
        try {
            const poolAddress = await state.fundMeContract.picaEthPool();
            console.log('Pool address:', poolAddress);

            // Uniswap V3 Pool ABI - just the slot0 function we need
            const poolABI = [
                {
                    "inputs": [],
                    "name": "slot0",
                    "outputs": [
                        {"name": "sqrtPriceX96", "type": "uint160"},
                        {"name": "tick", "type": "int24"},
                        {"name": "observationIndex", "type": "uint16"},
                        {"name": "observationCardinality", "type": "uint16"},
                        {"name": "observationCardinalityNext", "type": "uint16"},
                        {"name": "feeProtocol", "type": "uint8"},
                        {"name": "unlocked", "type": "bool"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "token0",
                    "outputs": [{"name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];

            const poolContract = new ethers.Contract(poolAddress, poolABI, state.provider);
            const slot0 = await poolContract.slot0();
            const token0 = await poolContract.token0();

            const sqrtPriceX96 = slot0.sqrtPriceX96;
            console.log('sqrtPriceX96:', sqrtPriceX96.toString());
            console.log('token0:', token0);

            // Calculate price from sqrtPriceX96
            // price = (sqrtPriceX96 / 2^96)^2
            const Q96 = 2n ** 96n;
            const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
            let price = sqrtPrice ** 2;

            console.log('Price from sqrtPriceX96:', price);

            // Check which token is token0 to determine if we need to invert
            const BRB_ADDRESS = '0x07f6A4932e8be5Be7a0aC1bfCAB5EF6b95B0b1a2';
            const isToken0BRB = token0.toLowerCase() === BRB_ADDRESS.toLowerCase();

            let brbPriceInEth;
            if (isToken0BRB) {
                // Price is BRB/WETH, invert to get WETH/BRB
                brbPriceInEth = 1 / price;
            } else {
                // Price is WETH/BRB, use directly
                brbPriceInEth = price;
            }

            console.log('BRB price in ETH (from pool):', brbPriceInEth);

            // Sanity check
            if (brbPriceInEth > 0 && brbPriceInEth < 1) {
                const ethPrice = await getEthPriceUSD();
                const brbPriceInUSD = brbPriceInEth * ethPrice;

                console.log('ETH price in USD:', ethPrice);
                console.log('BRB price in USD (from pool):', brbPriceInUSD);

                if (brbPriceInUSD > 0 && brbPriceInUSD < 1000000) {
                    // Format and display
                    let formattedUsdPrice;
                    if (brbPriceInUSD < 0.000001) {
                        formattedUsdPrice = `$${brbPriceInUSD.toExponential(4)}`;
                    } else if (brbPriceInUSD < 0.01) {
                        formattedUsdPrice = `$${formatNumber(brbPriceInUSD, 8)}`;
                    } else if (brbPriceInUSD < 1) {
                        formattedUsdPrice = `$${formatNumber(brbPriceInUSD, 6)}`;
                    } else {
                        formattedUsdPrice = `$${formatNumber(brbPriceInUSD, 4)}`;
                    }

                    console.log('Final formatted price:', formattedUsdPrice);
                    const picaPriceUsdElem = document.getElementById('picaPriceUsd');
                    if (picaPriceUsdElem) {
                        picaPriceUsdElem.textContent = formattedUsdPrice;
                    }
                    return; // Success!
                }
            }
        } catch (poolError) {
            console.log('Could not read from pool directly:', poolError.message);
        }

        // Fallback to contract helper functions
        console.log('Falling back to contract helper functions...');

        // Get both values to understand which one is correct
        const picaPerWethBigInt = await state.fundMeContract.getPicaPerWeth();
        const wethPerPicaBigInt = await state.fundMeContract.getWethPerPica();

        console.log('Raw values from contract:');
        console.log('  getPicaPerWeth():', picaPerWethBigInt.toString());
        console.log('  getWethPerPica():', wethPerPicaBigInt.toString());

        const picaPerWeth = parseFloat(ethers.formatUnits(picaPerWethBigInt, 18));
        const wethPerPica = parseFloat(ethers.formatUnits(wethPerPicaBigInt, 18));

        console.log('Formatted values:');
        console.log('  BRB per 1 WETH:', picaPerWeth);
        console.log('  WETH per 1 BRB:', wethPerPica);

        // The raw values from the contract need special handling
        // getPicaPerWeth raw: 24913179567 (this is NOT in 18 decimals)
        // This appears to be the sqrtPriceX96 or a similar ratio value

        let brbPriceInEth;

        // Use the raw values to calculate the actual ratio
        // If picaPerWethBigInt is small and wethPerPicaBigInt is large,
        // the price is likely: picaPerWethBigInt / (10^18)^2 or similar

        // Let's try a different approach: use the ratio of the raw values
        const ratio = Number(picaPerWethBigInt) / Number(wethPerPicaBigInt);
        console.log('Ratio of raw values (getPicaPerWeth / getWethPerPica):', ratio);

        // This ratio should give us the price
        brbPriceInEth = ratio;
        console.log('BRB price in ETH (from ratio):', brbPriceInEth);

        // If ratio is too small, we might need to adjust
        if (brbPriceInEth < 1e-15) {
            console.log('Ratio too small, trying alternative calculation');
            // Try using getPicaPerWeth formatted value directly
            brbPriceInEth = picaPerWeth;
            console.log('Using getPicaPerWeth formatted:', brbPriceInEth);
        }

        console.log('Final BRB price in ETH:', brbPriceInEth);

        // Sanity check - price should be between 0.000000001 and 1 ETH
        if (brbPriceInEth <= 0 || brbPriceInEth > 1) {
            console.error('Calculated ETH price is out of reasonable range:', brbPriceInEth);
            const picaPriceUsdElem = document.getElementById('picaPriceUsd');
            if (picaPriceUsdElem) {
                picaPriceUsdElem.textContent = '$-.----';
            }
            return;
        }

        // Get current ETH price and calculate BRB price in USD
        const ethPrice = await getEthPriceUSD();
        const brbPriceInUSD = brbPriceInEth * ethPrice;

        console.log('Current ETH price:', ethPrice);
        console.log('Final BRB price in USD:', brbPriceInUSD);

        // Sanity check - price should be reasonable
        if (brbPriceInUSD <= 0 || brbPriceInUSD > 1000000) {
            console.error('Calculated USD price is out of reasonable range:', brbPriceInUSD);
            const picaPriceUsdElem = document.getElementById('picaPriceUsd');
            if (picaPriceUsdElem) {
                picaPriceUsdElem.textContent = '$-.----';
            }
            return;
        }

        // Format USD price based on magnitude
        let formattedUsdPrice;
        if (brbPriceInUSD < 0.000001) {
            formattedUsdPrice = `$${brbPriceInUSD.toExponential(4)}`;
        } else if (brbPriceInUSD < 0.01) {
            formattedUsdPrice = `$${formatNumber(brbPriceInUSD, 8)}`;
        } else if (brbPriceInUSD < 1) {
            formattedUsdPrice = `$${formatNumber(brbPriceInUSD, 6)}`;
        } else {
            formattedUsdPrice = `$${formatNumber(brbPriceInUSD, 4)}`;
        }

        console.log('Formatted price:', formattedUsdPrice);
        const picaPriceUsdElem = document.getElementById('picaPriceUsd');
        if (picaPriceUsdElem) {
            picaPriceUsdElem.textContent = formattedUsdPrice;
        }
    } catch (error) {
        console.error('Error calculating BRB price on-chain:', error);
        const picaPriceUsdElem = document.getElementById('picaPriceUsd');
        if (picaPriceUsdElem) {
            picaPriceUsdElem.textContent = '$-.----';
        }
    }
}

async function updateLiquidityStatus() {
    if (!state.fundMeContract) return;

    try {
        // Get batch amount and minimum required
        const batchAmount = await state.fundMeContract.batchAmount();
        const minLiqAdd = await state.fundMeContract.MINLIQADD();

        const batchEth = ethers.formatEther(batchAmount);
        const minEth = ethers.formatEther(minLiqAdd);

        // Update available batch amount
        const availableBatchAmountElem = document.getElementById('availableBatchAmount');
        if (availableBatchAmountElem) {
            availableBatchAmountElem.textContent = `${formatNumber(batchEth, 4)} ETH`;
        }

        // Update minimum required
        const minLiquidityAmountElem = document.getElementById('minLiquidityAmount');
        if (minLiquidityAmountElem) {
            minLiquidityAmountElem.textContent = `${formatNumber(minEth, 4)} ETH`;
        }

        // Update status
        const liquidityStatusElem = document.getElementById('liquidityStatus');
        if (liquidityStatusElem) {
            const statusIndicator = liquidityStatusElem.querySelector('.status-indicator');
            const statusText = liquidityStatusElem.querySelector('.status-text');

            if (statusIndicator && statusText) {
                if (batchAmount >= minLiqAdd) {
                    statusIndicator.className = 'status-indicator ready';
                    statusText.textContent = 'Ready to Add';
                } else {
                    statusIndicator.className = 'status-indicator not-ready';
                    const remaining = parseFloat(minEth) - parseFloat(batchEth);
                    statusText.textContent = `Need ${formatNumber(remaining, 4)} ETH more`;
                }
            }
        }

        // Update button state
        const addLiquidityBtn = document.getElementById('addLiquidityBtn');
        if (addLiquidityBtn) {
            addLiquidityBtn.disabled = batchAmount < minLiqAdd;
        }

    } catch (error) {
        console.error('Error updating liquidity status:', error);
        const liquidityStatusElem = document.getElementById('liquidityStatus');
        if (liquidityStatusElem) {
            const statusIndicator = liquidityStatusElem.querySelector('.status-indicator');
            const statusText = liquidityStatusElem.querySelector('.status-text');
            if (statusIndicator && statusText) {
                statusIndicator.className = 'status-indicator';
                statusText.textContent = 'Error loading';
            }
        }
    }
}

async function loadUserData() {
    if (!state.userAddress || !state.fundMeContract) return;

    try {
        // Get user funded amount
        const fundedAmount = await state.fundMeContract.getHowMuchDudeFunded(state.userAddress);
        const fundedEth = ethers.formatEther(fundedAmount);

        // Get user funded amount in USD
        const fundedUsd = await state.fundMeContract.getHowMuchDudeFundedInUsd(state.userAddress);
        const fundedUsdFormatted = ethers.formatEther(fundedUsd);

        // Get user tier and bonus
        const [bonusPercentage, tierName] = await state.fundMeContract.getUserTierBonus(state.userAddress);

        // Update position card
        const positionCardElem = document.getElementById('positionCard');
        if (parseFloat(fundedEth) > 0 && positionCardElem) {
            positionCardElem.style.display = 'block';

            const userFundedEthElem = document.getElementById('userFundedEth');
            const userFundedUsdElem = document.getElementById('userFundedUsd');
            const userNftStatusElem = document.getElementById('userNftStatus');

            if (userFundedEthElem) userFundedEthElem.textContent = `${formatNumber(fundedEth, 4)} ETH`;
            if (userFundedUsdElem) userFundedUsdElem.textContent = `$${formatNumber(fundedUsdFormatted, 2)}`;
            if (userNftStatusElem) userNftStatusElem.textContent = tierName;

            // Calculate progress to next tier (thresholds are in ETH/USD equivalent)
            const nextTierProgressElem = document.getElementById('nextTierProgress');
            if (nextTierProgressElem) {
                const fundedUsdNum = parseFloat(fundedUsdFormatted);
                let nextTierText = '--';

                if (tierName === 'No NFT' && fundedUsdNum < TIER_THRESHOLDS.BRONZE) {
                    const remaining = TIER_THRESHOLDS.BRONZE - fundedUsdNum;
                    nextTierText = `$${formatNumber(remaining, 2)} to Bronze`;
                } else if (tierName === 'Bronze' && fundedUsdNum < TIER_THRESHOLDS.SILVER) {
                    const remaining = TIER_THRESHOLDS.SILVER - fundedUsdNum;
                    nextTierText = `$${formatNumber(remaining, 2)} to Silver`;
                } else if (tierName === 'Silver' && fundedUsdNum < TIER_THRESHOLDS.GOLD) {
                    const remaining = TIER_THRESHOLDS.GOLD - fundedUsdNum;
                    nextTierText = `$${formatNumber(remaining, 2)} to Gold`;
                } else if (tierName === 'Gold') {
                    nextTierText = 'Max Tier';
                }

                nextTierProgressElem.textContent = nextTierText;
            }
        }

        // Update stats card tier info
        const userTierElem = document.getElementById('userTier');
        const tierBonusElem = document.getElementById('tierBonus');
        if (userTierElem) userTierElem.textContent = tierName;
        if (tierBonusElem) tierBonusElem.textContent = `${bonusPercentage}% Bonus`;

    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// ==================== QUOTE CALCULATION ====================
async function calculateQuote(ethAmount) {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
        clearBreakdown();
        return;
    }

    try {
        // Use the getQuoteSimple function from getprice.js
        const quote = await window.getQuoteSimple(ethAmount);
        state.currentQuote = quote;

        /*starts quote slippage update needs funcition 
        const poolWeth = await getPoolLiquidity(); 
        const swapPercent = (quote.buybackEth * 100n) / poolWeth;
        if (swapPercent > 5n) {
        showToast(
            `⚠️ WARNING: Your swap is ${swapPercent}% of pool liquidity. 
            Expected slippage: ~${swapPercent}%. Consider funding a smaller amount.`,
            'warning'
        );
        }
    
        // Calculate expected value loss
        const estimatedSlippage = calculatePriceImpact(swapPercent);
        const valueAfterSlippage = ethAmount * (1 - estimatedSlippage);
        
        // Show warning if loss > 10%
        if (estimatedSlippage > 0.10) {
            showToast(
                `🚨 DANGER: Estimated value loss: ${(estimatedSlippage * 100).toFixed(0)}%
                You'll receive ~$${valueAfterSlippage.toFixed(2)} worth of PICA for $${ethAmount.toFixed(2)} ETH.
                Wait for more liquidity or fund a smaller amount.`,
                'error'
            );

            elements.fundBtn.disabled = true;
            return;
        } */


        // Get user's NFT bonus
        let bonusPercentage = 0;
        let tierName = 'No NFT';

        if (state.isConnected && state.fundMeContract) {
            try {
                [bonusPercentage, tierName] = await state.fundMeContract.getUserTierBonus(state.userAddress);
            } catch (error) {
                console.log('Error getting tier bonus:', error);
            }
        }

        // Calculate bonus tokens
        const bonusTokens = (quote.totalPica * BigInt(bonusPercentage)) / 100n;
        const totalWithBonus = quote.totalPica + bonusTokens;

        // Update breakdown UI
        updateBreakdown(quote, bonusPercentage, tierName, bonusTokens, totalWithBonus);

        // Enable fund button if amount is valid
        if (parseFloat(ethAmount) > 0) {
            elements.fundBtn.disabled = false;
            elements.fundBtn.querySelector('.btn-text').textContent = 'Fund Now';
        } else {
            elements.fundBtn.disabled = true;
            elements.fundBtn.querySelector('.btn-text').textContent = 'Enter Amount';
        }

    } catch (error) {
        console.error('Error calculating quote:', error);
        showToast('Failed to calculate quote. Please try again.', 'error');
        clearBreakdown();
    }
}

function updateBreakdown(quote, bonusPercentage, tierName, bonusTokens, totalWithBonus) {
    // Buyback section (80%)
    const buybackEth = ethers.formatEther(quote.buybackEth);
    elements.buybackAmount.textContent = `${formatNumber(buybackEth, 4)} ETH`;
    elements.buybackPica.textContent = formatTokenAmount(quote.swapOutput);

    // Batch allocation section (20%)
    const reservedEth = ethers.formatEther(quote.reservedEth);
    elements.batchAmount.textContent = `${formatNumber(reservedEth, 4)} ETH`;
    elements.compensationPica.textContent = formatTokenAmount(quote.compensation);

    // Bonus section
    elements.bonusPercentage.textContent = `${bonusPercentage}%`;
    elements.tierName.textContent = tierName;
    elements.bonusPica.textContent = formatTokenAmount(bonusTokens);

    // Total
    elements.totalPica.textContent = formatTokenAmount(totalWithBonus);
}

function clearBreakdown() {
    elements.buybackAmount.textContent = '0.00 ETH';
    elements.buybackPica.textContent = '0.00';
    elements.batchAmount.textContent = '0.00 ETH';
    elements.compensationPica.textContent = '0.00';
    elements.bonusPica.textContent = '0.00';
    elements.totalPica.textContent = '0.00';

    elements.fundBtn.disabled = true;
    elements.fundBtn.querySelector('.btn-text').textContent = 'Enter Amount';
}

// ==================== FUNDING ====================
async function fundWithEth() {
    if (!state.isConnected) {
        showToast('Please connect your wallet first', 'error');
        return;
    }

    const ethAmount = elements.ethInput.value;
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
        showToast('Please enter a valid ETH amount', 'error');
        return;
    }

    try {
        showLoading(true);

        const ethValue = ethers.parseEther(ethAmount);

        // Call the fund function
        const tx = await state.fundMeContract.fund({
            value: ethValue,
        });

        showToast('Transaction submitted! Waiting for confirmation...', 'success');

        // Wait for transaction confirmation
        await tx.wait();

        showToast('Funding successful! PICA tokens received!', 'success');

        // Refresh data
        await loadUserData();
        await loadContractStats();

        // Clear input
        elements.ethInput.value = '';
        clearBreakdown();

        showLoading(false);

    } catch (error) {
        console.error('Error funding:', error);

        let errorMessage = 'Transaction failed';

        if (error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction rejected by user';
        } else if (error.code === 'CALL_EXCEPTION' || error.receipt?.status === 0) {
            // Transaction reverted - check gas used to determine issue
            const gasUsed = error.receipt?.gasUsed;

            // High gas usage suggests it got far into execution before reverting

        } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient ETH in wallet';
        } else if (error.message.includes('You need to spend more ETH')) {
            errorMessage = 'Amount below minimum requirement ($0.20 USD)';
        } else if (error.message.includes('user rejected')) {
            errorMessage = 'Transaction rejected by user';
        }

        showToast(errorMessage, 'error');
        showLoading(false);
    }
}

// ==================== ADD LIQUIDITY ====================
async function addLiquidityToPool() {
    if (!state.isConnected) {
        showToast('Please connect your wallet first', 'error');
        return;
    }

    try {
        showLoading(true);

        // Get the current batch amount to check if it meets the minimum
        const batchAmount = await state.fundMeContract.batchAmount();
        const minLiqAdd = await state.fundMeContract.MINLIQADD();

        if (batchAmount < minLiqAdd) {
            const batchEth = ethers.formatEther(batchAmount);
            const minEth = ethers.formatEther(minLiqAdd);
            showToast(`Insufficient batch amount. Current: ${parseFloat(batchEth).toFixed(4)} ETH, Minimum: ${parseFloat(minEth).toFixed(4)} ETH`, 'error');
            showLoading(false);
            return;
        }

        // Call the addLiquidityToPool function
        const tx = await state.fundMeContract.addLiquidityToPool();

        showToast('Transaction submitted! Adding liquidity to pool...', 'success');

        // Wait for transaction confirmation
        const receipt = await tx.wait();

        // Parse the LiquidityAdded event from the receipt
        const liquidityAddedEvent = receipt.logs.find(log => {
            try {
                const parsed = state.fundMeContract.interface.parseLog(log);
                return parsed.name === 'LiquidityAdded';
            } catch {
                return false;
            }
        });

        if (liquidityAddedEvent) {
            const parsed = state.fundMeContract.interface.parseLog(liquidityAddedEvent);
            const ethAmount = ethers.formatEther(parsed.args.ethAmount);
            const picaAmount = ethers.formatUnits(parsed.args.picaAmount, 18);
            showToast(`Liquidity added successfully! ${parseFloat(ethAmount).toFixed(4)} ETH + ${parseFloat(picaAmount).toFixed(2)} BRB`, 'success');
        } else {
            showToast('Liquidity added successfully!', 'success');
        }

        // Refresh data
        await loadContractStats();
        await updateLiquidityStatus();
        if (state.userAddress) {
            await loadUserData();
        }

        showLoading(false);

    } catch (error) {
        console.error('Error adding liquidity:', error);

        let errorMessage = 'Failed to add liquidity';

        if (error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction rejected by user';
        } else if (error.message.includes('FundMe__LiquidityAdditionFailed')) {
            errorMessage = 'Liquidity addition failed - batch amount below minimum';
        } else if (error.message.includes('Insufficient PICA')) {
            errorMessage = 'Insufficient BRB tokens in contract';
        } else if (error.message.includes('user rejected')) {
            errorMessage = 'Transaction rejected by user';
        }

        showToast(errorMessage, 'error');
        showLoading(false);
    }
}

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
    // Connect/Disconnect wallet button
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const walletDropdown = document.getElementById('walletDropdown');

    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', handleWalletButtonClick);
    }

    // Disconnect button
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            disconnectWallet();
            const dropdown = document.getElementById('walletDropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        });
    }

    // Close dropdown when clicking outside
    if (walletDropdown) {
        document.addEventListener('click', (e) => {
            const btn = document.getElementById('connectWalletBtn');
            if (btn && !btn.contains(e.target) && !walletDropdown.contains(e.target)) {
                walletDropdown.classList.remove('show');
            }
        });
    }

    // Wallet modal event listeners
    const walletModalOverlay = document.getElementById('walletModalOverlay');
    const walletModalClose = document.getElementById('walletModalClose');
    const walletOptions = document.querySelectorAll('.wallet-option');

    // Close modal when clicking close button
    if (walletModalClose) {
        walletModalClose.addEventListener('click', hideWalletModal);
    }

    // Close modal when clicking overlay (outside modal)
    if (walletModalOverlay) {
        walletModalOverlay.addEventListener('click', (e) => {
            if (e.target === walletModalOverlay) {
                hideWalletModal();
            }
        });
    }

    // Handle wallet option clicks
    console.log('🟢 Registering click handlers for', walletOptions.length, 'wallet options');
    walletOptions.forEach((option, index) => {
        const walletType = option.getAttribute('data-wallet');
        console.log(`  - Option ${index}: data-wallet="${walletType}"`);

        option.addEventListener('click', (e) => {
            console.log('🟡 Wallet option clicked:', walletType);
            console.log('  - Event target:', e.target);
            console.log('  - Current target:', e.currentTarget);

            if (walletType) {
                console.log('  - Calling connectWithProvider with:', walletType);
                connectWithProvider(walletType);
            } else {
                console.error('  - ❌ No wallet type found on button!');
            }
        });
    });

    // ETH input change (only on pages with funding form)
    const ethInput = document.getElementById('ethInput');
    const ethInputUsd = document.getElementById('ethInputUsd');
    if (ethInput) {
        let debounceTimer;
        ethInput.addEventListener('input', async (e) => {
            const value = e.target.value;

            // Update USD value immediately
            if (value && parseFloat(value) > 0 && ethInputUsd) {
                try {
                    const ethPrice = await getEthPriceUSD();
                    const usdValue = parseFloat(value) * ethPrice;
                    ethInputUsd.textContent = `$${formatNumber(usdValue, 2)} USD`;
                } catch (error) {
                    ethInputUsd.textContent = '$-.-- USD';
                }
            } else if (ethInputUsd) {
                ethInputUsd.textContent = '$0.00 USD';
            }

            // Debounce quote calculation
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (value && typeof calculateQuote === 'function') {
                    calculateQuote(value);
                } else if (typeof clearBreakdown === 'function') {
                    clearBreakdown();
                }
            }, 500);
        });
    }

    // Refresh quote button
    const refreshQuote = document.getElementById('refreshQuote');
    if (refreshQuote && ethInput) {
        refreshQuote.addEventListener('click', () => {
            const ethAmount = ethInput.value;
            if (ethAmount && typeof calculateQuote === 'function') {
                calculateQuote(ethAmount);
                showToast('Quote refreshed', 'success');
            }
        });
    }

    // Fund button
    const fundBtn = document.getElementById('fundBtn');
    if (fundBtn && typeof fundWithEth === 'function') {
        fundBtn.addEventListener('click', fundWithEth);
    }

    // Add liquidity button
    const addLiquidityBtn = document.getElementById('addLiquidityBtn');
    if (addLiquidityBtn && typeof addLiquidityToPool === 'function') {
        addLiquidityBtn.addEventListener('click', addLiquidityToPool);
    }

    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                // User disconnected wallet
                location.reload();
            } else {
                // User switched accounts
                location.reload();
            }
        });

        window.ethereum.on('chainChanged', () => {
            // Reload on network change
            location.reload();
        });
    }
}

// ==================== INITIALIZATION ====================
async function initializeReadOnlyProvider() {
    try {
        // Use Base mainnet public RPC for read-only operations
        state.provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

        state.fundMeContract = new ethers.Contract(
            CONTRACT_ADDRESSES.FUNDME,
            FUNDME_ABI,
            state.provider
        );

        console.log('Read-only provider initialized with Base mainnet');
        await loadContractStats();
    } catch (error) {
        console.error('Error loading initial stats:', error);
    }
}

async function initialize() {
    console.log('Initializing PICA Fund DApp...');

    // Initialize event listeners
    initializeEventListeners();

    // Check if wallet should auto-reconnect
    const wasConnected = localStorage.getItem('walletConnected') === 'true';
    const selectedWallet = localStorage.getItem('selectedWallet');

    // CRITICAL: Only attempt reconnection if user was actually connected AND we know which wallet
    // DO NOT access window.ethereum directly - it might trigger Phantom popup!
    if (wasConnected && selectedWallet && window.ethereum) {
        try {
            console.log('Attempting silent reconnect to:', selectedWallet);

            // Use connectWithProviderSilent which handles provider selection WITHOUT triggering popups
            // This function uses eth_accounts internally, which doesn't trigger popups
            await connectWithProviderSilent(selectedWallet);

        } catch (error) {
            console.error('Error during silent reconnect:', error);
            // Clear localStorage if there's an error
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
            localStorage.removeItem('selectedWallet');
            localStorage.removeItem('actualWallet');
        }
    } else if (wasConnected && !selectedWallet) {
        // Wallet was connected but we don't know which one - clear localStorage
        console.log('Previous connection found but no wallet type saved - clearing');
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('selectedWallet');
        localStorage.removeItem('actualWallet');
    }

    // Load initial contract stats (read-only, no wallet needed)
    if (!state.isConnected && typeof initializeReadOnlyProvider === 'function') {
        try {
            await initializeReadOnlyProvider();
        } catch (error) {
            console.log('Error initializing read-only provider:', error);
        }
    }

    console.log('PICA Fund DApp initialized successfully!');
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Export for debugging
window.picaFund = {
    state,
    connectWallet,
    calculateQuote,
    fundWithEth,
    addLiquidityToPool,
    loadContractStats,
    loadUserData
};
