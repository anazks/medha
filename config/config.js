const mongoose = require("mongoose");


const connect = () => {

  return mongoose.connect("mongodb+srv://user:123@cluster0.xawpc.mongodb.net/virtualFashion?retryWrites=true&w=majority&appName=Cluster0")
}


module.exports = connect;