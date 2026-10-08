/**
 * ============================================================================
 * 💾 NATIVE JAVASCRIPT LITTLE-ENDIAN NBT ENGINE (Bedrock Edition)
 * ============================================================================
 * Ports the Python little-endian NBT scanner directly into native JavaScript
 * utilizing DataView and Uint8Array for zero-copy, in-place binary modification.
 * 
 * Target Bedrock Tags for Achievement Reviving:
 * - hasBeenLoadedInCreative (TAG_Byte, 1) -> 0
 * - cheatsEnabled           (TAG_Byte, 1) -> 0
 * - commandsEnabled         (TAG_Byte, 1) -> 0
 * - GameType                (TAG_Int,  3) -> 0 (Survival)
 * - ForceGameType           (TAG_Byte, 1) -> 1 (Lock Survival)
 * ============================================================================
 */

export class NBTStream {
    /**
     * @param {ArrayBuffer | Uint8Array} buffer 
     */
    constructor(buffer) {
        if (buffer instanceof Uint8Array) {
            this.buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            this.bytes = new Uint8Array(this.buffer);
        } else if (buffer instanceof ArrayBuffer) {
            this.buffer = buffer.slice(0);
            this.bytes = new Uint8Array(this.buffer);
        } else {
            throw new Error("Invalid buffer provided to NBTStream.");
        }
        
        this.view = new DataView(this.buffer);
        this.offset = 0;
        this.textDecoder = new TextDecoder('utf-8');
    }

    readByte() {
        if (this.offset >= this.bytes.length) throw new Error("Unexpected EOF reading byte");
        const val = this.view.getUint8(this.offset);
        this.offset += 1;
        return val;
    }

    readInt8() {
        if (this.offset >= this.bytes.length) throw new Error("Unexpected EOF reading int8");
        const val = this.view.getInt8(this.offset);
        this.offset += 1;
        return val;
    }

    writeByteAt(offset, val) {
        this.view.setUint8(offset, val & 0xFF);
    }

    readShort() {
        if (this.offset + 2 > this.bytes.length) throw new Error("Unexpected EOF reading short");
        const val = this.view.getUint16(this.offset, true); // little-endian
        this.offset += 2;
        return val;
    }

    readInt() {
        if (this.offset + 4 > this.bytes.length) throw new Error("Unexpected EOF reading int");
        const val = this.view.getInt32(this.offset, true); // little-endian
        this.offset += 4;
        return val;
    }

    writeIntAt(offset, val) {
        this.view.setInt32(offset, val, true); // little-endian
    }

    skip(n) {
        this.offset += n;
        if (this.offset > this.bytes.length) {
            throw new Error(`Offset exceeded stream bounds (+${n} -> ${this.offset}/${this.bytes.length})`);
        }
    }

    /**
     * Scans the NBT compound structure and patches target tags in-place.
     * Records pre-patch values and post-patch results.
     * 
     * @param {Object} targets Map of { tagName: [expectedTagType, targetValue] }
     * @returns {{ success: boolean, audit: Object, extractedLevelName: string | null, error?: string }}
     */
    scanAndPatch(targets) {
        const audit = {};
        let extractedLevelName = null;

        try {
            const rootType = this.readByte();
            if (rootType !== 10) { // TAG_Compound
                return { success: false, error: "Root tag is not a Compound (ID 10)", audit, extractedLevelName };
            }

            const nameLen = this.readShort();
            this.skip(nameLen); // skip root compound name

            this._parseCompound(targets, audit, (name) => {
                if (!extractedLevelName && name === "LevelName") return true;
                return false;
            }, (name, val) => {
                if (name === "LevelName") extractedLevelName = val;
            });

            return {
                success: true,
                audit,
                extractedLevelName
            };
        } catch (err) {
            return {
                success: false,
                error: err.message,
                audit,
                extractedLevelName
            };
        }
    }

    _parseCompound(targets, audit, shouldReadVal, onReadVal) {
        while (this.offset < this.bytes.length) {
            const tagType = this.readByte();
            if (tagType === 0) break; // TAG_End

            const nameLen = this.readShort();
            const nameBytes = this.bytes.subarray(this.offset, this.offset + nameLen);
            const name = this.textDecoder.decode(nameBytes);
            this.skip(nameLen);

            if (targets[name]) {
                const [expectedType, targetVal] = targets[name];
                if (tagType === expectedType) {
                    const valueOffset = this.offset;
                    let currentValue = null;

                    if (tagType === 1) { // TAG_Byte
                        currentValue = this.view.getUint8(valueOffset);
                        this.writeByteAt(valueOffset, targetVal);
                    } else if (tagType === 3) { // TAG_Int
                        currentValue = this.view.getInt32(valueOffset, true);
                        this.writeIntAt(valueOffset, targetVal);
                    }

                    audit[name] = {
                        tagType,
                        previousValue: currentValue,
                        newValue: targetVal,
                        patched: true,
                        offset: valueOffset
                    };
                }
            }

            if (shouldReadVal && shouldReadVal(name)) {
                const readVal = this._readPayloadValue(tagType);
                if (onReadVal) onReadVal(name, readVal);
            } else {
                this._skipPayload(tagType, targets, audit, shouldReadVal, onReadVal);
            }
        }
    }

