const mongoose = require('mongoose');
require('dotenv').config();
//get env variable
const mongoURI = process.env.MONGODB_URI;
//connect to MongoDB
const connect = mongoose.connect(mongoURI);

//check database connection 
connect.then(() => {
    console.log('Database connection SUCCESSFUL');
})
.catch((err) => {
    console.log('Database connection FAILED: ', err.message);
});

//export database connection module
module.exports = connect;

