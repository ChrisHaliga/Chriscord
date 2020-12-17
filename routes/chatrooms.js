const router = require('express').Router();

let Q =  require('../query.js');

router.route('/info').get((req, res) => {
    Q.validate(req.body.token, res, you => {
        Q.Chatroom.findOne( 
        {
            "name":req.body.chatroom,
            "members": {$elemMatch: {user:you._id}}
        })
        .populate({path:'members.user', select:"username -_id"})
        .populate({path:'admins.user', select:"username -_id"})
        .populate({path:'owners.user', select:"username -_id"})
        .exec((err, chatroom) => {
            if(!err){
                ret = JSON.parse(JSON.stringify(chatroom)) //        -Converts from MongoDB object to true json.
                delete ret._id; delete ret.id; delete ret.__v;  //   -Deletes the id's and v.
                ret.channels.map(c => delete c._id); //              -Removes all the id fields from channels.
                [ret.members, ret.admins, ret.owners].map(group =>{//-Removes non-public information about users.
                    group.map(m => {delete m._id; delete m.favorite; delete m.muted; m.user = m.user.username});
                })
                
                res.json(ret);
            }
            else
                res.status(500).json("Could not query Chatroom");
        })
    })
});

/*  request:{   
        token:<your token>
        chatroom:<the name>,
    }
*/ 
router.route('/create').post((req, res) => {
    const chatroom = req.body.chatroom;
    Q.validate(req.body.token, res, user => {
        newChatroom = new Q.Chatroom({
            name:chatroom,
            channels: [
                {
                    name: "general",
                    messages:[]
                }
            ],
            members: [
                {
                    user: user._id,
                    admin: true,
                    owner: true
                }
            ]
        });
        newChatroom.save()
        .then(() =>  res.json(`Chatroom '${chatroom}' created.`))
        .catch(err => res.status(404).json(err));
    })
});

router.route('/delete').post((req, res) => {
    Q.validate(req.body.token, res, you => {
        Q.Chatroom.findOneAndDelete(
            {
                name:req.body.chatroom, // Find the chatroom
                members: {$elemMatch: {
                    user:you._id,       // Ensure you're a member and an owner
                    $or: [{owner:true}]
                }}
            })
        .then(receipt => {
            if(receipt)
                res.json(`${req.body.chatroom} deleted`);
            else
                res.status(400).json(`Chatroom named '${req.body.chatroom}' with your ownership not found.`)
        })
        .catch(err => res.status(500).json("Bad Query for Chatrooms"))
    })
});

/*
    token:      Token validates the user.
    chatroom:   The name of the chatroom.
    channel:    The name of the channel.
    x:          True: add channel; false: remove channel
    res:        So that Q functions can respond and this doesn't need endless catch statements.       
*/
const xChannel = (token, chatroom, channel, x, res) => {
    Q.validate(token, res, you => {
        Q.findOne(Q.Chatroom, 
        {
            "name":chatroom,
            "members": {$elemMatch: {
                user:you._id,           // Make sure you're a member and an owner or admin
                $or: [{admin:true}, {owner:true}]
            }}
        }, res, chatroom =>{
            if(chatroom){
                action = x?{$push: {channels:{name:channel}}}:{$pull: {channels:{name:channel}}}; //Selects pull or push.
                // filters to see if the channel exists by checking the length, then x checks if this state is desirable.
                if((chatroom.channels.filter(c=> c.name == channel).length == 0) == x){
                    Q.Chatroom.update({_id:chatroom._id}, action) //pulls or pushes based on x
                    .then(()=> res.json(`'${channel}' ${x?"added to":"removed from"} ${chatroom.name}.`))
                    .catch(err => res.status(500).json(err));
                }else
                    res.status(404).json(`'${channel}' ${x?"already exists":"doesn't exist"}.`);
            }
            else
                res.status(404).json(`Either ${chatroom} doesn't exist or you're not qualified to add members.`);
        })
    })
}

router.route('/addChannel').post((req, res) => {xChannel(req.body.token, req.body.chatroom, req.body.channel, true, res)});
router.route('/removeChannel').post((req, res) => {xChannel(req.body.token, req.body.chatroom, req.body.channel, false, res)});

/*
    token:      Token validates the user.
    chatroom:   The name of the chatroom.
    member:     The username of the (prospective) member.
    x:          True: add member; false: remove member
    res:        So that Q functions can handle catch statements.       
*/
const xMember = (token, chatroom, member, x, res) => {
    Q.validate(token, res, you => {
        Q.findOne(Q.User, {username: member}, res, them =>{
            Q.findOne(Q.Chatroom, 
            {
                "name":chatroom,
                "members": {$elemMatch: {
                    user:you._id,           // Make sure you're a member and an owner or admin
                    $or: [{admin:true}, {owner:true}]
                }}
            }, res, chatroom =>{
                if(chatroom){
                    action = x?{$push: {members:{user:them._id}}}:{$pull: {members:{user:them._id}}}; //Selects pull or push
                    // filters to see if the channel exists by checking the length, then x checks if this state is desirable.
                    if((chatroom.members.filter(m=> m.user.equals(them._id) && (x?!m.admin:true)).length == 0) == x){
                        Q.Chatroom.update({_id:chatroom._id}, action)
                        .then(()=> res.json(`'${member}' ${x?"added to":"removed from"} ${chatroom.name}.`))
                        .catch(err => res.status(500).json(err));
                    }else
                        res.status(404).json(`'${member}' is${x?" already a member":"n't a member or is an owner"}.`);
                }
                else
                    res.status(404).json(`Either ${chatroom} doesn't exist or you're not qualified to add members.`);
            })
        })
    })
}
router.route('/addMember').post((req, res) => xMember(req.body.token, req.body.chatroom, req.body.member, true, res));
router.route('/removeMember').post((req, res) => xMember(req.body.token, req.body.chatroom, req.body.member, false, res));


/*
    token:      Token validates the user.
    chatroom:   The name of the chatroom.
    member:     The username of the member.
    x:          True: promote member; false: demote member
    res:        So that Q functions can handle catch statements.       
*/
const xMote = (token, chatroom, member, x, res) => {
    Q.validate(token, res, you => {
        Q.findOne(Q.User, {username: member}, res, them =>{
            Q.findOne(Q.Chatroom, 
            {
                "name":chatroom,
                "members": {
                    $elemMatch: {
                        user:you._id, 
                        $or: [{admin:true}, {owner:true}]
                    },$elemMatch: {
                        user:them._id
                    }
                }
            }, res, chatroom =>{
                    if(chatroom){
                        // filters to see if the channel exists by checking the length, then x checks if this state is desirable.
                        if(chatroom.members.filter(member => member.user.equals(them._id) && member.admin != x)[0]){
                            Q.Chatroom.update({_id:chatroom._id, "members.user":them._id}, {$set: {"members.$.admin":x}})//sets admin status to x
                            .then(()=> res.json(`'${member}' ${x?"promoted to admin":"was demoted"}.`))
                            .catch(err => res.status(500).json(err));
                        }
                        else
                            res.status(404).json(`${member} ${x?"is already an admin":"is not an admin"}.`)
                    }
                    else
                        res.status(404).json(`You aren't qualified to change admin status in '${req.body.chatroom}'`)
                }
            )
        })
    })
}

router.route('/promote').post((req, res) => xMote(req.body.token, req.body.chatroom, req.body.member, true, res));
router.route('/demote').post((req, res) => xMote(req.body.token, req.body.chatroom, req.body.member, false, res));




module.exports = router;