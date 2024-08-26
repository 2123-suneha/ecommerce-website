// importing packages
const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const path = require('path');
// firebase admin setup
let serviceAccount = require("./ecom-website-288dd-firebase-adminsdk-l5o36-3b063fe7c9.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
let db = admin.firestore();
// aws config
const aws = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();
// aws parameters
const region = " ap-south-1";
const bucketName= "ecomwebsite-project";
const accessKeyId =process.env.AWS_ACCESS_KEY;
const secretAccesskey =process.env.AWS_SECRET_KEY; 
aws.config.update({
    region,
    accessKeyId,
    secretAccesskey
})
//init s3
const s3 = new aws.S3();
//generate image upload link
async function generateUrl(){
    let date = new Date();
    let id = parseInt(Math.random() * 10000000000);
    const imageName = `${id}${date.getTime()}.jpg`;
    const params =({
        Bucket: bucketName,
        Key: imageName,
        Expires: 300, //300ms
        ContentType:'image/jpeg'
    })
    const uploadUrl = await S3.getSignedUrlPromise('putObject', params);
    return uploadUrl;
}
//declare static path
let staticPath = path.join(__dirname, "website");
// initializing express.js
const app = express();
//middlewares
app.use(express.static(staticPath));
app.use(express.json());
//routess
//home route
app.get("/", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
})
//signup route
app.get('/signup', (req, res) => {
    res.sendFile(path.join(staticPath, "signup.html"));
    // console.log(req.body);
    // res.json('data received');
})
app.post('/signup', (req, res) => {
    let { name, email, password, number, tac, notification } = req.body;
    // form validations
    if (name.length < 3) {
        return res.json({ 'alert': 'name must be 3 letters long' });
    } else if (!email.length) {
        return res.json({ 'alert': 'enter your email' });
    } else if (password.length < 8) {
        return res.json({ 'alert': 'password should be 8 letters long ' });
    } else if (!number.length) {
        return res.json({ 'alert': 'enter your phone number' });
    } else if (!Number(number) || number.length < 10) {
        return res.json({ 'alert': 'invalid number,please enter valid number' });
    } else if (!tac) {
        return res.json({ 'alert': 'you must accept terms & conditions' });
    }
    // store user in db
    db.collection('users').doc(email).get()
        .then(user => {
            if (user.exists) {
                return res.json({ 'alert': 'email already exists' });
            } else {
                // encrypt the password before storing it
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(password, salt, (err, hash) => {
                        req.body.password = hash;
                        db.collection('users').doc(email).set(req.body)
                            .then(data => {
                                res.json({
                                    name: req.body.name,
                                    email: req.body.email,
                                    seller: req.body.seller,
                                })
                            })
                    })
                })
            }
        })
    // res.json('data recieved');
})
// login page route
app.get('/login', (req, res) => {
    res.sendFile(path.join(staticPath, "login.html"));
})
app.post('/login', (req, res) => {
    let { email, password } = req.body;
    if (!email.length || !password.length) {
        return res.json({ 'alert': 'fill all the data' })
    }
    db.collection('users').doc(email).get()
        .then(user => { // if email doesn't exist
            if (!user.exists) {
                return res.json({ 'alert': 'log in email does not exists' })
            } else{
                bcrypt.compare(password, user.data().password, (err,result) =>{
                    if(result){
                        let data = user.data();
                        return res.json({
                            name: data.name,
                            email:data.email,
                            seller: data.seller,
                        })
                    } else{
                        return res.json({'alert': 'Incorrect password'});
                    }
                })
            }

        })
})
// seller route
app.get('/seller' , (req, res) => {
    res.sendFile(path.join(staticPath, "seller.html"));
 })
app.post('/seller' ,(req, res) => {
      let{name,about,address,number,tac,legit,email} = req.body;
      if(!name.length || !address.length || !about.length || number.length < 10 || !Number(number)){
        return res.json({'alert': 'some information(s) is/are invalid'});

      } else if(!tac || !legit){
        return res.json({'alert':'you must agree to our terms and conditions'})
      }else{
        // update users seller status here
        db.collection('sellers').doc(email).set(req.body)
        .then(data => {
            db.collection('users').doc(email).update({
                seller: true
            }).then(data => {
                res.json(true);
            })
        })
      }
})
// add product
app.get('/add-product' , (req,res) => {
    res.sendFile(path.join(staticPath, "addProduct.html"));
})
//get the upload link
app.get('/s3url', (req, res) => {
    generateUrl().then(url => res.json(url));
})
// 404 route
app.get('/404', (req, res) => {
    res.sendFile(path.join(staticPath, "404.html"));
})
app.use((req, res) => {
    res.redirect('/404');
})
app.listen(3004, () => {
    console.log('listening on port 3004...........');
})