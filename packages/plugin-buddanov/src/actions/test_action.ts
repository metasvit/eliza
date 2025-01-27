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
} from "@elizaos/core";


export default {
    name: "POST_BUDDANOV",
    similes: ["POST_FUND_DAILY_UPDATE"],
    validate: async () => {
        // await validateAvalancheConfig(runtime);
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

        console.log("runtime", runtime);

        console.log("runtime.clients", runtime.clients?.telegram);


        callback?.({
            text: "Test done",
        });

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Post fund portfolio for 0x94811bc307b3a8Ed91AFB610b95213eac5C6C174",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;