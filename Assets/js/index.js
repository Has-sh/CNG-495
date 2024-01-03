let localStream;
var username;
let remoteUser;
let url = new URL(window.location.href);

let peerConnection;
let remoteStream;
let sendChannel;
let receiveChannel;
var msgInput = document.querySelector("#msg-input");
var msgSendBtn = document.querySelector(".msg-send-button");
var chatTextArea = document.querySelector(".chat-text-area");

// Establish a socket connection
let socket = io.connect()

// let socket = io.connect('wss://socialify1.ue.r.appspot.com'); //changed when hosted on cloud// Event listener when the socket connection is established
socket.on("connect", () => {
  console.log("The Socket is connected");
});

// Event listener to receive the socket ID
socket.on("mySocketId", (socketId) => {
  if (socket.connected) {
    // Event listener to receive the socket ID
    username = socketId;
    socket.emit("userconnect", {
      displayName: socketId,
    });
    // Call the main function to initiate user actions
    runUser();
  }
  console.log("My Socket ID:", socketId);
});

// Main function that initializes the user and sets up actions
function runUser() {
  // Async function to initialize user media (camera and audio)
  let init = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    // Display local stream in a video element
    document.getElementById("user-1").srcObject = localStream;

    // Emit an event to find an unengaged user for a chat
    socket.emit("findUnengagedUser", {
      username: username,
    });

    // Event listener for starting a chat with another user
    socket.on("startChat", (otherUserId) => {
      console.log("Starting chat with user:", otherUserId);
      remoteUser = otherUserId;
      // Create an offer to initiate the WebRTC connection
      createOffer(otherUserId);
    });
  };

  // Initialize user media
  init();

  // Configuration for ICE servers
  let servers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.1.google.com:19302",
          "stun:stun2.1.google.com:19302",
        ],
      },
    ],
  };

  // Function to create the Peer Connection
  let createPeerConnection = async () => {
    // Create an RTCPeerConnection with the configured servers
    peerConnection = new RTCPeerConnection(servers);
    remoteStream = new MediaStream();
    // Display the remote stream in a video element
    document.getElementById("user-2").srcObject = remoteStream;

    // Add tracks from the local stream to the Peer Connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    // Event listener when a track is received from the remote peer
    peerConnection.ontrack = async (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    // Event listener for when the remote stream is inactive
    remoteStream.oninactive = () => {
      remoteStream.getTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      // Close the peer connection when the stream is inactive
      peerConnection.close();
    };

    // Event listener for ICE candidates and sending them to the remote user
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        socket.emit("candidateSentToUser", {
          username: username,
          remoteUser: remoteUser,
          iceCandidateData: event.candidate,
        });
      }
    };

    // Create a data channel for sending messages
    sendChannel = peerConnection.createDataChannel("sendDataChannel");
    sendChannel.onopen = () => {
      console.log("Data channel is now open and ready to use");
      // Callback function for the send channel state change
      onSendChannelStateChange();
    };

    // Event listener for incoming data channel
    peerConnection.ondatachannel = receiveChannelCallback;
  };

  // Function to create an offer and send it to the remote user
  let createOffer = async (remoteU) => {
    createPeerConnection();
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offerSentToRemote", {
      username: username,
      remoteUser: remoteU,
      offer: peerConnection.localDescription,
    });
  };

  // Function to handle changes in the send channel state
  function onSendChannelStateChange() {
    const readystate = sendChannel.readystate;
    console.log("Send channel state is: " + readystate);
    if (readystate === "open") {
      console.log(
        "Data channel ready state is open - onSendChannelStateChange"
      );
    } else {
      console.log(
        "Data channel ready state is NOT open - onSendChannelStateChange"
      );
    }
  }