    _readPayloadValue(tagType) {
        if (tagType === 8) { // TAG_String
            const strLen = this.readShort();
            const strBytes = this.bytes.subarray(this.offset, this.offset + strLen);
            const str = this.textDecoder.decode(strBytes);
            this.skip(strLen);
            return str;
        } else if (tagType === 1) {
            return this.readByte();
        } else if (tagType === 3) {
            return this.readInt();
        }
        return null;
    }

    _skipPayload(tagType, targets, audit, shouldReadVal, onReadVal) {
        switch (tagType) {
            case 1: // TAG_Byte
                this.skip(1);
                break;
            case 2: // TAG_Short
                this.skip(2);
                break;
            case 3: // TAG_Int
                this.skip(4);
                break;
            case 4: // TAG_Long
                this.skip(8);
                break;
            case 5: // TAG_Float
                this.skip(4);
                break;
            case 6: // TAG_Double
                this.skip(8);
                break;
            case 7: { // TAG_Byte_Array (length is 4-byte LE int)
                const count = this.readInt();
                this.skip(count);
                break;
            }
            case 8: { // TAG_String (length is 2-byte LE uint)
                const strLen = this.readShort();
                this.skip(strLen);
                break;
            }
            case 9: { // TAG_List (1 byte sub_type, 4-byte LE int count)
                const subType = this.readByte();
                const count = this.readInt();
                for (let i = 0; i < count; i++) {
                    this._skipPayload(subType, targets, audit, shouldReadVal, onReadVal);
                }
                break;
            }
            case 10: // TAG_Compound
                this._parseCompound(targets, audit, shouldReadVal, onReadVal);
                break;
            case 11: { // TAG_Int_Array (length is 4-byte LE int, each element is 4 bytes)
                const count = this.readInt();
                this.skip(count * 4);
                break;
            }
            case 12: { // TAG_Long_Array (length is 4-byte LE int, each element is 8 bytes)
                const count = this.readInt();
                this.skip(count * 8);
                break;
            }
            default:
                throw new Error(`Encountered unknown NBT tag type: ${tagType} at offset ${this.offset - 1}`);
        }
    }
}

/**
 * High-level function to patch a full Bedrock level.dat binary buffer.
 * Bedrock format: 8-byte header (version LE int32 + length LE int32) + NBT Compound
 * 
 * @param {ArrayBuffer | Uint8Array} rawData 
 * @returns {{
 *   success: boolean,
 *   data?: Uint8Array,
 *   header?: { version: number, payloadLength: number },
 *   audit?: Object,
 *   levelName?: string,
 *   error?: string
 * }}
 */
export function patchBedrockLevelDat(rawData) {
    const bytes = rawData instanceof Uint8Array ? rawData : new Uint8Array(rawData);

    if (bytes.length < 8) {
        return { success: false, error: "File too small to be a valid Bedrock level.dat (under 8 bytes)." };
    }

    const headerView = new DataView(bytes.buffer, bytes.byteOffset, 8);
    const version = headerView.getInt32(0, true);
    const payloadLength = headerView.getInt32(4, true);

    // Some versions or tools might have raw NBT without the 8-byte header (e.g. root compound starts at byte 0)
    let headerOffset = 8;
    let nbtData = bytes.subarray(8);

    // If byte 0 is 10 and byte 8 is not, it could be a raw NBT compound without Bedrock header
    if (bytes[0] === 10 && (bytes[8] !== 10 && bytes.length > 8)) {
        headerOffset = 0;
        nbtData = bytes;
    }

    const stream = new NBTStream(nbtData);

    const targets = {
        "hasBeenLoadedInCreative": [1, 0], // TAG_Byte -> 0
        "cheatsEnabled":           [1, 0], // TAG_Byte -> 0
        "commandsEnabled":         [1, 0], // TAG_Byte -> 0
        "GameType":                [3, 0], // TAG_Int  -> 0 (Survival)
        "ForceGameType":           [1, 1]  // TAG_Byte -> 1 (Locked to Survival)
    };

    const scanResult = stream.scanAndPatch(targets);

    if (!scanResult.success) {
        return {
            success: false,
            error: scanResult.error || "NBT scanning failed."
        };
    }

    // Construct resulting Uint8Array
    let resultBytes;
    if (headerOffset === 8) {
        resultBytes = new Uint8Array(bytes.length);
        resultBytes.set(bytes.subarray(0, 8), 0);
        resultBytes.set(stream.bytes, 8);
    } else {
        resultBytes = stream.bytes;
    }

    return {
        success: true,
        data: resultBytes,
        header: headerOffset === 8 ? { version, payloadLength } : null,
        audit: scanResult.audit,
        levelName: scanResult.extractedLevelName
    };
}
