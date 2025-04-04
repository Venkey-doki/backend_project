import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import ApiResponse from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    //get the user data from the request body
    //validation of the data
    //check if the user already exists in the database
    //if the user exists, send a response with a message
    //check for images and for avatars
    //uplad them to cloudinary
    //create the user object and create entry in the database
    //send a response with the user data

    const {fullName, email, username, password} = req.body;
    console.log(email, username, password, fullName);

    if ( [fullName,email,username,password].some( (field) => field?.trim() === "" ) ) {
        throw new ApiError(400, 'Please provide all the required fields');
    }
    // check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError(409, 'User already exists');
    }

    // check for images and for avatars
    const avatar = req.files.avatar?.[0]?.path || 'https://via.placeholder.com/150x150';
    const coverImage = req.files.coverImage?.[0]?.path || 'https://via.placeholder.com/1200x400';
    console.log(avatar, coverImage);
    
    if (!avatar) {
        throw new ApiError(400, 'Please provide an avatar image');
    }

    //upload them to cloudinary
    const avatarUrl = await uploadToCloudinary(avatar);
    const coverImageUrl = await uploadToCloudinary(coverImage);
    console.log(avatarUrl, coverImageUrl);
    log(avatarUrl.url, coverImageUrl.url);

    if (!avatarUrl || !coverImageUrl) {
        throw new ApiError(500, 'Error uploading images to cloudinary');
    }
    // create the user object and create entry in the database
    const user = await User.create({
        fullName,
        email,
        username: username.lowerCase(),
        password,
        avatar: avatarUrl.url || 'https://via.placeholder.com/150x150',
        coverImage: coverImageUrl.url || 'https://via.placeholder.com/1200x400',
    })
    console.log(user);
    const createdUser = await User.findById(user._id).select('-password -refreshToken')
    if (!createdUser) {
        throw new ApiError(500, 'Error creating user');
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, 'User created successfully')
    );
});

export default registerUser;