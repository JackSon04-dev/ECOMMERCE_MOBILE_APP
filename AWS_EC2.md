# Báo cáo triển khai hệ thống E-Commerce bằng Docker lên AWS EC2

**Dự án:** ECOMMERCE_MOBILE_APP  
**Domain:** `clothesstores.app`  
**VPS:** AWS EC2 (`t3.micro` / `t2.micro`) - Ubuntu 26.04 LTS  
**Elastic IP (IP Tĩnh):** `3.1.234.40`  
**Private IP:** `172.31.35.159`  
**Ngày triển khai:** 29/05/2026

---

## Mục lục

1. [Phần 1: Docker hóa từng Service (Viết Dockerfile)](#phần-1-docker-hóa-từng-service-viết-dockerfile)
   - 1.1. Backend Express.js
   - 1.2. Chatbot AI FastAPI
   - 1.3. Admin Web Vue 3 + Nginx (Multi-stage Build)
   - 1.4. Redis Cache
2. [Phần 2: Gom tất cả Service bằng Docker Compose](#phần-2-gom-tất-cả-service-bằng-docker-compose)
   - 2.1. Cấu trúc file `docker-compose.yml`
   - 2.2. Mạng nội bộ Docker (Docker Network)
   - 2.3. Thứ tự khởi động (`depends_on`)
3. [Phần 3: Tạo VPS trên AWS EC2, SSH và Cấu hình Elastic IP](#phần-3-tạo-vps-trên-aws-ec2-ssh-và-cấu-hình-elastic-ip)
   - 3.1. Tạo EC2 Instance
   - 3.2. Cấu hình Security Group (Tường lửa)
   - 3.3. SSH từ Windows vào VPS bằng file `.pem`
   - 3.4. Cấp phát và gắn Elastic IP (IP Tĩnh)
4. [Phần 4: Tạo SSH Key và Clone Repo GitHub trên VPS](#phần-4-tạo-ssh-key-và-clone-repo-github-trên-vps)
   - 4.1. Tạo SSH Key trên VPS
   - 4.2. Thêm Public Key vào GitHub
   - 4.3. Clone Repository và chạy Docker Compose
5. [Phần 5: Đăng ký Domain trên Name.com và gắn IP VPS](#phần-5-đăng-ký-domain-trên-namecom-và-gắn-ip-vps)
   - 5.1. Đăng ký domain miễn phí qua GitHub Student Pack
   - 5.2. Cấu hình DNS (A Record) trỏ về Elastic IP
6. [Phần 6: Cài đặt SSL Let's Encrypt và kích hoạt HTTPS](#phần-6-cài-đặt-ssl-lets-encrypt-và-kích-hoạt-https)
   - 6.1. Cài đặt Certbot trên VPS
   - 6.2. Lấy chứng chỉ SSL bằng chế độ Standalone
   - 6.3. Cơ chế xác thực domain của Certbot
   - 6.4. Cập nhật `nginx.conf` cho HTTPS
   - 6.5. Cập nhật `docker-compose.yml` để mount chứng chỉ SSL
   - 6.6. Khởi động lại hệ thống

---

## Phần 1: Docker hóa từng Service (Viết Dockerfile)

Mục tiêu của bước này là "đóng gói" mỗi service thành một container Docker độc lập, đảm bảo chúng chạy giống hệt nhau trên mọi môi trường (máy dev, máy bạn, máy chấm bài, hay VPS trên cloud).

### 1.1. Backend Express.js

**File:** `ecommerce_backend/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
```

**Giải thích từng dòng:**

| Dòng | Ý nghĩa |
|---|---|
| `FROM node:18-alpine` | Dùng hệ điều hành Alpine Linux siêu nhẹ (~5MB) có sẵn Node.js 18 làm nền tảng. |
| `WORKDIR /app` | Tạo thư mục `/app` bên trong container và đặt nó làm thư mục làm việc mặc định. |
| `COPY package*.json ./` | Copy file `package.json` và `package-lock.json` trước để tận dụng cơ chế **cache layer** của Docker. |
| `RUN npm install` | Cài đặt toàn bộ thư viện (dependencies) của Backend. |
| `COPY . .` | Copy toàn bộ mã nguồn Backend còn lại vào container. |
| `EXPOSE 5000` | Khai báo container này sẽ lắng nghe kết nối ở cổng 5000. |
| `CMD ["node", "server.js"]` | Lệnh khởi chạy server khi container được bật lên. |

---

### 1.2. Chatbot AI FastAPI (Python)

**File:** `chatbotAI/Dockerfile`

```dockerfile
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
```

---

### 1.3. Admin Web Vue 3 + Nginx (Multi-stage Build)

**File:** `ecommerce_admin_FE/Dockerfile`

Sử dụng kỹ thuật **Multi-stage Build** để giảm thiểu kích thước image:

```dockerfile
# Stage 1: Build Vue application
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all code and build
COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built files from build-stage to Nginx default folder
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy our custom Nginx config for routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Giải thích Multi-stage Build:**
- **Stage 1 (`build-stage`)**: Dùng Node.js để build mã nguồn Vue thành file tĩnh tĩnh HTML/CSS/JS. Giai đoạn này nặng (~300MB).
- **Stage 2 (Final)**: Dùng image Nginx siêu nhẹ (~25MB). Chỉ copy thư mục build sang, bỏ lại toàn bộ Node.js và mã nguồn gốc. Kết quả image cực kỳ nhẹ và bảo mật.

---

### 1.4. Redis Cache

Redis không cần viết Dockerfile vì sử dụng trực tiếp image chính thức `redis:7-alpine` từ Docker Hub.

---

## Phần 2: Gom tất cả Service bằng Docker Compose

### 2.1. Cấu trúc file `docker-compose.yml`

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: local_redis
    networks:
      - ecommerce_local_net

  backend:
    build:
      context: ./ecommerce_backend
      dockerfile: Dockerfile
    container_name: local_backend
    environment:
      - PORT=5000
      # Các biến môi trường khác...
    depends_on:
      - redis
    networks:
      - ecommerce_local_net

  chatbot:
    build:
      context: ./chatbotAI
      dockerfile: Dockerfile
    container_name: local_chatbot
    networks:
      - ecommerce_local_net

  admin_web:
    build:
      context: ./ecommerce_admin_FE
      dockerfile: Dockerfile
    container_name: local_admin_web
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
      - chatbot
    networks:
      - ecommerce_local_net

networks:
  ecommerce_local_net:
    driver: bridge
```

### 2.2. Mạng nội bộ Docker (Docker Network)
Các container được đưa vào cùng một mạng `ecommerce_local_net`. Chúng có thể gọi nhau bằng tên (ví dụ: Nginx gọi `http://backend:5000`) mà không cần biết IP. Mạng này hoàn toàn cách ly với Internet công cộng.

---

## Phần 3: Tạo VPS trên AWS EC2, SSH và Cấu hình Elastic IP

### 3.1. Tạo EC2 Instance

Tạo EC2 Instance với cấu hình:
- **AMI:** Ubuntu 26.04 LTS
- **Instance Type:** `t3.micro` (hoặc `t3.small`)
- **Key Pair:** Tạo mới và lưu file `.pem` (`ecommerce-key.pem`)
- **Storage:** 20 GiB gp3

### 3.2. Cấu hình Security Group (Tường lửa)

Mở các cổng (Inbound Rules) cho Security Group:
- **Port 22 (SSH)**: `0.0.0.0/0` (Để remote vào VPS)
- **Port 80 (HTTP)**: `0.0.0.0/0` (Web thông thường)
- **Port 443 (HTTPS)**: `0.0.0.0/0` (Web bảo mật)

### 3.3. SSH từ Windows vào VPS bằng file `.pem`

Trên Windows, sử dụng **Git Bash**:
```bash
cd /d                          # Di chuyển sang ổ D (nơi lưu file .pem)
chmod 400 ecommerce-key.pem    # Giới hạn quyền đọc cho riêng user hiện tại
ssh -i "ecommerce-key.pem" ubuntu@3.1.234.40
```

### 3.4. Cấp phát và gắn Elastic IP (IP Tĩnh)

**Tại sao cần Elastic IP?** Mặc định, mỗi khi Stop và Start EC2, AWS sẽ đổi địa chỉ IP Public thành một số ngẫu nhiên mới, làm mất kết nối Domain. Elastic IP giải quyết triệt để vấn đề này.

**Cách thực hiện:**
1. Vào AWS Console → **Elastic IPs** → **Allocate Elastic IP address**.
2. Chọn khu vực (ví dụ `ap-southeast-1`) và bấm **Allocate**. Hệ thống cấp 1 IP tĩnh (Ví dụ: `3.1.234.40`).
3. Chọn IP vừa tạo → **Actions** → **Associate Elastic IP address**.
4. Chọn **Instance** là máy chủ EC2 của bạn và bấm **Associate**.
5. Kể từ lúc này, IP `3.1.234.40` sẽ **gắn chặt vĩnh viễn** với VPS của bạn dù có khởi động lại bao nhiêu lần.

> [!NOTE]
> Hệ điều hành Ubuntu bên trong EC2 chỉ nhận dạng **Private IP** (`172.31.35.159`). Elastic IP được AWS quản lý ở vòng ngoài (NAT Gateway) và tự động chuyển hướng (forward) dữ liệu vào Private IP ở vòng trong.

---

## Phần 4: Tạo SSH Key và Clone Repo GitHub trên VPS

### 4.1. Tạo SSH Key trên VPS

```bash
ssh-keygen -t ed25519 -C "your_email@gmail.com"
cat ~/.ssh/id_ed25519.pub
```

### 4.2. Thêm Public Key vào GitHub
Copy nội dung Public Key và thêm vào **GitHub → Settings → SSH and GPG keys**.

### 4.3. Clone Repository và chạy Docker Compose

Cài đặt Docker, Docker Compose, clone code và chạy:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker
sudo apt install -y docker-compose-v2

git clone git@github.com:<username>/ECOMMERCE_MOBILE_APP.git
cd ECOMMERCE_MOBILE_APP
docker compose up -d
```

---

## Phần 5: Đăng ký Domain trên Name.com và gắn IP VPS

1. Nhận quyền lợi GitHub Student Developer Pack để lấy 1 domain miễn phí trên Name.com (Ví dụ: `clothesstores.app`).
2. Vào phần quản lý DNS của Name.com, cấu hình **A Record**:
   - Host: `@` (Domain gốc) → Giá trị: `3.1.234.40`
   - Host: `www` → Giá trị: `3.1.234.40`
3. Lưu lại và chờ DNS cập nhật toàn cầu.

---

## Phần 6: Cài đặt SSL Let's Encrypt và kích hoạt HTTPS

### 6.1. Cài đặt Certbot trên VPS

```bash
sudo apt update
sudo apt install -y certbot
```

### 6.2. Lấy chứng chỉ SSL bằng chế độ Standalone

Tạm tắt Nginx container đang chạy cổng 80, sau đó chạy Certbot:
```bash
docker compose down
sudo certbot certonly --standalone -d clothesstores.app -d www.clothesstores.app
```
Chứng chỉ được tạo thành công và lưu tại: `/etc/letsencrypt/live/clothesstores.app/`

### 6.3. Cơ chế xác thực domain của Certbot
Certbot tạo 1 web server tạm thời trên cổng 80. Tổ chức Let's Encrypt gọi HTTP Request tới `clothesstores.app` (lúc này đã trỏ về IP VPS). Nếu máy chủ trả lời đúng token bảo mật, Let's Encrypt xác nhận bạn là chủ sở hữu domain và cấp chứng chỉ.

### 6.4. Cập nhật `nginx.conf` cho HTTPS

Sửa đổi cấu hình Nginx để tự động chuyển HTTP sang HTTPS, mở cổng 443 và khai báo SSL:

```nginx
server {
    listen 80;
    server_name clothesstores.app www.clothesstores.app;
    return 301 https://$host$request_uri; # Tự động chuyển hướng
}

server {
    listen 443 ssl;
    server_name clothesstores.app www.clothesstores.app;

    ssl_certificate /etc/letsencrypt/live/clothesstores.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clothesstores.app/privkey.pem;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/chat {
        proxy_pass http://chatbot:8000;
        # Proxy settings...
    }

    location /api {
        proxy_pass http://backend:5000;
        # Proxy settings...
    }
}
```

### 6.5. Cập nhật `docker-compose.yml` để mount chứng chỉ SSL

```yaml
  admin_web:
    # ...
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```
Lệnh `volumes` giúp container Nginx bên trong Docker có thể đọc được chứng chỉ lưu tại `/etc/letsencrypt/` của máy chủ VPS bên ngoài.

### 6.6. Khởi động lại hệ thống

Pull code mới nhất từ GitHub và build lại Nginx:
```bash
cd ~/ECOMMERCE_MOBILE_APP
git pull origin main
docker compose up --build -d
```

Hoàn tất! Truy cập `https://clothesstores.app` để kiểm tra kết quả bảo mật (Ổ khóa xanh).
