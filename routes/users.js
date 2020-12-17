const router = require('express').Router();
const Bcrypt = require('bcrypt');
const e = require('express');
const path = require('path');
const fs = require('fs');

const Q =  require('../query');
const FH = require('../fileHandler')

const uUpdate = (token, changes, res, callback, e=`Error: Not found in User.`) =>
    Q.vUpdate(token, Q.User, {token:token}, changes, res, callback, e);


/*
    Generates a semi-random string of characters and encrypts it. The username starts every token seed to ensure no collisions.
*/
const generateToken = async (user, callback) => {
    let plaintext = user.username;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( var i = 0; i < 32 - user.username.length; i++ ) 
        plaintext += characters.charAt(Math.floor(Math.random() * characters.length));
    try
    {
        key = await Bcrypt.hash(plaintext, 10);
        Q.User.findOneAndUpdate({_id: user._id}, {token:key})
        .then(results => callback(null, key))
        .catch(err => callback("Error: Issue retrieving user data", null));
    }
    catch
    {
        callback('Error: Issue with bcrypt', null);
    }
}

router.route('/profilePicture').post((req,res) => {
    res.json(FH.loadProfilePicture(req.body.username));
});

router.route('/info').get((req, res) => {
    const username = req.body.username;
    Q.User.findOne({username:username})
        .then(user => {
            let {username, online, busy} = user;
            res.json({username, busy, online})
        })
        .catch(err => res.status(400).json(`Error: Could not find user \'${username}\': ${err}`))
});

router.route('/register').post(async (req, res) => {
    try{
        const username = req.body.username;
        const password = await Bcrypt.hash(req.body.password, 10);
        const online = true;
        const busy = false;

        const newUser = new Q.User({
            username,
            password,
            online,
            busy
        });

        newUser.save()
        .then(() => generateToken(newUser, (err, token) => {
            if(token){
                parent = path.resolve(__dirname, "..");
                fs.mkdir(path.join(parent, 'uploads', username), err => {
                    fs.mkdir(path.join(parent, 'uploads', username, "profilePicture"), err => {
                        res.json(token);
                    })
                })
            }
                
            else
                res.status(500).json(err);
        }))
        .catch(err => res.status(400).json(`Error: Username taken.`))
    }
    catch{
        res.status(500).send()
    }
});

router.route('/delete').post((req, res) => { 
    Q.findOne(Q.User, {username:req.body.username}, res, async user => {
        try{
            valid = await Bcrypt.compare(req.body.password, user.password)
            if(valid){
                Q.Chatroom.update({}, {$pull: {members:{user:user._id}}})
                .then(report=> {
                    ////////////  Pass on ownership or delete if neccessary  ////////////
                        Q.Chatroom.find({owners: {$size: 0}})
                        .then(chatrooms => {
                            for(c of chatrooms){
                                if(c.members.length){
                                    if(c.admins.length < 1){
                                        Q.Chatroom.updateMany({_id:c._id,members:{$exists:true}}, {$set:{"members.$.owner":true}})
                                        .then(()=>console.log(`${c.name} ownership inherited`))
                                        .catch(err => console.log(err))
                                    }
                                    else{
                                        Q.Chatroom.updateMany({_id:c._id, members:{$elemMatch:{admin:true}}}, {$set:{"members.$.owner":true}})
                                        .then(()=>console.log(`${c.name} ownership inherited`))
                                        .catch(err => console.log(err))
                                    }
                                }else{
                                    Q.Chatroom.deleteOne({_id:c._id})
                                    .then(()=>console.log(`${c.name} deleted.`))
                                    .catch(err => console.log(err))
                                }
                            }
                        })
                        .catch(err => res.status(500).json(err))
                    ////////////////////////////////////////////////////////////////////////////////
                    Q.Friends.remove({$or:[{requester:user._id},{accepter:user._id}]})
                    .then(()=> {
                        Q.User.remove({_id:user._id})
                        .then(receipt => {
                            parent = path.resolve(__dirname, "..")
                            fs.rmdir(path.join(parent, 'uploads', req.body.username), {recursive:true}, err => {
                                if(!err)
                                    res.json(`'${req.body.username}' deleted.`);
                                else
                                    res.status(500).json('Error: Could not delete user files.')
                            })
                        })
                        .catch(err => res.status(500).json('Error: Could not delete user.'));
                    })
                    .catch(err => res.status(500).json('Error: Could not remove user from friendships.'));
                })
                .catch(err => res.status(500).json('Error: Could not remove user from chatrooms.'));
            }
            else
                res.status(400).json("Error: Invalid password.")
        }
        catch{
            res.status(500).send();
        }
    })
});