// Function to create an answer to the received offer
  let createAnswer = async (data) => {
    // Set the remote user for the answer
    remoteUser = data.username;
    createPeerConnection();
    // Create a peer connection
    await peerConnection.setRemoteDescription(data.offer);
    // Create an answer to the offer
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    // Send the answer to the remote user via the signaling server
    socket.emit("answerSentToUser1", {
      answer: answer,
      sender: data.remoteUser,
      receiver: data.username,
    });
    // Enable the 'next-chat' button for the user to proceed
    document.querySelector(".next-chat").style.pointerEvents = "auto";
  };

  // Event listener for receiving an offer from the remote user
  socket.on("ReceiveOffer", function (data) {
    // Call the function to create an answer for the received offer
    createAnswer(data);
  });

  // Function to add the received answer to the peer connection
  let addAnswer = async (data) => {
    // Check if there is no existing remote description
    if (!peerConnection.currentRemoteDescription) {
      // Set the received answer as the remote description
      peerConnection.setRemoteDescription(data.answer);
    }
    // Enable the 'next-chat' button for the user to proceed
    document.querySelector(".next-chat").style.pointerEvents = "auto";
  };
  // Event listener for receiving an answer from the remote user
  socket.on("ReceiveAnswer", function (data) {
    // Call the function to add the received answer to the peer connection
    addAnswer(data);
  });
}
function sendData() {
  const msgData = msgInput.value;
  chatTextArea.innerHTML +=
    "<div style='margin-top:2px; margin-bottom:2px;'><b>Me: </b>" +
    msgData +
    "</div>";
  if (sendChannel) {
    onSendChannelStateChange();
    sendChannel.send(msgData);
    msgInput.value = "";
  } else {
    // Handle sending data on receive channel if needed
    // receiveChannel.send(msgData);
    msgInput.value = "";
  }
}

function receiveChannelCallback(event) {
  console.log("Receive Channel Callback");
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveChannelMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}


   socket.on("closedRemoteUser", function (data) {
     const remotStream = peerConnection.getRemoteStreams()[0];
     remotStream.getTracks().forEach((track) => track.stop());
     peerConnection.close();
     document.querySelector(".chat-text-area").innerHTML = "";
     const remoteVid = document.getElementById("user-2");
     if (remoteVid.srcObject) {
       remoteVid.srcObject.getTracks().forEach((track) => track.stop());
       remoteVid.srcObject = null;
     }
     console.log("Closed Remote user");
     fetchNextUser(remoteUser);
   });

   socket.on("candidateReceiver", function (data) {
     peerConnection.addIceCandidate(data.iceCandidateData);
   });

   msgSendBtn.addEventListener("click", function (event) {
     sendData();
   });

   window.addEventListener("unload", function (event) {
     socket.emit("remoteUserClosed", {
       username: username,
       remoteUser: remoteUser,
     });
   });

   async function closeConnection() {
     document.querySelector(".chat-text-area").innerHTML = "";
     const remotStream = peerConnection.getRemoteStreams()[0];
     remotStream.getTracks().forEach((track) => track.stop());

     await peerConnection.close();
     const remoteVid = document.getElementById("user-2");
     if (remoteVid.srcObject) {
       remoteVid.srcObject.getTracks().forEach((track) => track.stop());
       remoteVid.srcObject = null;
     }

     await socket.emit("remoteUserClosed", {
       username: username,
       remoteUser: remoteUser,
     });
     fetchNextUser(remoteUser);
   }

   $(document).on("click", ".next-chat", function () {
     document.querySelector(".chat-text-area").innerHTML = "";
     console.log("From Next Chat button");
     closeConnection();
  });
=======
function onReceiveChannelMessageCallback(event) {
  console.log("Received Message");
  chatTextArea.innerHTML +=
    "<div style='margin-top:2px; margin-bottom:2px;'><b>Stranger: </b>" +
    event.data +
    "</div>";
}

function onReceiveChannelStateChange() {
  const readystate = receiveChannel.readystate;
  console.log("Receive channel state is: " + readystate);
  if (readystate === "open") {
    console.log(
      "Data channel ready state is open - onReceiveChannelStateChange"
    );
  } else {
    console.log(
      "Data channel ready state is NOT open - onReceiveChannelStateChange"
    );
  }
}




