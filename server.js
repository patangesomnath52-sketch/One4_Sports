const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// MongoDB
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// API ROUTES
app.get('/api/products', async (req, res) => {
    const products = await mongoose.model('Product').find().sort({ createdAt: -1 });
    res.json({ success: true, products });
});

// ORDER ROUTES
app.get('/api/orders', async (req, res) => {
    const orders = await mongoose.model('Order').find().sort({ date: -1 });
    res.json({ success: true, orders });
});

// --- THE FIX FOR "NOT FOUND" ---
// This tells Express to serve your built React files
app.use(express.static(path.join(__dirname, 'frontend/build')));

// This ensures all other traffic is sent to React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));