router.route('/login').post((req, res) => { 
    Q.findOne(Q.User, {username:req.body.username}, res, async user => {
        try{
            valid = await Bcrypt.compare(req.body.password, user.password)
            if(valid){
                generateToken(user, (err, token) => {
                    if(token)
                        res.json(token);
                    else
                        res.status(500).json(err);
                });
            }
            else
                res.status(400).json("Error: Invalid password.")
        }
        catch{
            res.status(500).send();
        }
    },"Incorrect username or password.")
});


router.route('/logout').post((req, res) => {
    uUpdate(req.body.token, {token:null}, res)
});

router.route('/checkin').post((req, res) => {
    Q.validate(req.body.token, res);
});

router.route('/busy').post((req, res) => {
    uUpdate(req.body.token, {busy:true}, res, null)
})
router.route('/notBusy').post((req, res) => {
    uUpdate(req.body.token, {busy:false}, res)
})

router.route('/test').get((req, res) =>{
    Q.Chatroom.find({owners: {$exists: false}})
    .then(chatrooms=> res.json(chatrooms))
    .catch(err => res.status(500).json("err"));
})

router.route('/chatrooms').post((req, res) =>{
    Q.validate(req.body.token, res, user => {
        Q.Chatroom.find({members:{$elemMatch:{user:user._id}}})
        .then(chatrooms => {
            const ret = [];
            for(c of chatrooms){
                // If owner deleted their account, update the chain of command
                if(c.owners.length < 1){
                    console.log("No owners")
                    if(c.admins.length < 1){
                        console.log("No admins")
                        Q.Chatroom.update({_id:c._id, members:{$elemMatch:{user:user._id}}}, {$set:{"members.$.owner":true}})
                        .then(()=>console.log("success"))
                        .catch(err => console.log(err))
                    }
                    else{
                        Q.Chatroom.update({_id:c._id, members:{$elemMatch:{admin:true}}}, {$set:{"members.$.owner":true}})
                        .then(()=>console.log("success"))
                        .catch(err => console.log(err))
                    }
                }
                //
                me = c.members.filter(m=> m.user.equals(user._id))[0];
                ret.push({name:c.name, profile_picture:c.profile_picture, new:c.updatedAt.getTime()>me.last_read.getTime(), channels:c.channels});
            }
            res.json(ret);
        })
        .catch(err => res.status(400).json(err))
    });
});

router.route('/friends').post((req, res) =>{
    Q.validate(req.body.token, res, user => {
        Q.Friends.find({ accepted: true, $or:[{requester:user._id},{accepter:user._id}]})
        .then(friendships => {
            const ret = [];
            for(f of friendships){
                if(f.requester.equals(user._id)) 
                    ret.push({"friend":f.accepter, "new":f.requester_new, "requester_last_read":f.requester_last_read, "accepter_last_read":f.accepter_last_read});
                else 
                    ret.push({"friend":f.requester, "new":f.accepter_new, "requester_last_read":f.requester_last_read, "accepter_last_read":f.accepter_last_read});
            }
            Q.User.find({_id:{$in: ret.map(r=>r.friend)}})
            .then(users => {
                users.map(u => {
                    ret.map(r =>{
                        if(u._id.equals(r.friend)){
                            r.friend = u.username;
                            r.online = u.online;
                            r.busy = u.busy;
                            r.profile_picture = FH.loadProfilePicture(u.username);
                        }
                    });
                });
                res.json(ret);
            })
            .catch(err => res.status(500).json("Error: Could not retrieve user profiles of friends"))
        })
        .catch(err => res.status(500).json("Error: Could not retrieve friends"))
    })
});

