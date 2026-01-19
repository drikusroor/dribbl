export interface Player {
  id: string;
  name: string;
  score: number;
  hasDrawn: boolean;
  avatar?: string;
  isDisconnected?: boolean;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  isCorrect: boolean;
  isClose?: boolean;
  isSystemLike?: boolean;
}

export interface DrawData {
  x: number;
  y: number;
  color: string;
  size: number;
  type: string;
}
