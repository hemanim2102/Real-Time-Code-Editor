const { Server } = require('socket.io');
const express = require('express');
var http = require('http');
const ACTIONS = require('./src/actions');

const app = express();

const server = http.createServer(app);
const io = new Server(server);


//storing the socketId and userName key value pair of all connected clients to a perticular room
const userSocketMap = {};


//for listing all the sockets conected with a room identified by given roomID
const getAllConnectedClients = (roomId) => {
    //map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            userName: userSocketMap[socketId],
        }

    })
}


//connecting the socket with the room
io.on('connection', (socket) => {
    // console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, userName }) => {

        //saving the client name and socket if in userSocketMap
        userSocketMap[socket.id] = userName;

        //socket joining the room
        socket.join(roomId);

        //for notifying all members of room about joinning of new member and adding them into the clients object of editor page (room)
        const clientList = getAllConnectedClients(roomId);
        // console.log(clientList);

        //this emitted event will be listened in editorPage.js to refelect notification to members in the room
        clientList.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clientList,
                userName,
                socketId: socket.id,
            });
        });
    });


    //we are listening to the event called by a client
    //then emiting that event from server to everyone connected to the same room and also passing the changed code text of text editor
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, codeText }) => {

        // console.log('recieving', codeText, roomId);

        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { codeText });
    });

    ////listening event emitted by new joining and for updating the editor of new joind member 
    socket.on(ACTIONS.SYNC_CODE, ({ codeText, socketId }) => {

        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { codeText });
    });

    //logic for diconnection
    socket.on('disconnecting', () => {
        const allRooms = [...socket.rooms];//normally only one room will be there but we are getting all rooms for situations where multiple rooms are created

        //so we are updating all the rooms and broadcasting disconnected messege
        //also passing the data with emiter
        allRooms.forEach((roomID) => {
            socket.in(roomID).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                userName: userSocketMap[socket.id]
            })
        })

        //deleting the disconnected client data from userSocketMap
        delete userSocketMap[socket.id];

        //socket leaving the room
        socket.leave();
    })

});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));