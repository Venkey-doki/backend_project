import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

// Enable CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(express.json({alimit: '50kb'}));
app.use(express.urlencoded({limit: '50kb', extended: true}));
app.use(express.static('public'));

// Parse cookies
app.use(cookieParser());

export default app;