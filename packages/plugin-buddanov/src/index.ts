import { Plugin } from "@elizaos/core";
import fundUpdateAction from "./actions/fundUpdateAction";
import cookieTreadAction from "./actions/cookieTreadAction";
import getCoinInfoAction from "./actions/getCoinInfoAction";
import makePostAction from "./actions/makePostAction";
import retweetAction from "./actions/retweetAction";
import directTwitterAction from "./actions/directTwitterAction";


export const buddanovPlugin: Plugin = {
    name: "buddanov",
    description: "Buddanov integration plugin",
    actions: [fundUpdateAction, cookieTreadAction, getCoinInfoAction, makePostAction, retweetAction, directTwitterAction],
    evaluators: [],
    providers: [],
};

export default buddanovPlugin;