class DataInput {
    #pos = 0;
    #buf = Uint8Array;
    #view = DataView;

    constructor(bytes) {
        if (typeof bytes === "string") {
            const decodedString = atob(bytes);
            const byteArr = new Uint8Array(decodedString.length);
            for (let i = 0; i < decodedString.length; i++) {
                byteArr[i] = decodedString.charCodeAt(i);
            }
            bytes = byteArr;
        }
        this.#buf = bytes;
        this.#view = new DataView(bytes.buffer);
    }

    #_advance(bytes) {
        if (this.#pos + bytes > this.#buf.length) {
            throw new Error("Buffer overflow: cannot advance further.");
        }
        const p = this.#pos;
        this.#pos += bytes;
        return p;
    }

    readByte() {
        return this.#buf[this.#_advance(1)];
    }

    readBoolean() {
        return this.readByte() !== 0;
    }

    readUnsignedShort() {
        return this.#view.getUint16(this.#_advance(2), false);
    }

    readInt() {
        return this.#view.getInt32(this.#_advance(4), false);
    }

    readLong() {
        const msb = this.#view.getInt32(this.#_advance(4), false);
        const lsb = this.#view.getUint32(this.#_advance(4), false);
        return BigInt(msb) << 32n | BigInt(lsb);
    }

    readUTF() {
        const len = this.readUnsignedShort();
        const start = this.#_advance(len);
        return new window.TextDecoder().decode(this.#buf.slice(start, start + len));
    }
}

const decoders = [
    (input, trackId) => {
        const title = input.readUTF();
        const author = input.readUTF();
        const length = input.readLong();
        const identifier = input.readUTF();
        const isStream = input.readBoolean();
        const uri = input.readBoolean() ? input.readUTF() : null;
        const thumbnail = input.readBoolean() ? input.readUTF() : null;
        const source = input.readUTF();

        return { trackId, title, author, length, identifier, isStream, uri, thumbnail, source, position: 0n };
    },
    undefined,
    (input, trackId) => {
        const title = input.readUTF();
        const author = input.readUTF();
        const length = input.readLong();
        const identifier = input.readUTF();
        const isStream = input.readBoolean();
        const uri = input.readBoolean() ? input.readUTF() : null;
        const source = input.readUTF();

        return { trackId, title, author, length, identifier, isStream, uri, thumbnail: null, source, position: 0n };
    },
    (input, trackId) => {
        const title = input.readUTF();
        const author = input.readUTF();
        const length = input.readLong();
        const identifier = input.readUTF();
        const isStream = input.readBoolean();
        const uri = input.readBoolean() ? input.readUTF() : null;
        const thumbnail = input.readBoolean() ? input.readUTF() : null;
        const isrc = input.readBoolean() ? input.readUTF() : null;
        const source = input.readUTF();

        return { trackId, title, author, length, identifier, isStream, uri, thumbnail, source, position: 0n };
    }
]

function decode(trackId, requester = null) {
    const input = new DataInput(trackId);
    const flags = input.readInt();
    const version = input.readByte();

    const decoder = decoders[version];
    return new Track(decoder(input, trackId), requester);
}

function msToReadableTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    let timeString = "";
    if (hours > 0) {
        timeString += hours + ":" + minutes + ":" + seconds;
    } else {
        timeString += minutes + ":" + seconds;
    }

    return timeString;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function darkenColor(rgb, percent) {
    return rgb.map(color => Math.max(0, Math.min(255, Math.floor(color * (1 - percent)))));
}

function isDarkColor(rgb) {
    const brightness = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
    return brightness < 128;
}

function capitalize(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatString(str, ...args) {
    return str.replace(/{(\d+)}/g, (match, number) => typeof args[number] !== 'undefined' ? args[number] : match);
};