const express = require('express');
const bcrypt = require('bcrypt'); //for hashing passwords and secure storage
const validator = require('email-validator'); //for validating user-entered email format
const nodemailer = require('nodemailer'); //for sending emails via node server
const jwt = require('jsonwebtoken'); //for generating and validating authentication tokens for user email verification
const users_collection = require('./models/users'); //User schema
const tasks_collection = require('./models/tasks'); //Tasklist schema
require('dotenv').config(); //.env file

const app = express();
//use ejs as the view engine
app.set('view engine', 'ejs');
//link static file folders
app.use(express.static('../public'));
app.use(express.static('../images'));
//enable JSON parsing from request bodies
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//env variables
const hostEmail = process.env.EMAIL_USER;
const hostPassword = process.env.EMAIL_PASSWORD;
const secretKey = process.env.JWT_KEY;
//email transporter setup
const emailTransporter = 
nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: hostEmail,
        pass: hostPassword,
    }
});  
//style variable for res.send HTML messages
let style = 'color:#315839; text-align:center; font-family:sans-serif; font-size:20px;' +
            'display: flex; flex-direction: column; align-items: center;';

/* Routes setup GET */
app.get('/', (req, res) => {
    //check is user is logged in 
    let loggedin = checkAuthenticated();
    if(loggedin){
        res.redirect('/tasks'); //redirect user to their homepage if true
    } else {
        res.redirect('/login'); //redirect user back to login page if false
    }
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

//user email verification upon signup
app.get('/verify', async (req, res) => {
    try {
        //verify the token using the secret key
        jwt.verify(token, secretKey);
        await createUser(); //create user in database
        res.redirect('/login'); 
      } catch (error) {
        let htmlMsg = `<p style="${style}"><b>Token error. Email not verified.</b></p> 
                       <p style="${style}">Please signup again</p>`
        res.send(htmlMsg);
      }
});

app.get('/login', (req, res) => { //similar to default '/' route
    let loggedin = checkAuthenticated();
    if(loggedin){
        res.redirect('/tasks');
    } else {
        res.render('login');
    }
});

app.get('/logout', async (req, res) => {
    authenticated = false; //set authenticated to false once user logs out
    res.redirect('/login');
});

app.get('/tasks', async (req, res) => {
    let loggedin = checkAuthenticated();
    if(loggedin == false){
        res.redirect('/login');
    } else {
        res.render('home');
    }
});

//ask user for email when user clicks on 'Forgot Password'
app.get('/reset_password', async (req, res) => {
    res.send(`<form action="/send-link" method="post" id="reset-form" style="${style}">
                    <label for="email" >Please enter your HelloTask email address</label> <br>
                    <input type="text" id="email" name="email" placeholder="Enter your email" required><br>
                    <button type="submit" class="btn"> Submit </button>
            </form>`);
});

//lead user to password reset form when they click the reset link in their email
app.get('/reset', async (req, res) => {
    res.render('password_reset')
})

/* Routes setup POST */
//register new user
let newUser;
app.post('/signup', async (req, res) => {
    try{
        newUser = new users_collection ({
            email: req.body.email,
            username: req.body.username,
            password: req.body.password,
        });
        emailValidated = validator.validate(req.body.email); //validate email format 
        const existingEmail = await users_collection.findOne({email: newUser.email});
        const existingUsername = await users_collection.findOne({username: newUser.username});
        /* User input checks */
        //check whether email address has a valid format
        if(!emailValidated){
            let htmlMsg = `<p style="${style}"><b>Please enter a valid email address</b></p> 
                           <p style="${style}">This is needed to verify your email</p>`
            res.send(htmlMsg);
        }
        //check if user already exists in database
        else if(existingEmail) {
            let htmlMsg = `<p style="${style}"><b>This user already exists</b></p> 
                           <p style="${style}">Please enter a different email address</p>`
            res.send(htmlMsg);
        }
        //check if username is already taken
        else if(existingUsername){
            let htmlMsg = `<p style="${style}"><b>This username is already in use</b></p> 
                           <p style="${style}">Please enter a different username</p>`
            res.send(htmlMsg);
        }
        //check password entries
        else{
            //check if password length is at least 8 characters
            if(newUser.password.length < 8){
                let htmlMsg = `<p style="${style}"><b>Password should be at least 8 characters long</b></p>`
                res.send(htmlMsg);
            //check if double entries of password are equal 
            } else if(req.body.password != req.body.confirmPassword){
                let htmlMsg = `<p style="${style}"><b>Both password entries should match</b></p>`
                res.send(htmlMsg);
            } else{ //if all checks are cleared
                //send user verification email
                await sendVerificationEmail(newUser.email);
                //once email is sent, inform user 
                let htmlMsg = `<p style="${style}"><b>A verification link has been sent to your email</b></p>
                               <p style="${style}">Please verify your account to use HelloTask</p>
                               <p style="${style}">Note: If you do not see the email, please check the spam folder</p>`
                res.send(htmlMsg);
            }
        }
    } catch(e){
        console.log(e);
        res.redirect('/signup');
    }
});

//login existing user
let authenticated = false; //set authenticated to false by default
app.post('/login', async (req, res) => {
    try{
        //find if user exists through username
        const user = await users_collection.findOne({username: req.body.username});
        if(!user) {
            let htmlMsg = `<p style="${style}"><b>No user exists with this name</b></p> 
                           <p style="${style}">Please try again</p>`
            res.send(htmlMsg);
            return;
        }
        //if a user is found, compare the entered password with the hashed version of the password in database
        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (isPasswordMatch) {
            //render user homepage
            res.redirect('/tasks');
            authenticated = true;
            setCurrentUser(user);
        }
        else{
            let htmlMsg = `<p style="${style}"><b>Username and password do not match</b></p> 
                           <p style="${style}">Please try again</p>`
            res.send(htmlMsg);
            authenticated = false;
        }
    } catch(e) {
        authenticated = false;
        console.log(e);
        res.redirect('/login')
    }
});

//send email to the user with reset password link
let resetRequestUser; //variable to hold details of user who requested password reset
app.post('/send-link', async (req, res) => {
    //find user in database associated with provided email address 
    resetRequestUser = await users_collection.findOne({email: req.body.email});
    //if an account is found with the provided email, send password reset link to email address
    if(resetRequestUser){
        resetUrl = 'http://localhost:8000/reset'
        resetMailDetails = {
            from: hostEmail,
            to: req.body.email,
            subject: 'Reset Your Password',
            html: `<p style="${style}">Please click the provided link to reset your password.</p> 
                   <p style="${style}">This will take you to the password reset page.</p>
                   <a href=${resetUrl}>Reset password</a>` 
        };   
        try{
            await emailTransporter.sendMail(resetMailDetails);
            console.log('Password reset email sent successfully.');
        }
        catch(error) {
            console.error('Error sending reset email:', error.message);
        }
        //once email is sent, inform user
        let htmlMsg = `<p style="${style}"><b>Password reset link sent to ${req.body.email}</b></p>`
        res.send(htmlMsg);
    } else{//if no user is found with provided email address, inform user
        let htmlMsg = `<p style="${style}"><b>No user found with that email</b></p> 
                       <p style="${style}">Please try again</p>`
        res.send(htmlMsg); 
    }
});

app.post('/reset', async (req, res) => {
    const newPassword = req.body.newPassword;
    const confirmedPassword = req.body.confirmPassword;
    //check password entries
    if(newPassword.length < 8){
        let htmlMsg = `<p style="${style}"><b>Password should be at least 8 characters long</b></p>`
        res.send(htmlMsg);
    } else if(newPassword != confirmedPassword){
        let htmlMsg = `<p style="${style}"><b>Both password entries should match</b></p>`
        res.send(htmlMsg);
    } else{ //if all checks are cleared
        //hash the password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        //replace password with new hashed password
        resetRequestUser.password = hashedPassword;
        //save user with updated password
        await resetRequestUser.save(); 
        let htmlMsg = `<p style="${style}"><b>Your password has been reset</b></p>
                       <p style="${style}"><a href ='/'>Click here to return to the login page</a></p>`
        res.send(htmlMsg);
    }
});

/* API routes for client-side script.js database-related functions */
//get user's tasklist
app.get('/api/tasklist', async (req, res) => {
    try {
        const userid = currentUser._id;
        const existingTasklist = await tasks_collection.findOne({ userid: userid });
        res.json(existingTasklist);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching tasks' });
    }
});

//add new task to user's tasklist in the database 
app.post('/api/newtask', async (req, res) => {
    try{
        const newTask = req.body;
        const userid = currentUser._id;
        //find tasklist associated with current user
        const existingTasklist = await tasks_collection.findOne({ userid: userid });
        //add the new task to the existing tasklist
        existingTasklist.tasklist.push(newTask);
        //save updated tasklist back to the database
        await existingTasklist.save();
        //send updated tasklist back to client-side script
        res.json(existingTasklist.tasklist);
    } catch(e) {
        console.log(e);
    }
});

//update exisitng task in user's tasklist
app.post('/api/updateTask', async (req, res) => {
    try{
        const userid = currentUser._id;
        //find tasklist associated with current user
        const userTasklist = await tasks_collection.findOne({ userid: userid });
        //get updated task details
        const updatedTask = req.body;
        //find id of task to be updated
        const taskid = updatedTask._id;
        if(userTasklist){ //check for tasklist existence
            //find index of task to be updated
            const taskIndex = userTasklist.tasklist.findIndex(
                //iterate over all tasks to find task id match
                (task) => task._id.toString() === taskid 
            );
            if (taskIndex !== -1) {
                //update the located task with new task details and save tasklist
                userTasklist.tasklist[taskIndex].set(updatedTask);
                await userTasklist.save();
                res.json({ message: 'Task updated successfully' });
            }
            else{
                res.json('Task not found');
            }
        } else{
            res.json('Tasklist not found');
        }
    } catch(e) {
        console.log(e);
    }
});

//delete task from user's tasklist
app.post('/api/deleteTask', async (req, res) => {
    const userTasks = req.body;
    const userid = currentUser._id;
    //find tasklist associated with current user
    const existingTasklist = await tasks_collection.findOne({ userid: userid });
    //replace user tasklist with updated tasklist received in POST request body and save
    existingTasklist.tasklist = userTasks.tasklist;
    await existingTasklist.save();
    res.json({ message: 'Task deleted successfully' });
});

//update user's token goal in the database
app.post('/api/updateGoal', async (req, res) => {
    try{
        const userid = currentUser._id;
        //find token goal associated with current user
        const tokenGoal = await tasks_collection.findOne({ userid: userid });
        //get updated goal value 
        const updatedGoal = req.body.value;
        //update token goal value in database and save
        tokenGoal.tokengoal = updatedGoal;
        await tokenGoal.save();
        res.json({ message: 'Token goal updated successfully' });
    }
    catch(e){
        console.log(e);
    }
});

/* Server-side functions */
//send verification email to user to verify their provided email upon signup 
let token = '';
async function sendVerificationEmail(userEmail) {
    //create JWT verification token with 1 hour expiry 
    const verificationToken = jwt.sign({
        email: userEmail}, 
        secretKey, { expiresIn: '1h' });
    const verificationUrl = `http://localhost:8000/verify?token=${verificationToken}`;
    const verificationMailDetails = {
        from: hostEmail,
        to: userEmail,
        subject: 'Verify Your Email Address',
        html: `<p style="${style}">Please click the provided link to verify your email for your HelloTask account.</p> 
                <p style="${style}">Successful verification will take you to the HelloTask login page.</p><br>
                <a href=${verificationUrl}>Verify my email</a>` 
    };   
    try{
        //wait for nodemailer to send email
        await emailTransporter.sendMail(verificationMailDetails);
        console.log('Verification email sent successfully.');
        //get token verification result
        const tokenPromise = Promise.resolve(verificationToken); 
        try {
            token = await tokenPromise;
            return token;
        } catch (error) {
            console.error('Error resolving token:', error);
        }
    }
    catch(error) {
        console.error('Error sending verification email:', error.message);
    }
}

//create new user in database
async function createUser(){
    //hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newUser.password, saltRounds);
    //replace password with hashed password
    newUser.password = hashedPassword;
    const user = await newUser.save();
    //create empty tasklist for user
    const newTasklist = new tasks_collection({
        userid: user._id,
        tasklist: [] 
    });
    const tasklist = await newTasklist.save();
}

//check whether user is logged in through authenticated variable
function checkAuthenticated(req, res, next){
    return authenticated;
}

let currentUser;
async function setCurrentUser(user){
    let userid = user._id;
    currentUser = await users_collection.findOne({_id: userid});
}

//start server on specified port
const port = 8000;
app.listen(port, () => {
    console.log(`Server running on Port ${port}`);
})
