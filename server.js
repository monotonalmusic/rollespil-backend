const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const metadataFilePath = './metadata.json'; // Path to store metadata

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
app.use('/uploads', express.static(uploadDir));

/**
 * POST: Upload image and text data
 */
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Upload Error:', err);
            return res.status(400).send('Error uploading file.');
        }

        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Get form data
        const { Navn, Race, Klasse, Styrker, Svageheder, MereOm } = req.body;

        // Validate input fields
        if (!Navn || !Race || !Klasse || !Styrker || !Svageheder || !MereOm) {
            return res.status(400).send('Missing required details.');
        }

        // Create new item object
        const newItem = {
            id: Date.now(), // Unique ID
            filePath: `/uploads/${req.file.filename}`,
            Navn,
            Race,
            Klasse,
            Styrker,
            Svageheder,
            MereOm
        };

        // Add new item to array and save metadata
        uploadedItems.push(newItem);
        saveMetadataToFile();

        res.json(newItem);
    });
});

/**
 * GET: Retrieve all uploaded metadata
 */
app.get('/uploads-data', (req, res) => {
    res.json(uploadedItems);
});

/**
 * DELETE: Delete an uploaded image and its metadata
 */
app.delete('/delete', (req, res) => {
    const { id } = req.query; // Use ID for deletion

    // Find the item index
    const index = uploadedItems.findIndex(item => item.id == id);
    if (index === -1) {
        return res.status(404).send('Item not found.');
    }

    // Remove the file from the file system
    const fileName = path.join(__dirname, uploadedItems[index].filePath);
    fs.unlink(fileName, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Error deleting file.');
        }

        // Remove item from metadata array and save
        uploadedItems.splice(index, 1);
        saveMetadataToFile();

        res.sendStatus(200);
    });
});

/**
 * PUT: Edit existing uploads, including image replacement
 */
app.put('/edit', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Upload Error:', err);
            return res.status(400).send('Error uploading file.');
        }

        const { id, Navn, Race, Klasse, Styrker, Svageheder, MereOm } = req.body;

        // Find item index
        const index = uploadedItems.findIndex(item => item.id == id);
        if (index === -1) {
            return res.status(404).send('Item not found.');
        }

        // Get existing file path
        let updatedFilePath = uploadedItems[index].filePath;

        // If a new image is uploaded, replace the old one
        if (req.file) {
            // Remove old file
            const oldFilePath = path.join(__dirname, uploadedItems[index].filePath);
            fs.unlink(oldFilePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting old file:', unlinkErr);
            });

            // Update to new file path
            updatedFilePath = `/uploads/${req.file.filename}`;
        }

        // Update metadata
        uploadedItems[index] = {
            id: parseInt(id), // Maintain ID
            filePath: updatedFilePath,
            Navn,
            Race,
            Klasse,
            Styrker,
            Svageheder,
            MereOm
        };

        saveMetadataToFile();

        res.json(uploadedItems[index]);
    });
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
