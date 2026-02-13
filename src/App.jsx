import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const NOTE_COLORS = [
  { name: 'yellow', bg: '#FEF08A', border: '#EAB308' },
  { name: 'gray', bg: '#404040', border: '#525252' },
  { name: 'orange', bg: '#FDBA74', border: '#EA580C' }
];

function StickyNote({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(!note.content);
  const [isTearing, setIsTearing] = useState(false);

  const handleTear = () => {
    setIsTearing(true);
    setTimeout(() => onDelete(note.id), 300);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0, rotate: -5, opacity: 0 }}
      animate={{
        scale: isTearing ? 1.2 : 1,
        rotate: isTearing ? [0, -10, 10, -10, 0] : note.rotation || 0,
        opacity: isTearing ? 0 : 1,
        x: 0,
        y: isTearing ? -500 : 0
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      drag={!isEditing && !isTearing}
      dragMomentum={false}
      dragElastic={0}
      whileDrag={{ scale: 1.05, zIndex: 50 }}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => setIsEditing(true)}
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: note.width || 200,
        minHeight: note.height || 180,
        backgroundColor: NOTE_COLORS.find(c => c.name === note.color)?.bg,
        border: `3px solid ${NOTE_COLORS.find(c => c.name === note.color)?.border}`,
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        borderRadius: '4px',
        cursor: 'grab',
        zIndex: 1,
        transformOrigin: 'top center'
      }}
    >
      <div
        style={{
          width: '100%',
          height: '24px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTopLeftRadius: '2px',
          borderTopRightRadius: '2px'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '2px'
          }}
        />
      </div>
      <textarea
        autoFocus={isEditing}
        value={note.content}
        onChange={(e) => onUpdate(note.id, { content: e.target.value })}
        onBlur={() => setIsEditing(false)}
        onDoubleClick={() => setIsEditing(true)}
        placeholder="Speak the truth..."
        style={{
          width: '100%',
          height: 'calc(100% - 24px)',
          minHeight: '136px',
          padding: '16px',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: '"Permanent Marker", cursive',
          fontSize: '16px',
          resize: 'none',
          color: note.color === 'gray' ? '#fff' : '#1a1a1a',
          cursor: 'text'
        }}
      />
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          handleTear();
        }}
        style={{
          position: 'absolute',
          top: '-12px',
          right: '-12px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          border: '2px solid #fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        <X size={18} color="white" />
      </motion.button>
    </motion.div>
  );
}

function App() {
  const [notes, setNotes] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const inactivityTimer = useRef(null);

  useEffect(() => {
    const savedNotes = localStorage.getItem('accountabilityMirrorNotes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (err) {
        console.error('Failed to parse saved notes, clearing storage:', err);
        localStorage.removeItem('accountabilityMirrorNotes');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('accountabilityMirrorNotes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      console.log("Attaching stream to video element...");
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        console.log("VIDEO_PLAYING_SUCCESS");
      };
    }
  }, [cameraActive, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const resetInactivityTimer = () => {
    setShowUI(true);
    clearTimeout(inactivityTimer.current);
    if (cameraActive) {
      inactivityTimer.current = setTimeout(() => setShowUI(false), 3000);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);

    return () => {
      clearTimeout(inactivityTimer.current);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
      window.removeEventListener('keypress', resetInactivityTimer);
      window.removeEventListener('touchstart', resetInactivityTimer);
    };
  }, [cameraActive]);

  const startCamera = async () => {
    console.log("BUTTON_CLICKED - Starting camera...");
    try {
      console.log("Requesting camera access...");
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      console.log("Stream obtained:", newStream);
      setStream(newStream);
      setCameraActive(true);
      resetInactivityTimer();
    } catch (err) {
      console.error("CAMERA_ERROR:", err);
    }
  };

  const handleMirrorDoubleClick = (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA' && cameraActive) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - 100;
      const y = e.clientY - rect.top - 90;

      const newNote = {
        id: Date.now(),
        x,
        y,
        content: '',
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].name,
        width: 200,
        height: 180,
        rotation: (Math.random() - 0.5) * 10
      };

      setNotes([...notes, newNote]);
    }
  };

  const updateNote = (id, updates) => {
    setNotes(notes.map(note => note.id === id ? { ...note, ...updates } : note));
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <div 
      className="fixed inset-0 w-screen h-[100dvh] overflow-hidden bg-transparent"
      onClick={resetInactivityTimer}
    >
      {cameraActive && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            loop
            className="fixed inset-0 w-screen h-[100dvh] object-cover"
            style={{ 
              transform: 'scaleX(-1)',
              zIndex: -50,
              background: '#000'
            }}
          />
          <div 
            className="fixed inset-0 w-screen h-[100dvh] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
              zIndex: -40
            }}
          />
        </>
      )}

      <div
        className="relative w-full h-full z-10"
        onDoubleClick={handleMirrorDoubleClick}
      >
        <AnimatePresence>
          {notes.map(note => (
            <StickyNote
              key={note.id}
              note={note}
              onUpdate={updateNote}
              onDelete={deleteNote}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!cameraActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black"
            style={{ zIndex: 100 }}
          >
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startCamera}
              style={{
                padding: '24px 48px',
                backgroundColor: '#fff',
                color: '#000',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '20px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                border: '4px solid #fff',
                cursor: 'pointer'
              }}
            >
              FACE THE TRUTH
            </motion.button>
          </motion.div>
        )}

        {cameraActive && showUI && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50
            }}
          >
            <motion.p
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.15em',
                textAlign: 'center'
              }}
            >
              DOUBLE-CLICK TO CREATE • DRAG HANDLE TO MOVE
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
