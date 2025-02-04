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

function getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000; // Convert to milliseconds
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
            // Launch browser and scrape data
            const browser = await puppeteer.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-dev-shm-usage']
            });

            const page = await browser.newPage();
            const url = 'https://www.cookie.fun/';

            await page.goto(url, { waitUntil: 'networkidle0' });
            console.log("Page loaded successfully.");

            await page.screenshot({
                path: 'debug-screenshot.png',
                fullPage: true
            });
            console.log("Screenshot saved as debug-screenshot.png");

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

            // Store scraped data in state for later use
            state.scrapedAddresses = extractedData;
            state.scarlettAnalyses = []; // Initialize analyses array

            // Initialize TelegramHashAnalyzer with env variables
            const analyzer = new TelegramHashAnalyzer({
                apiId: process.env.TELEGRAM_API_ID!,
                apiHash: process.env.TELEGRAM_API_HASH!,
                phoneNumber: process.env.TELEGRAM_PHONE_NUMBER!,
                chatId: Number(process.env.TELEGRAM_CHAT_ID!),
                threadId: Number(process.env.TELEGRAM_THREAD_ID!),
            });

            // Process each address sequentially
            for (const address of extractedData) {
                console.log(`🔄 Processing address: ${address}`);

                try {
                    // Analyze the current address
                    const result = await analyzer.analyzeHash(`analyze ${address}`);

                    if (result.status === 'success' && result.scarlettResponse) {
                        // Store the analysis
                        const analysis: ScarlettAnalysis = {
                            address: address,
                            response: result.scarlettResponse
                        };
                        state.scarlettAnalyses.push(analysis);

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
                            console.log("Runtime agent:", runtime.agent);

                            // Create tweet text
                            const tweetContent = `Analysis for ${address}:\n${result.scarlettResponse}`;

                            // Generate tweet text with length limit
                            const tweetText = await generateText({
                                runtime,
                                context: tweetContent,  // Pass string directly instead of object
                                modelClass: ModelClass.MEDIUM,
                            });

                            console.log("📝 Generated tweet text:", tweetText);

                            // Post to Twitter
                            console.log("🚀 Sending tweet...");
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

            // After all analyses are complete, generate summary
            if (state.scarlettAnalyses.length > 0) {
                const summary = `📊 Analysis Complete\n\nProcessed ${state.scarlettAnalyses.length} addresses:\n` +
                    state.scarlettAnalyses.map((analysis, index) =>
                        `\n${index + 1}. Address: ${analysis.address}\n${analysis.response}\n`
                    ).join('\n');

                callback?.({
                    text: summary,
                });

                return true;
            }

            return false;
        } catch (error) {
            elizaLogger.error("Error in Hash Analyze info handler:", error);
            callback?.({
                text: "❌ Sorry, I couldn't process your request at the moment.",
                error: error
            });
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