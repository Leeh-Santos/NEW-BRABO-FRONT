import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.7.0/dist/ethers.min.js';
import { CONTRACT_ADDRESSES, FUNDME_ABI, NFT_ABI } from './constants.js';

// State
let provider = null;
let signer = null;
let userAddress = null;
let fundMeContract = null;
let nftContract = null;

// DOM Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const connectPromptBtn = document.getElementById('connectPromptBtn');
const walletDropdown = document.getElementById('walletDropdown');
const disconnectBtn = document.getElementById('disconnectBtn');
const connectPrompt = document.getElementById('connectPrompt');
const portfolioContent = document.getElementById('portfolioContent');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const refreshPortfolioBtn = document.getElementById('refreshPortfolioBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkExistingConnection();
});

function initializeEventListeners() {
    connectWalletBtn?.addEventListener('click', handleWalletClick);
    connectPromptBtn?.addEventListener('click', () => showWalletModal());
    disconnectBtn?.addEventListener('click', disconnectWallet);
    refreshPortfolioBtn?.addEventListener('click', loadPortfolioData);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.wallet-container')) {
            walletDropdown?.classList.remove('show');
        }
    });

    // Wallet modal event listeners
    const walletModalOverlay = document.getElementById('walletModalOverlay');
    const walletModalClose = document.getElementById('walletModalClose');
    const walletOptions = document.querySelectorAll('.wallet-option');

    // Close modal when clicking close button
    walletModalClose?.addEventListener('click', hideWalletModal);

    // Close modal when clicking overlay (outside modal)
    walletModalOverlay?.addEventListener('click', (e) => {
        if (e.target === walletModalOverlay) {
            hideWalletModal();
        }
    });

    // Handle wallet option clicks
    walletOptions.forEach(option => {
        option.addEventListener('click', () => {
            const walletType = option.getAttribute('data-wallet');
            if (walletType) {
                connectWithProvider(walletType);
            }
        });
    });
}

async function checkExistingConnection() {
    const wasConnected = localStorage.getItem('walletConnected') === 'true';

    if (typeof window.ethereum !== 'undefined' && wasConnected) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                console.log('Auto-reconnecting wallet silently...');
                await connectWallet(true); // Pass true for silent mode
            } else {
                // Wallet was connected before but not anymore, clear localStorage
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('walletAddress');
            }
        } catch (error) {
            console.error('Error checking existing connection:', error);
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
        }
    }
}

