import { Plugin } from "@elizaos/core";
import analyze_coin_action from "./actions/analyze_coin_action";

export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [analyze_coin_action],
    evaluators: [],
    providers: [],
};

export default buddanovPlugin;