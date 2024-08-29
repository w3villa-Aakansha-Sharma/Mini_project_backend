const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const connection = require("../config/dbConnection");

const app = express();


// Update createPaymentIntent handler to store order details
const createPaymentIntent = async (req, res) => {
  const { plan, usertoken } = req.body;

  // Define prices for each plan
  const prices = {
    silver: 1000, // $10.00 in cents
    gold: 3000   // $30.00 in cents
  };

  try {
    // Determine the amount based on the plan
    const amount = prices[plan];

    if (!amount) {
      return res.status(400).send({ error: 'Invalid plan selected' });
    }

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,  // Use the calculated amount
      currency: 'usd',
      metadata: { usertoken, plan },  // Store user token and plan in metadata
    });

    // Store initial order in the database with 'pending' status
    const insertOrderQuery = `
      INSERT INTO payment (usertoken, plan, amount, status, payment_intent_id)
      VALUES (?, ?, ?, 'pending', ?)
    `;
    await connection.query(insertOrderQuery, [usertoken, plan, amount / 100, paymentIntent.id]);

    // Send client secret to the frontend
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send('Internal Server Error');
  }
};
  
// // Webhook handler
// const webhookStripe = async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     console.log("sig is", sig);

//     try {
//         // Construct the event from the raw body
//         const event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
//         console.log("event is", event);
        
//         // Handle the event
//         if (event.type === 'payment_intent.succeeded') {
//             const paymentIntent = event.data.object;
//             console.log('PaymentIntent was successful!', paymentIntent);

//             const usertoken = paymentIntent.metadata.usertoken;

//             try {
//                 const currentDate = new Date();
//                 const subscriptionStartDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//                 const subscriptionEndDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1)).toISOString().slice(0, 19).replace('T', ' ');

//                 const updateQuery = `
//                     UPDATE user_table
//                     SET plan = ?, subscription_start_date = ?, subscription_end_date = ?
//                     WHERE verification_hash = ?
//                 `;

//                 await connection.execute(updateQuery, [
//                     paymentIntent.amount_received === 1000 ? 'silver' : 'gold',
//                     subscriptionStartDate,
//                     subscriptionEndDate,
//                     usertoken
//                 ]);

//                 console.log('User subscription updated successfully.');
//             } catch (error) {
//                 console.error('Database Error:', error);
//             }
//         }

//         res.json({ received: true });
//     } catch (err) {
//         console.error('Webhook Error:', err.message);
//         res.status(400).send(`Webhook Error: ${err.message}`);
//     }
// };

// // Define routes
// app.post('/api/webhooks/stripe', webhookStripe);

module.exports = { createPaymentIntent };