async function handleWalletClick() {
    if (userAddress) {
        walletDropdown?.classList.toggle('show');
    } else {
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

async function connectWithProvider(providerType) {
    try {
        hideWalletModal();

        // Check if any Web3 provider is available
        if (!window.ethereum) {
            showToast('No Web3 wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet.', 'error');
            return;
        }

        // Handle WalletConnect separately (requires library)
        if (providerType === 'walletconnect') {
            showToast('WalletConnect support coming soon. Please use browser wallet for now.', 'error');
            return;
        }

        // Find the correct provider
        let selectedProvider = null;
        let actualWallet = null;

        // Try to find MetaMask through alternative injection points
        console.log('Checking for wallet providers...');
        console.log('window.ethereum exists:', !!window.ethereum);
        console.log('window.ethereum.providers exists:', !!window.ethereum?.providers);

        // Some wallets inject themselves in different places
        if (window.ethereum) {
            console.log('window.ethereum.isMetaMask:', window.ethereum.isMetaMask);
            console.log('window.ethereum.isTrust:', window.ethereum.isTrust);
            console.log('window.ethereum.isCoinbaseWallet:', window.ethereum.isCoinbaseWallet);
        }

        // Check if multiple providers exist (desktop with multiple wallets)
        if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
            console.log('Multiple providers detected:', window.ethereum.providers.length);

            // Log all available providers for debugging
            window.ethereum.providers.forEach((provider, index) => {
                console.log(`Provider ${index}:`, detectWalletProvider(provider));
            });

            // Find the specific provider based on wallet type
            selectedProvider = window.ethereum.providers.find(provider => {
                const walletType = detectWalletProvider(provider);
                console.log(`Checking provider: ${walletType} against selected: ${providerType}`);
                return walletType === providerType || (providerType === 'injected' && walletType !== 'unknown');
            });

            if (!selectedProvider && providerType === 'injected') {
                // For "Browser Wallet", use first available
                selectedProvider = window.ethereum.providers[0];
            }

            if (!selectedProvider) {
                const walletNames = {
                    'metamask': 'MetaMask',
                    'trust': 'Trust Wallet',
                    'coinbase': 'Coinbase Wallet'
                };
                showToast(`${walletNames[providerType] || providerType} not detected. Please make sure it's installed and enabled.`, 'error');
                return;
            }

            actualWallet = detectWalletProvider(selectedProvider);
            console.log('Selected provider:', actualWallet);
        } else {
            // Single provider or in-wallet browser
            selectedProvider = window.ethereum;
            actualWallet = detectWalletProvider(selectedProvider);

            console.log('==========================================');
            console.log('Single provider detected:', actualWallet);
            console.log('User selected:', providerType);
            console.log('==========================================');

            // Check if the detected wallet matches what the user selected
            if (providerType !== 'injected' && actualWallet !== providerType && actualWallet !== 'unknown') {
                const walletNames = {
                    'metamask': 'MetaMask',
                    'trust': 'Trust Wallet',
                    'coinbase': 'Coinbase Wallet'
                };

                const requestedWallet = walletNames[providerType] || providerType;
                const detectedWallet = walletNames[actualWallet] || 'your current wallet';

                console.error('==========================================');
                console.error('❌ WALLET MISMATCH DETECTED');
                console.error('==========================================');
                console.error('Selected:', requestedWallet);
                console.error('Detected:', detectedWallet);
                console.error('');
                console.error('🔧 HOW TO FIX:');
                console.error('');
                console.error('Option 1 (Recommended):');
                console.error('  1. Open chrome://extensions/');
                console.error(`  2. Find "${detectedWallet}" and toggle it OFF`);
                console.error('  3. Refresh this page (F5)');
                console.error(`  4. Click "${requestedWallet}" again`);
                console.error('');
                console.error('Option 2:');
                console.error(`  1. Click "Browser Wallet" to connect with ${detectedWallet}`);
                console.error(`  2. Or install the ${requestedWallet} extension if missing`);
                console.error('==========================================');

                const errorMsg = `⚠️ Wallet Conflict!\n\n${detectedWallet} is overriding ${requestedWallet} in Chrome.\n\nTo use ${requestedWallet}:\n\n1. Open chrome://extensions/\n2. Disable ${detectedWallet} extension\n3. Refresh page (F5)\n4. Try again\n\nOr click "Browser Wallet" to use ${detectedWallet}`;

                showToast(errorMsg, 'error');

                // STOP execution - do NOT continue
                throw new Error(`Wallet mismatch: selected ${providerType}, detected ${actualWallet}`);
            }
        }

        // Store the selected wallet type and actual wallet detected
        localStorage.setItem('selectedWallet', providerType);
        localStorage.setItem('actualWallet', actualWallet);

        console.log('Connecting with:', actualWallet);

        // IMPORTANT: Request accounts from the SPECIFIC provider, not window.ethereum
        showLoading('Connecting wallet...');

        try {
            // Use the specific provider to request accounts
            const accounts = await selectedProvider.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                hideLoading();
                return;
            }

            // Now setup ethers with the selected provider
            provider = new ethers.BrowserProvider(selectedProvider);
            signer = await provider.getSigner();
            userAddress = accounts[0];

            // Initialize contracts
            fundMeContract = new ethers.Contract(CONTRACT_ADDRESSES.FUNDME, FUNDME_ABI, signer);
            nftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, NFT_ABI, provider);

            // Save connection state
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', userAddress);

            // Update UI
            updateWalletButton();
            connectPrompt?.classList.add('hidden');

            // Load portfolio data
            await loadPortfolioData();

            showToast('Wallet connected successfully!', 'success');
            hideLoading();

        } catch (connectError) {
            console.error('Error during wallet connection:', connectError);
            if (connectError.code === 4001) {
                showToast('Connection rejected by user', 'error');
            } else {
                showToast('Failed to connect wallet', 'error');
            }
            hideLoading();
        }

    } catch (error) {
        console.error('Error in connectWithProvider:', error);
        showToast('Failed to connect wallet', 'error');
        hideLoading();
    }
}

