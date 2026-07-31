import express from 'express';
import { searchChatbot, loadMoreChatbot } from '../../controllers/user/chatBotController.js';

const router = express.Router();

// 🔍 Search NLP qua Chatbot
router.post('/search', searchChatbot);

// 🔄 Load more products by session
router.get('/loadmore', loadMoreChatbot);

export default router;
