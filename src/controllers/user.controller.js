import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import ApiResponse from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const createAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
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
    if( !(username || email)){
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
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')

    if (!loggedInUser) {
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
        .json(
            new ApiResponse(
                200, 
                {
                    user:loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        );
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

const refreshAccessToken = asyncHandler(async (req, res) => {
    //get the refresh token from the cookies
    //check if the refresh token exists in the database
    //if the refresh token exists, create a new access token
    //and send it in the response in secure cookies
    //and status code 200
    //if the refresh token does not exist, send a response with a message
    //and status code 401
    const { refreshToken } = req.cookies.refreshToken || req.headers?.authorization?.split(' ')[1] || req.body.refreshToken;
    if (!refreshToken) {
        throw new ApiError(401, 'Unauthorized');
    }
    // check if refresh token exists in the database
    try {
        const decodedeToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        if (!decodedeToken) {
            throw new ApiError(401, 'Unauthorized');
        }
    
        const user = await User.findById(decodedeToken?._id);
    
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
    
        if (refreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'refresh token is not valid');
        }
    
        // create new access token
        const options = {
            httpOnly: true,
            secure: true,
        };
        const {newAccessToken, newRefereshToken}= await createAccessAndRefreshTokens(user._id)
    
        return res
           .status(200)
           .cookie('accessToken', newAccessToken, options)
           .cookie('refreshToken', newRefereshToken, options)
           .json(
                new ApiResponse(
                    200,
                    {
                     newAccessToken, newRefereshToken
                    },
                    "Access token refreshed successfully"
                )
            );
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json(new ApiError(401, 'Unauthorized'));
        }
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json(new ApiError(401, 'Token expired'));
        }
        return res.status(500).json(new ApiError(500, 'Internal server error'));        
    }
});

const changePassword = asyncHandler(async (req,res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, 'Please provide old password and new password');
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    const isPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, 'Invalid password');
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(
        new ApiResponse(200, null, 'Password changed successfully')
    );
});

const getCUrrentUser = asyncHandler(async (req, res) => {
    return req.status(200).json(
        new ApiResponse(200, req.user, 'Current user fetched successfully')
    );
});

const updateUserdetails = asyncHandler(async (req, res) => {
    const { fullName, email} = req.body;
    if ( [fullName,email].some( (field) => field?.trim() === "" ) ) {
        throw new ApiError(400, 'Please provide all the required fields');
    }
    // check if user already exists
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            }
        },
        {
            new: true,
        }
    ).select('-password -refreshToken');
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    return res.status(200).json(
        new ApiResponse(200, user, 'User updated successfully')
    );
});

const updateUserAvatar = asyncHandler(async(req,res) => {
    const { avatar } = req.files?.path || req.body.avatar;
    if(!avatar){
        throw new ApiError(400, 'Please provide an avatar image');
    }

    const avatarCloudinary = await uploadToCloudinary(avatar)

    if(!avatarCloudinary.url){
        throw new ApiError(500, 'Error uploading images to cloudinary');
    }

    // await User.findByIdAndUpdate(
    //     req.user?._id,
    //     {
    //         $set: {
    //             avatar: avatarCloudinary.url
    //         }
    //     },
    //     {
    //         new: true,
    //     }
    // ).select('-password -refreshToken');

    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    // update the user avatar
    // and delete the old avatar from cloudinary
    const oldAvatar = user.avatar;

    user.avatar = avatarCloudinary.url;
    await user.save({validateBeforeSave: false});
    // delete the old avatar from cloudinary

    if (oldAvatar) {
        const publicId = oldAvatar.split('/').pop().split('.')[0];
        await deleteFromCloudinary(publicId);
    }

    return res.status(200).json(
        new ApiResponse(200, { avatar: user.avatar }, 'Avatar updated successfully')
    );
    
});

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const { coverImage } = req.files?.path || req.body.coverImage;
    if(!coverImage){
        throw new ApiError(400, 'Please provide an coverImage image');
    }

    const coverImageCloudinary = await uploadToCloudinary(coverImage)

    if(!coverImageCloudinary.url){
        throw new ApiError(500, 'Error uploading images to cloudinary');
    }

    // await User.findByIdAndUpdate(
    //     req.user?._id,
    //     {
    //         $set: {
    //             coverImage: coverImageCloudinary.url
    //         }
    //     },
    //     {
    //         new: true,
    //     }
    // ).select('-password -refreshToken');

    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    // update the user avatar
    // and delete the old avatar from cloudinary
    const oldcoverImage = user.coverImage;

    user.coverImage = coverImageCloudinary.url;

    await user.save({validateBeforeSave: false});
    // delete the old avatar from cloudinary

    if (oldcoverImage) {
        const publicId = oldcoverImage.split('/').pop().split('.')[0];
        await deleteFromCloudinary(publicId);
    }

    return res.status(200).json(
        new ApiResponse(200, { avatar: user.coverImage }, 'coverImage updated successfully')
    );
});

export {registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCUrrentUser, updateUserdetails, updateUserAvatar, updateUserCoverImage};