async function connectWallet(silent = false) {
    if (typeof window.ethereum === 'undefined') {
        if (!silent) {
            showToast('Please install MetaMask to use this app', 'error');
        }
        return;
    }

    try {
        if (!silent) {
            showLoading('Connecting wallet...');
        }

        provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send(silent ? 'eth_accounts' : 'eth_requestAccounts', []);

        if (accounts.length === 0) {
            if (!silent) {
                hideLoading();
            }
            return;
        }

        signer = await provider.getSigner();
        userAddress = accounts[0];

        // Initialize contracts
        fundMeContract = new ethers.Contract(CONTRACT_ADDRESSES.FUNDME, FUNDME_ABI, signer);
        nftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, NFT_ABI, signer);

        // Save connection state to localStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', userAddress);

        // Update UI
        updateWalletButton();
        showPortfolioContent();

        // Load portfolio data
        await loadPortfolioData();

        if (!silent) {
            hideLoading();
            showToast('Wallet connected successfully!', 'success');
        }

        // Listen for account changes (only add listeners once)
        if (window.ethereum && !window.ethereum._portfolioListenersAdded) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => window.location.reload());
            window.ethereum._portfolioListenersAdded = true;
        }

    } catch (error) {
        if (!silent) {
            hideLoading();
        }
        console.error('Error connecting wallet:', error);
        if (!silent) {
            showToast('Failed to connect wallet', 'error');
        }
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        userAddress = accounts[0];
        updateWalletButton();
        loadPortfolioData();
    }
}

function disconnectWallet() {
    provider = null;
    signer = null;
    userAddress = null;
    fundMeContract = null;
    nftContract = null;

    // Clear localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');

    updateWalletButton();
    hidePortfolioContent();
    walletDropdown?.classList.remove('show');
    showToast('Wallet disconnected', 'success');
}

function updateWalletButton() {
    const walletText = connectWalletBtn?.querySelector('.wallet-text');
    if (userAddress) {
        const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        if (walletText) walletText.textContent = shortAddress;
        connectWalletBtn?.classList.add('connected');
    } else {
        if (walletText) walletText.textContent = 'Connect Wallet';
        connectWalletBtn?.classList.remove('connected');
    }
}

function showPortfolioContent() {
    if (connectPrompt) connectPrompt.style.display = 'none';
    if (portfolioContent) portfolioContent.style.display = 'block';
}

function hidePortfolioContent() {
    if (connectPrompt) connectPrompt.style.display = 'block';
    if (portfolioContent) portfolioContent.style.display = 'none';
}

