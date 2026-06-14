# E-Commerce Mobile App & Admin Dashboard

## 1. Project Overview
This is a complete E-Commerce system designed to offer an easy shopping experience for users and strong management tools for admins. The system includes a mobile app, a web-based admin dashboard, a fast backend API, and an AI chatbot for customer support.

## 2. Project Structure
The project is divided into four main parts:

- **`ecommerce_user_FE`**: The mobile app for users. They can use it to view products, add items to their cart, make secure payments, and track their orders.
- **`ecommerce_admin_FE`**: The web dashboard for shop owners. It helps them manage products, process orders, view revenue stats, and track customer activities.
- **`ecommerce_backend`**: The core API that connects the mobile app and the admin dashboard. It handles business logic, database tasks, background jobs (workers), and connects to outside services like payments.
- **`chatbotAI`**: An independent AI service that provides automatic and smart customer support.

## 3. Main Technologies Used

### Mobile App (`ecommerce_user_FE`)
- **Framework**: Flutter (Dart) - for building mobile apps for both iOS and Android from one codebase.
- **State Management**: Provider, Riverpod.
- **Authentication**: Google Sign In and custom JWT login.
- **Local Storage**: `flutter_secure_storage` (to save safe data like tokens) and `shared_preferences`.
- **Networking**: `http` package for API requests.

### Admin Dashboard (`ecommerce_admin_FE`)
- **Framework**: Vue.js 3 (Composition API).
- **Build Tool**: Vite for fast development.
- **Networking**: Axios for API requests.
- **Styling**: Tailwind CSS for quick and responsive design.

### Backend API (`ecommerce_backend`)
- **Environment**: Node.js.
- **Framework**: Express.js.
- **Architecture**: MVC (Model-View-Controller) combined with a Decoupled Worker system.
- **Database**: MongoDB (Mongoose) for flexible data storage.
- **Message Queue**: RabbitMQ for background tasks and load balancing.
- **Caching**: Redis for better performance and fast data reading.
- **Media Storage**: Cloudinary for uploading and serving images.
- **Payment Gateways**: VNPay, ZaloPay, and PayOS for safe payments.
- **Push Notifications**: Firebase Admin SDK for sending messages to mobile users.

### AI Chatbot (`chatbotAI`)
- **Language**: Python.
- **Functionality**: Uses AI models to understand user questions and give automatic answers based on store data.

## 4. Key Features
- **Multi-platform Support**: Works on Android/iOS phones (Flutter) and web browsers (Vue).
- **Decoupled Architecture**: Uses RabbitMQ and Background Workers to handle heavy traffic and prevent server crashes during flash sales.
- **Secure Payments**: Supports popular Vietnamese payment methods (VNPay, ZaloPay, PayOS) with automatic webhooks.
- **Data Analytics**: The admin dashboard shows live charts and stats for revenue, top products, and top buyers.
- **Order Management**: Full control over the order process, from "Pending" to "Delivered".
- **Social Login**: Easy login using Google accounts.
- **AI Chatbot**: 24/7 automatic customer support.
