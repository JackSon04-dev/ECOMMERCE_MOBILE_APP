import * as chatBotService from '../../services/chatBotService.js';

/**
 * 🔍 POST /api/chatbot/search
 * Search for products via natural language message
 */
export const searchChatbot = async (req, res, next) => {
  try {
    const { message } = req.body;

    const result = await chatBotService.searchChatbot({ message });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 🔄 GET /api/chatbot/loadmore?sessionId=...&page=2
 * Paginate product list from AI search session
 */
export const loadMoreChatbot = async (req, res, next) => {
  try {
    const { sessionId, page } = req.query;

    const result = await chatBotService.loadMoreChatbot({ sessionId, page });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
