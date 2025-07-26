import { Music } from "../types/music";

// 음악 목록
export const MUSIC_LIST: Music[] = [
  {
    id: "jingle-bells",
    title: "징글벨",
    difficulty: 1,
    duration: 29,
    audioFile: "/assets/jingle-bells/music.mp3",
    thumbnail: "/assets/jingle-bells/thumbnail.png",
    isReady: true,
  },
  {
    id: "a-small-miracle",
    title: "작은 기적",
    difficulty: 3,
    duration: 77,
    audioFile: "/assets/a-small-miracle/music.mp3",
    thumbnail: "/assets/a-small-miracle/thumbnail.jpg",
    isReady: false,
  },
] as const;
