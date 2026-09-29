const express = require("express");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = 3000;

// MongoDB connection
const client = new MongoClient("mongodb://localhost:27017/");

// File path for audit log
const auditFile = path.join(__dirname, "audit.log");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Custom EventEmitter
const userEvents = new EventEmitter();

// Write activity to audit.log
function logActivity(message) {
    const timestamp = new Date().toISOString();

    fs.appendFileSync(
        auditFile,
        `[${timestamp}] ${message}\n`
    );
}

// Signup event
userEvents.on("signup", (user) => {
    logActivity(`New user registered: ${user.email}`);
});

// Login event
userEvents.on("login", (user) => {
    logActivity(`User logged in: ${user.email}`);
});

// Start server
async function startServer() {
    try {
        await client.connect();

        console.log("MongoDB connected successfully!");

        const db = client.db("emea");
        const users = db.collection("users");

        // Ensure email addresses are unique
        await users.createIndex(
            { emailLower: 1 },
            { unique: true }
        );

        // Sign Up
        app.post("/signup", async (req, res) => {
            try {
                const { name, email, password } = req.body;
                if (!name || !email || !password) {
                    return res.status(400).json({
                        success: false,
                        message: "All fields are required."
                    });
                }

                const emailLower = email.trim().toLowerCase();

                const existingUser = await users.findOne({
                    emailLower: emailLower
                });

                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: "Email already registered."
                    });
                }

                const newUser = {
                    name,
                    email: email.trim(),
                    emailLower,
                    password
                };

                await users.insertOne(newUser);

                userEvents.emit("signup", newUser);

                res.status(201).json({
                    success: true,
                    message: "Registration successful!"
                });

            } catch (error) {
                if (error.code === 11000) {
                    return res.status(409).json({
                        success: false,
                        message: "Email already registered."
                    });
                }

                console.error("Signup error:", error);

                res.status(500).json({
                    success: false,
                    message: "Server error."
                });
            }
        });

        // Login
        app.post("/login", async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({
                        success: false,
                        message: "Email and password are required."
                    });
                }

                const user = await users.findOne({
                    emailLower: email.trim().toLowerCase(),
                    password: password
                });

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid email or password."
                    });
                }

                userEvents.emit("login", user);

                res.json({
                    success: true,
                    message: "Login successful!",
                    name: user.name
                });

            } catch (error) {
                console.error("Login error:", error);

                res.status(500).json({
                    success: false,
                    message: "Server error."
                });
            }
        });

        // Start Express
        app.listen(PORT, () => {
            console.log(
                `Server running at http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error("Server startup error:", error);
    }
}

startServer();