export const ORACLE_ABI = [
  "function updateDataFeedsValuesPartial(bytes32[]) public",
  "function getLastUpdateDetails(bytes32) public view returns (uint256, uint256, uint256)",
  "function getLivePricesAndTimestamp(bytes32[]) public view returns (uint256[], uint256)",
];

export const Constants = {
  DECIMALS: 8, // price feed precision
  MIN_DEVIATION: 0.5, // 0.5%
  MIN_TIME_ELAPSED_HOURS: 6, // 6 hours

  // Redstone services
  REDSTONE_PRIMARY_PROD: "redstone-primary-prod",
  REDSTONE_MAIN_DEMO: "redstone-main-demo",

  // Unique signers count
  NUM_UNIQUE_SIGNERS_REDSTONE_PRIMARY_PROD: 2,
  NUM_UNIQUE_SIGNERS_REDSTONE_MAIN_DEMO: 1,

  // Debug mode
  DEBUG_MODE: false,
} as const;
