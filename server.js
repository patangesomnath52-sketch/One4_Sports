const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// MongoDB
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// API Routes (Keeping your original logic)
app.get('/api/products', async (req, res) => {
    const products = await mongoose.model('Product').find().sort({ createdAt: -1 });
    res.json({ success: true, products });
});

app.get('/api/orders', async (req, res) => {
    const orders = await mongoose.model('Order').find().sort({ date: -1 });
    res.json({ success: true, orders });
});

// --- THE FOOLPROOF PRODUCTION BRIDGE ---
const potentialPaths = [
    path.join(__dirname, 'frontend', 'build'),
    path.join(__dirname, 'client', 'build'),
    path.join(__dirname, 'build')
];

let foundPath = null;
for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
        foundPath = p;
        break;
    }
}

if (foundPath) {
    console.log(`✅ Serving frontend from: ${foundPath}`);
    app.use(express.static(foundPath));
    app.get('*', (req, res) => res.sendFile(path.join(foundPath, 'index.html')));
} else {
    console.error("❌ CRITICAL: Could not find build folder! Searched in:", potentialPaths);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));