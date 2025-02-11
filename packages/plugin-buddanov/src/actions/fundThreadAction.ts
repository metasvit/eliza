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
} from "@elizaos/core";
import { TelegramHashAnalyzer } from '../util/telegramCoinAnalyzer';
import { CookieScraper } from '../util/cookieScraper';

const scarlettPostTemplate = `
# Task: Read all data from scarlettResponses and create post for twitter based on the data.

Input data: {{scarlettResponses}}

{{agentName}} shouldn't use IGNORE.

# Requirements:
- Read all data from scarlettResponses.
- Post must include some predictions based on the data (hold, sell, buy, dump, rug, etc).
- Read news from our sources for creating more detailed post with proofs.
- You must write about coins that are mentioned in scarlettResponses.
- Return actual prices and key values for each coin.
- You can mention important news for crypto world.
- Dont use old sourses.
- Use https://www.coingecko.com/ for retreiving prices.



# Format: Generate a single tweet text string that includes general analysis of the market, predictions and explanation about our predictions.

🧵 Crypto Market Analysis & Predictions
The crypto market is showing interesting dynamics. Let's dive into key metrics, trends, and what they mean for investors. #Crypto #MarketAnalysis
🔍 Market Overview

- Total Crypto Market Cap: $2.9T
- 24h Volume: $98B
- BTC Dominance: 51.2%
- Global Crypto Adoption Index: ↑ 4.2%

📊 Key Performers
#Bitcoin (BTC)

- Price: $96,479.00
- 24h Change: -0.48%
- 7d Change: -3.00%
- Key Support: $94,000
- Resistance: $98,500

#Ethereum (ETH)

- Price: $2,647.50
- 24h Change: -0.23%
- 7d Change: -6.20%
- Key Support: $2,600
- Resistance: $2,750

🌟 Market Predictions
Short term (30 days):

 - BTC likely to test $95K resistance
 - Altcoin season potentially starting
 - DeFi tokens showing bullish patterns
 - Layer-2 solutions gaining momentum

📰 Key News & Developments

- Major banks expanding crypto custody services
- New spot ETFs showing strong inflows
- Regulatory clarity improving globally
- Institutional adoption accelerating

💡 Analysis & Insights
The market is showing strong fundamentals:

- Increasing institutional investment
- Growing real-world adoption
- Technical indicators remain bullish
- Reduced market volatility

🔮 Long-term Outlook
We remain bullish on the crypto sector:

- Mass adoption continues
- Infrastructure maturing
- Innovation accelerating
- Regulatory framework improving

Below you can read about most mentioned coins.

Stay informed and always DYOR! #CryptoTrading #MarketAnalysis

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
    name: "FUND_THREAD",
    similes: ["FUND THREAD", "THREAD FUND", "MAKE A FUND THREAD"],
    validate: async () => true,
    description: "Analyzes a set of addresses and posts the results to Twitter",
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
            const scraper = new CookieScraper('3fdc3a017c03115652be8fe118b46952f4c72448');
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


                console.log("🚀 Creating thread...");

                const tweetText = await generateText({
                    runtime,
                    context: scarlettPostTemplate,
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
                    //console.log(`Posting Scarlett response ${iteration}:`, response);

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
                    text: "FUND_THREAD",
                    action: "FUND_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to post a fund thread",
                    action: "FUND_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Make a fund thread on twitter",
                    action: "FUND_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "do a fund thread",
                    action: "FUND_THREAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "fund thread",
                     action: "FUND_THREAD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Let's update the fund info on twitter",
                     action: "FUND_THREAD" },
            },
        ],
    ] as ActionExample[][]
} as Action;