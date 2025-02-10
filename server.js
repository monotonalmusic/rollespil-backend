const express = require('express');
const cors = require('cors'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const metadataFilePath = './metadata.json'; // Path to store metadata

app.use(cors()); 

let uploadedItems = []; // Array to store uploaded items metadata

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure metadata file exists
if (!fs.existsSync(metadataFilePath)) {
    fs.writeFileSync(metadataFilePath, JSON.stringify([], null, 2), 'utf-8');
}

// Function to load metadata from the JSON file
function loadExistingUploads() {
    if (fs.existsSync(metadataFilePath)) {
        const data = fs.readFileSync(metadataFilePath, 'utf-8');
        uploadedItems = JSON.parse(data);
    }
}

// Load metadata when the server starts
loadExistingUploads();

// Function to save metadata to the JSON file
function saveMetadataToFile() {
    fs.writeFileSync(metadataFilePath, JSON.stringify(uploadedItems, null, 2), 'utf-8');
}

// Set storage for Multer
const storage = multer.diskStorage({
    destination: uploadDir, // Store images in the uploads folder
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize Multer for file uploads
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 } // 10MB file size limit
}).single('image');

// Middleware to parse JSON and URL-encoded form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve uploaded images as static files
app.use('/uploads/', express.static(uploadDir));

/**
 * GET: Retrieve all uploaded metadata
 */
app.get('/uploads-data/', (req, res) => {
    res.json(uploadedItems);
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

