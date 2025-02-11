import { Plugin } from "@elizaos/core";
import  getCoinInfoAction  from "./actions/getCoinInfoAction"
import  fundThreadAction  from "./actions/fundThreadAction"
import { TwitterPostJobService } from "./services/actionTimer";
import sendTweetAction from "./actions/sendTweetAction";

export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [fundThreadAction, getCoinInfoAction, sendTweetAction],
    evaluators: [],
    providers: [new TwitterPostJobService()]
};

export default buddanovPlugin;