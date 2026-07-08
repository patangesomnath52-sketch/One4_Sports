const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const path = require('path');

const app = express(); // ✅ only one app declaration

// ===== MIDDLEWARE (MUST BE BEFORE ROUTES) =====
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// ===== CLOUDINARY (optional – only if you use file uploads) =====
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
// Updated Product schema to store sizes as array of objects {size, status}
const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String, 
    price: Number, 
    category: String, 
    images: [String],
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

app.post('/api/products/add', async (req, res) => {
    try {
        const { productId, name, price, category, stockStatus, sizes, images } = req.body;
        // images should be an array of base64 strings (or Cloudinary URLs)
        console.log("Received product with", images ? images.length : 0, "images and", sizes ? sizes.length : 0, "sizes");

        const newProduct = await Product.findOneAndUpdate(
            { productId },
            { name, price, category, stockStatus, sizes, images },
            { upsert: true, new: true }
        );
        res.json({ success: true });
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

// ===== REVIEWS ROUTES (new) =====
const reviewsRouter = require('./reviews');
app.use('/api/reviews', reviewsRouter);

// ===== CATCH-ALL FOR SPA =====
app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));