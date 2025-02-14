import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    ActionExample,
} from "@elizaos/core";

export default {
    name: "RETWEET",
    similes: ["RETWEET", "RT", "SHARE", "SHARE TWEET"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Add the allowed room ID check
        const allowedRoomId = process.env.ALLOWED_ROOM_ID; // Ensure this is set in your environment variables
        const currentRoomId = message.roomId; // Assuming `roomId` is a property of `message`

        // Check if the action is triggered from Telegram
        const sourcePlatform = message.content.source; // Assuming `source` is a property of `message.content`
        if (sourcePlatform !== "telegram") {
            elizaLogger.log(`Unauthorized platform access attempt from source: ${sourcePlatform}`);
            return false;
        }

        if (currentRoomId !== allowedRoomId) {
            elizaLogger.log(`Unauthorized room access attempt from room ID: ${currentRoomId}`);
            return false;
        }

        return true;
    },
    description: "Reposts a tweet from a link",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Reposting a tweet...");

        // Add debug logging
        /*
        console.log("Available runtime clients:", Object.keys(runtime.clients || {}));
        console.log("Twitter client details:", runtime.clients?.twitter);
        */
        try {
            const twitterManager = runtime.clients?.twitter;

            if (!twitterManager?.client?.twitterClient) {
                throw new Error("Twitter client not initialized");
            }

            const tweetUrl = message.content.text.trim();
            console.log("Raw tweet URL input:", tweetUrl);

            const tweetIdMatch = tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);

            if (!tweetIdMatch) {
                throw new Error(`Invalid tweet URL format: ${tweetUrl}`);
            }

            const tweetId = tweetIdMatch[1];
            console.log("Extracted tweet ID:", tweetId);

            // Use the base twitter client directly
            const result = await twitterManager.client.twitterClient.retweet(tweetId.toString());
            //console.log("Raw retweet API response:", result);
            elizaLogger.log("✅ Retweet successful:", result);
            return true;

        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("Twitter client not initialized")) {
                    elizaLogger.error("❌ Twitter client not found. Please check configuration.");
                } else if (error.message.includes("Invalid tweet URL")) {
                    elizaLogger.error("❌ " + error.message);
                } else if (error.message.includes('401') || error.message.includes('403')) {
                    elizaLogger.error("❌ Authentication failed for retweet. Please check Twitter credentials.");
                } else {
                    elizaLogger.error("❌ Failed to retweet:", {
                        error,
                        message: error.message,
                        stack: error.stack
                    });
                }
            } else {
                elizaLogger.error("❌ Unknown error during retweet:", error);
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Retweet" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll retweet that tweet now.",
                    action: "RETWEET",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "RT this" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Sure, retweeting that right away.",
                    action: "RETWEET",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Share this tweet" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "On it, reposting that tweet now.",
                    action: "RETWEET",
                }
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Retweet this" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Ok, I'll retweet that to X now.",
                    action: "RETWEET",
                },
            },
        ]
    ] as ActionExample[][],
} as Action;
