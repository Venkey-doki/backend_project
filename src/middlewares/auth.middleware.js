import {asyncHandler} from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
export const verifyJwt = asyncHandler( async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1];
    
        if (!token) {
            throw new ApiError(401, 'Unauthorized');
        }
    
        const decodedTOken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedTOken._id).select('-password -refreshToken -__v');
        if (!user) {
            throw new ApiError(401, 'Unauthorized');
        }
    
        req.user = user;
        next();
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