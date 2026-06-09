const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 1. Cloudinary Setup
cloudinary.config({
    cloud_name: 'dcxsebtas', 
    api_key: '872585929966168',
    api_secret: 't490x7y5jzQhZrJ8juEhNmjmLwI'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'rj_sports_products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

// 2. MongoDB Connection
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority"; 
mongoose.connect(MONGO_URI).then(() => console.log("✅ MongoDB Connected!"));

// 3. Database Schemas
const Product = mongoose.model('Product', new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String,
    price: Number,
    category: String,
    images: [String],
    isOutOfStock: { type: Boolean, default: false }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: String,
    customer: String,
    phone: String,
    total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now }
}));

// 4. API Routes

// ADD/UPDATE PRODUCT (With Upsert to prevent duplicate errors)
app.post('/api/products/add', upload.array('productImages', 3), async (req, res) => {
    try {
        const imagePaths = req.files.map(file => file.path);
        const { productId, name, price, category } = req.body;

        const updateData = {
            name,
            price: parseFloat(price),
            category,
            isOutOfStock: false // Ensure it's not hidden by "Sold Out" filter
        };

        if (imagePaths.length > 0) updateData.images = imagePaths;

        await Product.findOneAndUpdate(
            { productId },
            { $set: updateData },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "✅ Product Saved/Updated Successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// Add this to your server.js
app.post('/api/products/add', async (req, res) => {
    try {
        const newProduct = new Product(req.body); // Assumes 'Product' is your MongoDB model
        await newProduct.save();
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Add these routes to your server.js
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find(); // Matches your Order DB model
        res.json({ orders });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products/update', async (req, res) => {
    try {
        const { name, sizes, status } = req.body;
        await Product.findOneAndUpdate({ name }, { availableSizes: sizes, stockStatus: status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// GET ALL PRODUCTS (This must be separate and come before the /:id route)
app.get('/api/products', async (req, res) => {
    try {
        // This finds all products in your MongoDB database
        const products = await Product.find(); 
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
});

// GET SINGLE PRODUCT DETAILS
app.get('/api/products/:id', async (req, res) => {
    try {
        // We use req.params.id to catch the "s2" from the URL
        const product = await Product.findOne({ productId: req.params.id });
        
        if (product) {
            res.json({ success: true, product });
        } else {
            // If the ID doesn't exist in MongoDB, it returns 404
            res.status(404).json({ success: false, message: "Product not found in database" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// GET ALL ORDERS
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json({ success: true, orders });
    } catch (err) { 
        res.status(500).json({ success: false }); 
    }
});

// DELETE PRODUCT
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findOneAndDelete({ productId: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));