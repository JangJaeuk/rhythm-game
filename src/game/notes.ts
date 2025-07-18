import { JINGLE_BELL_NOTES } from "./constants/notes/jingleBell";

const getNotes = (musicId: string) => {
    switch (musicId) {
        case "jingle-bells":
            return JINGLE_BELL_NOTES;
        default:
            return [];
    }
}

export default getNotes;