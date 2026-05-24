# E-Commerce Mobile App & Admin Dashboard

## 1. Project Overview
A comprehensive E-Commerce solution designed to provide a seamless shopping experience for users and powerful management tools for administrators. The system consists of a cross-platform mobile application, a web-based admin dashboard, a robust backend API, and an AI-powered chatbot for customer support.

## 2. Project Architecture & Modules
The repository is divided into four main modules:

- **`ecommerce_user_FE`**: The mobile application for end-users, enabling them to browse products, manage their shopping carts, make secure payments, and track their orders.
- **`ecommerce_admin_FE`**: The administrative web dashboard for shop owners to manage inventory, process orders, view revenue statistics, and monitor customer activity.
- **`ecommerce_backend`**: The core RESTful API serving both the mobile app and the admin dashboard, handling business logic, database interactions, and third-party integrations (payments, cloud storage).
- **`chatbotAI`**: A standalone AI service providing automated and intelligent customer support.

## 3. Prominent Technologies Used

### Mobile App (`ecommerce_user_FE`)
- **Framework**: Flutter (Dart) - for building natively compiled applications for mobile from a single codebase.
- **State Management**: Provider, Riverpod
- **Authentication**: Google Sign In, and JWT-based custom authentication.
- **Local Storage**: `flutter_secure_storage` (for sensitive data like tokens) and `shared_preferences`.
- **Networking**: `http` package for RESTful API communication.
- **UI & Animations**: `flutter_animate`, `flutter_slidable`, `charts_flutter` (for data visualization), and various icon packs (`cupertino_icons`, `font_awesome_flutter`).

### Admin Dashboard (`ecommerce_admin_FE`)
- **Framework**: Vue.js 3 (Composition API).
- **Build Tool**: Vite (powered by Rolldown) for extremely fast development and optimized builds.
- **Routing**: Vue Router for Single Page Application (SPA) navigation.
- **Networking**: Axios for API requests.
- **Styling**: Tailwind CSS for rapid UI development and responsive design.

### Backend API (`ecommerce_backend`)
- **Runtime Environment**: Node.js.
- **Web Framework**: Express.js.
- **Database**: MongoDB with Mongoose ODM for flexible, document-oriented data storage.
- **Caching**: Redis for performance optimization and fast data retrieval.
- **Authentication & Security**: JWT (JSON Web Tokens), `bcryptjs` for password hashing, and `crypto-js`.
- **Media Storage**: Cloudinary integrated with `multer` for efficient image uploading and delivery.
- **Payment Gateways**: Integration with VNPay and ZaloPay for secure transaction processing.
- **Push Notifications**: Firebase Admin SDK for sending FCM (Firebase Cloud Messaging) notifications to mobile users.

### AI Chatbot (`chatbotAI`)
- **Language**: Python.
- **Functionality**: Serves as an intelligent assistant using AI models to process user queries and provide automated responses based on the store's data (`chatbot_data.json`).

## 4. Key Features
- **Multi-platform Access**: Accessible via Android/iOS devices (Flutter) and Web browsers (Vue).
- **Secure Payments**: Built-in support for popular Vietnamese payment gateways (VNPay, ZaloPay) with IPN/Webhook verifications.
- **Real-time Analytics**: The admin dashboard features dynamic charts and statistics for revenue, top products, and top customers.
- **Order Management**: Comprehensive order lifecycle management from "Pending" to "Delivered".
- **Social Login**: Easy onboarding with Google and Facebook authentication.
- **AI Integration**: 24/7 automated customer support through the integrated chatbot module.
