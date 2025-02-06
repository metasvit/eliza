import { Plugin } from "@elizaos/core";
import  buddanovAction  from "./actions/analyzeCoinAction"
import { TwitterPostJobService } from "./services/actionTimer";

export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [buddanovAction],
    evaluators: [],
    providers: [new TwitterPostJobService()]
};

export default buddanovPlugin;