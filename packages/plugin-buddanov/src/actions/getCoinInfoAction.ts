import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
} from "@elizaos/core";
import { TelegramHashAnalyzer } from "../util/telegramCoinAnalyzer";

export default {
    name: "GET_COIN_INFO",
    similes: ["get info", "info", "get coin info", "coin info"],
    validate: async () => true,
    description: "Returns info about a coin, address or token",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Coin info action called");

        try{
            //Initialize telegramCoinAnalyzer.ts with env variables
            const analyzer = new TelegramHashAnalyzer({
                apiId: process.env.TELEGRAM_API_ID!,
                apiHash: process.env.TELEGRAM_API_HASH!,
                phoneNumber: process.env.TELEGRAM_PHONE_NUMBER!,
                chatId: Number(process.env.TELEGRAM_CHAT_ID!),
                threadId: Number(process.env.TELEGRAM_THREAD_ID!),
            });

            const result = await analyzer.analyzeHash(message.content.text);

            if(result.status === "success" && result.scarlettResponse){
                callback?.({
                    text: result.scarlettResponse,
                });
            } else if (result.status === "error"){
                callback?.({
                    text: "❌Error analyzing hash: ${result.error}"
                });
            } else {
                callback?.({
                    text: "❌No response from analysis service"
                });
            }
        } catch (error) {
            elizaLogger.error("Error in telegramCoinAnalyzer", error);
            callback?.({
                text: "❌An error occurred while processing the request."
            });
        }

    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me about this coin 5UmDWgyLV1JBg8Jr8NwyezXdQkiU3vHGJu2efm7Cpump",
                    action: "COIN_INFO",
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get info about this address CpEpquNgiGyeMeTBrJJCgMXL8vn1jCkWKVbSurhJpump",
                    action: "COIN_INFO",
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "info 14zP2ToQ79XWvc7FQpm4bRnp9d6Mp1rFfsUW3gpLcRX",
                    action: "COIN_INFO",
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "coin info 0x4F9Fd6Be4a90f2620860d680c0d4d5Fb53d1A825",
                    action: "COIN_INFO",
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "COIN_INFO 4q3Z58YxrZEAVMLtMwnm7eHtodSD3LSpSNt3pDnqpump",
                    action: "COIN_INFO",
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
