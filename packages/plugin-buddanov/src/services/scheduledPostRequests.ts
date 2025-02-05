import cron from "node-cron";
import dotenv from "dotenv";


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
        cron.schedule("*/10 * * * *", async () => {
            elizaLogger.log(
                "Run postCoinTweet at",
                new Date().toUTCString()
            );
            await this.postCoinTweet();
            console.log("postCoinTweet done");
        });

        elizaLogger.log("TwitterPostJobService cron has been started");
    }

    async postCoinTweet(): Promise<void> {
        console.log("postCoinTweet");

        const agentId = process.env.AGENT_ID;
        if (!agentId) {
            elizaLogger.error("AGENT_ID not found in environment variables");
            return;
        }

        console.log("agentId", agentId);

        try {
            const url = "http://localhost:3000/" + agentId + "/message";
            const body = JSON.stringify({
                text: "44T3gS1KJeJfPv52kU73VHbvke8QRDn8fH3AJh5hpump"
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