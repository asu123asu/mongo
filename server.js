const express = require('express');
const fs = require('fs'); // Node's built-in File System module
const path = require('path');
const app = express();
// 1. Host the website: Tell Express to serve the 'public' folder
app.use(express.static('public'));

// 2. The API: Read the JSON file and send it to the website
app.get('/api/users', (req, res) => {
  // Read the users.json file
  const filePath = path.join(__dirname, 'users.json');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send("Error reading file");
    }
    
    // Convert the text data into JSON and send it back to the frontend
    res.json(JSON.parse(data));
  });
});

// 3. Start the server
app.listen(3000, () => {
  console.log('Server is running! Open http://localhost:3000 in your browser.');
});