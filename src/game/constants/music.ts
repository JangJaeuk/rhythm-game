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
    },
    {
        id: "a-small-miracle",
        title: "작은 기적",
        difficulty: 2,
        duration: 77,
        audioFile: "./src/assets/a-small-miracle.mp3",
        thumbnail: ""
    }
  ] as const;