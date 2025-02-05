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
import { TelegramHashAnalyzer } from '../util/agencyTg';
import puppeteer from 'puppeteer';

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

interface ScrapedData {
    addresses: string[];
}

interface ScarlettAnalysis {
    address: string;
    response: string;
}

interface ThreadState {
    threadStartId?: string;
}

function getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000; // Convert to milliseconds
}

interface ExtendedState extends State {
    scrapedAddresses: string[];
    scarlettAnalyses: ScarlettAnalysis[];
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
        state: ExtendedState,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        const typedState = state as ExtendedState;
        elizaLogger.log("Starting hash analyze info handler...");

        try {
            // Launch browser and scrape data
            const browser = await puppeteer.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-dev-shm-usage']
            });

            const page = await browser.newPage();
            const url = 'https://www.cookie.fun/';

            await page.goto(url, { waitUntil: 'networkidle0' });
            console.log("Page loaded successfully.");

            const extractedData = await page.evaluate(() => {
                console.log("Starting page evaluation");

                // Get all page content for debugging
                const bodyContent = document.body.innerHTML;
                console.log("Page content length:", bodyContent.length);

                const elements = document.getElementsByClassName('__variable_e081fc __className_0dc517 font-sans text-text-primary antialiased bg-primary');
                console.log("Found elements:", elements.length);

                const elementContent = Array.from(elements).map(element => {
                    console.log("Element content:", element.textContent?.substring(0, 100));
                    return element.textContent?.trim() || '';
                })[0];

                const addresses: string[] = [];
                if (elementContent) {
                    console.log("Processing content length:", elementContent.length);
                    // Match the exact format including escaped quotes
                    const regex = /contractAddress\\\":\\\"([A-Za-z0-9]{32,44})\\/g;
                    let match;
                    /////// CHANGE addresses.length to get more or less addresses
                    while ((match = regex.exec(elementContent)) !== null && addresses.length < 3) {
                        console.log("Found address:", match[1]);
                        addresses.push(match[1]);
                    }
                } else {
                    console.log("No element content found");
                }

                return addresses;
            });

            // Log results
            console.log("🔍 Extraction completed");
            console.log("Found addresses:", extractedData);

            await browser.close();

            // Store scraped data
            typedState.scrapedAddresses = extractedData;
            typedState.scarlettAnalyses = [];

            // Create initial thread tweet
            const tClient = runtime.clients?.twitter.client;
            const twitterPostClient = runtime.clients?.twitter.post;

            if (!tClient || !twitterPostClient) {
                console.log("❌ Twitter client not found");
                return false;
            }

            try {
                console.log("🚀 Creating thread starter tweet...");
                const timestamp = new Date().toLocaleTimeString();
                const starterTweetResponse = await tClient.twitterClient.sendTweet(
                    `🔍 ${timestamp} - Starting fresh crypto analysis! Let's examine some interesting tokens... #CryptoAnalysis`
                );

                // Initialize analyzer and process addresses
                const analyzer = new TelegramHashAnalyzer({
                    apiId: process.env.TELEGRAM_API_ID!,
                    apiHash: process.env.TELEGRAM_API_HASH!,
                    phoneNumber: process.env.TELEGRAM_PHONE_NUMBER!,
                    chatId: Number(process.env.TELEGRAM_CHAT_ID!),
                    threadId: Number(process.env.TELEGRAM_THREAD_ID!),
                });

                // Process each address
                for (const address of extractedData) {
                    try {
                        const result = await analyzer.analyzeHash(`analyze ${address}`);

                        if (result.status === 'success' && result.scarlettResponse) {
                            const analysis: ScarlettAnalysis = {
                                address: address,
                                response: result.scarlettResponse
                            };
                            typedState.scarlettAnalyses.push(analysis);

                        console.log(`✅ Analysis complete for ${address}`);
                        console.log(`Response: ${result.scarlettResponse.substring(0, 100)}...`);

                        // Post to Twitter immediately
                        console.log("🐦 Attempting to post to Twitter...");
                        console.log("Message source:", message.content.source);

                        const tClient = runtime.clients?.twitter.client;
                        const twitterPostClient = runtime.clients?.twitter.post;

                        console.log("Twitter clients status:", {
                            hasClient: !!tClient,
                            hasPostClient: !!twitterPostClient
                        });

                        if (!tClient || !twitterPostClient) {
                            console.log("❌ Twitter client not found");
                            continue;
                        }

                        try {
                            console.log("🔄 Preparing tweet content...");
                            console.log("Runtime agent:", runtime.agentId);

                            // Create tweet text
                            const tweetContent = `Analysis for ${address}:\n${result.scarlettResponse}`;
                            const tweetText = await generateText({
                                runtime,
                                context: tweetContent,
                                modelClass: ModelClass.MEDIUM,
                            });

                            // Post as reply to thread
                            await tClient.twitterClient.sendTweet(
                                tweetText.length > 280 ? tweetText.slice(0, 277) + "..." : tweetText
                            );

                            console.log("✅ Tweet posted successfully!");

                            callback?.({
                                text: `Analysis for ${address} posted to Twitter:\n${tweetText}`,
                            });
                        } catch (error) {
                            console.error("❌ Twitter API Error:", error);
                            console.error("Error details:", {
                                name: error.name,
                                message: error.message,
                                stack: error.stack
                            });
                            callback?.({
                                text: `Failed to post tweet for ${address}: ${error.message}`,
                            });
                        }

                        // Wait random time between requests
                        const delay = getRandomDelay(10, 30);
                        console.log(`⏳ Waiting ${delay/1000} seconds before next request...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        console.log(`❌ Failed to analyze ${address}: ${result.error || 'No response'}`);
                    }
                } catch (error) {
                    console.error(`Error analyzing ${address}:`, error);
                    continue;
                }
            }

                return true;
            } catch (error) {
                console.error("❌ Twitter thread error:", error);
                return false;
            }

            return false;
        } catch (error) {
            elizaLogger.error("Error in handler:", error);
            return false;
        }
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