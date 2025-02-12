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

export default {
    name: "DIRECT_TWITTER_POST",
    similes: ["DIRECT TWEET", "DIRECT TWITTER POST", "DIRECT X POST",  "POST DIRECTLY TO TWITTER", "POST DIRECTLY TO X"],
    validate: async () => true,
    description: "Sends custom text directly to twitter, send only the text between the quotes",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Sending a direct tweet...");

        const tClient = runtime.clients?.twitter.client;
        const twitterPostClient = runtime.clients?.twitter.post;

        if (!tClient || !twitterPostClient) {
            console.log("❌ Twitter client not found");
            return false;
        }

        // Extract text between quotes
        const match = message.content.text.match(/"([^"]*)"/)
        const tweetText = match ? match[1] : message.content.text;

        elizaLogger.log("Direct tweet text:", tweetText);

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
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: '"This is important news" direct tweet' },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post that as a direct tweet.",
                    action: "DIRECT_TWITTER_POST",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: '"Check this out!" direct twitter post' },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll share that as a direct post.",
                    action: "DIRECT_TWITTER_POST",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: '"Exciting update!" direct x post' },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post that directly to X.",
                    action: "DIRECT_TWITTER_POST",
                }
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: '"Great news everyone!" post directly to twitter' },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post that directly to Twitter.",
                    action: "DIRECT_TWITTER_POST",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: '"Important announcement:" post directly to x' },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post that directly to X.",
                    action: "DIRECT_TWITTER_POST",
                },
            },
        ]
    ] as ActionExample[][],
} as Action;
