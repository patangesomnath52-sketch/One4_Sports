const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Required for serving frontend files

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// ------------------------------
// 1. MongoDB Connection
// ------------------------------
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ------------------------------
// 2. Database Schemas
// ------------------------------
const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String,
    price: Number,
    category: String,
    description: String,
    images: [String],
    isOutOfStock: { type: Boolean, default: false },
    availableSizes: [String], 
    sizes: [{ size: String, status: String }],
    stockStatus: String 
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    orderId: String,
    customer: String,
    total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now },
    items: [{ 
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        image: String
    }],
    address: String
});

const Order = mongoose.model('Order', orderSchema);

// ------------------------------
// 3. API ROUTES
// ------------------------------

// Product Routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
});

app.post('/api/products/add', async (req, res) => {
    try {
        const { productId, name, price, category, description, images, sizes, stockStatus } = req.body;
        if (!productId || !name || !price) return res.status(400).json({ success: false, message: "Missing required fields" });
        
        const availableSizes = sizes ? sizes.filter(s => s.status !== 'Sold Out').map(s => s.size) : [];
        const updateData = {
            name, price: parseFloat(price), category: category || 'Uncategorized',
            description: description || '', isOutOfStock: stockStatus === 'out-of-stock',
            sizes: sizes || [], availableSizes, stockStatus: stockStatus || 'in-stock', images: images || [] 
        };

        const updatedProduct = await Product.findOneAndUpdate({ productId }, { $set: updateData }, { upsert: true, new: true });
        res.status(201).json({ success: true, product: updatedProduct });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Order Routes
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.status(200).json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: "Order failed" });
    }
});

// ------------------------------
// 4. PRODUCTION BRIDGE (Fixes 404s)
// ------------------------------
// Serve static files from the React frontend build folder
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Handle React routing (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// ------------------------------
// 5. Start Server
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));