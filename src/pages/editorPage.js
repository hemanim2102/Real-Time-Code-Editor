import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Navigate, useParams } from "react-router-dom";

import styles from "./editor-page.module.css"
import AddClient from "../components/addclient";
import Editor from "../components/editor";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleHalfStroke, faUsers, faPlay } from '@fortawesome/free-solid-svg-icons';
import { faFileCode, faMessage } from '@fortawesome/free-regular-svg-icons';

import { initSocket } from "../socket";
import ACTIONS from "../actions";

import toast from 'react-hot-toast';



const EditorPage = () => {

    const [clients, setClients] = useState([]);
    const [lightDark, setLightDark] = useState('false');
    const [hidUsers, setHidUsers] = useState('false');

    const socketRef = useRef(null);
    const location = useLocation();
    const reactNavigator = useNavigate();
    const { roomId } = useParams();//getting roomId from the link of the room given while navigation from home to editor
    const syncCodeRef = useRef(null);



    useEffect(() => {
        const init = async () => {

            //creatin socket for the room url
            socketRef.current = await initSocket();

            //// .on is a listner which listens the event specified in it (below the specified event name is 'connection_error' )
            socketRef.current.on('connection_error', (err) => handleErrors(err));
            socketRef.current.on('connection_failed', (err) => handleErrors(err));

            //handling connection error of socket to the room (server) 
            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.')
                reactNavigator('/');
            }

            //emitting connection event which will be listened by the server
            //also sending the connection data to the server to handle and keep record of it 
            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                userName: location.state?.userName,
            });

            //listening for joined event emitted by server
            socketRef.current.on(ACTIONS.JOINED, ({ clientList, userName, socketId }) => {
                if (userName != location.state?.userName) {
                    toast.success(`${userName} joined the room.`);
                    console.log(`${userName} joined.`)
                }

                setClients(clientList);

                //emiting event and sending the current code text data to the server for updating the editor for new joined member
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    codeText: syncCodeRef.current,
                    socketId,
                });
            })

            //listening for disconnection event emitted by server
            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, userName }) => {
                toast.error(`${userName} left the room.`);
                setClients((current) => {
                    return current.filter(client => client.socketId !== socketId);
                })
            })
        }
        init();

        //the moment component will unmount this function will be called and the imp task of cleaning of listeners will be performed
        return () => {
            //disconnecting listener
            socketRef.current.disconnect();

            //disconnecting the socket.io event listener
            socketRef.current.off(ACTIONS.JOINED)
            socketRef.current.off(ACTIONS.DISCONNECTED)
        }
    }, [])



    if (!location.state) {
        return <Navigate to="/"></Navigate>
    }



    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success(`Room ID copied to clipboard`)
            console.log(roomId)
        } catch (err) {
            toast.error("Couldn't copy Room ID");
            console.error(err);
        }
    }



    const leaveRoom = () => {
        reactNavigator('/');
    }



    const ChangeTheme = () => {
        if (lightDark === 'false') {
            setLightDark('true');
        } else {
            setLightDark('false');
        }
    }

    const HideUserSection = () => {
        console.log("I'm clicked.")
        if (hidUsers === 'false') {
            setHidUsers('true');
        } else {
            setHidUsers('false');
        }
        console.log(hidUsers)
    }


    return <div className={`${styles.mainWrap} ${lightDark === 'true' ? "myMode" : ""} ${hidUsers === 'true' ? "myUsers" : ""}`}>
        <div className={`${styles.editorIconsBar} myModeBar`}>
            <div className={styles.leftIcons}>
                <div className={styles.icons}><FontAwesomeIcon icon={faCircleHalfStroke} className={`${styles.editorIcons} ${styles.lighDarkModeIcon} myModicon`} onClick={ChangeTheme} /></div>

                <div className={styles.icons}><FontAwesomeIcon icon={faFileCode} className={`${styles.editorIcons} ${styles.codeFileIcon} myModicon`} /></div>

                <div className={styles.icons}><FontAwesomeIcon icon={faUsers} className={`${styles.editorIcons} ${styles.usersIcon} myModicon`} onClick={HideUserSection} /></div>

                <div className={styles.icons}><FontAwesomeIcon icon={faMessage} className={`${styles.editorIcons} ${styles.messageIcon} myModicon`} /></div>
            </div>
            <div className={`${styles.icons} ${styles.rightIcon}`}><FontAwesomeIcon icon={faPlay} className={`${styles.editorIcons} ${styles.playIcon} myModicon`} /></div>
        </div>
        <div className={styles.secondWrap}>
            <div className={`${styles.sideBar} mymodeSideBar`}>
                <div className={styles.sideInner}>
                    <div className={`${styles.logo} myModelogo`}>
                        <h1 className={`${styles.editorName} myModeditorName`}>Realtime <br></br>Collaboration</h1>
                    </div>
                    <div className={styles.membersList}>
                        <h3>Connected</h3>
                        <div className={styles.clientList}>
                            {
                                clients.map((client) =>
                                    <AddClient key={client.socketID} userName={client.userName}></AddClient>
                                )
                            }
                        </div>
                    </div>
                </div>
                <div className={styles.sideButtons}>
                    <button className={`btn myModecopy ${styles.copyBtn}`} onClick={copyRoomId}>Copy Room ID</button>
                    <button className={`btn myModeleave ${styles.leaveBtn}`} onClick={leaveRoom}>Leave</button>
                </div>
            </div>
            <div className={`${styles.editorWrap}`}>
                <Editor socketRef={socketRef} roomId={roomId} onCodeSync={(codeText) => { syncCodeRef.current = codeText; }}></Editor>
            </div>
        </div>
    </div>
}

export default EditorPage;