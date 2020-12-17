const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chatroomSchema = new Schema({
    name: 
    {
        type: String,
        required: true,
        minlength: 3
    },
    profile_picture:{type: String},
    channels:[
        {
            name: 
            {
                type: String,
                required: true,
                minlength: 3
            },
            messages:
            [
                {
                    _id:false,
                    user: {
                        name: {type: String, minlength: 3, maxlength: 20, required: true},
                        profile_picture:{type: String}
                    },
                    text: {type: String},
                    date_sent: { type: Date, default: Date.now },
                    images:
                    [{
                        _id:false,
                        insert_index:{type: Number, required:true},
                        path:{type: String, required:true}
                    }]
                },{timestamps: true,}
            ]
        }
    ],
    members: [
        {
            user: {type: Schema.Types.ObjectId, ref:'User', required: true},
            last_read: {type: Date, required: true, default: new Date(0)},
            favorite: {type: Boolean, required: true, default: false},
            muted: {type: Boolean, required: true, default: false},
            admin: {type: Boolean, required: true, default: false},
            owner: {type: Boolean, required: true, default: false},
            date_joined: { type: Date, default: Date.now },
        },{timestamps: true}
    ]
},{timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true }});

chatroomSchema.virtual('owners').get(function () {
    owners = [];
    this.members.map(member => {
        if(member.owner) owners.push(member);
    })
    return owners;
});

chatroomSchema.virtual('admins').get(function () {
    admins = [];
    this.members.map(member => {
        if(member.admin) admins.push(member);
    })
    return admins;
});

const Chatroom = mongoose.model('Chatroom', chatroomSchema);
module.exports = Chatroom;