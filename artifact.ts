// ============================================================================
// SERVER (server.js)
// ============================================================================
// Run: node server.js
// Then open: http://localhost:3000

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Game state
const games = new Map();

const WORDS = ['watermelon', 'house', 'cat', 'tree', 'car', 'pizza', 'guitar', 
  'mountain', 'bicycle', 'flower', 'rocket', 'elephant', 'beach', 'clock', 'rainbow',
  'phone', 'book', 'computer', 'sun', 'moon', 'star', 'cloud', 'fish', 'bird'];

const ROUND_TIME = 60;
const POINTS_CORRECT = 100;

function createGame(gameId, creatorId, creatorName, isPrivate) {
  const game = {
    id: gameId,
    players: new Map([[creatorId, { 
      id: creatorId, 
      name: creatorName, 
      score: 0, 
      hasDrawn: false 
    }]]),
    isPrivate,
    started: false,
    currentDrawer: null,
    currentWord: null,
    roundNumber: 0,
    totalRounds: 1,
    timeLeft: ROUND_TIME,
    timer: null,
    guessedPlayers: new Set(),
    drawingData: []
  };
  games.set(gameId, game);
  return game;
}

function getNextDrawer(game) {
  const availablePlayers = Array.from(game.players.values()).filter(p => !p.hasDrawn);
  return availablePlayers.length > 0 ? availablePlayers[0] : null;
}

function startNewRound(game) {
  game.guessedPlayers.clear();
  game.drawingData = [];
  
  const drawer = getNextDrawer(game);
  
  if (!drawer) {
    // All players have drawn in this round
    if (game.roundNumber >= game.totalRounds) {
      endGame(game);
      return;
    }
    // Reset for next round
    game.players.forEach(p => p.hasDrawn = false);
    game.roundNumber++;
    startNewRound(game);
    return;
  }
  
  game.currentDrawer = drawer.id;
  game.currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  game.timeLeft = ROUND_TIME;
  
  io.to(game.id).emit('roundStart', {
    drawerId: game.currentDrawer,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds,
    timeLeft: game.timeLeft
  });
  
  io.to(game.currentDrawer).emit('yourWord', game.currentWord);
  
  startTimer(game);
}

function startTimer(game) {
  if (game.timer) clearInterval(game.timer);
  
  game.timer = setInterval(() => {
    game.timeLeft--;
    io.to(game.id).emit('timeUpdate', game.timeLeft);
    
    if (game.timeLeft <= 0) {
      nextTurn(game);
    }
  }, 1000);
}

function nextTurn(game) {
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }
  
  const drawer = game.players.get(game.currentDrawer);
  if (drawer) drawer.hasDrawn = true;
  
  io.to(game.id).emit('wordReveal', game.currentWord);
  io.to(game.id).emit('gameState', getGameState(game));
  
  setTimeout(() => startNewRound(game), 3000);
}

function endGame(game) {
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }
  
  game.started = false;
  const finalScores = Array.from(game.players.values())
    .sort((a, b) => b.score - a.score);
  
  io.to(game.id).emit('gameOver', finalScores);
}

function getGameState(game) {
  return {
    players: Array.from(game.players.values()),
    currentDrawer: game.currentDrawer,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds,
    timeLeft: game.timeLeft,
    started: game.started
  };
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createGame', ({ playerName, isPrivate }) => {
    const gameId = Math.random().toString(36).substr(2, 9);
    const game = createGame(gameId, socket.id, playerName, isPrivate);
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, game: getGameState(game) });
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    
    if (game.started) {
      socket.emit('error', 'Game already started');
      return;
    }
    
    game.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      score: 0,
      hasDrawn: false
    });
    
    socket.join(gameId);
    io.to(gameId).emit('playerJoined', {
      player: game.players.get(socket.id),
      game: getGameState(game)
    });
  });

  socket.on('startGame', ({ gameId, totalRounds }) => {
    const game = games.get(gameId);
    if (!game || game.players.size < 2) return;
    
    game.started = true;
    game.roundNumber = 1;
    game.totalRounds = totalRounds;
    game.players.forEach(p => {
      p.score = 0;
      p.hasDrawn = false;
    });
    
    io.to(gameId).emit('gameStarted', getGameState(game));
    startNewRound(game);
  });

  socket.on('draw', ({ gameId, data }) => {
    const game = games.get(gameId);
    if (!game || game.currentDrawer !== socket.id) return;
    
    game.drawingData.push(data);
    socket.to(gameId).emit('drawing', data);
  });

  socket.on('clearCanvas', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.currentDrawer !== socket.id) return;
    
    game.drawingData = [];
    io.to(gameId).emit('canvasCleared');
  });

  socket.on('guess', ({ gameId, message }) => {
    const game = games.get(gameId);
    if (!game || !game.started) return;
    
    const player = game.players.get(socket.id);
    if (!player || socket.id === game.currentDrawer) return;
    
    const isCorrect = message.toLowerCase().trim() === game.currentWord.toLowerCase();
    
    io.to(gameId).emit('chatMessage', {
      playerId: socket.id,
      playerName: player.name,
      message,
      isCorrect
    });
    
    if (isCorrect && !game.guessedPlayers.has(socket.id)) {
      game.guessedPlayers.add(socket.id);
      
      const timeBonus = Math.floor((game.timeLeft / ROUND_TIME) * 50);
      const points = POINTS_CORRECT + timeBonus;
      
      player.score += points;
      
      const drawer = game.players.get(game.currentDrawer);
      if (drawer) drawer.score += 50;
      
      io.to(gameId).emit('correctGuess', {
        playerId: socket.id,
        playerName: player.name,
        points
      });
      
      io.to(gameId).emit('gameState', getGameState(game));
      
      // If all players guessed, move to next turn
      if (game.guessedPlayers.size === game.players.size - 1) {
        setTimeout(() => nextTurn(game), 2000);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    games.forEach((game, gameId) => {
      if (game.players.has(socket.id)) {
        game.players.delete(socket.id);
        
        if (game.players.size === 0) {
          if (game.timer) clearInterval(game.timer);
          games.delete(gameId);
        } else {
          io.to(gameId).emit('playerLeft', {
            playerId: socket.id,
            game: getGameState(game)
          });
          
          if (game.started && game.currentDrawer === socket.id) {
            nextTurn(game);
          }
        }
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ============================================================================
// CLIENT (public/index.html)
// ============================================================================
/*
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dribbl Game</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="app.js"></script>
</body>
</html>
*/

// ============================================================================
// CLIENT APP (public/app.js)
// ============================================================================
/*


ReactDOM.render(<App />, document.getElementById('root'));
*/

