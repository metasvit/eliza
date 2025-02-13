import axios from 'axios';
import * as cheerio from 'cheerio';

interface Agent {
    name: string;
    mindshare: number;
    mindshare_change: string;
    address: string | null;
}

class CookieScraper {
    private zenrowsApiKey: string;
    private baseUrl: string = 'https://www.cookie.fun';

    constructor(apiKey: string) {
        this.zenrowsApiKey = "3fdc3a017c03115652be8fe118b46952f4c72448";
    }

    private async makeZenrowsRequest(url: string): Promise<string> {
        const params = {
            js_render: 'true',
            premium_proxy: 'true',
            apikey: this.zenrowsApiKey
        };

        const response = await axios.get(`https://api.zenrows.com/v1/?url=${encodeURIComponent(url)}`, { params });
        return response.data;
    }

    async scrapeTopAgents(): Promise<Agent[] | null> {
        try {
            console.log("Fetching agents list...");
            const html = await this.makeZenrowsRequest(`${this.baseUrl}/?type=agent`);
            const $ = cheerio.load(html);

            const agents: Agent[] = [];

            // Find the correct table by looking for specific content and row count
            const tables = $('table.w-full.caption-bottom');
            let targetTable;

            tables.each((_, table) => {
                const $table = $(table);
                const rowCount = $table.find('tbody tr').length;

                if (rowCount === 11) {
                    targetTable = $table;
                    return false; // break the each loop
                }
            });

            if (targetTable && targetTable.length) {
                const rows = targetTable.find('tbody tr');

                for (let i = 0; i < rows.length; i++) {
                    const row = $(rows[i]);
                    const cells = row.find('td');

                    if (cells.length >= 3) {
                        const agentLink = cells.eq(0).find('a');
                        if (agentLink.length) {
                            const name = agentLink.find('span').text().trim();
                            const mindshare = parseFloat(cells.eq(1).text().trim().replace('%', '')) || 0;
                            const mindshare_change = cells.eq(2).text().trim();

                            const agentUrl = `${this.baseUrl}${agentLink.attr('href')}`;
                            console.log(`Fetching address for ${name} from: ${agentUrl}`);

                            const agentHtml = await this.makeZenrowsRequest(agentUrl);
                            const $agent = cheerio.load(agentHtml);

                            let address: string | null = null;
                            const preloadLink = $agent('link[rel="preload"][href*="trade.cookie.fun/trade"]').first();

                            if (preloadLink.length) {
                                const href = preloadLink.attr('href') || '';
                                const addressMatch = href.match(/address=((?:0x[a-fA-F0-9]+)|(?:[a-zA-Z0-9]{32,}))/);
                                if (addressMatch) {
                                    address = addressMatch[1];
                                    console.log(`Found address for ${name}: ${address}`);
                                }
                            }

                            agents.push({
                                name,
                                mindshare,
                                mindshare_change,
                                address
                            });
                        }
                    }
                }
            }

            // Sort agents by mindshare (descending order)
            return agents
                .sort((a, b) => b.mindshare - a.mindshare)
                .slice(0, 10);

        } catch (error) {
            console.error("Error occurred:", error);
            return null;
        }
    }
}

export { CookieScraper, Agent };