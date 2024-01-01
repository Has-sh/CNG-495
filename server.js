const express = require("express");// Importing Express framework for server setup
const path = require("path");// Utility for handling file paths
const bodyparser = require("body-parser"); // Middleware for parsing incoming request bodies
const session = require("express-session"); // Middleware for managing sessions

const app = express();// Creating an instance of Express


const PORT = process.env.PORT || 8080;// Defining the port for the server to listen on (defaults to 8080 if not provided in the environment)

app.use(bodyparser.urlencoded({ extended: true }));; // Parsing url-encoded bodies

app.use(bodyparser.json());// Parsing JSON bodies

app.set("view engine", "ejs");// Setting the view engine to EJS for rendering views/templates

// Serving static files such as CSS, images, and JS
app.use("/css", express.static(path.resolve(__dirname, "Assets/css")));
app.use("/img", express.static(path.resolve(__dirname, "Assets/img")));
app.use("/js", express.static(path.resolve(__dirname, "Assets/js")));

// Routing setup
app.use("/", require("./Server/routes/router"));

// Starting the server and listening on the defined port
var server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const io = require("socket.io")(server, {
  allowEIO3: true,// Configuring Socket.IO with options
});

var userConnection = []; // Array to keep track of connected users

io.on("connection", (socket) => {
  console.log("Socket id is: ", socket.id);
  socket.emit("mySocketId", socket.id); // Emitting the current socket ID to the connected client

  // Handling user connection event
  socket.on("userconnect", (data) => {
    console.log("Logged in username", data.displayName);
    // Storing user connection details in the array
    userConnection.push({
      connectionId: socket.id,
      user_id: data.displayName,
      engaged: false,// Initially marking the user as not engaged
    });
    // Logging user information for tracking purposes
    userConnection.map(function (user) {
      const use = { "userid: ": user.user_id, Engaged: user.engaged };
      console.log(use);
    });
  });

  // Handling event to find an unengaged user to start a chat
  socket.on("findUnengagedUser", (data) => {
    const unengagedUser = userConnection.find(
      (user) => !user.engaged && user.connectionId !== socket.id
    );

    if (unengagedUser) {
      const senderUser = userConnection.find(
        (user) => user.connectionId === socket.id
      );
      if (senderUser) {
        senderUser.engaged = true;// Marking the sender as engaged
        console.log("UserUser is", senderUser);
      }

      unengagedUser.engaged = true;// Marking the found unengaged user as engaged
      socket.emit("startChat", unengagedUser.connectionId); // Emitting event to start chat with the found unengaged user
      console.log("engaged user", unengagedUser.engaged);
    }
  });

  // Event listener for receiving an offer sent to a remote user
  socket.on("offerSentToRemote", (data) => {
    // Finding the user who should receive the offer
    var offerReceiver = userConnection.find(
      (o) => o.user_id === data.remoteUser
    );
    if (offerReceiver) {
      // Logging the receiver's connection ID for reference
      console.log("OfferReceiver user is: ", offerReceiver.connectionId);
      // Emitting the offer to the intended receiver
      socket.to(offerReceiver.connectionId).emit("ReceiveOffer", data);
    }
  });
});


