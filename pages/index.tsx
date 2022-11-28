import type { NextPage } from 'next';
import Head from 'next/head';
import { FormEvent, useCallback, useRef, useState } from 'react';
import React from 'react';

import styles from '../styles/Home.module.css';
import io from 'socket.io-client';
const Home: NextPage = () => {
  const [enterroom, setroom] = useState(true);
  const roomRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLInputElement>(null);
  const nickNameRef = useRef<HTMLInputElement>(null);
  const [roomName, setRoomName] = useState('');
  const socket = io('http://localhost:8080');
  function handleNickNameSubmit(e: FormEvent) {
    e.preventDefault();
    nickNameRef.current && socket.emit('nickName', nickNameRef.current.value);
  }
  function handleRoomSubmit(e: FormEvent) {
    e.preventDefault();
    roomRef.current && socket.emit('enter_room', roomRef.current.value);
    if (roomRef.current) {
      setRoomName(roomRef.current.value);
      roomRef.current.value = '';
    }
    setroom(false);
  }
  function handleMessageSubmit(e: FormEvent) {
    e.preventDefault();
    if (messageRef.current !== null) {
      const newmessage = messageRef.current.value;
      socket.emit('new_message', messageRef.current.value, roomName);
      console.log(roomName);
      messageRef.current.value = '';
    }
  }
  const [msgList, setMsgList] = useState<string[]>([]);

  function addMessage(msg: string) {
    setMsgList((prev) => [...prev, msg]);
  }
  socket.on('welcome', (user) => {
    addMessage(`${user} 들어옴`);
  });
  socket.on('bye', (left) => {
    addMessage(`${left} 떠남`);
  });
  socket.on('no1_message', (msg) => {
    addMessage(msg);
  });
  return (
    <>
      <Head>
        <title>zoom</title>
      </Head>
      <div className={styles.container}>
        <main>
          {enterroom ? (
            <div>
              <form onSubmit={handleNickNameSubmit}>
                <input
                  type="text"
                  ref={nickNameRef}
                  placeholder="nickname"
                  required
                />
                <button>send</button>
              </form>
              <form onSubmit={handleRoomSubmit}>
                <input
                  type="text"
                  ref={roomRef}
                  placeholder="room name"
                  required
                />
                <button>Enter room</button>
              </form>
            </div>
          ) : (
            ''
          )}
          {!enterroom ? (
            <div>
              <h2>{roomName}</h2>
              <form onSubmit={handleNickNameSubmit}>
                <input
                  type="text"
                  ref={nickNameRef}
                  placeholder="nickname"
                  required
                />
                <button>send</button>
              </form>
              <form onSubmit={handleMessageSubmit}>
                <input
                  type="text"
                  ref={messageRef}
                  placeholder="message"
                  required
                />
                <button>send</button>
              </form>
              <ul>
                {msgList.map((x, idx) => {
                  return <li key={idx}>{x}</li>;
                })}
              </ul>
            </div>
          ) : (
            ''
          )}
        </main>
      </div>
    </>
  );
};

export default Home;
