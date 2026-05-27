FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files
COPY . .

# Expose fastapi port
EXPOSE 8000

# Start fastapi chatbot api
CMD ["python", "chatbot_api.py"]
