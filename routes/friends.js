const router = require('express').Router();

let Q =  require('../query.js');

router.route('/request').post((req,res)=> {
    Q.validate(req.body.token, res, me => {
        Q.findOne(Q.User,{username:req.body.friend}, res, them=>{
            Q.xFindOne(Q.Friends, {$or:[{requester:me._id, accepter:them._id},{requester:them._id, accepter:me._id}]}, res, friendship =>{
                if(!friendship){
                    newFriends = new Q.Friends({
                        requester:me._id,
                        accepter:them._id,
                        messages:[]
                    });
                    newFriends.save()
                    .then(() =>  res.json(`Friend request sent to ${req.body.friend}.`))
                    .catch(err => res.status(500).json(err));
                }else{
                    res.status(404).json(`A friend request has already been sent between you and ${req.body.friend}`)       
                }
            })
        },`User ${req.body.friend} not found`);
    });
});

router.route('/accept').post((req,res)=> {
    Q.validate(req.body.token, res, me => {
        Q.findOne(Q.User, {username:req.body.friend}, res, them =>{
            Q.Friends.findOneAndUpdate({requester:them._id, accepter:me._id, accepted:false},{accepted:true})
            .then(results => {
                if(results)
                    res.json("Friend request accepted");
                else
                    res.status(404).json("Friend request not found")
            });
        });
    });
});

router.route('/remove').post((req,res)=> {
    Q.validate(req.body.token, res, me => {
        Q.findOne(Q.User, {username:req.body.friend}, res, them =>{
            Q.Friends.findOneAndDelete({$or:[{requester:me._id, accepter:them._id},{requester:them._id, accepter:me._id}]})
            .then(results => {
                if(results)
                    res.json("Friend request accepted");
                else
                    res.status(404).json("Friendship not found")
            })
            .catch(err => res.status(500).json("Bad Query for Friends"))
        });
    });
});



module.exports = router;