import mongoose from 'mongoose';
import { DB_NAME} from '../constatnts.js';

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}` );
        console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
        console.log(`MongoDB connected: ${connectionInstance.connection.name}`);
        console.log(`MongoDB connected: ${connectionInstance.connection.port}`);
        console.log(`MongoDB connected: ${connectionInstance}`);
        
    } catch (error) {
        console.error('Error connecting to MongoDB currently at DB/index.js:', error);
        process.exit(1); // Exit the process with failure
    }
}

export default connectDB;