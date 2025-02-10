const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const metadataFilePath = './metadata.json'; // Path to store the metadata
let uploadedItems = []; // Array to store uploaded items metadata

// Set storage for Multer
const storage = multer.diskStorage({
    destination: './uploads/', // Folder to store the uploaded files
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 } // 10MB file size limit
}).single('image');

// Middleware to parse form fields
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Function to save metadata to file
function saveMetadataToFile() {
    fs.writeFileSync(metadataFilePath, JSON.stringify(uploadedItems, null, 2), 'utf-8');
}

// Load metadata from the file when the server starts
function loadExistingUploads() {
    if (fs.existsSync(metadataFilePath)) {
        const data = fs.readFileSync(metadataFilePath, 'utf-8');
        uploadedItems = JSON.parse(data);
    }
}

// Call the function to load existing uploads when the server starts
loadExistingUploads();

// POST route to handle image and event data
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.log('Upload Error:', err);
            return res.status(400).send('Error uploading file.');
        }

        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Get additional form data (Navn, Race, Klasse, Styrker, Svageheder, Mere om..)
        const { Navn, Race, Klasse, Styrker, Svageheder, MereOm } = req.body;

        // Check if the additional fields are received
        if (!Navn || !Race || !Klasse || !Styrker || !Svageheder || !MereOm) {
            return res.status(400).send('Missing required details.');
        }

        // Save the uploaded data (in memory and metadata.json)
        const newItem = {
            filePath: `/uploads/${req.file.filename}`,
            Navn,
            Race,
            Klasse,
            Styrker,
            Svageheder,
            MereOm
        };

        uploadedItems.push(newItem);
        saveMetadataToFile(); // Save metadata after every upload

        // Respond with the file path and other form data
        res.json(newItem);
    });
});

// DELETE route to delete an uploaded item
app.delete('/delete', (req, res) => {
    const { filePath } = req.query;

    // Find the index of the item to delete
    const index = uploadedItems.findIndex(item => item.filePath === filePath);
    if (index === -1) {
        return res.status(404).send('Item not found.');
    }

    // Remove the file from the file system
    const fileName = path.join(__dirname, filePath);
    fs.unlink(fileName, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Error deleting file.');
        }

        // Remove the item from the uploadedItems array
        uploadedItems.splice(index, 1);
        saveMetadataToFile(); // Save updated metadata after deletion

        res.sendStatus(200);
    });
});

// PUT route to edit existing uploads including image replacement
app.put('/edit', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Upload Error:', err);
            return res.status(400).send('Error uploading file.');
        }

        const { filePath, Navn, Race, Klasse, Styrker, Svageheder, MereOm } = req.body;

        // Check if filePath is provided
        if (!filePath) {
            return res.status(400).send('filePath is required.');
        }

        // Find the index of the item to edit
        const index = uploadedItems.findIndex(item => item.filePath === filePath);
        if (index === -1) {
            return res.status(404).send('Item not found.');
        }

        // If there's a new file, update the image path
        let updatedFilePath = uploadedItems[index].filePath;
        if (req.file) {
            // Remove the old image file
            const oldFileName = path.join(__dirname, uploadedItems[index].filePath);
            fs.unlink(oldFileName, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting old file:', unlinkErr);
            });

            // Update the filePath to the new uploaded file
            updatedFilePath = `/uploads/${req.file.filename}`;
        }

        // Update the item's metadata
        uploadedItems[index] = {
            filePath: updatedFilePath,  // Update the file path if image was changed
            Navn,
            Race,
            Klasse,
            Styrker,
            Svageheder,
            MereOm
        };

        // Save the updated metadata to file
        saveMetadataToFile();

        // Respond with the updated item
        res.json(uploadedItems[index]);
    });
});


// Serve the uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GET route to retrieve all uploaded items
app.get('/uploads-data', (req, res) => {
    res.json(uploadedItems);
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