async function loadPortfolioData() {
    if (!userAddress || !fundMeContract || !nftContract) return;

    try {
        showLoading('Loading portfolio data...');

        // Fetch basic data (always works)
        const [
            userFundedWei,
            userFundedUsdWei,
            ethPrice
        ] = await Promise.all([
            fundMeContract.getHowMuchDudeFunded(userAddress),
            fundMeContract.getHowMuchDudeFundedInUsd(userAddress),
            getEthPrice()
        ]);

        // Update Position Overview
        const ethFunded = ethers.formatEther(userFundedWei);
        const usdFunded = parseFloat(ethers.formatEther(userFundedUsdWei));

        document.getElementById('portfolioEthFunded').textContent = `${parseFloat(ethFunded).toFixed(6)} ETH`;
        document.getElementById('portfolioUsdFunded').textContent = `$${usdFunded.toFixed(2)}`;

        // Get actual BRB balance from wallet
        let brbBalance = 0;
        try {
            const brbTokenAddress = '0x07f6A4932e8be5Be7a0aC1bfCAB5EF6b95B0b1a2';
            const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
            const provider = window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null;

            if (provider) {
                const brbTokenContract = new ethers.Contract(brbTokenAddress, erc20Abi, provider);
                const brbBalanceWei = await brbTokenContract.balanceOf(userAddress);
                brbBalance = parseFloat(ethers.formatUnits(brbBalanceWei, 18));

                console.log('BRB Balance from wallet:', brbBalance);
                document.getElementById('portfolioBrbReceived').textContent = `${brbBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })} $BRB`;
            } else {
                // Fallback to estimated if provider not available
                const picaPerWeth = await fundMeContract.getPicaPerWeth();
                const estimatedBrb = parseFloat(ethFunded) * (Number(picaPerWeth) / 1e18) * 0.8;
                brbBalance = estimatedBrb;
                document.getElementById('portfolioBrbReceived').textContent = `${estimatedBrb.toFixed(2)} $BRB (est.)`;
            }
        } catch (error) {
            console.error('Error fetching BRB balance:', error);
            // Fallback to estimated
            const picaPerWeth = await fundMeContract.getPicaPerWeth();
            const estimatedBrb = parseFloat(ethFunded) * (Number(picaPerWeth) / 1e18) * 0.8;
            brbBalance = estimatedBrb;
            document.getElementById('portfolioBrbReceived').textContent = `${estimatedBrb.toFixed(2)} $BRB (est.)`;
        }

        // Calculate BRB value using current price
        try {
            const brbPriceElement = document.getElementById('picaPriceUsd');
            if (brbPriceElement && brbPriceElement.textContent) {
                const brbPrice = parseFloat(brbPriceElement.textContent.replace('$', ''));
                if (!isNaN(brbPrice) && brbPrice > 0) {
                    const brbValue = brbBalance * brbPrice;
                    document.getElementById('portfolioBrbValue').textContent = `$${brbValue.toFixed(2)}`;
                } else {
                    document.getElementById('portfolioBrbValue').textContent = `--`;
                }
            } else {
                document.getElementById('portfolioBrbValue').textContent = `--`;
            }
        } catch (error) {
            console.log('Could not calculate BRB value:', error);
            document.getElementById('portfolioBrbValue').textContent = `--`;
        }

        // Try to fetch NFT data (may fail if user has no NFT)
        let nftBalance = 0n;
        let userTier = 0;

        try {
            nftBalance = await nftContract.balanceOf(userAddress);
            console.log('NFT Balance:', nftBalance.toString());

            // Only try to get tier if user has NFT
            if (Number(nftBalance) > 0) {
                try {
                    userTier = await nftContract.getUserTier(userAddress);
                    console.log('User Tier:', userTier);
                } catch (tierError) {
                    console.log('Could not get user tier (using default 0):', tierError.message);
                    userTier = 0;
                }
            }
        } catch (nftError) {
            console.log('NFT data not available (user may not have NFT):', nftError.message);
            nftBalance = 0n;
            userTier = 0;
        }

        // Update NFT Section
        await updateNftSection(nftBalance, userTier);

        // Update Tier Progression
        await updateTierProgression(usdFunded, userTier);

        // Update Activity Summary
        updateActivitySummary(usdFunded);

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading portfolio data:', error);
        showToast('Error loading portfolio data. Please try refreshing.', 'error');
    }
}

async function updateNftSection(nftBalance, userTier) {
    const nftEmptyState = document.getElementById('nftEmptyState');
    const nftCard = document.getElementById('nftCard');

    const hasNft = Number(nftBalance) > 0;

    if (hasNft) {
        nftEmptyState.style.display = 'none';
        nftCard.style.display = 'flex';

        // Get token ID and tier info
        try {
            const tokenId = await nftContract.getTokenIdByOwner(userAddress);
            const tierNames = ['Bronze', 'Silver', 'Gold'];
            const tierBonuses = ['+2%', '+5%', '+10%'];
            const tier = Number(userTier);

            document.getElementById('nftTokenId').textContent = `Token #${tokenId}`;
            document.getElementById('nftTier').textContent = tierNames[tier] || 'Bronze';
            document.getElementById('nftBonus').textContent = tierBonuses[tier] || '+2%';

            // Update badge
            const badge = document.getElementById('nftTierBadge');
            badge.textContent = tierNames[tier] || 'Bronze';
            badge.className = 'nft-tier-badge';
            if (tier === 1) badge.classList.add('silver');
            if (tier === 2) badge.classList.add('gold');

            // Update NFT image based on tier
            const nftImage = document.getElementById('nftImage');
            const tierImages = ['bronze.svg', 'silver.svg', 'gold.svg'];
            nftImage.src = tierImages[tier] || 'bronze.svg';

        } catch (error) {
            console.error('Error fetching NFT details:', error);
        }
    } else {
        nftEmptyState.style.display = 'block';
        nftCard.style.display = 'none';
    }
}