router.route('/sendChatroom').post((req, res) =>{
    Q.validate(req.body.token, res, me => {
        Q.findOne(Q.Chatroom, {name:req.body.chatroom, members:{$elemMatch:{user:me._id}}},res, chatroom => {
            const channel = chatroom.channels.filter(channel => channel.name == req.body.channel)[0]
            if(channel){
                //TODO: If message contains picture, upload it and get the path then:
                images = [];
                if(req.body.images){
                    images = req.body.images;
                }
                if(req.body.text){
                    message = {user: {name:me.username,profile_picture: me.profile_picture}, text:req.body.text, images: images}
                    Q.Chatroom.update(
                        {_id: chatroom._id, "channels._id": channel.id},
                        {$push: {"channels.$.messages": message}}
                    )
                    .then(receipt => res.json(`Message sent to ${channel.name}`))
                    .catch(err => res.status(500).json("Error: Could not post message"));
                }
                else{
                    res.status(404).json("Error: Did not provide text.")
                }          
            }
            else
                res.status(404).json(`${req.body.channel} is not a channel in ${req.body.chatroom}`)
        }, `Not a member of ${req.body.chatroom}.`)
    })
});

router.route('/sendDM').post((req, res) =>{
    Q.validate(req.body.token, res, me => {
        Q.findOne(Q.User, {username:req.body.friend}, res, them =>{
            Q.Friends.findOne({$or:[{requester:me._id, accepter:them._id},{requester:them._id, accepter:me._id}]})
            .then(friendship => {
                if(friendship){
                    images = [];
                    if(req.body.images){
                        images = req.body.images;
                    }
                    if(req.body.text){
                        message = {user: {name:me.username,profile_picture: me.profile_picture}, text:req.body.text, images: images}
                        Q.Friends.update(
                            {_id: friendship._id},
                            {$push: {"messages": message}}
                        )
                        .then(receipt => res.json(`Message sent to ${req.body.friend}`))
                        .catch(err => res.status(500).json("Error: Could not post message"));
                    }
                    else{
                        res.status(404).json("Error: Did not provide text.")
                    }    
                }
                else
                    res.status(404).json(`Not friends with ${req.body.friend}`)
            })
            .catch(err => res.status(500).json("Bad Query for Friends"))
        });
    });
});

router.route('/retrieveChatroom').get((req, res) =>{
    Q.validate(req.body.token, res, me => {
        Q.findOne(Q.Chatroom, {name:req.body.chatroom, members:{$elemMatch:{user:me._id}}},res, chatroom => {
            const channel = chatroom.channels.filter(channel => channel.name == req.body.channel)[0]
            if(channel){
                res.json(channel.messages)
            }
            else
                res.status(404).json(`${req.body.channel} is not a channel in ${req.body.chatroom}`)
        }, `Not a member of ${req.body.chatroom}.`)
    })
});

router.route('/retrieveDM').get((req, res) =>{
    Q.validate(req.body.token, res, me => {
        Q.findOne(Q.User, {username:req.body.friend}, res, them =>{
            Q.Friends.findOne({$or:[{requester:me._id, accepter:them._id},{requester:them._id, accepter:me._id}]})
            .then(friendship => {
                if(friendship){
                    res.json(friendship.messages);
                }
                else
                    res.status(404).json(`Not friends with ${req.body.friend}`)
            })
            .catch(err => res.status(500).json("Bad Query for Friends"))
        });
    });
});

module.exports = router;