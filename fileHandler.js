const Q =  require('./query');
const path = require('path');
const fs = require('fs');


const profilePicture = (req, res) => {
    Q.validate(req.body.token, res, user => { 
        if(!req.file.mimetype.includes("image/"))
            res.status(400).json("Not an image.");
        imgtype = req.file.mimetype.replace('image/', '');
        
        const source = path.join(__dirname, "uploads", req.file.filename);
        const dest = path.join(__dirname, "uploads", user.username, "profilePicture");
        console.log(dest)
        fs.rmdir(dest, {recursive:true}, err => {
            if(!err){
                fs.mkdir(dest, err => {
                    if(!err){
                        const profilePicture = path.join(dest, req.file.originalname);
                        fs.rename(source, profilePicture, err =>{
                            if(!err){
                                return res.json("success");
                            }
                            else
                                return res.status(500).json(err);
                        })
                    }
                    else
                        return res.status(500).send();
                })
            }      
            else
                res.status(500).send()
        })
    })
}

const saveImage = (req, res) => {
    Q.validate(req.body.token, res, user=> {
        if(!req.file.mimetype.includes("image/"))
            return res.status(400).json("Not an image.");
        imgtype = req.file.mimetype.replace('image/', '');
        
        const source = path.join(__dirname, "uploads", req.file.filename);
        const dest = path.join(__dirname, "uploads", user.username, `${Date.now()}-${req.file.originalname}`);

        fs.rename(source, dest, err =>{
            if(!err)
                return res.json(dest);
            else
                return res.status(500).json(err);
        })
    })
}

const loadProfilePicture = (username) => {
    profile = path.join(__dirname, "uploads", username, "profilePicture")
    try{
        return fs.readFileSync(path.join(profile, fs.readdirSync(profile)[0]), 'base64');
    }
    catch{
        return null;
    }
}

const loadImage = (path) => {
    fs.readFile(path, (err, file) => {
        if(!err){
            return file;
        }
        else
            return null;
    });
}


module.exports.profilePicture = profilePicture;
module.exports.saveImage = saveImage;

module.exports.loadImage = loadImage;
module.exports.loadProfilePicture = loadProfilePicture;