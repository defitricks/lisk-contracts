import { BigNumber } from "ethers";

export interface DataFeed {
    symbol: string;
    id: string;
    livePrice: BigNumber;
    storedPrice: BigNumber;
    storedTimestamp: number;
}

export interface DataServiceConfig {
    dataServiceId: string;
    uniqueSignersCount: number;
    dataPackagesIds: string[];
}