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

