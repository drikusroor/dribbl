import { Player } from "../types";

interface GameOverScreenProps {
  finalScores: Player[];
  returnToLobby: () => void;
}

export function GameOverScreen({ finalScores, returnToLobby }: GameOverScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="bg-gradient-to-br from-[#E8E8E8] via-white to-[#E8E8E8] rounded-3xl shadow-[0_0_80px_rgba(0,212,255,0.5),0_0_160px_rgba(182,32,224,0.3),inset_0_2px_20px_rgba(255,255,255,0.8)] p-12 max-w-4xl w-full border-4 border-transparent relative overflow-hidden" style={{borderImage: 'linear-gradient(135deg, rgba(0,212,255,0.5), rgba(182,32,224,0.5), rgba(255,47,146,0.5)) 1'}}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#B620E0]/5 pointer-events-none"></div>
        <div className="text-center mb-10 relative z-10">
          <div className="text-8xl mb-6 drop-shadow-[0_0_20px_rgba(255,215,0,0.6)] animate-pulse">🏆</div>
          <h2 className="text-5xl font-black bg-gradient-to-r from-[#FFD700] via-[#FF2F92] to-[#00D4FF] bg-clip-text text-transparent" style={{textShadow: '0 0 40px rgba(255,215,0,0.4)'}}>Game Over!</h2>
        </div>

        <div className="space-y-4 mb-8 relative z-10">
          {finalScores.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between p-5 rounded-2xl border-3 transition-all ${
              i === 0 ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.5)] scale-105' :
              i === 1 ? 'bg-gradient-to-r from-[#C0C0C0]/20 to-[#E8E8E8]/20 border-[#C0C0C0] shadow-[0_0_20px_rgba(192,192,192,0.4)]' :
              i === 2 ? 'bg-gradient-to-r from-[#CD7F32]/20 to-[#8B4513]/20 border-[#CD7F32] shadow-[0_0_20px_rgba(205,127,50,0.4)]' :
              'bg-gradient-to-r from-[#00D4FF]/10 to-[#B620E0]/10 border-[#00D4FF]/30 shadow-[0_0_15px_rgba(0,212,255,0.2)]'
            }`}>
              <div className="flex items-center gap-4">
                <span className={`text-3xl font-black ${
                  i === 0 ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent' :
                  i === 1 ? 'bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8] bg-clip-text text-transparent' :
                  i === 2 ? 'bg-gradient-to-r from-[#CD7F32] to-[#8B4513] bg-clip-text text-transparent' :
                  'bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent'
                }`}>#{i + 1}</span>
                {p.avatar && (
                  <img src={p.avatar} alt={p.name} className={`w-12 h-12 border-3 rounded-xl ${
                    i === 0 ? 'border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.5)]' :
                    i === 1 ? 'border-[#C0C0C0] shadow-[0_0_15px_rgba(192,192,192,0.4)]' :
                    i === 2 ? 'border-[#CD7F32] shadow-[0_0_15px_rgba(205,127,50,0.4)]' :
                    'border-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                  }`} />
                )}
                <span className="font-black text-lg bg-gradient-to-r from-[#00D4FF] to-[#B620E0] bg-clip-text text-transparent">{p.name}</span>
              </div>
              <span className={`text-2xl font-black ${
                i === 0 ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent' :
                i === 1 ? 'bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8] bg-clip-text text-transparent' :
                i === 2 ? 'bg-gradient-to-r from-[#CD7F32] to-[#8B4513] bg-clip-text text-transparent' :
                'bg-gradient-to-r from-[#FF2F92] to-[#00D4FF] bg-clip-text text-transparent'
              }`}>{p.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={returnToLobby}
          className="w-full bg-gradient-to-r from-[#00D4FF] via-[#B620E0] to-[#FF2F92] text-white py-5 rounded-xl font-black text-xl hover:shadow-[0_0_40px_rgba(0,212,255,0.7),0_0_80px_rgba(182,32,224,0.5)] transition-all border-2 border-white/30 relative overflow-hidden group"
        >
          <span className="relative z-10">Return to Lobby</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </button>
      </div>
    </div>
  );
}
