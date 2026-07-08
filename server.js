
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const path = require('path');
const express = require('express');
const app = express();

// IMPORTANT: allow large JSON payloads (for base64 images)


// ... your other routes ...

const reviewsRouter = require('./reviews');
app.use('/api/reviews', reviewsRouter);



// Add these lines at the top of your server.js, BEFORE your routes
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary
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

// Database
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Models
const Product = mongoose.model('Product', new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String, 
    price: Number, 
    category: String, 
    images: [String],
    availableSizes: [String], 
    stockStatus: { type: String, default: 'in-stock' }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: String, customer: String, phone: String, email: String, total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now },
    items: [{ name: String, price: Number, quantity: Number, size: String, image: String }]
}));
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    referralCode: { type: String, unique: true },
    referredBy: String, // <--- Add this
    points: { type: Number, default: 0 }
}));
// Routes
// In server.js, ensure this route returns the latest data
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
        // Ensure images is actually being passed from the frontend
        const { productId, name, price, category, stockStatus, availableSizes, images } = req.body;
        
        // Log to see if images are arriving correctly
        console.log("Received product with", images.length, "images");

        const newProduct = await Product.findOneAndUpdate(
            { productId: productId },
            { name, price, category, stockStatus, availableSizes, images },
            { upsert: true, new: true }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try { const orders = await Order.find().sort({ date: -1 }); res.json({ success: true, orders }); }
    catch (err) { res.status(500).json({ success: false, message: "Failed" }); }
});

app.post('/api/orders', async (req, res) => {
    try { await new Order(req.body).save(); res.status(201).json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/add-referral-points', async (req, res) => {
    const { referrerCode, points } = req.body;
    try {
        // Find user by referralCode and update points
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
                referredBy: referredBy, // Link the referrer here
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
        // 1. Calculate points securely on the server
        const purchasePoints = Math.floor(total * 0.05);

        // 2. Add points to the purchaser
        await User.findOneAndUpdate(
            { email: purchaserEmail }, 
            { $inc: { points: purchasePoints } }
        );

        // 3. Add referral points if a code exists
        if (referredBy) {
            await User.findOneAndUpdate(
                { referralCode: referredBy }, 
                { $inc: { points: 50 } } // Bonus for referral
            );
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

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));