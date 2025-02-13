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
- Dont use old sourses.


# Format:

Market Analysis 📊

The market shows a sharp divide between top and struggling performers.
High achievers maintain strong growth with stable rates, reflecting efficient strategies, while underperformers face high rates and negative growth, signaling failed aggressive tactics.
Moderate-rate agents see sustainable gains, while extreme risk-takers face corrections.
Stability is currently favored, with lower rates correlating to positive 24h performance, indicating a shift toward sustainable trading and risk management.


💹 Market Dynamics

- High current rates (5-9%) showing aggressive trading strategies
- Lower current rates (0.04-1.5%) indicating conservative approaches
- Clear correlation between higher current rates and higher volatility


🎯 Short-term Outlook

- VIRTUAL showing strongest momentum for potential entry
- FARTCOIN and AIXBT require careful monitoring due to high rates despite negative performance
- Middle-tier agents offer balanced risk-reward

🎮 Risk Management

- Consider position sizing based on current rate exposure
- Monitor high-rate agents for potential reversals
- Maintain balanced exposure across performance tiers

💎 Key Takeaways

- Market shows clear performance stratification
- Higher current rates correlate with higher volatility
- Conservative agents showing more stable but limited returns
- Risk management crucial for high-rate exposure

Not financial advice - always DYOR and manage risk appropriately!
#Crypto #CryptoTrading #MarketAnalysis
`;


interface ScarlettAnalysis {
    address: string;
    response: string;
}


function getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000; // Convert to milliseconds
}

interface ExtendedState extends State {
    scrapedAddresses: string[];
    scarlettAnalyses: ScarlettAnalysis[];
}

let isRunning = false;

export default {
    name: "COOKIE_THREAD",
    similes: ["COOKIE THREAD", "THREAD COOKIE", "MAKE A COOKIE THREAD"],
    validate: async () => true,
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
            state.scarlettAnalyses = []; // Initialize analyses array

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

                            scarlettResponses.push(result.scarlettResponse);

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