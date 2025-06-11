const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const HELIUS_API_KEY = 'a0d40783-7b2c-4e1f-913e-b243c28701d2';
const TELEGRAM_BOT_TOKEN = '7556220587:AAHlCARahbSMh84HmSIelnpQkv8s_AL4wQc';
const TELEGRAM_CHAT_ID = '-1002210217690';
const CONTRACT_ADDRESS = '3S8qX1MsMqRBwkG2Qy7n1s1oHMgaCu9c4VfVDPN';
const SOLANA_BURN_ADDRESS = '11111111111111111111111111111111';

app.post('/webhook', async (req, res) => {
    try {
        const transaction = req.body;
        console.log('Received transaction:', transaction);

        const tokenTransfers = transaction.tokenTransfers || [];
        let burnProcessed = false;
        for (const transfer of tokenTransfers) {
            if (!burnProcessed && (transfer.toUserAccount === SOLANA_BURN_ADDRESS || transfer.to === SOLANA_BURN_ADDRESS)) {
                const burnAmount = transfer.tokenAmount / 10 ** transfer.tokenDecimal;
                const gifUrl = 'https://media.giphy.com/media/3o7TKTDn976rzVgDf2/giphy.gif';
                const messageText = `🔥 BURN FUSE IGNITED 🔥\nDetected Burn: ${burnAmount} tokens sent to burn address\n(Real-time data from Solana blockchain)`;

                // Minimal initial delay and single attempt with retry
                let attempt = 0;
                const maxAttempts = 1; // Limit to one initial attempt to avoid spam
                while (attempt < maxAttempts) {
                    try {
                        console.log(`Attempting to send GIF and message (Attempt ${attempt + 1})...`);
                        // Send GIF
                        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAnimation`, {
                            chat_id: TELEGRAM_CHAT_ID,
                            animation: gifUrl
                        });
                        console.log('GIF sent successfully');

                        // Small buffer before message
                        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms buffer

                        // Send message
                        const messageResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                            chat_id: TELEGRAM_CHAT_ID,
                            text: messageText
                        });
                        console.log('Message sent successfully:', messageResponse.status);
                        burnProcessed = true; // Mark as processed to avoid duplicates
                        break;
                    } catch (error) {
                        if (error.response && error.response.status === 429 && error.response.data.parameters.retry_after) {
                            const retryAfter = Math.min(error.response.data.parameters.retry_after, 5); // Cap at 5 seconds
                            console.log(`Rate limited, waiting ${retryAfter} seconds before next attempt...`);
                            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                            attempt++;
                        } else {
                            console.error('Send error:', error.message, error.response ? error.response.data : 'No response data');
                            throw error;
                        }
                    }
                }
                if (attempt === maxAttempts && !burnProcessed) {
                    console.error('Failed to send GIF and message after maximum attempts');
                }
                break; // Exit after processing the first burn
            }
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