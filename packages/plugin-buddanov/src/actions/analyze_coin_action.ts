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
    generateText,
} from "@elizaos/core";
import { TelegramHashAnalyzer } from '../util/TelegramHashAnalyzer';

const scarlettPostTemplate = `
# Task: Shorten the received response from scarlett to 280 characters while keeping the important values

Input data: {{scarlettResponse}}

If the scarlettResponse is empty, return empty string
{{agentName}} shouldn't use IGNORE.

# Requirements:
- Keep it under 280 characters
- Do not explain the output, just return the shortened output
- Do not add any other text, just the output

# Format: Generate a single tweet text string that includes pros and cons of the analyzed coin

Example output format:

🔹 Name: *coin name*
🔹 MC: $4.6K | Price: $0.000005
🔹 Liquidity: $8.4K | Holders: 281
🚩 Red Flags:
Low volume: $358 (24h)
Top holder (Raydium LP): 92.4M tokens
Only 3 traders in 24h

📉 Verdict: Illiquid, no growth, high risk—avoid. 🚫
`;

interface GURResponse {
    formatted_message: string;    // The formatted message from the API
    scarlett_response: string;    // The response from Buddanov
    status: string;              // Status of the request (e.g., "Message sent successfully")
}

export default {
    name: "ANALYZE_COIN",
    similes: ["ANALYZE", "HASH", "COIN", "ANALYZE COIN", "ANALYZE TOKEN", "ANALYZE HASH"],
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

                state.scarlettResponse = result.scarlettResponse;

                const scarlettPostContext = composeContext({
                    state,
                    template: scarlettPostTemplate,
                });


                if(message.content.source === "direct") {
                    const tClient = runtime.clients?.twitter.client;
                    const twitterPostClient = runtime.clients?.twitter.post;

                    if (!state) {
                        state = (await runtime.composeState(message)) as State;
                    } else {
                        state = await runtime.updateRecentMessageState(state);
                    }

                    const tweetText = await generateText({
                        runtime,
                        context: scarlettPostContext,
                        modelClass: ModelClass.MEDIUM,
                    });

                    console.log("🔍 Tweet text:", tweetText);

                    if(!tClient || !twitterPostClient){
                        callback?.({
                            text: "Twitter client not found",
                        });
                        return false;
                    }

                    try {
                        // Use the Twitter client directly
                        await tClient.twitterClient.sendTweet(
                            tweetText.length > 280 ? tweetText.slice(0, 277) + "..." : tweetText
                        );

                        callback?.({
                            text: tweetText,
                        });
                    } catch (error) {
                        console.error("Twitter API Error:", error);
                        callback?.({
                            text: `Failed to post tweet: ${error.message}`,
                        });
                    }
                } else {
                    callback?.({
                        text: "Sorry, can't post this to twitter",
                    });
                }

                return true;
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
                    text: "Tell me about this coin 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                    action: "ANALYZE_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "what about this coin 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump?",
                    action: "ANALYZE_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "analyze 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                    action: "ANALYZE_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                    action: "ANALYZE_COIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "token analyze 9RjwNo6hBPkxayWHCqQD1VjaH8igSizEseNZNbddpump",
                     action: "ANALYZE_COIN" },
            },
        ],
    ] as ActionExample[][],
} as Action;