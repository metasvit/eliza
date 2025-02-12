import { Plugin } from "@elizaos/core";
import  getCoinInfoAction  from "./actions/getCoinInfoAction"
import  fundThreadAction  from "./actions/fundThreadAction"
import { TwitterPostJobService } from "./services/actionTimer";
import makePostAction from "./actions/makePostAction";
import retweetAction from "./actions/retweetAction";
import DirectTwitterPostAction  from "./actions/directTwitterPost";
export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [fundThreadAction, getCoinInfoAction, makePostAction, retweetAction, DirectTwitterPostAction],
    evaluators: [],
    providers: [new TwitterPostJobService()]
};

export default buddanovPlugin;