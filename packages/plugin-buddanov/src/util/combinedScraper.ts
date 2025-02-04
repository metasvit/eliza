import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    // Launch a new browser instance
    const browser = await puppeteer.launch({
        headless: false, // Set to true to run in headless mode
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    // Open a new page
    const page = await browser.newPage();

    // URL of the website
    const url = 'https://www.cookie.fun/';

    try {
        // Navigate to the URL
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log("Page loaded successfully.");

        const extractedData = await page.evaluate(() => {
            const elements = document.getElementsByClassName('__variable_e081fc __className_0dc517 font-sans text-text-primary antialiased bg-primary');
            const elementContent = Array.from(elements).map(element => element.textContent?.trim() || '')[0];
            
            const addresses: string[] = [];
            if (elementContent) {
                // Match the exact format including escaped quotes
                const regex = /contractAddress\\\":\\\"([A-Za-z0-9]{32,44})\\/g;
                let match;
                while ((match = regex.exec(elementContent)) !== null && addresses.length < 10) {
                    addresses.push(match[1]);
                }
            }
            
            return addresses;
        });

        if (extractedData.length === 10) {
            console.log(`Found first ${extractedData.length} contract addresses:`, extractedData);
            
            const outputData = {
                addresses: extractedData
            };

            fs.writeFileSync('extracted_data.json', JSON.stringify(outputData, null, 4), 'utf-8');
            console.log('Data extraction complete. Check extracted_data.json for results.');
        } else {
            console.log(`Found ${extractedData.length} addresses, expected 10.`);
        }
    } catch (error) {
        console.error(`Error loading page: ${error}`);
    } finally {
        // Close the browser
        await browser.close();
    }
})(); 