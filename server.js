require('dotenv').config(); // Ensure dotenv is configured before other requires
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const AWS = require('aws-sdk');
const { Readable } = require('stream');
const mysql = require('mysql2/promise'); // Use promise-based mysql2 for async/await
const userModels = require('./model/userModel');
const verificationModels = require('./model/verificationModel');
const payment=require("./model/payment")
const userRouter = require('./routes/userRoutes');
const { protect } = require('./helper/authMiddleware');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const conn = require('./config/dbConnection'); 

const app = express();
const PORT = 8000;

// Initialize multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize AWS S3 client with Storj credentials
const s3 = new AWS.S3({
  accessKeyId: process.env.STORJ_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY,
  endpoint: 'https://gateway.storjshare.io',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  connectTimeout: 0,
  httpOptions: { timeout: 0 }
});


const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.getConnection()
  .then(() => console.log('Connected to the database.'))
  .catch(err => console.error('Database connection failed:', err));

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret:"aakansha_sharma",
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

    // Update the user's profile image URL in the databasenp
    const verificationHash = req.body.token; // Assuming you pass token in the request body
    const updateQuery = `
      UPDATE user_table
      SET profile_image_url = ?
      WHERE verification_hash = ?
    `;
    await db.query(updateQuery, [url, verificationHash]);

    res.status(200).json({ msg: 'Profile picture uploaded and URL updated successfully', file: data, url });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ msg: 'An error occurred while uploading the file' });
  }
});



app.post('/create-payment-intent', async (req, res) => {
  const { plan } = req.body;
  console.log(plan)

  // Define your prices based on the plan
  const prices = {
      free: 5000,
      silver: 1000, // in cents
      gold: 3000 // in cents
  };

  try {
      const paymentIntent = await stripe.paymentIntents.create({
          amount: prices[plan],
          currency: 'usd',
          payment_method_types: ['card'],
      });

      res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/webhooks/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
      console.error('Webhook Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent);

      // Save payment details to the database
      savePaymentDetails(paymentIntent);
  }

  res.json({ received: true });
});













// Initialize tables
userModels.createTable();
verificationModels.createTable();
payment.createPayTable();

// Use the userRouter for all API routes
app.use('/api', userRouter);

// Protected route example
app.post('/dashboard', protect, (req, res) => {
  console.log("this is dashboard",req.body)
  
});

app.listen(PORT, () => console.log(`Server is running on Port ${PORT}`));
