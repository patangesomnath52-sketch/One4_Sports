const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const path = require('path');

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// ===== CLOUDINARY =====
cloudinary.config({
    cloud_name: 'dcxsebtas',
    api_key: '872585929966168',
    api_secret: 't490x7y5jzQhZrJ8juEhNmjmLwI'
});
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'rj_sports_products', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] },
});
const upload = multer({ storage: storage });

// ===== DATABASE =====
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ===== MODELS =====
const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String,
    description: String,   // <-- added description field
    price: Number,
    category: String,
    images: [String],
    // We'll store sizes as an array of objects { size: "UK 7", status: "Available" }
    // But we also accept 'availableSizes' from frontend (array of strings) and convert
    sizes: [{
        size: String,
        status: { type: String, default: 'Available' }
    }],
    stockStatus: { type: String, default: 'in-stock' }
});
const Product = mongoose.model('Product', productSchema);

const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: String, customer: String, phone: String, email: String, total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now },
    items: [{ name: String, price: Number, quantity: Number, size: String, image: String }]
}));

const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    referralCode: { type: String, unique: true },
    referredBy: String,
    points: { type: Number, default: 0 }
}));

// ===== REVIEW MODEL (ONLY ONCE!) =====
const reviewSchema = new mongoose.Schema({
    productId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
    imageDataUrl: String,
    dateDisplay: String,
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

// ===== ROUTES =====

// PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ productId: req.params.id });
        if (!product) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, product });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ADD / UPDATE PRODUCT (handles both 'sizes' array of objects and 'availableSizes' array of strings)
app.post('/api/products/add', async (req, res) => {
    try {
        const { productId, name, description, price, category, stockStatus, sizes, availableSizes, images } = req.body;

        // Build the sizes array: if 'sizes' provided (array of objects) use that; else convert 'availableSizes' (strings) to objects
        let finalSizes = [];
        if (sizes && Array.isArray(sizes) && sizes.length > 0) {
            finalSizes = sizes; // assume already { size, status }
        } else if (availableSizes && Array.isArray(availableSizes) && availableSizes.length > 0) {
            // Convert string array to { size, status: 'Available' }
            finalSizes = availableSizes.map(s => ({ size: s, status: 'Available' }));
        }

        const updateData = {
            name,
            description: description || '',
            price,
            category,
            stockStatus: stockStatus || 'in-stock',
            sizes: finalSizes,
            images: images || []
        };

        const newProduct = await Product.findOneAndUpdate(
            { productId },
            updateData,
            { upsert: true, new: true }
        );
        res.json({ success: true, product: newProduct });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ORDERS
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed" });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        await new Order(req.body).save();
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update order status (PATCH)
app.patch('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const order = await Order.findOneAndUpdate(
            { orderId },
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// REFERRAL & POINTS
app.post('/api/add-referral-points', async (req, res) => {
    const { referrerCode, points } = req.body;
    try {
        await User.findOneAndUpdate({ referralCode }, { $inc: { points: points } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Could not update points" });
    }
});

app.post('/api/register-user', async (req, res) => {
    const { email, name, referredBy } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (!existing) {
            const newCode = name.substring(0,3).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
            await User.create({
                email,
                referralCode: newCode,
                referredBy,
                points: 0
            });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Sync failed" });
    }
});

app.post('/api/complete-purchase', async (req, res) => {
    const { total, referredBy, purchaserEmail } = req.body;
    try {
        const purchasePoints = Math.floor(total * 0.05);
        await User.findOneAndUpdate({ email: purchaserEmail }, { $inc: { points: purchasePoints } });
        if (referredBy) {
            await User.findOneAndUpdate({ referralCode: referredBy }, { $inc: { points: 50 } });
        }
        res.json({ success: true, pointsEarned: purchasePoints });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get('/api/user-data', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ===== REVIEW ROUTES =====
app.get('/api/reviews', async (req, res) => {
    const productId = req.query.productId;
    if (!productId) return res.status(400).json({ success: false, message: 'productId required' });
    try {
        const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    const { productId, userName, userEmail, rating, comment, imageDataUrl } = req.body;
    if (!productId || !userName || !rating || !comment) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    try {
        const newReview = new Review({
            productId,
            userName,
            userEmail: userEmail || userName,
            rating: parseInt(rating),
            comment,
            imageDataUrl: imageDataUrl || null,
            dateDisplay: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        });
        await newReview.save();
        res.json({ success: true, review: newReview });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        const result = await Review.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== CATCH-ALL =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));