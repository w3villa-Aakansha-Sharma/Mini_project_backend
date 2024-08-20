// const multer = require('multer');
// const cloudinary = require('../config/cloudinary');
// const path = require('path');

// // Configure Multer to use memory storage
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// const uploadProfilePicture = async (req, res) => {
//     console.log("hi I am profile uploader and I have reached here");
//     try {
//         if (!req.file) {
//             return res.status(400).json({ msg: 'No file uploaded' });
//         }
        
//         const result = await new Promise((resolve, reject) => {
//             const stream = cloudinary.uploader.upload_stream(
//                 { folder: 'profile_pictures' },
//                 (error, result) => {
//                     if (error) {
//                         reject(error);
//                     } else {
//                         resolve(result);
//                     }
//                 }
//             );
//             stream.end(req.file.buffer);
//         });

//         res.status(200).json({ msg: 'Profile picture uploaded successfully', imageUrl: result.secure_url });
//     } catch (error) {
//         console.error('Error uploading to Cloudinary:', error);
//         res.status(500).json({ msg: 'An error occurred while uploading the image' });
//     }
// };

// module.exports = {
//     upload,
//     uploadProfilePicture
// };
