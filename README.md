# 🎯 LeadScanner Pro (Open Source Edition)

> An automated lead-generation engine built to find local businesses missing out on digital traffic. 

LeadScanner Pro uses Node.js, MySQL, and the Google Places API to dynamically scan geographic areas for specific niches (e.g., "Plumbers in Austin"). It isolates businesses that either have **no website at all** or rely entirely on **third-party booking links** (Linktree, Calendly, etc.), making them perfect targets for web design outreach.

---
## 🎓 Why I Made This Open-Source (The College Side-Hustle)
I made this repository completely free and open-source specifically for **other college students who want to try making their own money.** College is the best time to experiment with side hustles. Instead of manually clicking through Google Maps to find web design clients, or paying $50/month for expensive enterprise lead-gen software, I wanted to build my own pipeline. I am sharing the code so you can spin up your own lead-generation business this weekend. 

---

## 🤖 How This Was Built (Full AI Transparency)
I believe in building in public. **I used AI to write the entirety of the front-end code (HTML/CSS/JS) and the core `server.js` backend.**

So, what was my actual role? **System Architect and Product Manager.** While the AI acted as my junior developer, my job was to:
* Design the system architecture and business logic.
* Engineer the specific prompts required to get functional, secure code.
* Set up, configure, and connect the MySQL database schema.
* Troubleshoot CORS errors, API payload issues, and environment variables.
* Protect user security by enforcing `bcrypt` password hashing and API key hiding.

If you are a student learning to code, this repository is a perfect example of how to use AI not just as a chatbot, but as an engine to turn an idea into a functional business tool in a matter of days.

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (AI-Generated)
* **Backend:** Node.js, Express.js (AI-Generated)
* **Database:** MySQL2 (with Promises)
* **Security:** bcrypt (Password Hashing), CORS, Environment Variables
* **External APIs:** Google Places API (New)

---

## ⚙️ Installation & Setup (Takes ~1-2 Hours)

### 1. Prerequisites
You will need the following installed on your machine:
* [Node.js](https://nodejs.org/)
* MySQL Server
* A [Google Cloud Console](https://console.cloud.google.com/) account with the **Places API (New)** enabled and an API Key.

### 2. Clone the Repository
```bash
git clone [https://github.com/YourUsername/LeadScanner.git](https://github.com/YourUsername/LeadScanner.git)
cd LeadScanner

## 3. Dependencies
npm install express mysql2 cors dotenv bcrypt

## 4. Database Setup

CREATE DATABASE leadscanner_db;
USE leadscanner_db;

-- Create Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Leads Database
CREATE TABLE scanned_leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    google_place_id VARCHAR(255) UNIQUE,
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    website_url VARCHAR(500),
    phone_number VARCHAR(50),
    address VARCHAR(255),
    rating DECIMAL(3,1),
    review_count INT,
    search_keyword VARCHAR(100),
    search_location VARCHAR(100),
    is_third_party_booking BOOLEAN,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## Enviroment Variables
Create a file named .env in the root directory. Never commit this file to GitHub. Add your database credentials and Google API key:
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=leadscanner_db
mapsAPI=your_google_places_api_key_here
