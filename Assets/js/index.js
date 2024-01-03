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

let socket = io.connect()

// let socket = io.connect('wss://socialify1.ue.r.appspot.com'); //changed when hosted on cloud
socket.on("connect", () => {
  console.log("The Socket is connected");
});

socket.on("mySocketId", (socketId) => {
  if (socket.connected) {
    username = socketId;
    socket.emit("userconnect", {
      displayName: socketId,
    });
    runUser();
  }

  console.log("My Socket ID:", socketId);
});

function runUser() {
  let init = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    document.getElementById("user-1").srcObject = localStream;

    socket.emit("findUnengagedUser", {
      username: username,
    });

    socket.on("startChat", (otherUserId) => {
      console.log("Starting chat with user:", otherUserId);
      remoteUser = otherUserId;
      createOffer(otherUserId);
    });
  };

  init();


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
}

//   socket.on("closedRemoteUser", function (data) {
//     const remotStream = peerConnection.getRemoteStreams()[0];
//     remotStream.getTracks().forEach((track) => track.stop());
//     peerConnection.close();
//     document.querySelector(".chat-text-area").innerHTML = "";
//     const remoteVid = document.getElementById("user-2");
//     if (remoteVid.srcObject) {
//       remoteVid.srcObject.getTracks().forEach((track) => track.stop());
//       remoteVid.srcObject = null;
//     }
//     console.log("Closed Remote user");
//     fetchNextUser(remoteUser);
//   });

//   socket.on("candidateReceiver", function (data) {
//     peerConnection.addIceCandidate(data.iceCandidateData);
//   });

//   msgSendBtn.addEventListener("click", function (event) {
//     sendData();
//   });

//   window.addEventListener("unload", function (event) {
//     socket.emit("remoteUserClosed", {
//       username: username,
//       remoteUser: remoteUser,
//     });
//   });

//   async function closeConnection() {
//     document.querySelector(".chat-text-area").innerHTML = "";
//     const remotStream = peerConnection.getRemoteStreams()[0];
//     remotStream.getTracks().forEach((track) => track.stop());

//     await peerConnection.close();
//     const remoteVid = document.getElementById("user-2");
//     if (remoteVid.srcObject) {
//       remoteVid.srcObject.getTracks().forEach((track) => track.stop());
//       remoteVid.srcObject = null;
//     }

//     await socket.emit("remoteUserClosed", {
//       username: username,
//       remoteUser: remoteUser,
//     });
//     fetchNextUser(remoteUser);
//   }

//   $(document).on("click", ".next-chat", function () {
//     document.querySelector(".chat-text-area").innerHTML = "";
//     console.log("From Next Chat button");
//     closeConnection();
//   });

