// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/SlapsSPV.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: ERC20, ERC20Burnable, AccessControl, ReentrancyGuard, Pausable

/**
 * @title SlapsSPV
 * @author Millionaire Resilience LLC
 * @notice Special Purpose Vehicle (SPV) for Slaps Streaming Platform
 * @dev Tokenized investment vehicle for music IP royalty rights
 * 
 * This SPV structure allows:
 * - Fractional ownership of Slaps platform revenue
 * - IP royalty distribution to token holders
 * - Regulatory-compliant investment structure
 * - Story Protocol IP registration for SPV assets
 */
contract SlapsSPV is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard, Pausable {
    
    // Access control roles
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant INVESTOR_ROLE = keccak256("INVESTOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // Story Protocol Integration
    address public constant STORY_PROTOCOL_IPID = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE;
    
    // SPV Configuration
    string public spvName;
    string public spvPurpose;
    uint256 public targetRaise;
    uint256 public minimumInvestment;
    uint256 public maximumInvestment;
    uint256 public spvStartDate;
    uint256 public spvEndDate;
    
    // Financial tracking
    uint256 public totalInvested;
    uint256 public totalDistributed;
    uint256 public pendingDistribution;
    uint256 public managementFeeRate = 200; // 2% annual
    uint256 public performanceFeeRate = 2000; // 20% of profits
    
    // Investment state
    bool public fundingComplete;
    bool public distributionsEnabled;
    
    // Vesting and lockup
    uint256 public lockupPeriod = 365 days; // 1 year lockup
    mapping(address => uint256) public investmentTimestamp;
    mapping(address => uint256) public investmentAmount;
    mapping(address => uint256) public claimedDistributions;
    
    // Investor registry
    address[] public investors;
    mapping(address => bool) public isInvestor;
    mapping(address => bool) public isAccredited;
    
    // IP Assets linked to SPV
    struct IPAsset {
        uint256 id;
        string name;
        string storyProtocolIPID;
        uint256 valuationUSD;
        uint256 royaltyShare; // basis points
        bool isActive;
    }
    
    mapping(uint256 => IPAsset) public ipAssets;
    uint256 public ipAssetCount;
    
    // Distribution record
    struct Distribution {
        uint256 id;
        uint256 amount;
        uint256 timestamp;
        uint256 totalShares;
        string source; // "ROYALTIES", "SALE", "DIVIDEND"
    }
    
    Distribution[] public distributions;

    // Events
    event InvestmentReceived(address indexed investor, uint256 amount, uint256 shares);
    event DistributionMade(uint256 indexed distributionId, uint256 amount, string source);
    event DistributionClaimed(address indexed investor, uint256 amount);
    event IPAssetLinked(uint256 indexed assetId, string name, string storyProtocolIPID);
    event FundingCompleted(uint256 totalRaised);
    event InvestorAccredited(address indexed investor);
    event LockupPeriodUpdated(uint256 newPeriod);

    constructor() ERC20("Slaps SPV Token", "SLAP-SPV") {
        spvName = "Slaps Streaming LLC SPV";
        spvPurpose = "IP-backed stablecoin lending with PIL licensing revenue allocation";
        targetRaise = 1_000_000 * 1e6;
        minimumInvestment = 10_000 * 1e6;
        maximumInvestment = 100_000 * 1e6;
        spvStartDate = block.timestamp;
        spvEndDate = block.timestamp + (365 * 1 days);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
    }

    // ============ INVESTMENT FUNCTIONS ============

    /**
     * @notice Invest in the SPV
     * @dev Investor must be accredited and meet minimum investment
     */
    function invest() external payable whenNotPaused nonReentrant {
        require(!fundingComplete, "Funding period closed");
        require(block.timestamp <= spvEndDate, "SPV expired");
        require(msg.value >= minimumInvestment, "Below minimum investment");
        require(
            investmentAmount[msg.sender] + msg.value <= maximumInvestment,
            "Exceeds maximum investment"
        );
        require(isAccredited[msg.sender], "Must be accredited investor");

        // Register investor
        if (!isInvestor[msg.sender]) {
            investors.push(msg.sender);
            isInvestor[msg.sender] = true;
            _grantRole(INVESTOR_ROLE, msg.sender);
        }

        investmentAmount[msg.sender] += msg.value;
        investmentTimestamp[msg.sender] = block.timestamp;
        totalInvested += msg.value;

        // Mint SPV tokens proportional to investment
        // 1 token = 0.001 ETH (1000 tokens per ETH)
        uint256 tokensToMint = (msg.value * 1000) / 1 ether;
        _mint(msg.sender, tokensToMint * 10**decimals());

        emit InvestmentReceived(msg.sender, msg.value, tokensToMint);

        // Check if funding target reached
        if (totalInvested >= targetRaise) {
            fundingComplete = true;
            distributionsEnabled = true;
            emit FundingCompleted(totalInvested);
        }
    }

    /**
     * @notice Accredit an investor (admin/manager only)
     */
    function accreditInvestor(address investor) external onlyRole(MANAGER_ROLE) {
        isAccredited[investor] = true;
        emit InvestorAccredited(investor);
    }

    /**
     * @notice Batch accredit multiple investors
     */
    function batchAccreditInvestors(address[] calldata investorList) external onlyRole(MANAGER_ROLE) {
        for (uint256 i = 0; i < investorList.length; i++) {
            isAccredited[investorList[i]] = true;
            emit InvestorAccredited(investorList[i]);
        }
    }

    // ============ DISTRIBUTION FUNCTIONS ============

    /**
     * @notice Deposit distribution funds
     */
    function depositDistribution(string calldata source) external payable onlyRole(MANAGER_ROLE) {
        require(msg.value > 0, "Must deposit value");
        require(distributionsEnabled, "Distributions not enabled");

        uint256 distributionId = distributions.length;
        
        distributions.push(Distribution({
            id: distributionId,
            amount: msg.value,
            timestamp: block.timestamp,
            totalShares: totalSupply(),
            source: source
        }));

        pendingDistribution += msg.value;

        emit DistributionMade(distributionId, msg.value, source);
    }

    /**
     * @notice Claim pending distributions
     */
    function claimDistribution() external onlyRole(INVESTOR_ROLE) nonReentrant {
        require(distributionsEnabled, "Distributions not enabled");
        
        uint256 claimable = calculateClaimableDistribution(msg.sender);
        require(claimable > 0, "No distributions to claim");

        claimedDistributions[msg.sender] += claimable;
        totalDistributed += claimable;
        pendingDistribution -= claimable;

        payable(msg.sender).transfer(claimable);

        emit DistributionClaimed(msg.sender, claimable);
    }

    /**
     * @notice Calculate claimable distribution for an investor
     */
    function calculateClaimableDistribution(address investor) public view returns (uint256) {
        if (totalSupply() == 0 || distributions.length == 0) return 0;

        uint256 investorBalance = balanceOf(investor);
        uint256 totalClaimable = 0;

        for (uint256 i = 0; i < distributions.length; i++) {
            Distribution memory dist = distributions[i];
            uint256 investorShare = (dist.amount * investorBalance) / dist.totalShares;
            totalClaimable += investorShare;
        }

        return totalClaimable - claimedDistributions[investor];
    }

    // ============ IP ASSET MANAGEMENT ============

    /**
     * @notice Link an IP asset to the SPV
     */
    function linkIPAsset(
        string calldata name,
        string calldata storyProtocolIPID,
        uint256 valuationUSD,
        uint256 royaltyShare
    ) external onlyRole(MANAGER_ROLE) returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(royaltyShare <= 10000, "Royalty share cannot exceed 100%");

        ipAssetCount++;
        
        ipAssets[ipAssetCount] = IPAsset({
            id: ipAssetCount,
            name: name,
            storyProtocolIPID: storyProtocolIPID,
            valuationUSD: valuationUSD,
            royaltyShare: royaltyShare,
            isActive: true
        });

        emit IPAssetLinked(ipAssetCount, name, storyProtocolIPID);
        return ipAssetCount;
    }

    /**
     * @notice Deactivate an IP asset
     */
    function deactivateIPAsset(uint256 assetId) external onlyRole(MANAGER_ROLE) {
        require(ipAssets[assetId].id != 0, "Asset does not exist");
        ipAssets[assetId].isActive = false;
    }

    /**
     * @notice Update IP asset valuation
     */
    function updateIPAssetValuation(uint256 assetId, uint256 newValuation) external onlyRole(AUDITOR_ROLE) {
        require(ipAssets[assetId].id != 0, "Asset does not exist");
        ipAssets[assetId].valuationUSD = newValuation;
    }

    // ============ LOCKUP AND TRANSFER RESTRICTIONS ============

    /**
     * @notice Check if investor can transfer tokens
     */
    function canTransfer(address from) public view returns (bool) {
        if (hasRole(MANAGER_ROLE, from)) return true;
        if (investmentTimestamp[from] == 0) return true;
        return block.timestamp >= investmentTimestamp[from] + lockupPeriod;
    }

    /**
     * @notice Override transfer to enforce lockup
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        if (from != address(0) && to != address(0)) {
            require(canTransfer(from), "Tokens locked during lockup period");
            require(isAccredited[to] || hasRole(MANAGER_ROLE, to), "Recipient must be accredited");
        }
        super._update(from, to, value);

    // ============ ADMIN FUNCTIONS ============

    function setLockupPeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lockupPeriod = newPeriod;
        emit LockupPeriodUpdated(newPeriod);
    }

    function setManagementFeeRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRate <= 500, "Fee cannot exceed 5%");
        managementFeeRate = newRate;
    }

    function setPerformanceFeeRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRate <= 3000, "Fee cannot exceed 30%");
        performanceFeeRate = newRate;
    }

    function extendFundingPeriod(uint256 additionalDays) external onlyRole(MANAGER_ROLE) {
        require(!fundingComplete, "Funding already completed");
        spvEndDate += additionalDays * 1 days;
    }

    function completeFundingEarly() external onlyRole(MANAGER_ROLE) {
        require(!fundingComplete, "Already completed");
        require(totalInvested > 0, "No investments received");
        fundingComplete = true;
        distributionsEnabled = true;
        emit FundingCompleted(totalInvested);
    }

    function pause() external onlyRole(MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(MANAGER_ROLE) {
        _unpause();
    }

    function withdrawManagementFees() external onlyRole(MANAGER_ROLE) nonReentrant {
        uint256 balance = address(this).balance - pendingDistribution;
        uint256 fee = (totalInvested * managementFeeRate) / 10000;
        
        if (fee > balance) fee = balance;
        require(fee > 0, "No fees available");
        
        payable(msg.sender).transfer(fee);
    }

    // ============ VIEW FUNCTIONS ============

    function getInvestorCount() external view returns (uint256) {
        return investors.length;
    }

    function getInvestorInfo(address investor) external view returns (
        uint256 investment,
        uint256 tokenBalance,
        uint256 timestamp,
        uint256 claimed,
        bool accredited,
        bool locked
    ) {
        return (
            investmentAmount[investor],
            balanceOf(investor),
            investmentTimestamp[investor],
            claimedDistributions[investor],
            isAccredited[investor],
            !canTransfer(investor)
        );
    }

    function getSPVStats() external view returns (
        uint256 _totalInvested,
        uint256 _totalDistributed,
        uint256 _pendingDistribution,
        uint256 _investorCount,
        uint256 _ipAssetCount,
        bool _fundingComplete
    ) {
        return (
            totalInvested,
            totalDistributed,
            pendingDistribution,
            investors.length,
            ipAssetCount,
            fundingComplete
        );
    }

    function getIPAsset(uint256 assetId) external view returns (IPAsset memory) {
        return ipAssets[assetId];
    }

    function getDistribution(uint256 distributionId) external view returns (Distribution memory) {
        return distributions[distributionId];
    }

    function getDistributionCount() external view returns (uint256) {
        return distributions.length;
    }

    function getTotalIPAssetValuation() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 1; i <= ipAssetCount; i++) {
            if (ipAssets[i].isActive) {
                total += ipAssets[i].valuationUSD;
            }
        }
        return total;
    }

    // ============ RECEIVE ETHER ============

    receive() external payable {
        // Accept direct deposits for distributions
        if (distributionsEnabled) {
            distributions.push(Distribution({
                id: distributions.length,
                amount: msg.value,
                timestamp: block.timestamp,
                totalShares: totalSupply(),
                source: "DIRECT_DEPOSIT"
            }));
            pendingDistribution += msg.value;
            emit DistributionMade(distributions.length - 1, msg.value, "DIRECT_DEPOSIT");
        }
    }
}
