import { useRef, useState } from "react";

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
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center p-4">
      {showAvatarEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Draw Your Avatar</h3>
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
                className="w-full border-2 border-gray-300 rounded cursor-crosshair bg-white"
                style={{ touchAction: 'none' }}
              />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 border-2 border-gray-300 rounded cursor-pointer"
              />
              <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600">{brushSize}px</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearAvatarCanvas}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Clear
              </button>
              <button
                onClick={saveAvatar}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Save
              </button>
              <button
                onClick={() => setShowAvatarEditor(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 text-6xl">✏️</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dribbl</h1>
          <p className="text-gray-600">Draw, guess, and have fun!</p>
        </div>

        <div className="space-y-6">
          {/* Avatar section */}
          <div className="flex items-center justify-center gap-4">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-16 h-16 border-2 border-gray-300 rounded" />
            ) : (
              <div className="w-16 h-16 border-2 border-gray-300 rounded bg-gray-100 flex items-center justify-center text-gray-400">
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
            >
              {avatar ? 'Edit Avatar' : 'Create Avatar'}
            </button>
          </div>

          {/* Name input - always shown first */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900"
              autoFocus
            />
          </div>

          {/* Game code input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900"
            />
            {gameId && (
              <p className="text-sm text-gray-500 mt-1">Press Enter to join this game</p>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={gameId.trim() ? joinGame : createGame}
            disabled={!playerName.trim()}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 transition"
          >
            {gameId.trim() ? 'Join Game' : 'Create New Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
