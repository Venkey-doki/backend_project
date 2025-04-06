import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import ApiResponse from '../utils/ApiResponse.js';

const createAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userid);
        const accessToken = user.createAccessToken();
        const refreshToken = user.createRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, 'Error creating tokens');
    }
};

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
    // console.log(email, username, password, fullName);

    if ( [fullName,email,username,password].some( (field) => field?.trim() === "" ) ) {
        throw new ApiError(400, 'Please provide all the required fields');
    }
    // check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError(409, 'User already exists');
    }

    // check for images and for avatars
    const avatar = req.files.avatar?.[0]?.path;
    let coverImage;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImage = req.files.coverImage[0].path;
    }
    
    if (!avatar) {
        throw new ApiError(400, 'Please provide an avatar image');
    }

    //upload them to cloudinary
    const avatarUrl = await uploadToCloudinary(avatar);
    const coverImageUrl = await uploadToCloudinary(coverImage);

    if (!avatarUrl) {
        throw new ApiError(500, 'Error uploading images to cloudinary');
    }
    // create the user object and create entry in the database
    const user = await User.create({
        fullName,
        email,
        username: username?.trim().toLowerCase(),  // Fix: Corrected `.toLowerCase()`
        password,
        avatar: avatarUrl.url ,
        coverImage: coverImageUrl?.url || "",
    });
    
    console.log(user);
    const createdUser = await User.findById(user._id).select('-password -refreshToken')
    if (!createdUser) {
        throw new ApiError(500, 'Error creating user');
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, 'User created successfully')
    );
});

const loginUser = asyncHandler(async (req, res) => {
    //username and password are required
    //check if the user exists in the database
    //if the user exists, check if the password is correct
    //if the password is correct, send a response with the user data
    //if the password is incorrect, send a response with a message
    //access and referesh tokens are created 
    //and sent in the response in secure cookies

    const { username, email, password } = req.body;
    if( !username || !email){
        throw new ApiError(400, 'Please provide username or email ');
    }
    if (!password) {
        throw new ApiError(400, 'Please provide password');
    }

    // check if user exists
    const user = await User.findOne({ $or: [{ email }, { username }]});
    if (!user) {
        throw new ApiError(404, 'Invalid username or email');
    }
    // check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, 'Invalid password');
    }
    // create access and refresh tokens
    const { accessToken, refreshToken } = await createAccessAndRefreshTokens(user._id);
    // set refresh token in secure cookies
    const loggesdInUser = User.findById(user._id).select('-password -refreshToken')

    if (!loggesdInUser) {
        throw new ApiError(500, 'Error creating user');
    }

    const options = {
        httponly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(new ApiResponse(200, {user: loggesdInUser, accessToken, refreshToken }, 'User logged in successfully'));
});

const logoutUser = asyncHandler(async (req, res) => {
    //clear the refresh token from the cookies
    //send a response with a message
    //and status code 200
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: null,
            }
        },
        {
            new: true,
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .clearCookie('accessToken', options)
        .clearCookie('refreshToken', options)
        .json(new ApiResponse(200, null, 'User logged out successfully'));

});

export {registerUser, loginUser, logoutUser};