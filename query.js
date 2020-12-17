let User = require('./models/user.model');
const Chatroom = require('./models/chatroom.model');
let Friends = require('./models/friends.model');

const name = Table => {
    switch(Table){
        case User: return "User";
        case Chatroom: return "Chatroom";
        case Friends: return "Friendship";
    }
}

const validate = (token, res, callback) => {
    User.findOneAndUpdate({token:token}, {last_checkin:Date.now()})
    .then(user => { 
        if(user)
            callback? callback(user) : res.json("Success.");
        else
            res.status(404).json("Invalid Token.");
    })
    .catch(err => res.status(500).json("Invalid Token."));
};

const find = (Table, query, res, callback,  e=`Error: ${name(Table)} not found.`) => {
    Table.find(query)
    .then(items => {
        if(items)
            callback? callback(items): res.json("Success.");
        else
           res.status(404).json(e);
    })
    .catch(err => res.status(500).json(`Error: Could not query ${name(Table)}`));
}

const findOne = (Table, query, res, callback,  e=`Error: ${name(Table)} not found.`) => find(Table, query, res, items=>{
    if(items.length)
        callback(items[0]);
    else
        res.status(404).json(e);
}, e);

const xFindOne = (Table, query, res, callback,  e=`Error: ${name(Table)} not found.`) => find(Table, query, res, items=>{
    callback(items[0]);
}, e);

const update = (Table, query, changes, res, callback,   e=`Error: ${name(Table)} not found.`) => {
    Table.update(query, changes)
    .then(item => {
        if(item){
            callback? callback(item): res.json("Success.");
        }
        else
            res.status(404).json(e);
    })
    .catch(err => res.status(500).json(`Error: Could not query ${name(Table)}`));
};

const vFind = (token, Table, query, res, callback,  e=`Error: ${name(Table)} not found.`) =>{
    validate(token, res, user => {
        find(Table, query, res, callback, e);
    })
}

const vFindOne = (token, Table, query, res, callback,  e=`Error: ${name(Table)} not found.`) =>{
    validate(token, res, user => {
        findOne(Table, query, res, callback, e)
    })
}

const vUpdate = (token, Table, query, changes, res, callback, e=`Error: ${name(Table)} not found.`) =>{
    validate(token, res, user => {
        update(Table, query, changes, res, callback,  e)
    })
}

module.exports.User = User;
module.exports.Chatroom = Chatroom;
module.exports.Friends = Friends;

module.exports.find = find;
module.exports.findOne = findOne;
module.exports.update = update;
module.exports.validate = validate;


module.exports.vFind = vFind;
module.exports.vFindOne = vFindOne;
module.exports.vUpdate = vUpdate;

module.exports.xFindOne = xFindOne;