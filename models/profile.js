var mongoose = require("mongoose");

var profileSchema = new mongoose.Schema({
    image: String, 
    desc: String,
    owner: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
});

module.exports = mongoose.model("Profile", profileSchema);