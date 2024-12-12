import { BigNumber, Contract } from "ethers";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import * as redstone from "@redstone-finance/protocol";
import { DataFeed, DataServiceConfig } from "./types";
import { Constants } from "./constants";

export class PriceUtils {
    static computePriceDeviation(newPrice: BigNumber, oldPrice: BigNumber, decimals: number): BigNumber {
        try {
            if (oldPrice.eq(0)) {
                return BigNumber.from(10).pow(decimals);
            }

            const difference = newPrice.gt(oldPrice)
                ? newPrice.sub(oldPrice)
                : oldPrice.sub(newPrice);

            return difference
                .mul(BigNumber.from(10).pow(decimals))
                .div(oldPrice);
        } catch (error) {
            throw new Error(`Failed to compute price deviation: ${error.message}`);
        }
    }

    static getPriceDeviationPercent(newPrice: BigNumber, oldPrice: BigNumber): number {
        try {
            const deviation = this.computePriceDeviation(newPrice, oldPrice, Constants.DECIMALS);
            return (deviation.toNumber() / 10 ** Constants.DECIMALS) * 100;
        } catch (error) {
            throw new Error(`Failed to calculate price deviation: ${error.message}`);
        }
    }

    static printPrices(idToDataFeedMap: Map<string, DataFeed>): void {
        for (const dataFeed of idToDataFeedMap.values()) {
            LogUtils.log(
                `Live ${dataFeed.symbol} price: ${dataFeed.livePrice.toString()}`,
                `Stored ${dataFeed.symbol} price: ${dataFeed.storedPrice.toString()}`
            );
        }
    }

    static printTimestamps(dataFeed: DataFeed, timeElapsed: number): void {
        LogUtils.log(
            `Stored timestamp: ${dataFeed.storedTimestamp}`,
            `Time elapsed: ${timeElapsed.toFixed(2)} hours`
        );
    }
}

export class RedstoneUtils {
    static getWrappedOracle(oracle: Contract, config: DataServiceConfig) {
        return WrapperBuilder.wrap(oracle).usingDataService(config);
    }

    static parsePayload(txCalldataBytes: Uint8Array): redstone.RedstonePayloadParsingResult {
        try {
            return redstone.RedstonePayload.parse(txCalldataBytes);
        } catch (error) {
            throw new Error(`Failed to parse Redstone payload: ${error.message}`);
        }
    }

    static printSignedDataPackage(dataPackageIndex: number, signedDataPackage: redstone.SignedDataPackage): void {
        LogUtils.debug(
            `Data package: ${dataPackageIndex}`,
            `Timestamp: ${signedDataPackage.dataPackage.timestampMilliseconds}`,
            `Date and time: ${new Date(signedDataPackage.dataPackage.timestampMilliseconds).toUTCString()}`,
            `Signer address: ${signedDataPackage.recoverSignerAddress()}`,
            `Data points count: ${signedDataPackage.dataPackage.dataPoints.length}`,
            `Data points symbols: ${signedDataPackage.dataPackage.dataPoints.map(dp => dp.dataFeedId)}`,
            `Data points values: ${signedDataPackage.dataPackage.dataPoints.map(dp =>
                BigNumber.from(dp.value).toString()
            )}`
        );
    }
}

export class LogUtils {
    static log(...messages: any[]): void {
        console.log(...messages);
    }

    static debug(...messages: any[]): void {
        if (Constants.DEBUG_MODE) {
            console.log(...messages);
        }
    }

    static error(...messages: any[]): void {
        console.error(...messages);
    }

    static printSection(title: string): void {
        this.log("-".repeat(72));
        this.log(title);
        this.log("-".repeat(72));
    }
}

export class TimeUtils {
    static getTimeElapsedHours(currentTimestamp: number, previousTimestamp: number): number {
        try {
            return (currentTimestamp - previousTimestamp) / (1000 * 60 * 60);
        } catch (error) {
            throw new Error(`Failed to calculate time elapsed: ${error.message}`);
        }
    }
}