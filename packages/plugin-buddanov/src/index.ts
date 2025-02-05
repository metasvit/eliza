import { Plugin } from "@elizaos/core";
import  buddanovAction  from "./actions/analyze_coin_action"
import { TwitterPostJobService } from "./services/api_sender";

export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [buddanovAction],
    evaluators: [],
    providers: [new TwitterPostJobService()]
};

export default buddanovPlugin;