import { Music } from "../types";

// 음악 목록
export const MUSIC_LIST: Music[] = [
    {
      id: "jingle-bells",
      title: "징글벨",
      difficulty: 1,
      duration: 29,
      audioFile: "./src/assets/jingle-bells.mp3",
      thumbnail: ""
    }
  ] as const;