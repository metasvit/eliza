import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    ModelClass,
    generateText,
} from "@elizaos/core";
import { TelegramHashAnalyzer } from '../util/telegramCoinAnalyzer';
import puppeteer from 'puppeteer';

const scarlettPostTemplate = `
# Task: Read all data from scarlettResponses and create post for twitter based on the data.

Input data: {{scarlettResponses}}

{{agentName}} shouldn't use IGNORE.

# Requirements:
- Read all data from scarlettResponses.
- Post must include some predictions based on the data (hold, sell, buy, dump, rug, etc).


# Format: Generate a single tweet text string that includes predictions and explanation about our predictions.

📊 2025 Crypto Market Trends

1️⃣ Low-cap gems ($100M-$500M MC) like $AIXBT show strong growth potential but come with high volatility. 📈
2️⃣ Liquidity fragmentation across DEXs remains a challenge, limiting smooth trading. 🌊
3️⃣ Active wallets & volume spikes indicate real engagement—watch for consistent holder growth! 🚀
4️⃣ Post-ATH downtrends are common; smart entries matter more than hype. 🔍

🔮 Prediction: Utility-driven alts will shine, but liquidity & stability will separate winners from hype. #Crypto #Altcoins
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

export default {
    name: "ANALYZE_COIN",
    similes: ["ANALYZE", "HASH", "COIN", "ANALYZE COIN", "ANALYZE TOKEN", "ANALYZE HASH"],
    validate: async () => true,
    description:
        "Returns information when users mention token, hash, posting analyze, check token",
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
                    while ((match = regex.exec(elementContent)) !== null && addresses.length < 2) {
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
                for (const response of scarlettResponses) {
                    const ownPosts = await tClient.fetchOwnPosts(1);
                    console.log(ownPosts.map(post => ({
                        ...post,
                        text: post.text?.slice(0, 30)
                    })));
                    if (ownPosts.length > 0) {
                        console.log(`Before update: tempID = ${tempID}`);
                        console.log(ownPosts[0].id);


                        console.log(tempID);
                        tempID = ownPosts[0].id;
                        console.log(`After update: tempID = ${tempID}`);
                    } else {
                        console.error("❌ No recent tweets found");
                        return false;
                    }

                    const delay = getRandomDelay(10, 30);
                    console.log(`⏳ Waiting ${delay/1000} seconds before next tweet...`);
                    await new Promise(resolve => setTimeout(resolve, delay));

                    const immediateReply = await tClient.twitterClient.sendTweet("text for replies " + tempID, tempID);

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
        [
            {
                user: "{{user1}}",
                content: { text: "ANALYZE_COIN 0x0000000000000000000000000000000000000000",
                     action: "ANALYZE_COIN" },
            },
        ],
    ] as ActionExample[][],
} as Action;