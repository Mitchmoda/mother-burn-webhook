const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const HELIUS_API_KEY = 'a0d40783-7b2c-4e1f-913e-b243c28701d2';
const TELEGRAM_BOT_TOKEN = '7556220587:AAHlCARahbSMh84HmSIelnpQkv8s_AL4wQc';
const TELEGRAM_CHAT_ID = '-1002210217690';
const CONTRACT_ADDRESS = '3S8qX1MsMqRBwkG2Qy7n1s1oHMgaCu9c4VfVDPN';
// Array of known burn addresses
const BURN_ADDRESSES = [
    '11111111111111111111111111111111',
    '1nc1nerator11111111111111111111111111111111'
];

app.post('/webhook', async (req, res) => {
    try {
        const transaction = req.body;
        console.log('Received transaction:', JSON.stringify(transaction, null, 2));

        let burnProcessed = false;
        const tokenTransfers = transaction.tokenTransfers || [];
        const tokenBurns = transaction.tokenBurns || []; // Enhanced webhook data

        // Check for token transfers to burn addresses
        for (const transfer of tokenTransfers) {
            if (!burnProcessed && BURN_ADDRESSES.some(address => 
                transfer.toUserAccount === address || transfer.to === address)) {
                const burnAmount = transfer.tokenAmount / 10 ** transfer.tokenDecimal;
                const gifUrl = 'https://media.giphy.com/media/3o7TKTDn976rzVgDf2/giphy.gif';
                const messageText = `🔥 BURN FUSE IGNITED 🔥\nDetected Burn: ${burnAmount} tokens sent to ${transfer.to}\n(Real-time data from Solana blockchain)`;

                try {
                    console.log('Attempting to send GIF and message...');
                    const gifResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAnimation`, {
                        chat_id: TELEGRAM_CHAT_ID,
                        animation: gifUrl
                    });
                    console.log('GIF sent successfully:', gifResponse.status);

                    await new Promise(resolve => setTimeout(resolve, 200)); // 200ms buffer
                    const messageResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        chat_id: TELEGRAM_CHAT_ID,
                        text: messageText
                    });
                    console.log('Message sent successfully:', messageResponse.status);
                    burnProcessed = true;
                } catch (error) {
                    console.error('Send error:', error.message, error.response ? error.response.data : 'No response data');
                    if (error.response && error.response.status === 429 && error.response.data.parameters.retry_after) {
                        const retryAfter = Math.min(error.response.data.parameters.retry_after, 5);
                        console.log(`Rate limited, waiting ${retryAfter} seconds...`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    }
                }

                if (burnProcessed) {
                    console.log('Burn processed successfully');
                } else {
                    console.error('Failed to process burn');
                }
                break;
            }
        }

        // Check for programmatic burns
        if (!burnProcessed && tokenBurns.length > 0) {
            for (const burn of tokenBurns) {
                if (burn.mint === CONTRACT_ADDRESS) {
                    const burnAmount = burn.amount / 10 ** (burn.decimals || 6); // Default to 6 decimals if not provided
                    const gifUrl = 'https://media.giphy.com/media/3o7TKTDn976rzVgDf2/giphy.gif';
                    const messageText = `🔥 BURN FUSE IGNITED 🔥\nDetected Burn: ${burnAmount} tokens via program burn\n(Real-time data from Solana blockchain)`;

                    try {
                        console.log('Attempting to send GIF and message for program burn...');
                        const gifResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAnimation`, {
                            chat_id: TELEGRAM_CHAT_ID,
                            animation: gifUrl
                        });
                        console.log('GIF sent successfully:', gifResponse.status);

                        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms buffer
                        const messageResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                            chat_id: TELEGRAM_CHAT_ID,
                            text: messageText
                        });
                        console.log('Message sent successfully:', messageResponse.status);
                        burnProcessed = true;
                    } catch (error) {
                        console.error('Send error for program burn:', error.message, error.response ? error.response.data : 'No response data');
                        if (error.response && error.response.status === 429 && error.response.data.parameters.retry_after) {
                            const retryAfter = Math.min(error.response.data.parameters.retry_after, 5);
                            console.log(`Rate limited for program burn, waiting ${retryAfter} seconds...`);
                            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                        }
                    }

                    if (burnProcessed) {
                        console.log('Program burn processed successfully');
                    } else {
                        console.error('Failed to process program burn');
                    }
                    break;
                }
            }
        }

        if (!burnProcessed) {
            console.log('No burn detected in transaction');
        }
        res.status(200).send('Webhook processed');
    } catch (error) {
        console.error('Webhook error:', error.message, error.response ? error.response.data : 'No response data');
        res.status(500).send('Error processing webhook');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});