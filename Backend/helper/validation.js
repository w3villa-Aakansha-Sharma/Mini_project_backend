const { check, body } = require('express-validator');

exports.signupValidation = [
  // Check for name
  check('username', 'Name is required').not().isEmpty(),
  check('username', 'Name should be at least 2 characters').isLength({ min: 2 }),

  // Check for email
  check('email', 'Please provide a valid email').isEmail().normalizeEmail({ gmail_remove_dots: true }),

  // Check for password
  check('password', 'Password is required').not().isEmpty(),
  check('password', 'Password should be at least 6 characters long').isLength({ min: 6 }),

  // Check for confirm password
  body('confirmPassword')
    .exists().withMessage('Confirm Password is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Password and Confirm Password do not match'),

  // Check for mobile number
  check('mobileNumber', 'Mobile number should be 10 digits').isLength({ min: 10, max: 10 }).isNumeric(),

];
