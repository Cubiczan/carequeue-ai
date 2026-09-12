// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CritMinOracle
 * @notice AI-Powered Critical Minerals Supply Chain Risk Oracle
 * @dev On-chain oracle storing risk scores for critical minerals (Lithium, Nickel, Cobalt)
 *      deployed on HashKey Chain testnet.
 *
 * Risk scores are composites of:
 *   - Price forecast deviation (forecast vs actual %)
 *   - Supply sentiment (NLP analysis of SEC filings, -1.0 to 1.0)
 *   - Regulatory risk (keyword-based scoring from regulatory documents)
 *
 * DeFi protocols can consume these scores for underwriting, lending, and insurance.
 */

// ============================================================================
// Simple Ownable Pattern (no OpenZeppelin dependency)
// ============================================================================
abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error Unauthorized();
    error ZeroAddress();

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != _owner) revert Unauthorized();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
}

// ============================================================================
// Main Oracle Contract
// ============================================================================
contract CritMinOracle is Ownable {

    // -------------------------------------------------------------------------
    // Data Structures
    // -------------------------------------------------------------------------

    /**
     * @struct RiskScore
     * @notice Composite risk assessment for a critical mineral at a point in time.
     * @dev compositeScore ranges from -100 (extremely bearish/risky) to +100 (extremely bullish/safe).
     *      priceDeviation is the forecast vs actual price deviation in basis points (scaled by 100).
     *      supplySentiment is NLP sentiment from SEC filings (-10000 to 10000, representing -1.0 to 1.0 * 1e4).
     *      regulatoryRisk is a keyword-based regulatory risk score (0 to 10000, representing 0.0 to 100.0 * 100).
     *      forecastDirection is the 12-month price forecast direction (positive = price up).
     *      confidence is the confidence interval width in basis points.
     */
    struct RiskScore {
        uint256 timestamp;          // Unix timestamp of the assessment
        int256 compositeScore;      // -100 to +100 (scaled by 100, so -10000 to 10000)
        int256 priceDeviation;      // Forecast vs actual price % (scaled by 100)
        int256 supplySentiment;     // NLP sentiment from SEC filings (-10000 to 10000)
        int256 regulatoryRisk;      // Regulatory keyword risk score (0 to 10000)
        int256 forecastDirection;   // 12-month forecast direction (scaled by 100)
        uint256 confidence;         // Confidence interval width in basis points
    }

    /**
     * @struct MineralData
     * @notice Current data snapshot for a critical mineral.
     */
    struct MineralData {
        string symbol;              // "LITHIUM", "NICKEL", "COBALT"
        int256 currentPrice;        // Current price USD/mt (scaled by 1e8)
        int256 forecastPrice;       // 12-month forecast price (scaled by 1e8)
        uint256 lastUpdated;        // Timestamp of last update
        uint256 updateCount;        // Total number of updates pushed
        RiskScore latestScore;      // Most recent risk assessment
    }

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Supported critical mineral symbols
    bytes32 public constant LITHIUM = keccak256("LITHIUM");
    bytes32 public constant NICKEL  = keccak256("NICKEL");
    bytes32 public constant COBALT  = keccak256("COBALT");

    /// @notice Price scaling factor (1e8 = 8 decimals of precision)
    int256 public constant PRICE_SCALE = 1e8;

    /// @notice Score scaling factor (composite score multiplied by 100)
    int256 public constant SCORE_SCALE = 100;

    /// @notice Sentiment scaling factor (-1.0 to 1.0 represented as -10000 to 10000)
    int256 public constant SENTIMENT_SCALE = 10000;

    /// @notice Regulatory risk scaling factor (0 to 100.0 represented as 0 to 10000)
    int256 public constant REG_RISK_SCALE = 100;

    /// @notice Maximum historical entries per mineral (gas-efficient bounded array)
    uint256 public constant MAX_HISTORY = 100;

    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------

    /// @notice Mapping from mineral hash to mineral data
    mapping(bytes32 => MineralData) public minerals;

    /// @notice Historical risk scores per mineral (ring buffer)
    mapping(bytes32 => RiskScore[]) public riskHistory;

    /// @notice List of all registered mineral hashes
    bytes32[] public mineralList;

    /// @notice Whether the oracle has been initialized
    bool public initialized;

    /// @notice Oracle metadata
    string public oracleName;
    string public oracleVersion;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new mineral is registered
    event MineralRegistered(bytes32 indexed mineralHash, string symbol);

    /// @notice Emitted when risk scores are updated
    event RiskScoreUpdated(
        bytes32 indexed mineralHash,
        uint256 timestamp,
        int256 compositeScore,
        int256 priceDeviation,
        int256 supplySentiment,
        int256 regulatoryRisk,
        int256 forecastDirection,
        uint256 confidence
    );

    /// @notice Emitted when price data is updated
    event PriceUpdated(
        bytes32 indexed mineralHash,
        int256 currentPrice,
        int256 forecastPrice,
        uint256 timestamp
    );

    /// @notice Emitted when the oracle is initialized
    event OracleInitialized(string name, string version);

    /// @notice Emitted when ownership is transferred
    event OracleOwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyInitialized() {
        require(initialized, "CritMinOracle: not initialized");
        _;
    }

    modifier mineralExists(bytes32 mineralHash) {
        require(minerals[mineralHash].lastUpdated > 0, "CritMinOracle: mineral not registered");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(string memory _name, string memory _version) {
        oracleName = _name;
        oracleVersion = _version;
    }

    // -------------------------------------------------------------------------
    // Initialize
    // -------------------------------------------------------------------------

    /**
     * @notice Initializes the oracle with the three default critical minerals.
     * @dev Can only be called once by the owner. Registers LITHIUM, NICKEL, COBALT.
     */
    function initialize() external onlyOwner {
        require(!initialized, "CritMinOracle: already initialized");

        _registerMineral(LITHIUM, "LITHIUM");
        _registerMineral(NICKEL, "NICKEL");
        _registerMineral(COBALT, "COBALT");

        initialized = true;
        emit OracleInitialized(oracleName, oracleVersion);
    }

    // -------------------------------------------------------------------------
    // Write Functions (Oracle Only)
    // -------------------------------------------------------------------------

    /**
     * @notice Pushes a complete risk score update for a mineral.
     * @dev Only callable by the oracle owner (authorized updater).
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @param compositeScore Composite risk score (-100 to 100, scaled by SCORE_SCALE).
     * @param priceDeviation Price forecast deviation in basis points (scaled by 100).
     * @param supplySentiment NLP sentiment from SEC filings (-10000 to 10000).
     * @param regulatoryRisk Regulatory keyword risk score (0 to 10000).
     * @param forecastDirection 12-month forecast direction (scaled by 100).
     * @param confidence Confidence interval width in basis points.
     */
    function pushRiskScore(
        bytes32 mineralHash,
        int256 compositeScore,
        int256 priceDeviation,
        int256 supplySentiment,
        int256 regulatoryRisk,
        int256 forecastDirection,
        uint256 confidence
    ) external onlyOwner onlyInitialized mineralExists(mineralHash) {
        // Validate ranges
        require(
            compositeScore >= -100 * SCORE_SCALE && compositeScore <= 100 * SCORE_SCALE,
            "CritMinOracle: compositeScore out of range"
        );
        require(
            supplySentiment >= -SENTIMENT_SCALE && supplySentiment <= SENTIMENT_SCALE,
            "CritMinOracle: supplySentiment out of range"
        );
        require(
            regulatoryRisk >= 0 && regulatoryRisk <= 10000,
            "CritMinOracle: regulatoryRisk out of range"
        );

        RiskScore memory score = RiskScore({
            timestamp: block.timestamp,
            compositeScore: compositeScore,
            priceDeviation: priceDeviation,
            supplySentiment: supplySentiment,
            regulatoryRisk: regulatoryRisk,
            forecastDirection: forecastDirection,
            confidence: confidence
        });

        // Store in history (ring buffer)
        if (riskHistory[mineralHash].length >= MAX_HISTORY) {
            // Shift array: remove oldest entry
            for (uint256 i = 1; i < riskHistory[mineralHash].length; i++) {
                riskHistory[mineralHash][i - 1] = riskHistory[mineralHash][i];
            }
            riskHistory[mineralHash][riskHistory[mineralHash].length - 1] = score;
        } else {
            riskHistory[mineralHash].push(score);
        }

        // Update latest score
        minerals[mineralHash].latestScore = score;
        minerals[mineralHash].lastUpdated = block.timestamp;
        minerals[mineralHash].updateCount++;

        emit RiskScoreUpdated(
            mineralHash,
            block.timestamp,
            compositeScore,
            priceDeviation,
            supplySentiment,
            regulatoryRisk,
            forecastDirection,
            confidence
        );
    }

    /**
     * @notice Updates price data for a mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @param currentPrice Current price in USD/mt (scaled by PRICE_SCALE = 1e8).
     * @param forecastPrice 12-month forecast price (scaled by PRICE_SCALE = 1e8).
     */
    function updatePrice(
        bytes32 mineralHash,
        int256 currentPrice,
        int256 forecastPrice
    ) external onlyOwner onlyInitialized mineralExists(mineralHash) {
        require(currentPrice > 0, "CritMinOracle: currentPrice must be positive");
        require(forecastPrice > 0, "CritMinOracle: forecastPrice must be positive");

        minerals[mineralHash].currentPrice = currentPrice;
        minerals[mineralHash].forecastPrice = forecastPrice;
        minerals[mineralHash].lastUpdated = block.timestamp;

        emit PriceUpdated(mineralHash, currentPrice, forecastPrice, block.timestamp);
    }

    /**
     * @notice Pushes a complete data update (price + risk score) in a single transaction.
     * @dev Gas-efficient batch update for the off-chain pipeline.
     */
    function pushFullUpdate(
        bytes32 mineralHash,
        int256 currentPrice,
        int256 forecastPrice,
        int256 compositeScore,
        int256 priceDeviation,
        int256 supplySentiment,
        int256 regulatoryRisk,
        int256 forecastDirection,
        uint256 confidence
    ) external onlyOwner onlyInitialized mineralExists(mineralHash) {
        require(currentPrice > 0, "CritMinOracle: currentPrice must be positive");
        require(forecastPrice > 0, "CritMinOracle: forecastPrice must be positive");
        require(
            compositeScore >= -100 * SCORE_SCALE && compositeScore <= 100 * SCORE_SCALE,
            "CritMinOracle: compositeScore out of range"
        );
        require(
            supplySentiment >= -SENTIMENT_SCALE && supplySentiment <= SENTIMENT_SCALE,
            "CritMinOracle: supplySentiment out of range"
        );
        require(
            regulatoryRisk >= 0 && regulatoryRisk <= 10000,
            "CritMinOracle: regulatoryRisk out of range"
        );

        // Update price
        minerals[mineralHash].currentPrice = currentPrice;
        minerals[mineralHash].forecastPrice = forecastPrice;

        // Build risk score
        RiskScore memory score = RiskScore({
            timestamp: block.timestamp,
            compositeScore: compositeScore,
            priceDeviation: priceDeviation,
            supplySentiment: supplySentiment,
            regulatoryRisk: regulatoryRisk,
            forecastDirection: forecastDirection,
            confidence: confidence
        });

        // Store in history
        if (riskHistory[mineralHash].length >= MAX_HISTORY) {
            for (uint256 i = 1; i < riskHistory[mineralHash].length; i++) {
                riskHistory[mineralHash][i - 1] = riskHistory[mineralHash][i];
            }
            riskHistory[mineralHash][riskHistory[mineralHash].length - 1] = score;
        } else {
            riskHistory[mineralHash].push(score);
        }

        // Update mineral data
        minerals[mineralHash].latestScore = score;
        minerals[mineralHash].lastUpdated = block.timestamp;
        minerals[mineralHash].updateCount++;

        emit PriceUpdated(mineralHash, currentPrice, forecastPrice, block.timestamp);
        emit RiskScoreUpdated(
            mineralHash,
            block.timestamp,
            compositeScore,
            priceDeviation,
            supplySentiment,
            regulatoryRisk,
            forecastDirection,
            confidence
        );
    }

    // -------------------------------------------------------------------------
    // Read Functions (Public)
    // -------------------------------------------------------------------------

    /**
     * @notice Returns the latest risk score for a mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return The latest RiskScore struct.
     */
    function getLatestScore(bytes32 mineralHash) external view mineralExists(mineralHash) returns (RiskScore memory) {
        return minerals[mineralHash].latestScore;
    }

    /**
     * @notice Returns the latest mineral data (prices + score).
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return The full MineralData struct.
     */
    function getMineralData(bytes32 mineralHash) external view mineralExists(mineralHash) returns (MineralData memory) {
        return minerals[mineralHash];
    }

    /**
     * @notice Returns the composite risk index for a mineral.
     * @dev This is the primary score DeFi protocols should consume for:
     *      - Underwriting decisions (lower score = higher risk premium)
     *      - Collateral valuation (adjust LTV based on risk)
     *      - Insurance pricing (higher risk = higher premium)
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Composite risk score (-10000 to 10000, representing -100 to 100).
     */
    function getCompositeRiskIndex(bytes32 mineralHash) external view mineralExists(mineralHash) returns (int256) {
        return minerals[mineralHash].latestScore.compositeScore;
    }

    /**
     * @notice Returns the number of historical risk scores for a mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Number of historical entries.
     */
    function getHistoryCount(bytes32 mineralHash) external view returns (uint256) {
        return riskHistory[mineralHash].length;
    }

    /**
     * @notice Returns a historical risk score by index.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @param index The index in the history array.
     * @return The RiskScore at the given index.
     */
    function getHistoricalScore(bytes32 mineralHash, uint256 index) external view returns (RiskScore memory) {
        require(index < riskHistory[mineralHash].length, "CritMinOracle: index out of bounds");
        return riskHistory[mineralHash][index];
    }

    /**
     * @notice Returns the latest price for a mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Current price in USD/mt (scaled by 1e8).
     */
    function getCurrentPrice(bytes32 mineralHash) external view mineralExists(mineralHash) returns (int256) {
        return minerals[mineralHash].currentPrice;
    }

    /**
     * @notice Returns the forecast price for a mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Forecast price in USD/mt (scaled by 1e8).
     */
    function getForecastPrice(bytes32 mineralHash) external view mineralExists(mineralHash) returns (int256) {
        return minerals[mineralHash].forecastPrice;
    }

    /**
     * @notice Returns the total number of updates for a mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Total update count.
     */
    function getUpdateCount(bytes32 mineralHash) external view mineralExists(mineralHash) returns (uint256) {
        return minerals[mineralHash].updateCount;
    }

    /**
     * @notice Returns the supply sentiment score for a mineral.
     * @dev NLP-derived sentiment from SEC filing analysis.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Sentiment score (-10000 to 10000, representing -1.0 to 1.0).
     */
    function getSupplySentiment(bytes32 mineralHash) external view mineralExists(mineralHash) returns (int256) {
        return minerals[mineralHash].latestScore.supplySentiment;
    }

    /**
     * @notice Returns the regulatory risk score for a mineral.
     * @dev Keyword-based regulatory risk assessment.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Regulatory risk score (0 to 10000, representing 0.0 to 100.0).
     */
    function getRegulatoryRisk(bytes32 mineralHash) external view mineralExists(mineralHash) returns (int256) {
        return minerals[mineralHash].latestScore.regulatoryRisk;
    }

    /**
     * @notice Returns the forecast direction for a mineral.
     * @dev Positive = prices expected to rise, negative = expected to fall.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Forecast direction (scaled by 100).
     */
    function getForecastDirection(bytes32 mineralHash) external view mineralExists(mineralHash) returns (int256) {
        return minerals[mineralHash].latestScore.forecastDirection;
    }

    /**
     * @notice Returns the confidence level of the latest assessment.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Confidence in basis points.
     */
    function getConfidence(bytes32 mineralHash) external view mineralExists(mineralHash) returns (uint256) {
        return minerals[mineralHash].latestScore.confidence;
    }

    /**
     * @notice Returns the number of registered minerals.
     * @return Count of registered minerals.
     */
    function getMineralCount() external view returns (uint256) {
        return mineralList.length;
    }

    /**
     * @notice Returns a list of all registered mineral hashes.
     * @return Array of mineral hash identifiers.
     */
    function getMineralList() external view returns (bytes32[] memory) {
        return mineralList;
    }

    /**
     * @notice Returns the time since the last update for a mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @return Seconds since last update.
     */
    function getTimeSinceUpdate(bytes32 mineralHash) external view mineralExists(mineralHash) returns (uint256) {
        return block.timestamp - minerals[mineralHash].lastUpdated;
    }

    /**
     * @notice Checks if data is fresh (updated within the last maxAge seconds).
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @param maxAge Maximum acceptable age in seconds.
     * @return Whether the data is considered fresh.
     */
    function isFresh(bytes32 mineralHash, uint256 maxAge) external view mineralExists(mineralHash) returns (bool) {
        return (block.timestamp - minerals[mineralHash].lastUpdated) <= maxAge;
    }

    /**
     * @notice Computes a weighted risk score for DeFi underwriting.
     * @dev Uses configurable weights for different risk components.
     *      DeFi protocols can use this as a single input for their risk models.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @param priceWeight Weight for price deviation (basis points, e.g., 3000 = 30%).
     * @param sentimentWeight Weight for supply sentiment (basis points).
     * @param regWeight Weight for regulatory risk (basis points).
     * @return Weighted composite risk score.
     */
    function getWeightedRiskScore(
        bytes32 mineralHash,
        uint256 priceWeight,
        uint256 sentimentWeight,
        uint256 regWeight
    ) external view mineralExists(mineralHash) returns (int256) {
        RiskScore memory score = minerals[mineralHash].latestScore;

        // Normalize each component to a common scale and apply weights
        // priceDeviation is already in basis points (scaled by 100)
        // supplySentiment is -10000 to 10000
        // regulatoryRisk is 0 to 10000
        int256 weightedPrice = (score.priceDeviation * int256(priceWeight)) / 10000;
        int256 weightedSentiment = (score.supplySentiment * int256(sentimentWeight)) / 10000;
        int256 weightedReg = (score.regulatoryRisk * int256(regWeight)) / 10000;

        return weightedPrice + weightedSentiment + weightedReg;
    }

    // -------------------------------------------------------------------------
    // Internal Functions
    // -------------------------------------------------------------------------

    /**
     * @dev Registers a new mineral.
     * @param mineralHash The keccak256 hash of the mineral symbol.
     * @param symbol The human-readable mineral symbol.
     */
    function _registerMineral(bytes32 mineralHash, string memory symbol) internal {
        minerals[mineralHash].symbol = symbol;
        minerals[mineralHash].currentPrice = 0;
        minerals[mineralHash].forecastPrice = 0;
        minerals[mineralHash].lastUpdated = block.timestamp;
        minerals[mineralHash].updateCount = 0;

        mineralList.push(mineralHash);

        emit MineralRegistered(mineralHash, symbol);
    }

    /**
     * @dev Converts a mineral symbol string to its keccak256 hash.
     * @param symbol The mineral symbol string.
     * @return The keccak256 hash of the symbol.
     */
    function symbolToHash(string memory symbol) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(symbol));
    }
}
