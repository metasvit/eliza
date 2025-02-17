import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    HandlerCallback,
    elizaLogger,
    ModelClass,
    generateText,
    ActionExample,
} from "@elizaos/core";
import { validatePlatformAndUser } from '../util/validatePlatformAndUser';

const INVISIBLE_MARKER = '\u200B\u200D\u200B';

const REQUIRED_METRIC_PATTERNS = [
    /Market Cap: \$[\d,.]+[BMK]?/i,
    /Price: \$[\d,.]+/i,
    /(?:Pros|Cons):/i,
    /[\d,.]+[BMK]? (?:holders|wallets)/i,
    /volume.*\$[\d,.]+[BMK]?/i
];

const MINIMUM_PATTERNS_REQUIRED = 1; // Require at least 1 of these patterns to consider it a valid analysis

const postTemplate = `
# Task: Create an engaging tweet about the coin analysis

Input data: {{previousResponse}}

{{agentName}} MUST NOT use IGNORE.

# Requirements:
- Focus only on the coin analysis
- Do not explain the output, just return the tweet text
- Keep it informative but engaging
- Use the format below
- Include the coin symbol in $SYMBOL format

# Format:

📈 Just spent some time analyzing the charts and spotted something interesting...

🔍 Deep dive into $COIN

📊 Market Analysis:
• [current price trend]
• [trading volume insights]

💡 Key Takeaways:
• [technical analysis point]
• [fundamental analysis point]

🎯 Recommendation:
[trading/investment advice]

`;

export default {
    name: "MAKE_POST",
    similes: ["MAKE POST", "POST", "TWEET POST", "POST TWEET", "SEND TO TWITTER", "SEND TO X", "X POST", "MAKE AN X POST"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return await validatePlatformAndUser(message);
    },
    description: "Sends previous agent reponse to twitter",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Sending a tweet...");

        // Get the most recent agent message from history
        const recentMessages = state?.recentMessagesData || [];


        elizaLogger.log("Recent messages:", recentMessages.map(m => ({
            text: m.content.text,
            sender: m.agentId === runtime.agentId ? 'agent' : 'user'
        })));


        // Find the most recent coin analysis message
        const lastCoinAnalysis = recentMessages
            .filter(msg => msg.agentId === runtime.agentId)
            .find(msg => msg.content.text.startsWith(INVISIBLE_MARKER));

        const previousResponse = lastCoinAnalysis?.content?.text.replace(INVISIBLE_MARKER, '');

        if (!previousResponse) {
            if (callback) {
                await callback({
                    text: "I don't have any recent coin analysis to tweet. Please ask me about a specific coin first!",
                });
            }
            return false;
        }

        // Replace the warning check with metrics check
        if (previousResponse) {
            // Check how many metric patterns are present in the response
            const validMetricsCount = REQUIRED_METRIC_PATTERNS.filter(pattern =>
                pattern.test(previousResponse)
            ).length;

            if (validMetricsCount < MINIMUM_PATTERNS_REQUIRED) {
                if (callback) {
                    await callback({
                        text: "I can't create a tweet because the previous response doesn't contain any valid metrics.",
                    });
                }
                return false;
            }

            const tClient = runtime.clients?.twitter.client;
            const twitterPostClient = runtime.clients?.twitter.post;

            if (!tClient || !twitterPostClient) {
                console.log("❌ Twitter client not found");
                return false;
            }


            const postContext = composeContext({
                state: {
                    ...state,
                    previousResponse,
                },
                template: postTemplate,
            });

            const tweetText = await generateText({
                runtime,
                context: postContext,
                modelClass: ModelClass.MEDIUM,
            });

            elizaLogger.log("Tweet text:", tweetText);

            // Check tweet length (standard tweet limit is 280 characters)
            if (tweetText.length <= 280) {
                // Normal tweet
                const result = await tClient.twitterClient.sendTweet(tweetText);
                elizaLogger.log("Tweet result:", result);
                return true;
            }

            // Try sending as a note tweet first
            try {
                const result = await tClient.twitterClient.sendNoteTweet(tweetText);
                //const immediateReply = await tClient.twitterClient.sendTweet("Starting a new thread on this...", result.data.notetweet_create.tweet_results.result.rest_id);
                //elizaLogger.log("Immediate reply result:", immediateReply);
                elizaLogger.log("Long tweet result:", result.data.notetweet_create.tweet_results.result.rest_id);
                return true;
            } catch (error) {
                // If long tweet fails, truncate and fall back to normal tweet
                elizaLogger.log("Long tweet failed, falling back to truncated tweet");
                const truncatedText = tweetText.substring(0, 277) + "...";
                const result = await tClient.twitterClient.sendTweet(truncatedText);
                elizaLogger.log("Truncated tweet result:", result);
                return true;
            }
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "You should tweet that" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post that as a tweet now.",
                    action: "MAKE_POST",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Post this reply as a tweet" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Sure, posting that right away.",
                    action: "MAKE_POST",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Make a tweet about this" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "On it, posting that tweet now.",
                    action: "MAKE_POST",
                }
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Send this to X" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Ok, I'll post that to X now.",
                    action: "MAKE_POST",
                },
            },
        ]
    ] as ActionExample[][],
} as Action;
