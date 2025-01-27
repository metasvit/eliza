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
    similes: ["GUR_INFO", "BUDDANOV_INFO", "УПРАВЛІННЯ_РОЗВІДКИ", "УР"],
    validate: async () => true,
    description:
        "Returns information when users mention Buddanov, Budda, or ask about Управління розвідки (Intelligence Directorate)",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting GUR info handler...");

        const info = `event activated`;

        callback?.({
            text: info,
        });

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me about Buddanov",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Who is Budda?",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Що таке управління розвідки?",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Розкажи про УР",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;