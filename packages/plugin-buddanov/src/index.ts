import { Plugin } from "@elizaos/core";
import  getCoinInfoAction  from "./actions/getCoinInfoAction"
import  fundPostAction  from "./actions/fundPostAction"
import { TwitterPostJobService } from "./services/actionTimer";

export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [fundPostAction, getCoinInfoAction],
    evaluators: [],
    providers: [new TwitterPostJobService()]
};

export default buddanovPlugin;