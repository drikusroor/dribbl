import { useRef, useState } from "react";
import { useSounds } from '../contexts/SoundContext';

interface HomeScreenProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  gameId: string;
  setGameId: (id: string) => void;
  joinGame: () => void;
  createGame: () => void;
  avatar: string;
  setAvatar: (avatar: string) => void;
}

export function HomeScreen({
  playerName,
  setPlayerName,
  gameId,
  setGameId,
  joinGame,
  createGame,
  avatar,
  setAvatar,
}: HomeScreenProps) {
  const sounds = useSounds();
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [isDrawingAvatar, setIsDrawingAvatar] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const clearAvatarCanvas = () => {
    const canvas = avatarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveAvatar = () => {
    const canvas = avatarCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setAvatar(dataUrl);
    localStorage.setItem('playerAvatar', dataUrl);
    setShowAvatarEditor(false);
  };

  const startDrawingAvatar = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawingAvatar(true);
    drawAvatar(e);
  };

  const stopDrawingAvatar = () => {
    setIsDrawingAvatar(false);
  };

  const drawAvatar = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingAvatar && e.type !== 'mousedown' && e.type !== 'touchstart') return;

    const canvas = avatarCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).touches?.[0]?.clientX ?? 0;
    const clientY = 'clientY' in e ? (e as React.MouseEvent).clientY : (e as React.TouchEvent).touches?.[0]?.clientY ?? 0;
    // Scale coordinates to match canvas internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (e.type === 'mousedown' || e.type === 'touchstart') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      {showAvatarEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#E8E8E8] via-white to-[#E8E8E8] rounded-3xl shadow-[0_0_40px_rgba(0,212,255,0.5),0_0_80px_rgba(182,32,224,0.3)] p-8 max-w-sm w-full border-2 border-[#00D4FF]/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#B620E0]/5 pointer-events-none"></div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#00D4FF] via-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent mb-4 relative z-10">Draw Your Avatar</h3>
            <div className="mb-4">
              <canvas
                ref={avatarCanvasRef}
                width={200}
                height={200}
                onMouseDown={startDrawingAvatar}
                onMouseMove={drawAvatar}
                onMouseUp={stopDrawingAvatar}
                onMouseLeave={stopDrawingAvatar}
                onTouchStart={startDrawingAvatar}
                onTouchMove={drawAvatar}
                onTouchEnd={stopDrawingAvatar}
                className="w-full border-2 border-[#00D4FF] rounded-xl cursor-crosshair bg-white shadow-[0_0_20px_rgba(0,212,255,0.4)] relative z-10"
                style={{ touchAction: 'none' }}
              />
            </div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 border-2 border-[#B620E0] rounded-lg cursor-pointer shadow-[0_0_15px_rgba(182,32,224,0.4)]"
              />
              <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="flex-1 accent-[#00D4FF]"
              />
              <span className="text-sm font-bold bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">{brushSize}px</span>
            </div>
            <div className="flex gap-2 relative z-10">
              <button
                onClick={clearAvatarCanvas}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FF2F92] to-[#FF0055] text-white rounded-xl hover:shadow-[0_0_20px_rgba(255,47,146,0.6)] transition-all font-bold border-2 border-[#FF2F92]/50"
              >
                Clear
              </button>
              <button
                onClick={saveAvatar}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-black rounded-xl hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all font-bold border-2 border-[#00FF88]/50"
              >
                Save
              </button>
              <button
                onClick={() => setShowAvatarEditor(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-[0_0_20px_rgba(128,128,128,0.4)] transition-all font-bold border-2 border-gray-500/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-gradient-to-br from-[#E8E8E8] via-white to-[#E8E8E8] rounded-3xl shadow-[0_0_60px_rgba(0,212,255,0.4),0_0_120px_rgba(182,32,224,0.2),inset_0_2px_20px_rgba(255,255,255,0.8)] p-10 max-w-4xl w-full border-4 border-transparent relative overflow-hidden backdrop-blur-sm" style={{borderImage: 'linear-gradient(135deg, rgba(0,212,255,0.5), rgba(182,32,224,0.5), rgba(255,47,146,0.5)) 1'}}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#B620E0]/5 pointer-events-none"></div>
        <div className="text-center mb-8 relative z-10">
          <div className="w-20 h-20 mx-auto mb-4 text-7xl drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]">✏️</div>
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#00D4FF] via-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent drop-shadow-lg" style={{textShadow: '0 0 30px rgba(0,212,255,0.3)'}}>Dribbl</h1>
          <p className="text-lg font-semibold bg-gradient-to-r from-[#B620E0] to-[#00D4FF] bg-clip-text text-transparent">Draw, guess, and have fun!</p>
        </div>

        <div className="space-y-6 relative z-10">
          {/* Avatar section */}
          <div className="flex items-center justify-center gap-4">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-20 h-20 border-3 border-[#00D4FF] rounded-xl shadow-[0_0_20px_rgba(0,212,255,0.5)]" />
            ) : (
              <div className="w-20 h-20 border-3 border-[#B620E0] rounded-xl bg-gradient-to-br from-[#1A0033] to-[#2D004D] flex items-center justify-center text-[#00D4FF] font-bold text-xs shadow-[0_0_20px_rgba(182,32,224,0.5)]">
                No Avatar
              </div>
            )}
            <button
              onClick={() => {
                setShowAvatarEditor(true);
                setTimeout(() => {
                  if (avatar) {
                    const canvas = avatarCanvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        const img = new Image();
                        img.onload = () => {
                          ctx.drawImage(img, 0, 0);
                        };
                        img.src = avatar;
                      }
                    }
                  } else {
                    clearAvatarCanvas();
                  }
                }, 0);
              }}
              className="px-6 py-3 bg-gradient-to-r from-[#B620E0] to-[#00D4FF] text-white rounded-xl hover:shadow-[0_0_25px_rgba(182,32,224,0.6),0_0_50px_rgba(0,212,255,0.4)] transition-all font-bold border-2 border-[#00D4FF]/30"
            >
              {avatar ? 'Edit Avatar' : 'Create Avatar'}
            </button>
          </div>

          {/* Name input - always shown first */}
          <div>
            <label className="block text-sm font-bold mb-2 bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && playerName.trim()) {
                  if (gameId.trim()) {
                    joinGame();
                  } else {
                    createGame();
                  }
                }
              }}
              className="w-full px-5 py-4 border-3 border-[#00D4FF] rounded-xl focus:border-[#B620E0] focus:shadow-[0_0_20px_rgba(182,32,224,0.4)] focus:outline-none bg-white/90 backdrop-blur-sm font-medium text-gray-900 transition-all"
              autoFocus
            />
          </div>

          {/* Game code input */}
          <div>
            <label className="block text-sm font-bold mb-2 bg-gradient-to-r from-[#B620E0] to-[#FF2F92] bg-clip-text text-transparent">
              Game Code (optional)
            </label>
            <input
              type="text"
              placeholder="Leave empty to create a new game"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && playerName.trim()) {
                  if (gameId.trim()) {
                    joinGame();
                  } else {
                    createGame();
                  }
                }
              }}
              className="w-full px-5 py-4 border-3 border-[#B620E0] rounded-xl focus:border-[#FF2F92] focus:shadow-[0_0_20px_rgba(255,47,146,0.4)] focus:outline-none bg-white/90 backdrop-blur-sm font-medium text-gray-900 transition-all"
            />
            {gameId && (
              <p className="text-sm font-semibold bg-gradient-to-r from-[#00D4FF] to-[#00FF88] bg-clip-text text-transparent mt-2">Press Enter to join this game</p>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={() => {
              sounds.playClick();
              gameId.trim() ? joinGame() : createGame();
            }}
            disabled={!playerName.trim()}
            className="w-full bg-gradient-to-r from-[#00D4FF] via-[#B620E0] to-[#FF2F92] text-white py-4 rounded-xl font-black text-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.6),0_0_60px_rgba(182,32,224,0.4)] disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none transition-all border-2 border-white/30 relative overflow-hidden group"
          >
            <span className="relative z-10">{gameId.trim() ? 'Join Game' : 'Create New Game'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