async function updateTierProgression(usdFunded, userTier) {
    console.log('Updating tier progression - USD Funded:', usdFunded, 'User Tier:', userTier);

    const tier = Number(userTier);
    const tierNames = ['No Tier', 'Bronze', 'Silver', 'Gold'];
    const tierThresholds = [0, 5, 50, 100];

    // Determine current tier based on USD funded
    let currentTierIndex = 0; // 0 = No Tier, 1 = Bronze, 2 = Silver, 3 = Gold
    if (usdFunded >= 100) currentTierIndex = 3;
    else if (usdFunded >= 50) currentTierIndex = 2;
    else if (usdFunded >= 5) currentTierIndex = 1;
    else currentTierIndex = 0;

    const currentTierName = tierNames[currentTierIndex];
    document.getElementById('currentTierName').textContent = currentTierName;
    console.log('Current tier:', currentTierName);

    // Determine next tier
    let nextTierIndex = currentTierIndex + 1;
    if (nextTierIndex > 3) nextTierIndex = 3;
    const nextTierName = currentTierIndex >= 3 ? 'Max Tier' : tierNames[nextTierIndex];
    document.getElementById('nextTierName').textContent = nextTierName;
    console.log('Next tier:', nextTierName);

    // Calculate progress bar
    let progressPercent = 0;
    let nextThreshold = tierThresholds[nextTierIndex];
    let currentThreshold = tierThresholds[currentTierIndex];

    if (currentTierIndex >= 3) {
        progressPercent = 100;
    } else {
        const range = nextThreshold - currentThreshold;
        const progress = usdFunded - currentThreshold;
        progressPercent = Math.max(0, Math.min((progress / range) * 100, 100));
    }

    console.log('Progress:', progressPercent, '% - Current:', usdFunded, 'Next threshold:', nextThreshold);

    document.getElementById('tierProgressFill').style.width = `${progressPercent}%`;
    document.getElementById('currentProgressLabel').textContent = `$${usdFunded.toFixed(2)}`;
    document.getElementById('nextTierThreshold').textContent = currentTierIndex >= 3 ? 'MAX' : `$${nextThreshold.toFixed(2)}`;

    // Progress message
    const progressMessage = document.getElementById('tierProgressMessage');
    if (currentTierIndex >= 3) {
        progressMessage.innerHTML = `<strong>Congratulations!</strong> You've reached the highest tier!`;
    } else {
        const remaining = Math.max(0, nextThreshold - usdFunded);
        progressMessage.innerHTML = `Fund <strong>$${remaining.toFixed(2)} more</strong> to reach ${nextTierName}`;
    }

    // Update tier cards
    updateTierCards(currentTierIndex);
}

function updateTierCards(currentTierIndex) {
    const tiers = ['bronze', 'silver', 'gold'];
    const cards = [
        document.getElementById('bronzeTierCard'),
        document.getElementById('silverTierCard'),
        document.getElementById('goldTierCard')
    ];
    const statuses = [
        document.getElementById('bronzeStatus'),
        document.getElementById('silverStatus'),
        document.getElementById('goldStatus')
    ];

    tiers.forEach((tier, index) => {
        const card = cards[index];
        const status = statuses[index];

        card.classList.remove('unlocked', 'current');

        if (index < currentTierIndex) {
            card.classList.add('unlocked');
            status.innerHTML = '<span class="status-unlocked">Unlocked</span>';
        } else if (index === currentTierIndex && currentTierIndex > 0) {
            card.classList.add('current');
            status.innerHTML = '<span class="status-current">Current</span>';
        } else if (index === currentTierIndex && currentTierIndex === 0) {
            // User at index 0 means no tier yet, show bronze as next
            status.innerHTML = '<span class="status-locked">Next</span>';
        } else {
            status.innerHTML = '<span class="status-locked">Locked</span>';
        }
    });
}

function updateActivitySummary(usdFunded) {
    // These are placeholder values - you'd need to track actual transactions
    document.getElementById('totalTransactions').textContent = usdFunded > 0 ? '1+' : '0';
    document.getElementById('firstFundingDate').textContent = usdFunded > 0 ? 'Active' : '--';
    document.getElementById('totalBonusEarned').textContent = '0.00 $BRB';
}

async function getEthPrice() {
    try {
        // You could use an API or price feed here
        // For now, return a placeholder
        return 3400; // Placeholder ETH price
    } catch (error) {
        console.error('Error fetching ETH price:', error);
        return 3400;
    }
}

// UI Helpers
function showLoading(message = 'Processing...') {
    const loadingText = loadingOverlay?.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = message;
    loadingOverlay?.classList.add('active');
}

function hideLoading() {
    loadingOverlay?.classList.remove('active');
}

function showToast(message, type = 'success') {
    if (toastMessage) toastMessage.textContent = message;
    toast?.classList.remove('success', 'error');
    toast?.classList.add(type, 'show');

    setTimeout(() => {
        toast?.classList.remove('show');
    }, 3000);
}
