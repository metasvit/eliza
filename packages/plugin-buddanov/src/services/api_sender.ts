import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface RequestData {
    text: string;
    timestamp?: string;
}

async function sendPostRequest(url: string, data: RequestData): Promise<any> {
    try {
        const response = await axios.post(url, data);
        console.log(`[${new Date().toISOString()}] Status Code: ${response.status}`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`[${new Date().toISOString()}] Error sending request:`, error.message);
        } else {
            console.error(`[${new Date().toISOString()}] Unexpected error:`, error);
        }
        return null;
    }
}

export async function sendToExternalAPI(input: string): Promise<any> {
    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
        throw new Error('API_URL is not defined in environment variables');
    }

    const data: RequestData = {
        text: input,
        timestamp: new Date().toISOString()
    };

    return await sendPostRequest(apiUrl, data);
}

// Add this main execution block with interval
if (require.main === module) {
    const testMessage = "analyze coin 9wMsJBrjD1MA63BChs4WJAyU3cYZrp83TKnWB3Ehpump";

    // Initial request
    sendToExternalAPI(testMessage)
        .then(response => console.log('Response:', response))
        .catch(error => console.error('Error:', error));

    // Set up interval (3 minutes = 180000 milliseconds)
    setInterval(() => {
        sendToExternalAPI(testMessage)
            .then(response => console.log('Response:', response))
            .catch(error => console.error('Error:', error));
    }, 180000);

    console.log('Script is running. Sending requests every 3 minutes...');
}