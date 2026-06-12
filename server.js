const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const path = require('path');

const app = express();

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
    name: String, price: Number, category: String, images: [String],
    isOutOfStock: { type: Boolean, default: false },
    availableSizes: [String], stockStatus: String
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: String, customer: String, phone: String, email: String, total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now },
    items: [{ name: String, price: Number, quantity: Number, size: String, image: String }]
}));

// Routes
app.get('/api/products', async (req, res) => {
    try { const products = await Product.find(); res.json({ success: true, products }); }
    catch (err) { res.status(500).json({ success: false, message: "Server error" }); }
});

app.get('/api/products/:id', async (req, res) => {
    try { const product = await Product.findOne({ productId: req.params.id });
    res.json({ success: true, product }); }
    catch (err) { res.status(500).json({ success: false, message: "Server error" }); }
});

app.post('/api/products/add', upload.array('productImages', 3), async (req, res) => {
    try {
        const { productId, name, price, category, availableSizes, stockStatus, images } = req.body;
        const finalImages = [...(images ? JSON.parse(images) : []), ...(req.files ? req.files.map(f => f.path) : [])];
        const updated = await Product.findOneAndUpdate({ productId }, { name, price, category, isOutOfStock: stockStatus === 'out-of-stock', availableSizes: availableSizes?.split(','), stockStatus, images: finalImages }, { upsert: true, new: true });
        res.json({ success: true, product: updated });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try { const orders = await Order.find().sort({ date: -1 }); res.json({ success: true, orders }); }
    catch (err) { res.status(500).json({ success: false, message: "Failed" }); }
});

app.post('/api/orders', async (req, res) => {
    try { await new Order(req.body).save(); res.status(201).json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));