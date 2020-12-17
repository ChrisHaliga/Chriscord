const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const friendsSchema = new Schema({
    requester: {type: Schema.Types.ObjectId, ref:'User', required: true},
    accepter: {type: Schema.Types.ObjectId, ref:'User', required: true},
    requester_last_read: {type: Date, required: true, default: new Date(0)},
    accepter_last_read: {type: Date, required: true, default: new Date(0)},
    accepted: {type: Boolean, required: true, default: false},
    messages:
    [
        {
            _id:false,
            user: {type: Schema.Types.ObjectId, ref:'User', required: true},
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
},{timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true }});

friendsSchema.virtual('requester_new').get(function () {
    return (this.updatedAt.getTime()>this.requester_last_read.getTime())
});

friendsSchema.virtual('accepter_new').get(function () {
    return (this.updatedAt.getTime()>this.accepter_last_read.getTime())
});

const Friends = mongoose.model('Friends', friendsSchema);

module.exports = Friends;