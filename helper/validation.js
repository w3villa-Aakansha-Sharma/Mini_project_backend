const { check, body } = require('express-validator');

exports.signupValidation = [
  
  check('username', 'Name is required').not().isEmpty(),
  check('username', 'Name should be at least 2 characters').isLength({ min: 2 }),

  check('email', 'Please provide a valid email').isEmail().normalizeEmail({ gmail_remove_dots: true }),

  
  check('password', 'Password is required').not().isEmpty(),
  check('password', 'Password should be at least 6 characters long').isLength({ min: 6 }),

  
  body('confirmPassword')
    .exists().withMessage('Confirm Password is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Password and Confirm Password do not match'),

 
  

];
