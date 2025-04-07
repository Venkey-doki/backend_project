import mongoose ,{ Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, //who is subscribing potentially a multiple users
        ref: "User",
        // required: true,
    },
    channel: {
        type: Schema.Types.ObjectId, //to one who the subscriber is subscribed
        ref: "User",
        // required: true,
    },

}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);