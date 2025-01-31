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

const fundPortfolioTemplate = `
# Task: Create a Twitter post about fund portfolio performance

Input data: {{fundPortfolio}}

If the fundPortfolio is empty, return empty string

# Requirements:
- Keep it under 280 characters
- Include total portfolio value
- Mention top 5 holdings
- Add ETH exposure %
- Make it engaging and professional
- Use emojis wisely

# Format: Generate a single tweet text string that includes key portfolio metrics and insights

Example output format:

📊 Fund Portfolio Update
💰 Total: $88.4M
📈 Top holdings:
• WETH: $45.1M (51%)
• ETH: $18.9M (21%)
• VIRTUAL: $9.3M (10%)
⚡️72% ETH exposure
`;

export default {
    name: "POST_FUND_PORTFOLIO",
    similes: ["POST_FUND_DAILY_UPDATE"],
    validate: async () => {
        return true;
    },
    description:
        "MUST use this action if the user requests update info about the fund in Twitter, the request might be varied, but it will always be a fund update.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting POST_FUND_PORTFOLIO handler...");

        if (message.content.source !== "direct") {
            callback?.({
                text: "i can't do that for you.",
                content: { error: "Post fund portfolio not allowed" },
            });
            return false;
        }

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            const fundPortfolioResponse = await fetch(
                "https://api.b11a.xyz/api/v1/public/gmxbt/funds/1/portfolio"
            );
            const fundPortfolioData = await fundPortfolioResponse.json();

            if (!fundPortfolioData.address) {
                throw new Error("Fund portfolio data not found");
            }

            state.fundPortfolio = JSON.stringify(fundPortfolioData, null, 2);

            const fundPortfolioContext = composeContext({
                state,
                template: fundPortfolioTemplate,
            });

            // Generate text using AI model
            const tweetText = await generateText({
                runtime,
                context: fundPortfolioContext,
                modelClass: ModelClass.MEDIUM,
            });

            // Send response to agent
            callback?.({
                text: tweetText,
            });

            const bClient = runtime.clients?.twitter.client;
            const twitterPostClient = runtime.clients?.twitter.post;

            if (!bClient || !twitterPostClient) {
                throw new Error("Twitter client not found");
            }

            await twitterPostClient.sendStandardTweet(bClient, tweetText);

            return true;
        } catch (error) {
            elizaLogger.error("Error fetching portfolio data:", error);
            callback?.({
                text: "Error fetching portfolio data",
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "user-fund-update-twitter",
                content: {
                    text: "Post the fund portfolio for gmxbt",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    action: "POST_FUND_PORTFOLIO",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
