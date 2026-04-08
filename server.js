const dotenv = require('dotenv');
dotenv.config(); // This loads environment vars from .env file
const express = require('express'); // web framework for node.js
const mysql = require('mysql2'); // MySQL 
const cors = require('cors');
const path = require('path'); // For file paths...
const bcrypt = require('bcrypt');

const app = express(); // Initialize express 

/*
    - CORS: Cross-Origin Resource Sharing allows javascript to make requests to express server from a different domain.
    - What is SOP (Same Origin Policy)? Scheme, Domain, and Port must match for the browser to allow Js to access the response.
    - CORS allows us to bypass SOP by essentially saying to the browser I know this request but its safe so allow it.
*/
app.use(cors()); 
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise(); // It is the more modern way. So we dont have to implement callbacks within callbacks
// Promise is javascript object that represents that an asynchronous operation has completed (failed or successful)

db.query("SELECT 1") // This is our initial test query to ensure connection with database.
    .then(() => console.log("Connected to MySQL Database."))
    .catch(err => console.error("DB Connection Error: ", err.message));

// 2. REGISTER ROUTE 
// When the user Clicks the register button on the frontend,
// It triggers this function. We take the user input, validate it, hash the password, and then pass it to DB
app.post('/register', async (req, res) => { 
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) { // Make sure all values are in.
        return res.status(400).json({ message: "All fields are required" });
    }
    
    try {
        const saltRounds = 10; // introduces a random string into hashing to make it secure.
        const hashedPassword = await bcrypt.hash(password, saltRounds); // One way function
        
        // Simplified for MVP: We just insert the user directly. 
        // Dashboard tables were removed to keep the architecture clean and fast.
        await db.query(
            // Introducing ? to prevent SQL injection by treating user input as data and not executable code.
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)", 
            [firstName, lastName, email, hashedPassword] 
        );
        
        res.status(201).json({ message: "Account Created Successfully" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: "Email already in use" });
        res.status(500).json({ message: "Server error during registration" });
    }
});

// 3. LOGIN ROUTE (Left intact)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    
    try {
        const [results] = await db.query(
            "SELECT user_id, first_name, last_name, email, password_hash FROM users WHERE email = ?", [email]
        );
        
        if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            res.json({ userId: user.user_id, firstName: user.first_name, lastName: user.last_name, email: user.email });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: "Database Error" });
    }
});

// 4. SCAN AREA ROUTE 
app.post('/api/scan', async (req, res) => {
    // Extract data from the frontend request body
    const { keyword, location, pageToken, userId } = req.body;

    if (!keyword || !location) {
        return res.status(400).json({ message: "Keyword and location are required" });
    }
    if (!userId) {
        return res.status(401).json({ message: "Authentication Error: Please log in to scan." });
    }

    const searchQuery = `${keyword} in ${location}`;
    const apiKey = process.env.mapsAPI;

    const thirdPartyDomains = [
        'calendly.com', 'square.site', 'squareup.com', 'vagaro.com', 
        'fresha.com', 'booksy.com', 'mindbodyonline.com', 'linktr.ee', 
        'glossgenius.com', 'facebook.com', 'instagram.com'
    ];

    try {
        // Build the request body. If we have a pageToken, attach it!
        const requestBody = { textQuery: searchQuery };
        if (pageToken) {
            requestBody.pageToken = pageToken;
        }

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.reservable,nextPageToken'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            console.error("\n❌ GOOGLE API ERROR:", data.error.message);
            return res.status(500).json({ message: `Google API Error: ${data.error.message}` });
        }

        if (!data.places || data.places.length === 0) {
            console.log("✅ Google API worked, but found 0 results for that search.");
            return res.status(200).json({ results: [], nextPageToken: null });
        }

        console.log(`✅ Google found ${data.places.length} total businesses in this batch. Processing...`);
        
        const valuesToSave = data.places.map(place => {
            const url = place.websiteUri ? place.websiteUri.toLowerCase() : '';
            const hasBookingIntegration = place.reservable === true;
            
            const isThirdPartyLink = thirdPartyDomains.some(domain => url.includes(domain));
            const isThirdPartyBooking = isThirdPartyLink || (hasBookingIntegration && !url);

            return [
                place.id,                                    
                place.displayName?.text || 'Unknown',        
                place.primaryTypeDisplayName?.text || null,  
                place.websiteUri || null,                    
                place.nationalPhoneNumber || null,           
                place.formattedAddress || null,              
                place.rating || null,                        
                place.userRatingCount || null,               
                keyword,                                     
                location,
                isThirdPartyBooking
            ];
        });

        // Save everything to the global database
        await db.query(
            `INSERT IGNORE INTO scanned_leads 
            (google_place_id, business_name, business_type, website_url, phone_number, address, rating, review_count, search_keyword, search_location, is_third_party_booking) 
            VALUES ?`, 
            [valuesToSave]
        );

        // Filter the targets for the UI display
        const targetLeadsForUI = data.places.filter(place => {
            const url = place.websiteUri ? place.websiteUri.toLowerCase() : '';
            const isThirdPartyLink = thirdPartyDomains.some(domain => url.includes(domain));
            
            return !url || isThirdPartyLink; 
        });

        console.log(`🎯 Found ${targetLeadsForUI.length} viable targets (No Site or Third-Party). Sending to UI.`);

        // Send the targets and the nextPageToken back to the frontend
        res.status(200).json({ 
            results: targetLeadsForUI,
            nextPageToken: data.nextPageToken || null 
        });

    } catch (error) {
        console.error("Server Fetch Error:", error);
        res.status(500).json({ message: "Failed to scan area due to server error" });
    }
});

// 5. GET ALL LEADS ROUTE
app.get('/api/leads', async (req, res) => {
    try {
        const [leads] = await db.query("SELECT * FROM scanned_leads ORDER BY scanned_at DESC");
        res.status(200).json({ leads });
    } catch (error) {
        console.error("Database Error Fetching Leads:", error);
        res.status(500).json({ message: "Failed to load leads" });
    }
});

app.listen(3000, () => console.log("Server running at: http://localhost:3000/index.html"));