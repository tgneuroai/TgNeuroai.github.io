require('dotenv').config();
     const express = require('express');
     const TelegramBot = require('node-telegram-bot-api');

     const app = express();
     const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
     const port = process.env.PORT || 3000;

     // Middleware to parse JSON
     app.use(express.json());

     // In-memory database (replace with MongoDB/Firebase in production)
     let userData = {};

     // Test endpoint
     app.get('/', (req, res) => {
         res.send('NeuroAI Backend is running!');
     });

     // Claim Free NFT
     app.post('/api/claim-nft', async (req, res) => {
         const { telegramId, nftIndex } = req.body;
         if (!telegramId || nftIndex !== 0) {
             return res.status(400).json({ success: false, error: 'Invalid request' });
         }
         if (!userData[telegramId]) {
             userData[telegramId] = {
                 nfts: Array(5).fill(false),
                 mining: { power: 22, totalMined: 234.12 }
             };
         }
         if (!userData[telegramId].nfts[0]) {
             userData[telegramId].nfts[0] = true;
             try {
                 await bot.sendMessage(telegramId, '🎉 You claimed Neon Starter #1 for free!');
                 await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `User ${telegramId} claimed free NFT #1`);
                 res.json({ success: true });
             } catch (error) {
                 res.status(500).json({ success: false, error: 'Failed to notify user' });
             }
         } else {
             res.status(400).json({ success: false, error: 'NFT already claimed' });
         }
     });

     // Buy NFT with Stars
     app.post('/api/buy-nft', async (req, res) => {
         const { telegramId, nftIndex, stars, receiver } = req.body;
         if (!telegramId || !nftIndex || !stars || !receiver) {
             return res.status(400).json({ success: false, error: 'Invalid request' });
         }
         if (!userData[telegramId]) {
             userData[telegramId] = {
                 nfts: Array(5).fill(false),
                 mining: { power: 22, totalMined: 234.12 }
             };
         }
         if (!userData[telegramId].nfts[nftIndex]) {
             try {
                 // Send invoice to user
                 await bot.sendInvoice(telegramId, {
                     title: `NFT #${nftIndex + 1}`,
                     description: `Purchase NFT #${nftIndex + 1} for NeuroAI`,
                     payload: `nft-${nftIndex}-${telegramId}`,
                     provider_token: '', // Leave empty for Telegram Stars
                     currency: 'XTR',
                     prices: [{ label: `NFT #${nftIndex + 1}`, amount: stars }]
                 });
                 res.json({ success: true, message: 'Invoice sent, awaiting payment' });
             } catch (error) {
                 res.status(500).json({ success: false, error: 'Failed to send invoice' });
             }
         } else {
             res.status(400).json({ success: false, error: 'NFT already owned' });
         }
     });

     // Handle pre-checkout query
     bot.on('pre_checkout_query', (query) => {
         bot.answerPreCheckoutQuery(query.id, true);
     });

     // Handle successful payment
     bot.on('successful_payment', async (msg) => {
         const telegramId = msg.chat.id;
         const { payload, total_amount } = msg.successful_payment;
         const [_, nftIndex] = payload.split('-');
         userData[telegramId].nfts[parseInt(nftIndex)] = true;
         await bot.sendMessage(telegramId, `🚀 You purchased NFT #${parseInt(nftIndex) + 1} for ${total_amount} ⭐!`);
         await bot.sendMessage(process.env.ADMIN_TELEGRAM_ID, `Received ${total_amount} ⭐ from ${telegramId} for NFT #${parseInt(nftIndex) + 1}`);
     });

     // Get Mining Data
     app.get('/api/mining-data', (req, res) => {
         const { telegramId } = req.query;
         if (!telegramId || !userData[telegramId]) {
             return res.status(400).json({ success: false, error: 'User not found' });
         }
         res.json({ success: true, miningData: userData[telegramId].mining });
     });

     // Update Mining Data
     app.post('/api/update-mining', async (req, res) => {
         const { telegramId, miningData } = req.body;
         if (!telegramId || !miningData) {
             return res.status(400).json({ success: false, error: 'Invalid request' });
         }
         if (!userData[telegramId]) {
             userData[telegramId] = {
                 nfts: Array(5).fill(false),
                 mining: { power: 22, totalMined: 234.12 }
             };
         }
         userData[telegramId].mining = miningData;
         try {
             await bot.sendMessage(telegramId, `⛏️ Mining updated: ${miningData.power} Hash/s, ${miningData.totalMined} NAI`);
             res.json({ success: true });
         } catch (error) {
             res.status(500).json({ success: false, error: 'Failed to notify user' });
         }
     });

     // Bot commands
     bot.onText(/\/start/, (msg) => {
         bot.sendMessage(msg.chat.id, 'Welcome to NeuroAI Bot! Connect your Telegram in the app to start mining.');
     });

     // Start server
     app.listen(port, () => {
         console.log(`Server running on port ${port}`);
         bot.sendMessage(process.env.TELEGRAM_CHAT_ID, '🟢 NeuroAI Backend Server started!');
     });