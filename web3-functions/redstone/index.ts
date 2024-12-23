import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import {
  arrayify,
  formatBytes32String,
  parseBytes32String,
} from "ethers/lib/utils";
import { DataFeed } from "./types";
import { ORACLE_ABI, Constants } from "./constants";
import { PriceUtils, RedstoneUtils, LogUtils, TimeUtils } from "./utils";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  try {
    const { userArgs, multiChainProvider } = context;
    const provider = multiChainProvider.default();

    const dataServiceId = userArgs.dataServiceId as string;
    const dataFeedIdsString = userArgs.symbols as string[];
    const dataFeedIdsBytes32 = dataFeedIdsString.map(formatBytes32String);
    const oracleAddress = userArgs.oracleAddress as string;

    const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);

    // Initialize data feeds map
    const idToDataFeedMap = new Map<string, DataFeed>();
    for (const id of dataFeedIdsString) {
      idToDataFeedMap.set(id, {
        symbol: id,
        id: formatBytes32String(id),
        livePrice: BigNumber.from(0),
        storedPrice: BigNumber.from(0),
        storedTimestamp: 0,
      });
    }
    LogUtils.debug("Data feed ids: ", idToDataFeedMap);

    // Get wrapped oracle based on service ID
    const wrappedOracle = RedstoneUtils.getWrappedOracle(oracle, {
      dataServiceId,
      uniqueSignersCount:
        dataServiceId === Constants.REDSTONE_PRIMARY_PROD
          ? Constants.NUM_UNIQUE_SIGNERS_REDSTONE_PRIMARY_PROD
          : Constants.NUM_UNIQUE_SIGNERS_REDSTONE_MAIN_DEMO,
      dataPackagesIds: dataFeedIdsString,
    });

    // Retrieve live prices
    const { data: livePriceData } =
      await wrappedOracle.populateTransaction.getLivePricesAndTimestamp(
        dataFeedIdsBytes32,
      );
    const txCalldataBytes = arrayify(String(livePriceData));

    const parsingResult = RedstoneUtils.parsePayload(txCalldataBytes);

    parsingResult.signedDataPackages.forEach((signedDataPackage, index) => {
      RedstoneUtils.printSignedDataPackage(index, signedDataPackage);

      const dataFeed = idToDataFeedMap.get(
        signedDataPackage.dataPackage.dataPoints[0].dataFeedId,
      );

      if (dataFeed && dataFeed.livePrice.eq(0)) {
        dataFeed.livePrice = BigNumber.from(
          signedDataPackage.dataPackage.dataPoints[0].value,
        );
      }
    });

    // Validate data feeds
    for (const dataFeed of idToDataFeedMap.values()) {
      if (dataFeed.livePrice.eq(0)) {
        LogUtils.error("Data feed not found: ", dataFeed);
        return {
          canExec: false,
          message: `Data feed not found: ${dataFeed.symbol}`,
        };
      }
    }

    // Get stored prices and timestamps
    for (const dataFeed of idToDataFeedMap.values()) {
      [dataFeed.storedTimestamp, , dataFeed.storedPrice] = await wrappedOracle
        .getLastUpdateDetails(dataFeed.id)
        .catch(() => {
          LogUtils.debug(
            `No stored price found for ${dataFeed.symbol}, using defaults`,
          );
          return [BigNumber.from(0), BigNumber.from(0), BigNumber.from(0)];
        });
    }

    LogUtils.debug("Stored prices and timestamps:");
    PriceUtils.printPrices(idToDataFeedMap);

    const currentTimestamp = Date.now();
    LogUtils.printSection(
      "Current timestamp: " +
        currentTimestamp +
        "\nPrice deviations and time elapsed since last update:",
    );

    // Check price deviations and collect updates
    const priceFeedIdsToUpdate: string[] = [];
    for (const dataFeed of idToDataFeedMap.values()) {
      const deviationPrct = PriceUtils.getPriceDeviationPercent(
        dataFeed.livePrice,
        dataFeed.storedPrice,
      );

      LogUtils.log(
        `Price deviation for ${dataFeed.symbol}: ${deviationPrct.toFixed(2)}%`,
      );

      const timeElapsed = TimeUtils.getTimeElapsedHours(
        currentTimestamp,
        dataFeed.storedTimestamp,
      );

      PriceUtils.printTimestamps(dataFeed, timeElapsed);

      if (
        deviationPrct >= Constants.MIN_DEVIATION ||
        timeElapsed >= Constants.MIN_TIME_ELAPSED_HOURS
      ) {
        priceFeedIdsToUpdate.push(dataFeed.id);
      }
    }

    LogUtils.log(
      "Price feeds to update:",
      priceFeedIdsToUpdate.map((id) => {
        return parseBytes32String(id);
      }),
    );

    if (priceFeedIdsToUpdate.length === 0) {
      return {
        canExec: false,
        message: `No update: price deviation less than ${Constants.MIN_DEVIATION.toFixed(2)}% or time elapsed since last update is less than ${Constants.MIN_TIME_ELAPSED_HOURS} hours`,
      };
    }

    // Update prices
    LogUtils.log("Updating price feeds...");
    const { data: updateDataFeedsPartialData } =
      await wrappedOracle.populateTransaction.updateDataFeedsValuesPartial(
        priceFeedIdsToUpdate,
      );
    LogUtils.log(`Transaction data received: ${updateDataFeedsPartialData}`);

    return {
      canExec: true,
      callData: [
        { to: oracleAddress, data: updateDataFeedsPartialData as string },
      ],
    };
  } catch (error) {
    LogUtils.error("Error in Web3Function execution:", error);
    return {
      canExec: false,
      message: `Execution error: ${error.message}`,
    };
  }
});
