import aSmallMiracleThumbnail from "../../assets/a-small-miracle/thumbnail.jpg";
import jingleBellsThumbnail from "../../assets/jingle-bells/thumbnail.png";
import { Music } from "../types";

// 음악 목록
export const MUSIC_LIST: Music[] = [
    {
        id: "jingle-bells",
        title: "징글벨",
        difficulty: 1,
        duration: 29,
        audioFile: "./src/assets/jingle-bells/music.mp3",
        thumbnail: jingleBellsThumbnail,
    },
    {
        id: "a-small-miracle",
        title: "작은 기적",
        difficulty: 3,
        duration: 77,
        audioFile: "./src/assets/a-small-miracle/music.mp3",
        thumbnail: aSmallMiracleThumbnail,
    }
  ] as const;