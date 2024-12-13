export const ORACLE_ABI = [
  "function updateDataFeedsValuesPartial(bytes32[]) public",
  "function getLastUpdateDetails(bytes32) public view returns (uint256, uint256, uint256)",
  "function getLivePricesAndTimestamp(bytes32[]) public view returns (uint256[], uint256)",
];

export const Constants = {
  DECIMALS: 8,
  MIN_DEVIATION: 0.5, // 0.5%
  MIN_TIME_ELAPSED_HOURS: 6, // 6 hours

  // Redstone services
  REDSTONE_PRIMARY_PROD: "redstone-primary-prod",
  REDSTONE_MAIN_DEMO: "redstone-main-demo",

  // Debug mode
  DEBUG_MODE: false,
} as const;
