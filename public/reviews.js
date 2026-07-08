const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

// Helper: read reviews from JSON file
function readReviews() {
    try {
        if (!fs.existsSync(REVIEWS_FILE)) return [];
        const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Helper: write reviews to JSON file
function writeReviews(reviews) {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
}

// GET /api/reviews?productId=xxx
router.get('/', (req, res) => {
    const productId = req.query.productId;
    if (!productId) {
        return res.status(400).json({ success: false, message: 'productId required' });
    }
    const all = readReviews();
    const filtered = all.filter(r => r.productId === productId);
    res.json({ success: true, reviews: filtered });
});

// POST /api/reviews
router.post('/', (req, res) => {
    const { productId, userName, userEmail, rating, comment, imageDataUrl } = req.body;
    if (!productId || !userName || !rating || !comment) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const reviews = readReviews();
    const newReview = {
        id: Date.now() + Math.random() * 1000,
        productId,
        userName,
        userEmail: userEmail || userName,
        rating: parseInt(rating),
        comment,
        imageDataUrl: imageDataUrl || null,
        dateDisplay: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    reviews.unshift(newReview);
    writeReviews(reviews);
    res.json({ success: true, review: newReview });
});

// DELETE /api/reviews/:id
router.delete('/:id', (req, res) => {
    const id = parseFloat(req.params.id);
    let reviews = readReviews();
    const index = reviews.findIndex(r => r.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Review not found' });
    }
    reviews.splice(index, 1);
    writeReviews(reviews);
    res.json({ success: true });
});

module.exports = router;