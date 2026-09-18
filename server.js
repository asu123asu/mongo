const express = require("express");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");

const app = express();
const PORT = 3000;

// File paths
const usersFile = path.join(__dirname, "users.json");
const auditFile = path.join(__dirname, "audit.log");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Custom EventEmitter
const userEvents = new EventEmitter();

// Read users from users.json
function readUsers() {
    try {
        const data = fs.readFileSync(usersFile, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Save users to users.json
function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

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

// Sign Up
app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    const users = readUsers();

    const existingUser = users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "Email already registered."
        });
    }

    const newUser = {
        name,
        email,
        password
    };

    users.push(newUser);
    saveUsers(users);

    userEvents.emit("signup", newUser);

    res.status(201).json({
        success: true,
        message: "Registration successful!"
    });
});

// Login
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    const users = readUsers();

    const user = users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === password
    );

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
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
