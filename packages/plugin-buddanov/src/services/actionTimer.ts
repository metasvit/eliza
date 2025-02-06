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
                "Run action at",
                new Date().toUTCString()
            );
            await this.startActionTimer();
            console.log("Running action done");
        });

        elizaLogger.log("cron has been started");
    }


    async startActionTimer(): Promise<void> {
        console.log("Action call start");

        const agentId = process.env.AGENT_ID;
        if (!agentId) {
            throw new Error("AGENT_ID environment variable is not set");
        }

        console.log("agentId", agentId);

        try {
            const url = "http://localhost:3000/" + agentId + "/message";
            const body = JSON.stringify({
                text: "ANALYZE COIN 44T3gS1KJeJfPv52kU73VHbvke8QRDn8fH3AJh5hpump"
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
            console.log("Action called", responseData);
        } catch (error) {
            elizaLogger.error("Error calling action", error);
        }
    }

    get(): any {
        return this;
    }
}