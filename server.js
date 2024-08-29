const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const AWS = require('aws-sdk');
const { Readable } = require('stream');
const userModels = require('./model/userModel');
const verificationModels = require('./model/verificationModel');
const payment = require("./model/payment");
const userRouter = require('./routes/userRoutes');
const { protect } = require('./helper/authMiddleware');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const conn = require('./config/dbConnection');
const rawBody = require('raw-body');

const app = express();
const PORT = 8000;
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Stripe webhook endpoint
// Stripe webhook endpoint
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const buffer = req.body; // Stripe raw body middleware should have set this

  try {
    const event = stripe.webhooks.constructEvent(buffer, sig, endpointSecret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const usertokenSuccess = paymentIntent.metadata.usertoken;
        const tier=paymentIntent.metadata.plan;

        // Update order status to 'completed'
        const updateOrderQuerySuccess = `
          UPDATE payment
          SET status = 'completed', amount_received = ?
          WHERE payment_intent_id = ? AND usertoken = ?
        `;
        await conn.query(updateOrderQuerySuccess, [paymentIntent.amount_received / 100, paymentIntent.id, usertokenSuccess]);

        console.log('PaymentIntent succeeded and order updated to completed.');

        // **New Code: Insert transaction details into user_table**
        const updateUserTableQuery = `
          UPDATE user_table
          SET tier = ?, subscription_start_date = ?, subscription_end_date = ?
          WHERE verification_hash = ?
        `;

        // Assuming you have logic to determine the tier, start, and end dates.
        const newTier = tier; // Example tier
        const startDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 19).replace('T', ' ');

        await conn.query(updateUserTableQuery, [newTier, startDate, endDate, usertokenSuccess]);

        console.log('User table updated with subscription details.');
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        const usertokenFailed = failedPaymentIntent.metadata.usertoken;

        // Update order status to 'failed'
        const updateFailedOrderQuery = `
          UPDATE payment
          SET status = 'failed'
          WHERE payment_intent_id = ? AND usertoken = ?
        `;
        await conn.query(updateFailedOrderQuery, [failedPaymentIntent.id, usertokenFailed]);

        console.log('PaymentIntent failed and order updated to failed.');
        break;

      case 'payment_intent.canceled':
        const canceledPaymentIntent = event.data.object;
        const usertokenCanceled = canceledPaymentIntent.metadata.usertoken;

        // Update order status to 'canceled'
        const updateCanceledOrderQuery = `
          UPDATE payment
          SET status = 'canceled'
          WHERE payment_intent_id = ? AND usertoken = ?
        `;
        await conn.query(updateCanceledOrderQuery, [canceledPaymentIntent.id, usertokenCanceled]);

        console.log('PaymentIntent canceled and order updated to canceled.');
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Middleware setup
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: "aakansha_sharma",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: false, sameSite: 'None' }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

const storage = multer.memoryStorage();
const upload = multer({ storage });

const s3 = new AWS.S3({
  accessKeyId: process.env.STORJ_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY,
  endpoint: 'https://gateway.storjshare.io',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  connectTimeout: 0,
  httpOptions: { timeout: 0 }
});
// Middleware to handle raw body extraction for Stripe webhooks

// Middleware to handle raw body extraction for Stripe webhooks
// Route to handle file upload
app.post('/api/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const file = req.file;
    const params = {
      Bucket: 'image-container',
      Key: `${Date.now()}-${file.originalname}`,
      Body: Readable.from(file.buffer),
      ContentType: file.mimetype
    };

    // Upload file to Storj
    const data = await s3.upload(params).promise();

    // Generate a signed URL to access the uploaded file
    const urlParams = {
      Bucket: 'image-container',
      Key: params.Key,
      Expires: 60 * 60 * 24 * 7
    };
    const url = s3.getSignedUrl('getObject', urlParams);

    // Update the user's profile image URL in the database
    const verificationHash = req.body.token; // Assuming you pass token in the request body
    const updateQuery = `
      UPDATE user_table
      SET profile_image_url = ?
      WHERE verification_hash = ?
    `;
    await conn.query(updateQuery, [url, verificationHash]);

    res.status(200).json({ msg: 'Profile picture uploaded and URL updated successfully', file: data, url });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ msg: 'An error occurred while uploading the file' });
  }
});

// Initialize tables
userModels.createTable();
verificationModels.createTable();
payment.createPayTable();

// Use the userRouter for all API routes
app.use('/api', userRouter);

// Protected route example
app.post('/dashboard', protect, (req, res) => {
  console.log("this is dashboard", req.body);
});

// Start the server
app.listen(PORT, () => console.log(`Server is running on Port ${PORT}`));
