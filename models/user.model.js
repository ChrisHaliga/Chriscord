const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: 
    {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    password: 
    {
        type: String,
        required: true,
        minlength: 3
    },
    token: 
    {
        type: String,
        unique: true,
        default: null
    },
    profile_picture:{type: String},
    last_checkin: {type: Date, default: Date.now, required:true},
    busy:{type:Boolean, required:true}
},{timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true }});

userSchema.virtual('online').get(function () {
    if(this.token && this.last_checkin)
        return Date.now() - this.last_checkin.getTime() <= 1000*60*10;
    return false;
});

const User = mongoose.model('User', userSchema);
module.exports = User;