<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$file = 'reviews.json'; // will be created in the same folder

function getReviews() {
    global $file;
    if (!file_exists($file)) return [];
    $data = file_get_contents($file);
    return json_decode($data, true) ?: [];
}

function saveReviews($reviews) {
    global $file;
    file_put_contents($file, json_encode($reviews, JSON_PRETTY_PRINT));
}

// GET
if ($method === 'GET') {
    $productId = $_GET['productId'] ?? '';
    if (!$productId) {
        echo json_encode(['success' => false, 'message' => 'productId required']);
        exit;
    }
    $all = getReviews();
    $filtered = array_filter($all, function($r) use ($productId) {
        return $r['productId'] === $productId;
    });
    echo json_encode(['success' => true, 'reviews' => array_values($filtered)]);
    exit;
}

// POST
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $required = ['productId', 'userName', 'rating', 'comment'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            echo json_encode(['success' => false, 'message' => "Missing $field"]);
            exit;
        }
    }
    $reviews = getReviews();
    $newReview = [
        'id' => time() + rand(1, 1000),
        'productId' => $input['productId'],
        'userName' => $input['userName'],
        'userEmail' => $input['userEmail'] ?? $input['userName'],
        'rating' => (int)$input['rating'],
        'comment' => $input['comment'],
        'imageDataUrl' => $input['imageDataUrl'] ?? null,
        'dateDisplay' => date('d M Y')
    ];
    array_unshift($reviews, $newReview);
    saveReviews($reviews);
    echo json_encode(['success' => true, 'review' => $newReview]);
    exit;
}

// DELETE
if ($method === 'DELETE') {
    $path = explode('/', $_SERVER['REQUEST_URI']);
    $id = end($path);
    if (!is_numeric($id)) {
        echo json_encode(['success' => false, 'message' => 'Invalid review ID']);
        exit;
    }
    $reviews = getReviews();
    $found = false;
    foreach ($reviews as $key => $r) {
        if ($r['id'] == $id) {
            unset($reviews[$key]);
            $found = true;
            break;
        }
    }
    if (!$found) {
        echo json_encode(['success' => false, 'message' => 'Review not found']);
        exit;
    }
    saveReviews(array_values($reviews));
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);