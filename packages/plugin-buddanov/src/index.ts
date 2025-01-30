import { Plugin } from "@elizaos/core";
import  buddanovAction  from "./actions/analyze_action"

export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [buddanovAction],
    evaluators: [],
    providers: [],
};

export default buddanovPlugin;