import { Plugin } from "@elizaos/core";
import  buddanovAction  from "./actions/analyzeCoin"
import { TwitterPostJobService } from "./services/scheduledPostRequests";

export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [buddanovAction],
    evaluators: [],
    providers: [new TwitterPostJobService()]
};

export default buddanovPlugin;