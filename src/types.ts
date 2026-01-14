export interface Player {
  id: string;
  name: string;
  score: number;
  hasDrawn: boolean;
  avatar?: string;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  isCorrect: boolean;
  isClose?: boolean;
}

export interface DrawData {
  x: number;
  y: number;
  color: string;
  size: number;
  type: string;
}
