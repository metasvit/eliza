import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    ModelClass,
    generateText,
    composeContext
} from "@elizaos/core";
import { TelegramHashAnalyzer } from '../util/telegramCoinAnalyzer';
import { CookieScraper } from '../util/cookieScraper';

const scarlettPostTemplate = `
# Task: Read all data from scarlettResponses and create post for twitter based on the data. Generate a single tweet text string that includes general analysis of the market and explanation about our predictions.

Input data: {{scarlettResponses}}

{{agentName}} shouldn't use IGNORE.

# Requirements:
- Read all data from scarlettResponses.
- Post must include some predictions based on the data (hold, sell, buy, dump, rug, etc) for each coin.
- You must write about coins that are mentioned in scarlettResponses.
- Return actual prices and key values for each coin, take data from scarlettResponses.
- Dont use markups.
- Predictions must be writed just after the coin info.


# Format:

Market Analysis 📊

The market shows a sharp divide between top and struggling performers.
High achievers maintain strong growth with stable rates, reflecting efficient strategies, while underperformers face high rates and negative growth, signaling failed aggressive tactics.
Moderate-rate agents see sustainable gains, while extreme risk-takers face corrections.
Stability is currently favored, with lower rates correlating to positive 24h performance, indicating a shift toward sustainable trading and risk management.


🎯 Short-term Outlook

- $FARTCOIN ($0.51): Despite decent liquidity ($18.9M on Raydium) and high trading volume ($55.7M), the lack of utility and high concentration among top holders (13.8% of supply) make this a risky momentum play.
Prediction: Hold or cautiously monitor.

- $AIXBT ($0.2388): With a market cap of $204.4M and a large holder base (303k+), the trading volume is promising. However, bearish technical signals and selling pressure from top traders hint at a potential downturn.
Prediction: Sell or wait for clearer entry signals.

- $TOSHI ($0.000763): While it boasts a broad holder base (541k) and strong trading volume ($10.9M), the absence of clear utility raises concerns. The community's inflated sentiment could suggest manipulation.
Prediction: Dump if holding; avoid new positions.

💎 Key Takeaways

- Market shows clear performance stratification
- Higher current rates correlate with higher volatility
- Conservative agents showing more stable but limited returns
- Risk management crucial for high-rate exposure

Not financial advice - always DYOR and manage risk appropriately!
#Crypto #CryptoTrading #MarketAnalysis
`;

// const scarlettResponseTemplate = `
// # Task: Rewrite the responce based on the input data.

// Input data: {{scarlettResponses}}

// {{agentName}} shouldn't use IGNORE.

// # Requirements:
// - Dont add any additional information.
// - Just rewrite the responce with your data from input.
// - Dont lose any important information..
// - Use input data to create a responce.
// - Use input data for correct analysis.
// - Use input data for actual info about the coin.

// # Format:

// Token: Broccoli
// Market Cap: $3.4M | Price: $0.003432

// Pros:
// ✔ Strong early volume ($15.5M in 24h)
// ✔ High holder count (11,159) for a new token
// ✔ Multiple DEX pairs with decent liquidity
// ✔ Raydium LP holds ~33M tokens (2nd largest wallet)
// ✔ Viral hype from CZ’s tweet

// Cons:
// ✖ Extremely young token (<4 hours old)
// ✖ Top 10 holders control ~10.8% (excluding LP)
// ✖ Volume concentrated among top traders
// ✖ Price already up 4,456% in 24h
// ✖ Classic pump & dump pattern forming

// This is pure memecoin hype—driven solely by CZ posting a pic of his dog. While the early metrics look strong, the rapid price spike and concentrated trading suggest this is a short-term play rather than a sustainable project. If you're jumping in, keep it small and take profits fast. The crypto streets are littered with dog tokens that didn’t survive their first walk.
// `;


function getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000; // Convert to milliseconds
}

interface ExtendedState extends State {
    scrapedAddresses: string[];
}

let isRunning = false;

