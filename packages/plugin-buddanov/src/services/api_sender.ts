import cron from "node-cron";

import {
    elizaLogger,
    IAgentRuntime,
    Service,
    ServiceType,
    Provider,
} from "@elizaos/core";

export interface ITwitterPostJobService extends Service {
    runCron(): Promise<void>;
}

export class TwitterPostJobService
    extends Service
    implements ITwitterPostJobService, Provider
{
    private runtime: IAgentRuntime;

    constructor() {
        super();

        this.runCron();
    }

    static get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    async initialize(_runtime: IAgentRuntime): Promise<void> {
        this.runtime = _runtime;
    }

    async runCron(): Promise<void> {
        cron.schedule("*/1 * * * *", async () => {
            elizaLogger.log(
                "Run updatePortfolioTweet at",
                new Date().toUTCString()
            );
            await this.updatePortfolioTweet();
            console.log("updatePortfolioTweet done");
        });

        elizaLogger.log("TwitterPostJobService cron has been started");
    }

    async updatePortfolioTweet(): Promise<void> {

        console.log("updatePortfolioTweet");

        try {
            const url = "http://127.0.0.1:3000/aa15681a-4c5f-08d1-9c93-3b65a2d6e8e4/message";
            const body = JSON.stringify({
                text: "Hello"
            });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: body,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log("Update Portfolio response", responseData);
        } catch (error) {
            elizaLogger.error("Error updating portfolio twitter", error);
        }
    }

    get(): any {
        return this;
    }
}