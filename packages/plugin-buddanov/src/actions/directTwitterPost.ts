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
    similes: ["DIRECT TWITTER POST", "DIRECT TWEET", "DIRECT X POST", "POST DIRECTLY TO X", "POST DIRECTLY TO TWITTER"],
    validate: async () => true,
    description: "Sends custom text directly to twitter",
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
                    action: "SEND_TWEET",
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
                    action: "SEND_TWEET",
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
                    action: "SEND_TWEET",
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
                    action: "SEND_TWEET",
                },
            },
        ]
    ] as ActionExample[][],
} as Action;