export default {
    name: "COOKIE_THREAD",
    similes: ["COOKIE THREAD", "THREAD COOKIE", "MAKE A COOKIE THREAD"],
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
    description: "Analyzes a set of addresses from cookie.fun and posts the results to Twitter",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: ExtendedState,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        if (isRunning) {
            elizaLogger.log("Handler already running, skipping...");
            return false;
        }

        isRunning = true;
        elizaLogger.log("Starting hash analyze info handler...");

        try {
            const scraperKey = process.env.COOKIE_SCRAPER_KEY;
            if (!scraperKey) {
                console.error("❌ Cookie scraper key is not defined in the environment variables.");
                return false;
            }

            const scraper = new CookieScraper(scraperKey);
            console.log("🔍 Starting scraping process...");

            // Get top agents and their addresses
            const agents = await scraper.scrapeTopAgents();

            if (!agents) {
                console.log("❌ Failed to scrape agents");
                return false;
            }

            // Extract addresses from agents
            const extractedData = agents
                .filter(agent => agent.address !== null)
                .map(agent => agent.address as string);

            // Log results
            console.log("✅ Extraction completed");
            console.log("Found addresses:", extractedData);

            // Store scraped data in state for later use
            state.scrapedAddresses = extractedData;


            try {
                // Initialize analyzer and process addresses
                const analyzer = new TelegramHashAnalyzer({
                    apiId: process.env.TELEGRAM_API_ID!,
                    apiHash: process.env.TELEGRAM_API_HASH!,
                    phoneNumber: process.env.TELEGRAM_PHONE_NUMBER!,
                    chatId: Number(process.env.TELEGRAM_CHAT_ID!),
                    threadId: Number(process.env.TELEGRAM_THREAD_ID!),
                });

                // Structure to store Scarlett responses
                const scarlettResponses = [];
                const tClient = runtime.clients?.twitter.client;
                // Process each address
                for (const address of extractedData) {
                    try {
                        const result = await analyzer.analyzeHash(`analyze ${address}`);

                        if (result.status === 'success' && result.scarlettResponse) {
                            if (result.scarlettResponse.length > 600) {
                                // const contextResponce = composeContext({
                                //     state: {
                                //         ...state,
                                //         scarlettResponse: result.scarlettResponse
                                //     },
                                //     template: scarlettResponseTemplate,
                                // });

                                // const response = await generateText({
                                //     runtime,
                                //     context: contextResponce,
                                //     modelClass: ModelClass.SMALL,
                                // });

                                scarlettResponses.push(result.scarlettResponse);
                            }
                            console.log(`✅ Analysis complete for ${address}`);
                        } else {
                            console.log(`❌ Failed to analyze ${address}: ${result.error || 'No response'}`);
                            scarlettResponses.push(`Failed to analyze ${address}`);
                        }
                    } catch (error) {
                        console.error(`Error analyzing ${address}:`, error);
                        continue;
                    }
                }

                // Create a single tweet text
                console.log("🚀 Creating thread...");

                const threadContext = composeContext({
                    state: {
                        ...state,
                        scarlettResponses,
                    },
                    template: scarlettPostTemplate,
                });

                const tweetText = await generateText({
                    runtime,
                    context: threadContext,
                    modelClass: ModelClass.SMALL,
                });

                const twitterReply = await tClient.twitterClient.sendNoteTweet(tweetText);
                let tempID = twitterReply.data.notetweet_create.tweet_results.result.rest_id;
                let iteration = 0;
                while (iteration < scarlettResponses.length) {
                    const response = scarlettResponses[iteration];
                    if (!response) {
                        console.error(`❌ Scarlett response at index ${iteration} is null or undefined`);
                        continue;
                    }

                    try {
                        const immediateReply = await tClient.twitterClient.sendNoteTweet(response, tempID);
                        console.log("🚀 Immediate reply sent with ID:", immediateReply.data.notetweet_create.tweet_results.result.rest_id);

                        // Update tempID with the ID of the newly posted tweet
                        tempID = immediateReply.data.notetweet_create.tweet_results.result.rest_id;
                    } catch (error) {
                        console.error(`❌ Error posting response for ${response}:`, error);
                    }

                    if (iteration !== scarlettResponses.length - 1) {
                        const delay = getRandomDelay(3, 5);
                        console.log(`⏳ Waiting ${delay / 1000} seconds before next tweet...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    iteration++;
                }

            }

            catch (error) {
                console.error("❌ Twitter thread error:", error);
                return false;
            }
            return false;
        } catch (error) {
            elizaLogger.error("Error in handler:", error);
            return false;
        } finally {
            isRunning = false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "COOKIE_THREAD",
                    action: "COOKIE_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to post a cookie thread",
                    action: "COOKIE_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Make a cookie thread on twitter",
                    action: "COOKIE_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "do a cookie thread",
                    action: "COOKIE_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "cookie thread",
                     action: "COOKIE_THREAD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Let's update the cookie info on twitter",
                     action: "COOKIE_THREAD" },
            },
        ],
    ] as ActionExample[][]
} as Action;