import { Player } from "../types";

interface GameOverScreenProps {
  finalScores: Player[];
  returnToLobby: () => void;
}

export function GameOverScreen({ finalScores, returnToLobby }: GameOverScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-gray-800">Game Over!</h2>
        </div>

        <div className="space-y-3 mb-6">
          {finalScores.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between p-4 rounded-lg ${
              i === 0 ? 'bg-yellow-100 border-2 border-yellow-400' :
              i === 1 ? 'bg-gray-100 border-2 border-gray-400' :
              i === 2 ? 'bg-orange-100 border-2 border-orange-400' :
              'bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-600">#{i + 1}</span>
                {p.avatar && (
                  <img src={p.avatar} alt={p.name} className="w-10 h-10 border-2 border-gray-300 rounded" />
                )}
                <span className="font-semibold">{p.name}</span>
              </div>
              <span className="text-xl font-bold text-purple-600">{p.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={returnToLobby}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
