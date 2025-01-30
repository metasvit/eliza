import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    generateObject,
    ModelClass,
    Content,
} from "@elizaos/core";
import { TelegramHashAnalyzer } from '../util/TelegramHashAnalyzer';

interface GURResponse {
    formatted_message: string;    // The formatted message from the API
    scarlett_response: string;    // The response from Buddanov
    status: string;              // Status of the request (e.g., "Message sent successfully")
}

export default {
    name: "POST_ANALYZE",
    similes: ["analyze", "hash", "token", "post analyze"],
    validate: async () => true,
    description:
        "Returns information when users mention token, hash, posting analyze, check token )",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting hash analyze info handler...");


        try {
            // Initialize TelegramHashAnalyzer with env variables
            const analyzer = new TelegramHashAnalyzer({
                apiId: process.env.TELEGRAM_API_ID!,
                apiHash: process.env.TELEGRAM_API_HASH!,
                phoneNumber: process.env.TELEGRAM_PHONE_NUMBER!,
                chatId: Number(process.env.TELEGRAM_CHAT_ID!),
                threadId: Number(process.env.TELEGRAM_THREAD_ID!),
            });

            // Analyze the message
            const result = await analyzer.analyzeHash(message.content.text);

            if (result.status === 'success' && result.scarlettResponse) {
                callback?.({
                    text: result.scarlettResponse,
                });
            } else if (result.status === 'error') {
                callback?.({
                    text: `❌ Error: ${result.error}`,
                });
            } else {
                callback?.({
                    text: "❌ No response received from the analysis service.",
                });
            }

        } catch (error) {
            elizaLogger.error("Error in Hash Analyze info handler:", error);
            callback?.({
                text: "❌ Sorry, I couldn't process your request at the moment.",
                error: error
            });
        }
        return false;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me about this token 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                    action: "POST_ANALYZE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "what about this token 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump?",
                    action: "POST_ANALYZE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "analyze 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                    action: "POST_ANALYZE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                    action: "POST_ANALYZE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "token analyze 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                     action: "POST_BUDDANOV" },
            },
        ],
    ] as ActionExample[][],
} as Action;