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
    name: "POST_BUDDANOV",
    similes: ["GUR_INFO", "BUDDANOV_INFO", "УПРАВЛІННЯ_РОЗВІДКИ", "УР"],
    validate: async () => true,
    description:
        "Returns information when users mention Buddanov, Budda, or ask about Управління розвідки (Intelligence Directorate)",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting GUR info handler...");

        /*const analyzer = new TelegramHashAnalyzer({
            apiId: process.env.TELEGRAM_API_ID!,
            apiHash: process.env.TELEGRAM_API_HASH!,
            phoneNumber: process.env.TELEGRAM_PHONE_NUMBER!,
            chatId: Number(process.env.TELEGRAM_CHAT_ID!),
            threadId: Number(process.env.TELEGRAM_THREAD_ID!),
        });*/

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
            elizaLogger.error("Error in GUR info handler:", error);
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
                    text: "Tell me about Buddanov",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Who is Budda?",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Що таке управління розвідки?",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Розкажи про УР",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Buddanov", action: "POST_BUDDANOV" },
            },
        ],
    ] as ActionExample[][],
} as Action;