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

interface GURResponse {
    formatted_message: string;    // The formatted message from the API
    scarlett_response: string;    // The response from Buddanov
    status: string;              // Status of the request (e.g., "Message sent successfully")
}

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

        const handleResponse = (response: GURResponse) => {
            if (response.status !== 'Message sent successfully') {
                callback?.({
                    text: "An error occurred while processing your request.",
                });
                return;
            }

            // Handle successful response
            const responseText = response.scarlett_response || 'Message received';

            // Send the actual response after a short delay
            setTimeout(() => {
                callback?.({
                    text: responseText,
                });
            }, 1000);
        };

        try {
            const apiUrl = `https://${process.env.GUR_API_ENDPOINT}/send_message`;
            if (!apiUrl) {
                throw new Error("GUR_API_ENDPOINT not configured");
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message.content.text,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data: GURResponse = await response.json();
            handleResponse(data);

        } catch (error) {
            elizaLogger.error("Error in GUR info handler:", error);
            callback?.({
                text: "❌ Sorry, I couldn't process your request at the moment.",
                error: error
            });
        }
        return false;
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
        [
            {
                user: "{{user1}}",
                content: { text: "Buddanov", action: "POST_BUDDANOV" },
            },
        ],
    ] as ActionExample[][],
} as Action;