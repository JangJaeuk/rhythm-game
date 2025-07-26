export interface Music {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  duration: number;
  audioFile: string;
  thumbnail: string;
  isReady: boolean;
}
