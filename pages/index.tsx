import type { NextPage } from 'next';
import Head from 'next/head';
import { FormEvent, MediaHTMLAttributes, useCallback, useRef, useState } from 'react';
import React from 'react';

import styles from '../styles/Home.module.css';
import io from 'socket.io-client';

const Home: NextPage = () => {
  const [enterroom, setroom] = useState(true);
  const roomRef = useRef<HTMLInputElement>(null);
  const socket = io('http://localhost:8080');
  const myFace = useRef<HTMLVideoElement>(null);
  const peerStream = useRef<HTMLVideoElement>(null);
  // 화면 기본 키고 끄고 설정
  let myStream: MediaStream;
  let myPeerConnection: RTCPeerConnection;
  let roomName: string;
  let muted = false;
  let carmeraonoff = false;

  const selectRef = useRef<HTMLSelectElement>(null);
  async function getCamera() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind == 'videoinput');
      // console.log('사용가능카메라', cameras);
      const currentCamera = myStream.getVideoTracks()[0];
      if (cameras.length > selectRef.current!.length) {
        cameras.forEach((camera) => {
          const option = document.createElement('option');
          option.value = camera.deviceId;
          option.innerText = camera.label;
          if (currentCamera.label == camera.label) {
            option.selected = true;
          }
          selectRef.current!.appendChild(option);
        });
      }
    } catch (error) {}
  } // 디바이스가 undefinded인데 화상이 나오는 버그 셀렉트 하고 나서야 뮤트되는 버그가 있음

  async function getMedia(deviceId?: string) {
    console.log('첫값아디', deviceId);
    const initialConstrains = { audio: true, video: true }; // { facingMode: 'user' } 폰버젼 셀카
    const camerConstraints = { audio: true, video: { deviceId: { exact: deviceId } } };
    try {
      myStream = await navigator.mediaDevices.getUserMedia(deviceId ? camerConstraints : initialConstrains);
      console.log('디바이스아이디', camerConstraints);
      if (myFace.current !== null) {
        myFace.current.srcObject = myStream;
      }
      // if (!deviceId) {
      getCamera();
      // }
    } catch (error) {
      console.log(error);
    }
  }
  const audioRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLButtonElement>(null);

  const handleMute = () => {
    myStream && myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    if (!muted && audioRef.current) {
      audioRef.current!.innerText = 'Unmute';
      muted = true;
    } else {
      audioRef.current!.innerText = 'Mute';
      muted = false;
    }
  };
  const handleCamera = () => {
    myStream && myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    if (!carmeraonoff && videoRef.current) {
      videoRef.current.innerText = 'Caemra On';
      carmeraonoff = true;
    } else {
      videoRef.current!.innerText = 'Camera Off';
      carmeraonoff = false;
    }
  };
  const handleSelect = async () => {
    console.log('선택한다바이스아디', selectRef.current!.value);
    await getMedia(selectRef.current!.value);
    if (myPeerConnection) {
      const videoTrack = myStream.getAudioTracks()[0];
      const videoSender = myPeerConnection.getSenders().find((sender) => sender.track?.kind === 'video');
      videoSender?.replaceTrack(videoTrack);
    }
  };
  async function startMedia() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind == 'videoinput');
    console.log('처음 카메라', cameras[0].deviceId);
    await getMedia(cameras[0].deviceId);
    setroom(false);
    makeConnection();
  }
  React.useEffect(() => {
    getCamera();
  }, []);
  function handleRoomSubmit(evnet: FormEvent) {
    evnet.preventDefault();
    roomName = roomRef.current!.value;
    startMedia();
    socket.emit('join_room', roomName);
  }
  function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun3.l.google.com:19302',
            'stun:stun4.l.google.com:19302',
          ],
        },
      ],
    });
    myPeerConnection.addEventListener('icecandidate', handleIce);
    myPeerConnection.addEventListener('addstream', handleAddStream);
    if (myStream !== undefined) {
      myStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, myStream));
    }
  }

  function handleAddStream(data: any) {
    console.log('data', data);
    const peersStream = peerStream.current;
    peersStream!.srcObject = data.stream;
  }
  function handleIce(data: RTCPeerConnectionIceEvent) {
    console.log('sent candiate', data);
    socket.emit('ice', data.candidate, roomName);
  }
  socket.on('welcome', async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log('sent  the offer');
    socket.emit('offer', offer, roomName);
  });
  socket.on('ice', (ice) => {
    if (myPeerConnection) {
      myPeerConnection.addIceCandidate(ice);
      console.log('received candidate');
    }
  });

  socket.on('offer', async (offer) => {
    if (myPeerConnection) {
      console.log('received the offer');
      myPeerConnection.setRemoteDescription(offer);
      const answer = await myPeerConnection?.createAnswer();
      myPeerConnection.setLocalDescription(answer);
      socket.emit('answer', answer, roomName);
      console.log('sent the answer');
    }
  });

  socket.on('answer', (answer) => {
    console.log('received the answer');
    myPeerConnection && myPeerConnection.setRemoteDescription(answer);
  });
  return (
    <>
      <Head>
        <title>zoom</title>
        <link rel="stylesheet" href="https://unpkg.com/mvp.css"></link>
      </Head>

      <div className={styles.container}>
        <main>
          {enterroom ? (
            <div>
              <form onSubmit={handleRoomSubmit}>
                <input type="text" ref={roomRef} placeholder="room name" required />
                <button>Enter room</button>
              </form>
            </div>
          ) : (
            ''
          )}
          {!enterroom ? (
            <>
              <video autoPlay ref={myFace} playsInline width={400} height={400}></video>
              <video autoPlay ref={peerStream} playsInline width={400} height={400}></video>
              <button ref={audioRef} onClick={handleMute}>
                Mute
              </button>
              <button ref={videoRef} onClick={handleCamera}>
                Camera off
              </button>
              <select onInput={handleSelect} ref={selectRef}></select>
            </>
          ) : (
            ''
          )}
        </main>
      </div>
    </>
  );
};

export default Home;
