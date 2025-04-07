import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});


// Upload image to Cloudinary
const uploadToCloudinary = async (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete the file from local storage if it doesn't exist
            console.error('File does not exist:', filePath);
            return null;
        }
        const response = await cloudinary.uploader.upload(filePath, {resource_type: 'auto'})

        //file upload completed
        console.log('File uploaded to Cloudinary successfully!', response.url);

        fs.unlinkSync(filePath); // Delete the file from local storage after upload

        return response; // Return the URL of the uploaded image        
    } catch (error) {
        fs.unlinkSync(filePath); // Delete the file from local storage
        console.error('Error uploading file to Cloudinary:', error.message);
        return null; // Return null if upload fails
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const response = await cloudinary.uploader.destroy(publicId, {resource_type: 'auto'});

        //file delete completed
        console.log('File deleted from Cloudinary successfully!', response.result);
        console.log("response: "+response);
        
        return response; // Return the result of the delete operation
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error.message);
        return null; // Return null if delete fails         
    }
};

export { uploadToCloudinary, deleteFromCloudinary };