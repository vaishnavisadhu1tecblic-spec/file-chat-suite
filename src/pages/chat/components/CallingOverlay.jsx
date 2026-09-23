import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  FiPhone,
  FiPhoneOff,
  FiVideo,
  FiVideoOff,
  FiMic,
  FiMicOff,
  FiMaximize2,
  FiMinimize2,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import Avatar from "../../../components/common/Avatar";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Web Audio API Ringtone Synthesizers (No external MP3 files needed!)
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.gain = null;
    this.timer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playRingtone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playBurst = () => {
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.setValueAtTime(440, now); // A4
        osc2.frequency.setValueAtTime(480, now); // B4

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.setValueAtTime(0.15, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
      } catch (err) {
        console.error("Ringtone error:", err);
      }
    };

    playBurst();
    this.timer = setInterval(playBurst, 3500);
  }

  playRingback() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playBurst = () => {
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0.1, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.4);
      } catch (err) {
        console.error("Ringback error:", err);
      }
    };

    playBurst();
    this.timer = setInterval(playBurst, 3000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

const sounds = new SoundEffects();

const CallingOverlay = forwardRef(function CallingOverlay(
  { socket, currentUser },
  ref
) {
  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  // Call State: 'idle' | 'outgoing' | 'incoming' | 'connected'
  const [callState, setCallState] = useState("idle");
  const [callId, setCallId] = useState(null);
  const [callType, setCallType] = useState("voice"); // 'voice' | 'video'
  const [remoteUser, setRemoteUser] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);

  // Call Controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // References
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Expose startCall to parent
  useImperativeHandle(ref, () => ({
    startCall: (targetUser, type = "voice", conversationId = null) => {
      initiateCall(targetUser, type, conversationId);
    },
  }));

  // Clean up WebRTC peer & streams
  const cleanupCall = () => {
    sounds.stop();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setCallState("idle");
    setCallId(null);
    setRemoteUser(null);
    setActiveConversationId(null);
    setCallDuration(0);
    setIsMicMuted(false);
    setIsVideoDisabled(false);
  };

  // 1. Initiate Outgoing Call
  const initiateCall = async (targetUser, type, conversationId) => {
    if (!socket || !targetUser) return;

    cleanupCall();
    setCallState("outgoing");
    setCallType(type);
    setRemoteUser(targetUser);
    setActiveConversationId(conversationId);
    sounds.playRingback();

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      localStreamRef.current = stream;

      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }

      // Emit socket initiate
      socket.emit("call:initiate", {
        recipientId: targetUser._id || targetUser.id,
        conversationId,
        type,
      });
    } catch (err) {
      console.error("Failed to access camera/mic:", err);
      alert("Unable to access your microphone or camera for the call.");
      cleanupCall();
    }
  };

  // 2. Accept Incoming Call
  const acceptCall = async () => {
    sounds.stop();
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStreamRef.current = stream;

      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream;
      }

      // Create PeerConnection
      createPeerConnection();

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pcRef.current.addTrack(track, stream);
      });

      // Emit accept
      socket.emit("call:accept", {
        callId,
        callerId: remoteUser?._id || remoteUser?.id,
      });

      setCallState("connected");
      startDurationCounter();
    } catch (err) {
      console.error("Accept call error:", err);
      rejectCall("busy");
    }
  };

  // 3. Reject Incoming Call
  const rejectCall = (reason = "declined") => {
    sounds.stop();
    if (socket && remoteUser) {
      socket.emit("call:reject", {
        callId,
        callerId: remoteUser._id || remoteUser.id,
        reason,
      });
    }
    cleanupCall();
  };

  // 4. End Active Call
  const endCall = () => {
    if (socket && remoteUser) {
      socket.emit("call:end", {
        callId,
        targetUserId: remoteUser._id || remoteUser.id,
      });
    }
    cleanupCall();
  };

  // WebRTC Setup Helper
  const createPeerConnection = () => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUser && socket) {
        socket.emit("call:ice-candidate", {
          targetUserId: remoteUser._id || remoteUser.id,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote track
    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      event.streams[0]?.getTracks().forEach((t) => {
        remoteStreamRef.current.addTrack(t);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    return pc;
  };

  // Duration Timer
  const startDurationCounter = () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  };

  // Toggle Mute
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);

        if (socket && remoteUser) {
          socket.emit("call:toggle-media", {
            targetUserId: remoteUser._id || remoteUser.id,
            mediaType: "audio",
            enabled: audioTrack.enabled,
          });
        }
      }
    }
  };

  // Toggle Video
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);

        if (socket && remoteUser) {
          socket.emit("call:toggle-media", {
            targetUserId: remoteUser._id || remoteUser.id,
            mediaType: "video",
            enabled: videoTrack.enabled,
          });
        }
      }
    }
  };

  // Socket Event Listeners for Calling
  useEffect(() => {
    if (!socket) return;

    // Incoming Call
    const handleIncomingCall = (data) => {
      // If already in a call, notify busy
      if (callState !== "idle") {
        socket.emit("call:reject", {
          callId: data.callId,
          callerId: data.caller?._id || data.caller?.id,
          reason: "busy",
        });
        return;
      }

      setCallId(data.callId);
      setCallType(data.type || "voice");
      setRemoteUser(data.caller);
      setActiveConversationId(data.conversationId);
      setCallState("incoming");
      sounds.playRingtone();
    };

    // Caller receives call:initiated with callId
    const handleCallInitiated = (data) => {
      setCallId(data.callId);
    };

    // Caller receives call:accepted
    const handleCallAccepted = async (data) => {
      sounds.stop();
      setCallState("connected");
      startDurationCounter();

      const pc = createPeerConnection();

      // Add local stream tracks to PeerConnection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Create and send WebRTC Offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call:offer", {
          targetUserId: remoteUser?._id || remoteUser?.id,
          offer,
        });
      } catch (err) {
        console.error("Create offer error:", err);
      }
    };

    // Callee receives call:offer
    const handleCallOffer = async (data) => {
      const pc = createPeerConnection();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("call:answer", {
          targetUserId: data.callerId,
          answer,
        });
      } catch (err) {
        console.error("Handle offer error:", err);
      }
    };

    // Caller receives call:answer
    const handleCallAnswer = async (data) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        } catch (err) {
          console.error("Set remote description error:", err);
        }
      }
    };

    // ICE Candidate
    const handleIceCandidate = async (data) => {
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Add ICE candidate error:", err);
        }
      }
    };

    // Call Rejected / Ended / Busy
    const handleCallRejected = (data) => {
      sounds.stop();
      alert(
        data.reason === "busy"
          ? "User is currently busy on another call."
          : "Call was declined."
      );
      cleanupCall();
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    const handleUserBusy = () => {
      sounds.stop();
      alert("User is currently on another call.");
      cleanupCall();
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:initiated", handleCallInitiated);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:offer", handleCallOffer);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:user-busy", handleUserBusy);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:initiated", handleCallInitiated);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:offer", handleCallOffer);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:user-busy", handleUserBusy);
    };
  }, [socket, callState, remoteUser, callType, callId]);

  if (callState === "idle") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      {/* 1. INCOMING CALL SCREEN */}
      {callState === "incoming" && (
        <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-2xl animate-bounce-short">
          <div className="relative mb-4">
            <div className="absolute -inset-2 animate-ping rounded-full bg-[#315EFF]/20" />
            <Avatar user={remoteUser} size={84} />
          </div>

          <h3 className="text-[18px] font-bold text-gray-900">
            {remoteUser?.name || remoteUser?.username || "Incoming Call"}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-[#315EFF]">
            {callType === "video" ? <FiVideo /> : <FiPhone />}
            <span>Incoming {callType === "video" ? "Video" : "Voice"} Call...</span>
          </p>

          <div className="mt-8 flex items-center gap-6">
            {/* Decline */}
            <button
              type="button"
              onClick={() => rejectCall("declined")}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 active:scale-95"
              title="Decline"
            >
              <FiPhoneOff size={22} />
            </button>

            {/* Accept */}
            <button
              type="button"
              onClick={acceptCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600 active:scale-95"
              title="Accept"
            >
              <FiPhone size={22} />
            </button>
          </div>
        </div>
      )}

      {/* 2. OUTGOING CALL SCREEN */}
      {callState === "outgoing" && (
        <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-3xl bg-neutral-900 p-8 text-center text-white shadow-2xl">
          <div className="relative mb-5">
            <div className="absolute -inset-3 animate-pulse rounded-full bg-white/10" />
            <Avatar user={remoteUser} size={84} />
          </div>

          <h3 className="text-[18px] font-bold">
            {remoteUser?.name || remoteUser?.username || "Contact"}
          </h3>
          <p className="mt-1 text-[12px] text-white/70">
            Ringing {callType === "video" ? "video call" : "voice call"}...
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 active:scale-95"
              title="End Call"
            >
              <FiPhoneOff size={22} />
            </button>
          </div>
        </div>
      )}

      {/* 3. ACTIVE CONNECTED CALL SCREEN */}
      {callState === "connected" && (
        <div className="relative flex h-full max-h-[85vh] w-full max-w-3xl flex-col justify-between overflow-hidden rounded-3xl bg-neutral-950 shadow-2xl">
          {/* Header Info */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-5 text-white">
            <div className="flex items-center gap-3">
              <Avatar user={remoteUser} size={40} />
              <div>
                <h4 className="text-[13px] font-bold">
                  {remoteUser?.name || remoteUser?.username}
                </h4>
                <p className="text-[10px] text-green-400 font-medium">
                  {formatDuration(callDuration)}
                </p>
              </div>
            </div>

            <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium backdrop-blur-sm">
              {callType === "video" ? "HD Video" : "Voice Call"}
            </div>
          </div>

          {/* Main Media Tile */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {callType === "video" ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              /* Voice Call Visualizer Animation */
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-4 flex items-center justify-center">
                  <div className="absolute h-36 w-36 animate-ping rounded-full bg-[#315EFF]/20" />
                  <div className="absolute h-28 w-28 animate-pulse rounded-full bg-[#315EFF]/30" />
                  <Avatar user={remoteUser} size={88} />
                </div>
                <h3 className="text-[16px] font-bold text-white">
                  {remoteUser?.name || remoteUser?.username}
                </h3>
                <p className="mt-1 text-[11px] text-white/60">Connected</p>
              </div>
            )}

            {/* PIP Local Video (For Video Calls) */}
            {callType === "video" && (
              <div className="absolute bottom-4 right-4 h-36 w-28 overflow-hidden rounded-2xl border-2 border-white/30 bg-black shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Call Controls Toolbar */}
          <div className="relative z-20 flex items-center justify-center gap-4 border-t border-white/10 bg-black/70 p-5 backdrop-blur-md">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                isMicMuted
                  ? "bg-red-500 text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMicMuted ? <FiMicOff size={18} /> : <FiMic size={18} />}
            </button>

            {/* Video Toggle (if Video Call) */}
            {callType === "video" && (
              <button
                type="button"
                onClick={handleToggleVideo}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                  isVideoDisabled
                    ? "bg-red-500 text-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isVideoDisabled ? "Turn Video On" : "Turn Video Off"}
              >
                {isVideoDisabled ? <FiVideoOff size={18} /> : <FiVideo size={18} />}
              </button>
            )}

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              className="flex h-12 w-14 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg transition hover:bg-red-700 active:scale-95"
              title="End Call"
            >
              <FiPhoneOff size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default CallingOverlay;

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
