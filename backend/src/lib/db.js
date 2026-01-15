import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Mongoose connection successful");
        
    } catch (error) {
        console.log("Mongoose connection error", error);
    }
}
