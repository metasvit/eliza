import { Plugin } from "@elizaos/core";

import showFundPortfolio from "./actions/showFundPortfolio";
import postFundPortfolio from "./actions/postFundPortfolio";
import { TwitterPostJobService } from "./services/twitterPostJob";

export const gmxbtPlugin: Plugin = {
    name: "gmxbt",
    description: "GMXBT Plugin for Eliza",
    actions: [postFundPortfolio, showFundPortfolio],
    evaluators: [],
    providers: [],
    services: [new TwitterPostJobService()],
};

export default gmxbtPlugin;
