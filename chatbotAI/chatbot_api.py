from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import os

app = FastAPI(title="Ecommerce AI Chatbot API")

# Cấu hình CORS để cho phép Web UI gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Cho phép tất cả các nguồn (để test local)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str


# Load dữ liệu chatbot từ file JSON đã được build
CHATBOT_DATA = {}
try:
    with open('chatbot_data.json', 'r', encoding='utf-8') as f:
        CHATBOT_DATA = json.load(f)
except Exception as e:
    print(f"Warning: Không thể load dữ liệu chatbot_data.json. Error: {e}")

def format_currency(amount):
    return f"{amount:,.0f}đ".replace(",", ".")

def analyze_and_response(user_input: str):
    user_input_lower = user_input.lower()
    
    # Tìm kiếm các key có trong cấu hỏi của người dùng
    found_products = []
    matched_keyword = ""
    
    # Sắp xếp các keyword theo độ dài giảm dần để ưu tiên các từ khóa dài
    # Ví dụ: "áo sơ mi" (9 ký tự) sẽ được ưu tiên kiểm tra trước "áo" (2 ký tự)
    sorted_keywords = sorted(CHATBOT_DATA.keys(), key=len, reverse=True)
    
    for keyword in sorted_keywords:
        if keyword in user_input_lower:
            found_products = CHATBOT_DATA[keyword]
            matched_keyword = keyword
            break # Tìm thấy từ khóa khớp dài nhất thì dừng
            
    if found_products:
        # Nếu tìm thấy, trả về câu thông báo và toàn bộ data của keyword đó
        response_text = "Cảm ơn bạn đã ghé thăm shop đây là sản phẩm bạn cần tìm:\n"
        returned_products = []
        
        for p in found_products:
            response_text += f"- {p['name']} (Giá: {format_currency(p['price'])})\n"
            returned_products.append({
                "id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "thumbnail": p.get("thumbnail", "")
            })
            
        return response_text, returned_products
            
    # Trường hợp không có keywords nào khớp trong data
    return "Xin lỗi shop của chúng tôi không có sản phẩm này.", []

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    user_message = request.message
    bot_reply, products_list = analyze_and_response(user_message)
    # Trả về text dạng chuỗi và 1 mảng các sản phẩm kèm ID
    return {
        "reply": bot_reply,
        "products": products_list
    }

if __name__ == "__main__":
    print("Khởi động AI Chatbot Server tại cổng 8000...")
    # Chạy server với host 0.0.0.0
    uvicorn.run(app, host="0.0.0.0", port=8000)
