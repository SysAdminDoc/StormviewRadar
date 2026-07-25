(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/buffer/index.js
  var require_buffer = __commonJS({
    "node_modules/buffer/index.js"(exports) {
      "use strict";
      var base64 = require_base64_js();
      var ieee754 = require_ieee754();
      var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports.Buffer = Buffer3;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      var K_MAX_LENGTH = 2147483647;
      exports.kMaxLength = K_MAX_LENGTH;
      Buffer3.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer3.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
        );
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer3.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer3.isBuffer(this)) return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer3.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer3.isBuffer(this)) return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length) {
        if (length > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length);
        Object.setPrototypeOf(buf, Buffer3.prototype);
        return buf;
      }
      function Buffer3(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError(
              'The "string" argument must be of type string. Received type number'
            );
          }
          return allocUnsafe(arg);
        }
        return from(arg, encodingOrOffset, length);
      }
      Buffer3.poolSize = 8192;
      function from(value, encodingOrOffset, length) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
          );
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof value === "number") {
          throw new TypeError(
            'The "value" argument must not be of type number. Received type number'
          );
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer3.from(valueOf, encodingOrOffset, length);
        }
        const b = fromObject(value);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer3.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
        }
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      Buffer3.from = function(value, encodingOrOffset, length) {
        return from(value, encodingOrOffset, length);
      };
      Object.setPrototypeOf(Buffer3.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer3, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer3.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer3.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer3.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer3.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length = byteLength(string, encoding) | 0;
        let buf = createBuffer(length);
        const actual = buf.write(string, encoding);
        if (actual !== length) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array) {
        const length = array.length < 0 ? 0 : checked(array.length) | 0;
        const buf = createBuffer(length);
        for (let i = 0; i < length; i += 1) {
          buf[i] = array[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array, byteOffset, length) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length === void 0) {
          buf = new Uint8Array(array);
        } else if (length === void 0) {
          buf = new Uint8Array(array, byteOffset);
        } else {
          buf = new Uint8Array(array, byteOffset, length);
        }
        Object.setPrototypeOf(buf, Buffer3.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer3.isBuffer(obj)) {
          const len = checked(obj.length) | 0;
          const buf = createBuffer(len);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length) {
        if (length >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length | 0;
      }
      function SlowBuffer(length) {
        if (+length != length) {
          length = 0;
        }
        return Buffer3.alloc(+length);
      }
      Buffer3.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer3.prototype;
      };
      Buffer3.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array)) a = Buffer3.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array)) b = Buffer3.from(b, b.offset, b.byteLength);
        if (!Buffer3.isBuffer(a) || !Buffer3.isBuffer(b)) {
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
          );
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer3.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer3.concat = function concat(list, length) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer3.alloc(0);
        }
        let i;
        if (length === void 0) {
          length = 0;
          for (i = 0; i < list.length; ++i) {
            length += list[i].length;
          }
        }
        const buffer = Buffer3.allocUnsafe(length);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer3.isBuffer(buf)) buf = Buffer3.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(
                buffer,
                buf,
                pos
              );
            }
          } else if (!Buffer3.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer, pos);
          }
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string, encoding) {
        if (Buffer3.isBuffer(string)) {
          return string.length;
        }
        if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
          return string.byteLength;
        }
        if (typeof string !== "string") {
          throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
          );
        }
        const len = string.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0) return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len;
            case "utf8":
            case "utf-8":
              return utf8ToBytes(string).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len * 2;
            case "hex":
              return len >>> 1;
            case "base64":
              return base64ToBytes(string).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes(string).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer3.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding) encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer3.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer3.prototype.swap16 = function swap16() {
        const len = this.length;
        if (len % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer3.prototype.swap32 = function swap32() {
        const len = this.length;
        if (len % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer3.prototype.swap64 = function swap64() {
        const len = this.length;
        if (len % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer3.prototype.toString = function toString() {
        const length = this.length;
        if (length === 0) return "";
        if (arguments.length === 0) return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer3.prototype.toLocaleString = Buffer3.prototype.toString;
      Buffer3.prototype.equals = function equals(b) {
        if (!Buffer3.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return Buffer3.compare(this, b) === 0;
      };
      Buffer3.prototype.inspect = function inspect() {
        let str = "";
        const max = exports.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max) str += " ... ";
        return "<Buffer " + str + ">";
      };
      if (customInspectSymbol) {
        Buffer3.prototype[customInspectSymbol] = Buffer3.prototype.inspect;
      }
      Buffer3.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (isInstance(target, Uint8Array)) {
          target = Buffer3.from(target, target.offset, target.byteLength);
        }
        if (!Buffer3.isBuffer(target)) {
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
          );
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target ? target.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target.slice(start, end);
        for (let i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0) return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer.length - 1;
        }
        if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          else byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0;
          else return -1;
        }
        if (typeof val === "string") {
          val = Buffer3.from(val, encoding);
        }
        if (Buffer3.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i;
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1) i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read(arr, i + j) !== read(val, j)) {
                found = false;
                break;
              }
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer3.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer3.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer3.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length) {
          length = remaining;
        } else {
          length = Number(length);
          if (length > remaining) {
            length = remaining;
          }
        }
        const strLen = string.length;
        if (length > strLen / 2) {
          length = strLen / 2;
        }
        let i;
        for (i = 0; i < length; ++i) {
          const parsed = parseInt(string.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length);
      }
      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length);
      }
      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
      }
      Buffer3.prototype.write = function write(string, offset, length, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (length === void 0 && typeof offset === "string") {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length)) {
            length = length >>> 0;
            if (encoding === void 0) encoding = "utf8";
          } else {
            encoding = length;
            length = void 0;
          }
        } else {
          throw new Error(
            "Buffer.write(string, encoding, offset[, length]) is no longer supported"
          );
        }
        const remaining = this.length - offset;
        if (length === void 0 || length > remaining) length = remaining;
        if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding) encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string, offset, length);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string, offset, length);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string, offset, length);
            case "base64":
              return base64Write(this, string, offset, length);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string, offset, length);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer3.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          );
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len) end = len;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer3.prototype.slice = function slice(start, end) {
        const len = this.length;
        start = ~~start;
        end = end === void 0 ? len : ~~end;
        if (start < 0) {
          start += len;
          if (start < 0) start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0) end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start) end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer3.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer3.prototype.readUintLE = Buffer3.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer3.prototype.readUintBE = Buffer3.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer3.prototype.readUint8 = Buffer3.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer3.prototype.readUint16LE = Buffer3.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer3.prototype.readUint16BE = Buffer3.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer3.prototype.readUint32LE = Buffer3.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer3.prototype.readUint32BE = Buffer3.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer3.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer3.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer3.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer3.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer3.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128)) return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer3.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer3.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer3.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer3.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer3.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer3.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer3.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer3.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer3.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer3.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer3.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer3.prototype.writeUintLE = Buffer3.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeUintBE = Buffer3.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeUint8 = Buffer3.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer3.prototype.writeUint16LE = Buffer3.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer3.prototype.writeUint16BE = Buffer3.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer3.prototype.writeUint32LE = Buffer3.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer3.prototype.writeUint32BE = Buffer3.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer3.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer3.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer3.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer3.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
        if (value < 0) value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer3.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer3.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer3.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer3.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0) value = 4294967295 + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      Buffer3.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer3.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer3.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer3.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer3.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer3.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer3.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer3.isBuffer(target)) throw new TypeError("argument should be a Buffer");
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          );
        }
        return len;
      };
      Buffer3.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer3.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val) val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer3.isBuffer(val) ? val : Buffer3.from(val, encoding);
          const len = bytes.length;
          if (len === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
          }
        }
        return this;
      };
      var errors = {};
      function E(sym, getMessage, Base) {
        errors[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E(
        "ERR_BUFFER_OUT_OF_BOUNDS",
        function(name) {
          if (name) {
            return `${name} is outside of buffer bounds`;
          }
          return "Attempt to access memory outside buffer bounds";
        },
        RangeError
      );
      E(
        "ERR_INVALID_ARG_TYPE",
        function(name, actual) {
          return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
        },
        TypeError
      );
      E(
        "ERR_OUT_OF_RANGE",
        function(str, range, input) {
          let msg = `The value of "${str}" is out of range.`;
          let received = input;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          }
          msg += ` It must be ${range}. Received ${received}`;
          return msg;
        },
        RangeError
      );
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value, min, max, buf, offset, byteLength2) {
        if (value > max || value < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range;
          if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
              range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
          }
          throw new errors.ERR_OUT_OF_RANGE("value", range, value);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value, name) {
        if (typeof value !== "number") {
          throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
      }
      function boundsError(value, length, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
        }
        if (length < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(
          type || "offset",
          `>= ${type ? 1 : 0} and <= ${length}`,
          value
        );
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes(string, units) {
        units = units || Infinity;
        let codePoint;
        const length = string.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(
              codePoint >> 6 | 192,
              codePoint & 63 | 128
            );
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(
              codePoint >> 12 | 224,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) break;
            bytes.push(
              codePoint >> 18 | 240,
              codePoint >> 12 & 63 | 128,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          byteArray.push(str.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length) {
        let i;
        for (i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      var hexSliceLookupTable = function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      }();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    }
  });

  // node_modules/nexrad-level-2-data/src/classes/RandomAccessFile.js
  var require_RandomAccessFile = __commonJS({
    "node_modules/nexrad-level-2-data/src/classes/RandomAccessFile.js"(exports, module) {
      var BIG_ENDIAN = 0;
      var LITTLE_ENDIAN = 1;
      var RandomAccessFile = class {
        /**
         * Store a buffer or string and add functionality for random access
         * Unless otherwise noted all read functions advance the file's pointer by the length of the data read
         *
         * @param {Buffer|string} file A file as a string or Buffer to load for random access
         * @param {number} endian Endianess of the file constants BIG_ENDIAN and LITTLE_ENDIAN are provided
         */
        constructor(file, endian = BIG_ENDIAN) {
          this.offset = 0;
          this.buffer = null;
          if (endian < 0) return;
          this.bigEndian = endian === BIG_ENDIAN;
          if (typeof file === "string") {
            this.buffer = Buffer.from(file, "binary");
          } else {
            this.buffer = file;
          }
          if (this.bigEndian) {
            this.readFloatLocal = this.buffer.readFloatBE.bind(this.buffer);
            this.readIntLocal = this.buffer.readUIntBE.bind(this.buffer);
            this.readSignedIntLocal = this.buffer.readIntBE.bind(this.buffer);
          } else {
            this.readFloatLocal = this.buffer.readFloatLE.bind(this.buffer);
            this.readIntLocal = this.buffer.readUIntLE.bind(this.buffer);
            this.readSignedIntLocal = this.buffer.readIntLE.bind(this.buffer);
          }
        }
        /**
         * Get buffer length
         *
         * @category Positioning
         * @returns {number}
         */
        getLength() {
          return this.buffer.length;
        }
        /**
         * Get current position in the file
         *
         * @category Positioning
         * @returns {number}
         */
        getPos() {
          return this.offset;
        }
        /**
         * Seek to a provided buffer offset
         *
         * @category Positioning
         * @param {number} position Byte offset
         */
        seek(position) {
          this.offset = position;
        }
        /**
         * Read a string of a specificed length from the buffer
         *
         * @category Data
         * @param {number} length Length of string to read
         * @returns {string}
         */
        readString(length) {
          const data = this.buffer.toString("utf-8", this.offset, this.offset += length);
          return data;
        }
        /**
         * Read a float from the buffer
         *
         * @category Data
         * @returns {number}
         */
        readFloat() {
          const float = this.readFloatLocal(this.offset);
          this.offset += 4;
          return float;
        }
        /**
         * Read a 4-byte unsigned integer from the buffer
         *
         * @category Data
         * @returns {number}
         */
        readInt() {
          const int = this.readIntLocal(this.offset, 4);
          this.offset += 4;
          return int;
        }
        /**
         * Read a 4-byte signed integer from the buffer
         *
         * @category Data
         * @returns {number}
         */
        readSInt4() {
          const int = this.readSignedIntLocal(this.offset, 4);
          this.offset += 4;
          return int;
        }
        /**
         * Read a 2-byte unsigned integer from the buffer
         *
         * @category Data
         * @returns {number}
         */
        readShort() {
          const short = this.readIntLocal(this.offset, 2);
          this.offset += 2;
          return short;
        }
        /**
         * Read a 2-byte signed integer from the buffer
         *
         * @category Data
         * @returns {number}
         */
        readSignedInt() {
          const short = this.readSignedIntLocal(this.offset, 2);
          this.offset += 2;
          return short;
        }
        /**
         * Read a single byte from the buffer
         *
         * @category Data
         * @returns {number}
         */
        readByte() {
          return this.read();
        }
        // read a set number of bytes from the buffer
        /**
         * Read a set number of bytes from the buffer
         *
         * @category Data
         * @param {number} length Number of bytes to read
         * @returns {number|number[]} number if length = 1, otherwise number[]
         */
        read(length = 1) {
          let data = null;
          if (length > 1) {
            data = this.buffer.slice(this.offset, this.offset + length);
            this.offset += length;
          } else {
            data = this.buffer[this.offset];
            this.offset += 1;
          }
          return data;
        }
        /**
         * Advance the pointer forward a set number of bytes
         *
         * @category Positioning
         * @param {number} length Number of bytes to skip
         */
        skip(length) {
          this.offset += length;
        }
      };
      module.exports.RandomAccessFile = RandomAccessFile;
      module.exports.BIG_ENDIAN = BIG_ENDIAN;
      module.exports.LITTLE_ENDIAN = LITTLE_ENDIAN;
    }
  });

  // node_modules/nexrad-level-2-data/src/constants.js
  var require_constants = __commonJS({
    "node_modules/nexrad-level-2-data/src/constants.js"(exports, module) {
      var FILE_HEADER_SIZE = 24;
      var RADAR_DATA_SIZE = 2432;
      var CTM_HEADER_SIZE = 12;
      var MESSAGE_HEADER_SIZE = 28;
      module.exports = {
        FILE_HEADER_SIZE,
        RADAR_DATA_SIZE,
        CTM_HEADER_SIZE,
        MESSAGE_HEADER_SIZE
      };
    }
  });

  // node_modules/nexrad-level-2-data/src/classes/Level2Record-1.js
  var require_Level2Record_1 = __commonJS({
    "node_modules/nexrad-level-2-data/src/classes/Level2Record-1.js"(exports, module) {
      module.exports = (raf, message, options) => {
        const startingOffset = raf.getPos();
        message.record = {
          mseconds: raf.readInt(),
          julian_date: raf.readShort(),
          unambiguous_range: raf.readShort() / 10,
          azimuth: raf.readShort() / 8 * 0.043945,
          azimuth_number: raf.readShort(),
          radial_status: raf.readShort(),
          elevation_angle: raf.readShort() / 8 * 0.043945,
          elevation_number: raf.readShort(),
          surveillance_range: raf.readSignedInt() / 1e3,
          doppler_range: raf.readSignedInt() / 1e3,
          surveillance_range_sample_interval: raf.readSignedInt() / 1e3,
          doppler_range_sample_interval: raf.readSignedInt() / 1e3,
          number_of_surveillance_bins: raf.readShort(),
          number_of_doppler_bins: raf.readShort(),
          cut_sector_number: raf.readShort(),
          calibration_constant: raf.readFloat(),
          surveillance_pointer: raf.readShort(),
          velocity_pointer: raf.readShort(),
          spectral_width_pointer: raf.readShort(),
          doppler_velocity_resolution: raf.readShort() * 0.25,
          vcp: raf.readShort(),
          spare1: raf.read(8),
          spare2: raf.readShort(),
          spare3: raf.readShort(),
          spare4: raf.readShort(),
          nyquist_velocity: raf.readShort() / 100,
          atoms: raf.readShort() / 1e3,
          tover: raf.readShort() / 10,
          radial_spot_blanking_status: raf.readShort(),
          spare5: raf.read(32)
        };
        if (message.record.surveillance_pointer > 0) {
          raf.seek(startingOffset + message.record.surveillance_pointer);
          try {
            if (raf.getPos() > raf.getLength()) throw new Error("Message Type 1: Invalid surveillance (reflectivity) offset");
            if (raf.getPos() + message.record.number_of_surveillance_bins >= raf.getLength()) throw new Error("Message Type 1: Invalid surveillance (reflectivity) length");
            const reflectivity = [];
            for (let i = 0; i < message.record.number_of_surveillance_bins; i += 1) {
              const bin = raf.read();
              if (bin >= 2) {
                reflectivity.push(bin / 2 - 33);
              } else {
                reflectivity.push(null);
              }
            }
            message.record.reflect = reflectivity;
          } catch (e) {
            options.logger.warn(e.message);
          }
        }
        if (message.record.velocity_pointer > 0) {
          raf.seek(startingOffset + message.record.velocity_pointer);
          try {
            if (raf.getPos() > raf.getLength()) throw new Error("Message Type 1: Invalid doppler (velocity) offset");
            if (raf.getPos() + message.record.number_of_doppler_bins >= raf.getLength()) throw new Error("Message Type 1: Invalid doppler (velocity) length");
            const velocity = [];
            for (let i = 0; i < message.record.number_of_doppler_bins; i += 1) {
              const bin = raf.read();
              if (bin >= 2) {
                velocity.push((bin - 127) * message.record.doppler_velocity_resolution);
              } else {
                velocity.push(null);
              }
            }
            message.record.velocity = velocity;
          } catch (e) {
            options.logger.warn(e.message);
          }
        }
        if (message.record.spectral_width_pointer > 0) {
          raf.skip(message.record.spare4);
        }
        return message;
      };
    }
  });

  // node_modules/nexrad-level-2-data/src/classes/Level2Record-2.js
  var require_Level2Record_2 = __commonJS({
    "node_modules/nexrad-level-2-data/src/classes/Level2Record-2.js"(exports, module) {
      module.exports = (raf, message) => {
        message.record = {
          rdaStatus: raf.readShort(),
          operabilityStatus: raf.readShort(),
          controlStatus: raf.readShort(),
          auxiliaryPowerGeneratorState: raf.readShort(),
          averageTransmitterPower: raf.readShort(),
          horizontalReflectivityCalibrationCorrection: raf.readSignedInt() / 100,
          dataTransmissionEnabled: raf.readShort(),
          volumeCoveragePatternNumber: raf.readSignedInt(),
          rdaControlAuthorization: raf.readShort(),
          rdaBuildNumber: buildNumber(raf.readSignedInt()),
          operationalMode: raf.readShort(),
          superResolutionStatus: raf.readShort(),
          clutterMitigationDecisionStatus: raf.readShort(),
          avsetStatus: raf.readShort(),
          rdaAlarmSummary: raf.readShort(),
          commandAcknowledgement: raf.readShort(),
          channelControlStatus: raf.readShort(),
          spotBlankingStatus: raf.readShort(),
          bypassMapGenerationDate: raf.readInt(),
          bypassMapGenerationTime: raf.readInt(),
          clutterFilterMapGenerationDate: raf.readInt(),
          clutterFilterMapGenerationTime: raf.readInt(),
          verticalReflectivyCalibrationCorrection: raf.readSignedInt() / 100,
          transmitterPowerSourceStatus: raf.readShort(),
          rmsControlStatus: raf.readShort(),
          performanceCheckStatus: raf.readShort(),
          alarmCodes: alarmCodes(raf),
          signalProcessingOptions: raf.readShort(),
          spares: raf.read(36),
          statusVersion: raf.readInt()
        };
        return message;
      };
      var buildNumber = (raw) => {
        if (raw / 100 > 2) return raw / 100;
        return raw / 10;
      };
      var alarmCodes = (raf) => {
        const alarms = [];
        for (let i = 0; i < 14; i += 1) {
          alarms.push(raf.readShort());
        }
        return alarms;
      };
    }
  });

  // node_modules/nexrad-level-2-data/src/classes/Level2Record-31.js
  var require_Level2Record_31 = __commonJS({
    "node_modules/nexrad-level-2-data/src/classes/Level2Record-31.js"(exports, module) {
      var { MESSAGE_HEADER_SIZE } = require_constants();
      module.exports = (raf, message, offset, options) => {
        const record = {
          id: raf.readString(4),
          mseconds: raf.readInt(),
          julian_date: raf.readShort(),
          radial_number: raf.readShort(),
          azimuth: raf.readFloat(),
          compress_idx: raf.readByte(),
          sp: raf.readByte(),
          radial_length: raf.readShort(),
          ars: raf.readByte(),
          rs: raf.readByte(),
          elevation_number: raf.readByte(),
          cut: raf.readByte(),
          elevation_angle: raf.readFloat(),
          rsbs: raf.readByte(),
          aim: raf.readByte(),
          dcount: raf.readShort()
        };
        try {
          if (!record.id.match(/[A-Z]{4}/)) throw new Error(`Invalid record id: ${record.id}`);
          if (record.mseconds > 86401e3) throw new Error(`Invalid timestamp (ms): ${record.mseconds}`);
        } catch (e) {
          options.logger.warn(e.message);
          return message;
        }
        message.record = record;
        const dbp = [];
        for (let i = 0; i < 9; i += 1) {
          const pointer = raf.readInt();
          if (i < message.record.dcount) dbp.push(pointer);
        }
        const blockTypesFriendly = {
          VOL: "volume",
          ELE: "elevation",
          RAD: "radial",
          REF: "reflect",
          VEL: "velocity",
          "SW ": "spectrum",
          // intentional space to fill 3-character requirement
          ZDR: "zdr",
          PHI: "phi",
          RHO: "rho"
        };
        const messageSizeBytes = message.message_size * 2;
        let prevRecord = false;
        let prevBlockStart = 0;
        for (let i = 0; i < dbp.length; i += 1) {
          const parserStartPos = dbp[i] + offset + MESSAGE_HEADER_SIZE;
          raf.seek(parserStartPos);
          try {
            const { name } = blockName(raf);
            if (prevRecord && blockTypesFriendly[prevRecord.name]) {
              message.record[blockTypesFriendly[prevRecord.name]] = prevRecord;
            }
            prevRecord = false;
            if (dbp[i] < messageSizeBytes) {
              let thisRecord = false;
              switch (name) {
                case "VOL":
                  thisRecord = parseVolumeData(raf);
                  break;
                case "ELV":
                  thisRecord = parseElevationData(raf);
                  break;
                case "RAD":
                  thisRecord = parseRadialData(raf);
                  break;
                default:
                  thisRecord = parseMomentData(raf);
              }
              prevRecord = thisRecord;
            } else {
              throw new Error(`Block overruns file at ${raf.getPos()}`);
            }
            prevBlockStart = parserStartPos;
          } catch (e) {
            options.logger.warn(e.message);
            prevRecord = false;
            message.endedEarly = prevBlockStart;
            break;
          }
        }
        if (prevRecord && blockTypesFriendly[prevRecord.name]) {
          message.record[blockTypesFriendly[prevRecord.name]] = prevRecord;
        }
        return message;
      };
      var parseVolumeData = (raf) => ({
        block_type: raf.readString(1),
        name: raf.readString(3),
        size: raf.readShort(),
        version_major: raf.read(),
        version_minor: raf.read(),
        latitude: raf.readFloat(),
        longitude: raf.readFloat(),
        elevation: raf.readShort(),
        feedhorn_height: raf.readShort(),
        calibration: raf.readFloat(),
        tx_horizontal: raf.readFloat(),
        tx_vertical: raf.readFloat(),
        differential_reflectivity: raf.readFloat(),
        differential_phase: raf.readFloat(),
        volume_coverage_pattern: raf.readShort(),
        processing_status: raf.readShort(),
        zdr_bias_estimate: raf.readShort()
      });
      var parseElevationData = (raf) => ({
        block_type: raf.readString(1),
        name: raf.readString(3),
        size: raf.readShort(),
        atmos: raf.readShort(),
        calibration: raf.readFloat()
      });
      var parseRadialData = (raf) => ({
        block_type: raf.readString(1),
        name: raf.readString(3),
        size: raf.readShort(),
        unambiguous_range: raf.readShort() / 10,
        horizontal_noise_level: raf.readFloat(),
        vertical_noise_level: raf.readFloat(),
        nyquist_velocity: raf.readShort(),
        radial_flags: raf.readShort(),
        horizontal_calibration: raf.readFloat(),
        vertical_calibration: raf.readFloat()
      });
      var parseMomentData = (raf) => {
        const data = {
          block_type: raf.readString(1),
          name: raf.readString(3),
          spare: raf.read(4),
          gate_count: raf.readShort(),
          first_gate: raf.readShort() / 1e3,
          // scale int to float 0.001 precision
          gate_size: raf.readShort() / 1e3,
          // scale int to float 0.001 precision
          rf_threshold: raf.readShort() / 10,
          // scale int to float 0.1 precision
          snr_threshold: raf.readShort() / 1e3,
          // scale int to float 0.001 precision
          control_flags: raf.read(),
          data_size: raf.read(),
          scale: raf.readFloat(),
          offset: raf.readFloat(),
          moment_data: []
        };
        let getDataBlock = raf.read.bind(raf);
        let inc = 1;
        if (data.data_size === 16) {
          getDataBlock = raf.readShort.bind(raf);
          inc = 2;
        }
        const endI = data.gate_count * inc;
        for (let i = 0; i < endI; i += inc) {
          const val = getDataBlock();
          if (val >= 2) {
            data.moment_data.push((val - data.offset) / data.scale);
          } else {
            data.moment_data.push(null);
          }
        }
        return data;
      };
      var blockName = (raf) => {
        const type = raf.readString(1);
        const name = raf.readString(3);
        raf.skip(-4);
        if (!(type === "D" || type === "R")) {
          throw new Error(`Invalid data block type: 0x${(type.charCodeAt(0) || 0).toString(16).padStart(2, "0")} at ${raf.getPos()}`);
        }
        return { name, type };
      };
    }
  });

  // node_modules/nexrad-level-2-data/src/classes/Level2Record-5-7.js
  var require_Level2Record_5_7 = __commonJS({
    "node_modules/nexrad-level-2-data/src/classes/Level2Record-5-7.js"(exports, module) {
      module.exports = (raf, message) => {
        message.record = {
          message_size: raf.readShort(),
          pattern_type: raf.readShort(),
          pattern_number: raf.readShort(),
          num_elevations: raf.readShort(),
          version: raf.readByte(),
          clutter_number: raf.readByte(),
          velocity_resolution: velocityResolution(raf.readByte()),
          pulse_width: pulseWidth(raf.readByte()),
          reserved1: raf.readInt(),
          vcp_sequencing: vcpSequencing(raf.readShort()),
          vcp_supplemental: vcpSupplemental(raf.readShort()),
          reserved2: raf.readShort()
        };
        message.record.elevations = [];
        for (let i = 1; i <= message.record.num_elevations; i += 1) {
          const elev = {
            elevation_angle: parse360Angle(raf.readShort()),
            channel_config: raf.readByte(),
            waveform_type: raf.readByte(),
            super_res_control: superResControl(raf.readByte()),
            surv_prf_number: raf.readByte(),
            surv_prf_pulse: raf.readShort(),
            azimuth_rate: azimuthRate(raf.readShort()),
            ref_threshold: raf.readShort(),
            vel_threshold: raf.readShort(),
            sw_threshold: raf.readShort(),
            diff_ref_threshold: raf.readShort(),
            diff_ph_threshold: raf.readShort(),
            cor_coeff_threshold: raf.readShort(),
            edge_angle_s1: parse360Angle(raf.readShort()),
            prf_num_s1: raf.readShort(),
            prf_pulse_s1: raf.readShort(),
            supplemental_data: supplementalData(raf.readShort()),
            edge_angle_s2: parse360Angle(raf.readShort()),
            prf_num_s2: raf.readShort(),
            prf_pulse_s2: raf.readShort(),
            ebc_angle: parse360Angle(raf.readShort()),
            edge_angle_s3: parse360Angle(raf.readShort()),
            prf_num_s3: raf.readShort(),
            prf_pulse_s3: raf.readShort(),
            reserved: raf.readShort()
          };
          message.record.elevations[i] = elev;
        }
        return message;
      };
      var parseBits = (raw, start, end) => {
        if (end !== void 0) {
          let val = 0;
          for (let i = start; i <= end; i += 1) {
            if (raw & 2 ** i) val += 2 ** (i - start);
          }
          return val;
        }
        return (raw & 2 ** start) > 0;
      };
      var parse360Angle = (raw) => {
        let angle = 0;
        for (let i = 15; i >= 3; i -= 1) {
          if (parseBits(raw, i)) angle += 180 / 2 ** (15 - i);
        }
        return angle;
      };
      var velocityResolution = (raw) => {
        if (raw === 2) return 0.5;
        return 1;
      };
      var pulseWidth = (raw) => {
        if (raw === 2) return "short";
        return "Long";
      };
      var vcpSequencing = (raw) => ({
        elevations: parseBits(raw, 0, 4),
        max_sails_cuts: parseBits(raw, 5, 6),
        sequence_active: parseBits(raw, 13),
        truncated_vcp: parseBits(raw, 14)
      });
      var vcpSupplemental = (raw) => ({
        sails_vcp: parseBits(raw, 0),
        number_sails_cuts: parseBits(raw, 1, 3),
        mrle_vcp: parseBits(raw, 4),
        number_mrle_cuts: parseBits(raw, 5, 7),
        mpda_vcp: parseBits(raw, 11),
        base_tilt_vcp: parseBits(raw, 12),
        number_base_tilts: parseBits(raw, 13, 15)
      });
      var superResControl = (raw) => ({
        super_res: {
          halfDegreeAzimuth: parseBits(raw, 0),
          quarterKm: parseBits(raw, 1),
          "300km": parseBits(raw, 2)
        },
        dual_pol: {
          "300km": parseBits(raw, 3)
        }
      });
      var azimuthRate = (raw) => {
        let rate = 0;
        for (let i = 14; i >= 3; i -= 1) {
          if (parseBits(raw, i)) rate += 22.5 / 2 ** (14 - i);
        }
        if (parseBits(raw, 15)) rate = -rate;
        return rate;
      };
      var supplementalData = (raw) => ({
        sails_cut: parseBits(raw, 0),
        sails_sequence: parseBits(raw, 1, 3),
        mrle_cut: parseBits(raw, 4),
        mrle_sequence: parseBits(raw, 5, 7),
        mpda_cut: parseBits(raw, 9),
        base_tilt_cut: parseBits(raw, 10)
      });
    }
  });

  // node_modules/nexrad-level-2-data/src/classes/Level2RecordSearch.js
  var require_Level2RecordSearch = __commonJS({
    "node_modules/nexrad-level-2-data/src/classes/Level2RecordSearch.js"(exports, module) {
      var level2RecordSearch = (raf, startPos, julianDate, options) => {
        if (julianDate === void 0) return false;
        raf.seek(startPos);
        const result = search(raf, julianDate, options);
        if (result) return result;
        raf.seek(startPos);
        return search(raf, julianDate + 1, options);
      };
      var search = (raf, date, options) => {
        const endOfFile = raf.buffer.length - 10;
        const found = false;
        while (!found && raf.getPos() < endOfFile) {
          let skipBack = 2;
          if (raf.readShort() === date) {
            raf.skip(4);
            skipBack += 8;
            if (raf.readShort() === 1 && raf.readShort() === 1) {
              const foundAt = raf.getPos() - skipBack - 6;
              options.logger.warn(`Found next block at ${foundAt}`);
              return foundAt;
            }
            raf.skip(-skipBack);
          }
        }
        return false;
      };
      module.exports = {
        level2RecordSearch
      };
    }
  });

  // node_modules/nexrad-level-2-data/src/classes/Level2Record.js
  var require_Level2Record = __commonJS({
    "node_modules/nexrad-level-2-data/src/classes/Level2Record.js"(exports, module) {
      var {
        FILE_HEADER_SIZE,
        RADAR_DATA_SIZE,
        CTM_HEADER_SIZE
      } = require_constants();
      var parseMessage1 = require_Level2Record_1();
      var parseMessage2 = require_Level2Record_2();
      var parseMessage31 = require_Level2Record_31();
      var parseMessage5 = require_Level2Record_5_7();
      var { level2RecordSearch } = require_Level2RecordSearch();
      var Level2Record = (raf, record, message31Offset, header, options) => {
        let headerSize = 0;
        if (header?.ICAO) headerSize = FILE_HEADER_SIZE;
        const recordOffset = record * RADAR_DATA_SIZE + headerSize + message31Offset;
        if (recordOffset >= raf.getLength()) return { finished: true };
        const message = getRecord(raf, recordOffset, options);
        if (!message.endedEarly) return message;
        const nextRecordPos = level2RecordSearch(raf, message.endedEarly, header?.modified_julian_date, options);
        if (nextRecordPos === false) {
          throw new Error(`Unable to recover message at ${recordOffset}`);
        }
        message.actual_size = (nextRecordPos - recordOffset) / 2 - CTM_HEADER_SIZE;
        return message;
      };
      var getRecord = (raf, recordOffset, options) => {
        raf.seek(recordOffset);
        raf.skip(CTM_HEADER_SIZE);
        const message = {
          message_size: raf.readShort(),
          channel: raf.readByte(),
          message_type: raf.readByte(),
          id_sequence: raf.readShort(),
          message_julian_date: raf.readShort(),
          message_mseconds: raf.readInt(),
          segment_count: raf.readShort(),
          segment_number: raf.readShort()
        };
        switch (message.message_type) {
          case 31:
            return parseMessage31(raf, message, recordOffset, options);
          case 1:
            return parseMessage1(raf, message, options);
          case 2:
            return parseMessage2(raf, message);
          case 5:
          case 7:
            return parseMessage5(raf, message);
          default:
            return false;
        }
      };
      module.exports.Level2Record = Level2Record;
    }
  });

  // node_modules/seek-bzip/lib/bitreader.js
  var require_bitreader = __commonJS({
    "node_modules/seek-bzip/lib/bitreader.js"(exports, module) {
      var BITMASK = [0, 1, 3, 7, 15, 31, 63, 127, 255];
      var BitReader = function(stream) {
        this.stream = stream;
        this.bitOffset = 0;
        this.curByte = 0;
        this.hasByte = false;
      };
      BitReader.prototype._ensureByte = function() {
        if (!this.hasByte) {
          this.curByte = this.stream.readByte();
          this.hasByte = true;
        }
      };
      BitReader.prototype.read = function(bits) {
        var result = 0;
        while (bits > 0) {
          this._ensureByte();
          var remaining = 8 - this.bitOffset;
          if (bits >= remaining) {
            result <<= remaining;
            result |= BITMASK[remaining] & this.curByte;
            this.hasByte = false;
            this.bitOffset = 0;
            bits -= remaining;
          } else {
            result <<= bits;
            var shift = remaining - bits;
            result |= (this.curByte & BITMASK[bits] << shift) >> shift;
            this.bitOffset += bits;
            bits = 0;
          }
        }
        return result;
      };
      BitReader.prototype.seek = function(pos) {
        var n_bit = pos % 8;
        var n_byte = (pos - n_bit) / 8;
        this.bitOffset = n_bit;
        this.stream.seek(n_byte);
        this.hasByte = false;
      };
      BitReader.prototype.pi = function() {
        var buf = new Buffer(6), i;
        for (i = 0; i < buf.length; i++) {
          buf[i] = this.read(8);
        }
        return buf.toString("hex");
      };
      module.exports = BitReader;
    }
  });

  // node_modules/seek-bzip/lib/stream.js
  var require_stream = __commonJS({
    "node_modules/seek-bzip/lib/stream.js"(exports, module) {
      var Stream = function() {
      };
      Stream.prototype.readByte = function() {
        throw new Error("abstract method readByte() not implemented");
      };
      Stream.prototype.read = function(buffer, bufOffset, length) {
        var bytesRead = 0;
        while (bytesRead < length) {
          var c = this.readByte();
          if (c < 0) {
            return bytesRead === 0 ? -1 : bytesRead;
          }
          buffer[bufOffset++] = c;
          bytesRead++;
        }
        return bytesRead;
      };
      Stream.prototype.seek = function(new_pos) {
        throw new Error("abstract method seek() not implemented");
      };
      Stream.prototype.writeByte = function(_byte) {
        throw new Error("abstract method readByte() not implemented");
      };
      Stream.prototype.write = function(buffer, bufOffset, length) {
        var i;
        for (i = 0; i < length; i++) {
          this.writeByte(buffer[bufOffset++]);
        }
        return length;
      };
      Stream.prototype.flush = function() {
      };
      module.exports = Stream;
    }
  });

  // node_modules/seek-bzip/lib/crc32.js
  var require_crc32 = __commonJS({
    "node_modules/seek-bzip/lib/crc32.js"(exports, module) {
      module.exports = function() {
        var crc32Lookup = new Uint32Array([
          0,
          79764919,
          159529838,
          222504665,
          319059676,
          398814059,
          445009330,
          507990021,
          638119352,
          583659535,
          797628118,
          726387553,
          890018660,
          835552979,
          1015980042,
          944750013,
          1276238704,
          1221641927,
          1167319070,
          1095957929,
          1595256236,
          1540665371,
          1452775106,
          1381403509,
          1780037320,
          1859660671,
          1671105958,
          1733955601,
          2031960084,
          2111593891,
          1889500026,
          1952343757,
          2552477408,
          2632100695,
          2443283854,
          2506133561,
          2334638140,
          2414271883,
          2191915858,
          2254759653,
          3190512472,
          3135915759,
          3081330742,
          3009969537,
          2905550212,
          2850959411,
          2762807018,
          2691435357,
          3560074640,
          3505614887,
          3719321342,
          3648080713,
          3342211916,
          3287746299,
          3467911202,
          3396681109,
          4063920168,
          4143685023,
          4223187782,
          4286162673,
          3779000052,
          3858754371,
          3904687514,
          3967668269,
          881225847,
          809987520,
          1023691545,
          969234094,
          662832811,
          591600412,
          771767749,
          717299826,
          311336399,
          374308984,
          453813921,
          533576470,
          25881363,
          88864420,
          134795389,
          214552010,
          2023205639,
          2086057648,
          1897238633,
          1976864222,
          1804852699,
          1867694188,
          1645340341,
          1724971778,
          1587496639,
          1516133128,
          1461550545,
          1406951526,
          1302016099,
          1230646740,
          1142491917,
          1087903418,
          2896545431,
          2825181984,
          2770861561,
          2716262478,
          3215044683,
          3143675388,
          3055782693,
          3001194130,
          2326604591,
          2389456536,
          2200899649,
          2280525302,
          2578013683,
          2640855108,
          2418763421,
          2498394922,
          3769900519,
          3832873040,
          3912640137,
          3992402750,
          4088425275,
          4151408268,
          4197601365,
          4277358050,
          3334271071,
          3263032808,
          3476998961,
          3422541446,
          3585640067,
          3514407732,
          3694837229,
          3640369242,
          1762451694,
          1842216281,
          1619975040,
          1682949687,
          2047383090,
          2127137669,
          1938468188,
          2001449195,
          1325665622,
          1271206113,
          1183200824,
          1111960463,
          1543535498,
          1489069629,
          1434599652,
          1363369299,
          622672798,
          568075817,
          748617968,
          677256519,
          907627842,
          853037301,
          1067152940,
          995781531,
          51762726,
          131386257,
          177728840,
          240578815,
          269590778,
          349224269,
          429104020,
          491947555,
          4046411278,
          4126034873,
          4172115296,
          4234965207,
          3794477266,
          3874110821,
          3953728444,
          4016571915,
          3609705398,
          3555108353,
          3735388376,
          3664026991,
          3290680682,
          3236090077,
          3449943556,
          3378572211,
          3174993278,
          3120533705,
          3032266256,
          2961025959,
          2923101090,
          2868635157,
          2813903052,
          2742672763,
          2604032198,
          2683796849,
          2461293480,
          2524268063,
          2284983834,
          2364738477,
          2175806836,
          2238787779,
          1569362073,
          1498123566,
          1409854455,
          1355396672,
          1317987909,
          1246755826,
          1192025387,
          1137557660,
          2072149281,
          2135122070,
          1912620623,
          1992383480,
          1753615357,
          1816598090,
          1627664531,
          1707420964,
          295390185,
          358241886,
          404320391,
          483945776,
          43990325,
          106832002,
          186451547,
          266083308,
          932423249,
          861060070,
          1041341759,
          986742920,
          613929101,
          542559546,
          756411363,
          701822548,
          3316196985,
          3244833742,
          3425377559,
          3370778784,
          3601682597,
          3530312978,
          3744426955,
          3689838204,
          3819031489,
          3881883254,
          3928223919,
          4007849240,
          4037393693,
          4100235434,
          4180117107,
          4259748804,
          2310601993,
          2373574846,
          2151335527,
          2231098320,
          2596047829,
          2659030626,
          2470359227,
          2550115596,
          2947551409,
          2876312838,
          2788305887,
          2733848168,
          3165939309,
          3094707162,
          3040238851,
          2985771188
        ]);
        var CRC32 = function() {
          var crc = 4294967295;
          this.getCRC = function() {
            return ~crc >>> 0;
          };
          this.updateCRC = function(value) {
            crc = crc << 8 ^ crc32Lookup[(crc >>> 24 ^ value) & 255];
          };
          this.updateCRCRun = function(value, count) {
            while (count-- > 0) {
              crc = crc << 8 ^ crc32Lookup[(crc >>> 24 ^ value) & 255];
            }
          };
        };
        return CRC32;
      }();
    }
  });

  // node_modules/seek-bzip/package.json
  var require_package = __commonJS({
    "node_modules/seek-bzip/package.json"(exports, module) {
      module.exports = {
        name: "seek-bzip",
        version: "2.0.0",
        contributors: [
          "C. Scott Ananian (http://cscott.net)",
          "Eli Skeggs",
          "Kevin Kwok",
          "Rob Landley (http://landley.net)"
        ],
        description: "a pure-JavaScript Node.JS module for random-access decoding bzip2 data",
        main: "./lib/index.js",
        repository: {
          type: "git",
          url: "https://github.com/cscott/seek-bzip.git"
        },
        license: "MIT",
        bin: {
          "seek-bunzip": "./bin/seek-bunzip",
          "seek-table": "./bin/seek-bzip-table"
        },
        directories: {
          test: "test"
        },
        dependencies: {
          commander: "^6.0.0"
        },
        devDependencies: {
          fibers: "^5.0.0",
          mocha: "^8.1.0"
        },
        scripts: {
          test: "mocha"
        }
      };
    }
  });

  // node_modules/seek-bzip/lib/index.js
  var require_lib = __commonJS({
    "node_modules/seek-bzip/lib/index.js"(exports, module) {
      var BitReader = require_bitreader();
      var Stream = require_stream();
      var CRC32 = require_crc32();
      var pjson = require_package();
      var MAX_HUFCODE_BITS = 20;
      var MAX_SYMBOLS = 258;
      var SYMBOL_RUNA = 0;
      var SYMBOL_RUNB = 1;
      var MIN_GROUPS = 2;
      var MAX_GROUPS = 6;
      var GROUP_SIZE = 50;
      var WHOLEPI = "314159265359";
      var SQRTPI = "177245385090";
      var mtf = function(array, index) {
        var src = array[index], i;
        for (i = index; i > 0; i--) {
          array[i] = array[i - 1];
        }
        array[0] = src;
        return src;
      };
      var Err = {
        OK: 0,
        LAST_BLOCK: -1,
        NOT_BZIP_DATA: -2,
        UNEXPECTED_INPUT_EOF: -3,
        UNEXPECTED_OUTPUT_EOF: -4,
        DATA_ERROR: -5,
        OUT_OF_MEMORY: -6,
        OBSOLETE_INPUT: -7,
        END_OF_BLOCK: -8
      };
      var ErrorMessages = {};
      ErrorMessages[Err.LAST_BLOCK] = "Bad file checksum";
      ErrorMessages[Err.NOT_BZIP_DATA] = "Not bzip data";
      ErrorMessages[Err.UNEXPECTED_INPUT_EOF] = "Unexpected input EOF";
      ErrorMessages[Err.UNEXPECTED_OUTPUT_EOF] = "Unexpected output EOF";
      ErrorMessages[Err.DATA_ERROR] = "Data error";
      ErrorMessages[Err.OUT_OF_MEMORY] = "Out of memory";
      ErrorMessages[Err.OBSOLETE_INPUT] = "Obsolete (pre 0.9.5) bzip format not supported.";
      var _throw = function(status, optDetail) {
        var msg = ErrorMessages[status] || "unknown error";
        if (optDetail) {
          msg += ": " + optDetail;
        }
        var e = new TypeError(msg);
        e.errorCode = status;
        throw e;
      };
      var Bunzip = function(inputStream, outputStream) {
        this.writePos = this.writeCurrent = this.writeCount = 0;
        this._start_bunzip(inputStream, outputStream);
      };
      Bunzip.prototype._init_block = function() {
        var moreBlocks = this._get_next_block();
        if (!moreBlocks) {
          this.writeCount = -1;
          return false;
        }
        this.blockCRC = new CRC32();
        return true;
      };
      Bunzip.prototype._start_bunzip = function(inputStream, outputStream) {
        var buf = new Buffer(4);
        if (inputStream.read(buf, 0, 4) !== 4 || String.fromCharCode(buf[0], buf[1], buf[2]) !== "BZh")
          _throw(Err.NOT_BZIP_DATA, "bad magic");
        var level = buf[3] - 48;
        if (level < 1 || level > 9)
          _throw(Err.NOT_BZIP_DATA, "level out of range");
        this.reader = new BitReader(inputStream);
        this.dbufSize = 1e5 * level;
        this.nextoutput = 0;
        this.outputStream = outputStream;
        this.streamCRC = 0;
      };
      Bunzip.prototype._get_next_block = function() {
        var i, j, k;
        var reader = this.reader;
        var h = reader.pi();
        if (h === SQRTPI) {
          return false;
        }
        if (h !== WHOLEPI)
          _throw(Err.NOT_BZIP_DATA);
        this.targetBlockCRC = reader.read(32) >>> 0;
        this.streamCRC = (this.targetBlockCRC ^ (this.streamCRC << 1 | this.streamCRC >>> 31)) >>> 0;
        if (reader.read(1))
          _throw(Err.OBSOLETE_INPUT);
        var origPointer = reader.read(24);
        if (origPointer > this.dbufSize)
          _throw(Err.DATA_ERROR, "initial position out of bounds");
        var t = reader.read(16);
        var symToByte = new Buffer(256), symTotal = 0;
        for (i = 0; i < 16; i++) {
          if (t & 1 << 15 - i) {
            var o = i * 16;
            k = reader.read(16);
            for (j = 0; j < 16; j++)
              if (k & 1 << 15 - j)
                symToByte[symTotal++] = o + j;
          }
        }
        var groupCount = reader.read(3);
        if (groupCount < MIN_GROUPS || groupCount > MAX_GROUPS)
          _throw(Err.DATA_ERROR);
        var nSelectors = reader.read(15);
        if (nSelectors === 0)
          _throw(Err.DATA_ERROR);
        var mtfSymbol = new Buffer(256);
        for (i = 0; i < groupCount; i++)
          mtfSymbol[i] = i;
        var selectors = new Buffer(nSelectors);
        for (i = 0; i < nSelectors; i++) {
          for (j = 0; reader.read(1); j++)
            if (j >= groupCount) _throw(Err.DATA_ERROR);
          selectors[i] = mtf(mtfSymbol, j);
        }
        var symCount = symTotal + 2;
        var groups = [], hufGroup;
        for (j = 0; j < groupCount; j++) {
          var length = new Buffer(symCount), temp = new Uint16Array(MAX_HUFCODE_BITS + 1);
          t = reader.read(5);
          for (i = 0; i < symCount; i++) {
            for (; ; ) {
              if (t < 1 || t > MAX_HUFCODE_BITS) _throw(Err.DATA_ERROR);
              if (!reader.read(1))
                break;
              if (!reader.read(1))
                t++;
              else
                t--;
            }
            length[i] = t;
          }
          var minLen, maxLen;
          minLen = maxLen = length[0];
          for (i = 1; i < symCount; i++) {
            if (length[i] > maxLen)
              maxLen = length[i];
            else if (length[i] < minLen)
              minLen = length[i];
          }
          hufGroup = {};
          groups.push(hufGroup);
          hufGroup.permute = new Uint16Array(MAX_SYMBOLS);
          hufGroup.limit = new Uint32Array(MAX_HUFCODE_BITS + 2);
          hufGroup.base = new Uint32Array(MAX_HUFCODE_BITS + 1);
          hufGroup.minLen = minLen;
          hufGroup.maxLen = maxLen;
          var pp = 0;
          for (i = minLen; i <= maxLen; i++) {
            temp[i] = hufGroup.limit[i] = 0;
            for (t = 0; t < symCount; t++)
              if (length[t] === i)
                hufGroup.permute[pp++] = t;
          }
          for (i = 0; i < symCount; i++)
            temp[length[i]]++;
          pp = t = 0;
          for (i = minLen; i < maxLen; i++) {
            pp += temp[i];
            hufGroup.limit[i] = pp - 1;
            pp <<= 1;
            t += temp[i];
            hufGroup.base[i + 1] = pp - t;
          }
          hufGroup.limit[maxLen + 1] = Number.MAX_VALUE;
          hufGroup.limit[maxLen] = pp + temp[maxLen] - 1;
          hufGroup.base[minLen] = 0;
        }
        var byteCount = new Uint32Array(256);
        for (i = 0; i < 256; i++)
          mtfSymbol[i] = i;
        var runPos = 0, dbufCount = 0, selector = 0, uc;
        var dbuf = this.dbuf = new Uint32Array(this.dbufSize);
        symCount = 0;
        for (; ; ) {
          if (!symCount--) {
            symCount = GROUP_SIZE - 1;
            if (selector >= nSelectors) {
              _throw(Err.DATA_ERROR);
            }
            hufGroup = groups[selectors[selector++]];
          }
          i = hufGroup.minLen;
          j = reader.read(i);
          for (; ; i++) {
            if (i > hufGroup.maxLen) {
              _throw(Err.DATA_ERROR);
            }
            if (j <= hufGroup.limit[i])
              break;
            j = j << 1 | reader.read(1);
          }
          j -= hufGroup.base[i];
          if (j < 0 || j >= MAX_SYMBOLS) {
            _throw(Err.DATA_ERROR);
          }
          var nextSym = hufGroup.permute[j];
          if (nextSym === SYMBOL_RUNA || nextSym === SYMBOL_RUNB) {
            if (!runPos) {
              runPos = 1;
              t = 0;
            }
            if (nextSym === SYMBOL_RUNA)
              t += runPos;
            else
              t += 2 * runPos;
            runPos <<= 1;
            continue;
          }
          if (runPos) {
            runPos = 0;
            if (dbufCount + t > this.dbufSize) {
              _throw(Err.DATA_ERROR);
            }
            uc = symToByte[mtfSymbol[0]];
            byteCount[uc] += t;
            while (t--)
              dbuf[dbufCount++] = uc;
          }
          if (nextSym > symTotal)
            break;
          if (dbufCount >= this.dbufSize) {
            _throw(Err.DATA_ERROR);
          }
          i = nextSym - 1;
          uc = mtf(mtfSymbol, i);
          uc = symToByte[uc];
          byteCount[uc]++;
          dbuf[dbufCount++] = uc;
        }
        if (origPointer < 0 || origPointer >= dbufCount) {
          _throw(Err.DATA_ERROR);
        }
        j = 0;
        for (i = 0; i < 256; i++) {
          k = j + byteCount[i];
          byteCount[i] = j;
          j = k;
        }
        for (i = 0; i < dbufCount; i++) {
          uc = dbuf[i] & 255;
          dbuf[byteCount[uc]] |= i << 8;
          byteCount[uc]++;
        }
        var pos = 0, current = 0, run = 0;
        if (dbufCount) {
          pos = dbuf[origPointer];
          current = pos & 255;
          pos >>= 8;
          run = -1;
        }
        this.writePos = pos;
        this.writeCurrent = current;
        this.writeCount = dbufCount;
        this.writeRun = run;
        return true;
      };
      Bunzip.prototype._read_bunzip = function(outputBuffer, len) {
        var copies, previous, outbyte;
        if (this.writeCount < 0) {
          return 0;
        }
        var gotcount = 0;
        var dbuf = this.dbuf, pos = this.writePos, current = this.writeCurrent;
        var dbufCount = this.writeCount, outputsize = this.outputsize;
        var run = this.writeRun;
        while (dbufCount) {
          dbufCount--;
          previous = current;
          pos = dbuf[pos];
          current = pos & 255;
          pos >>= 8;
          if (run++ === 3) {
            copies = current;
            outbyte = previous;
            current = -1;
          } else {
            copies = 1;
            outbyte = current;
          }
          this.blockCRC.updateCRCRun(outbyte, copies);
          while (copies--) {
            this.outputStream.writeByte(outbyte);
            this.nextoutput++;
          }
          if (current != previous)
            run = 0;
        }
        this.writeCount = dbufCount;
        if (this.blockCRC.getCRC() !== this.targetBlockCRC) {
          _throw(Err.DATA_ERROR, "Bad block CRC (got " + this.blockCRC.getCRC().toString(16) + " expected " + this.targetBlockCRC.toString(16) + ")");
        }
        return this.nextoutput;
      };
      var coerceInputStream = function(input) {
        if ("readByte" in input) {
          return input;
        }
        var inputStream = new Stream();
        inputStream.pos = 0;
        inputStream.readByte = function() {
          return input[this.pos++];
        };
        inputStream.seek = function(pos) {
          this.pos = pos;
        };
        inputStream.eof = function() {
          return this.pos >= input.length;
        };
        return inputStream;
      };
      var coerceOutputStream = function(output) {
        var outputStream = new Stream();
        var resizeOk = true;
        if (output) {
          if (typeof output === "number") {
            outputStream.buffer = new Buffer(output);
            resizeOk = false;
          } else if ("writeByte" in output) {
            return output;
          } else {
            outputStream.buffer = output;
            resizeOk = false;
          }
        } else {
          outputStream.buffer = new Buffer(16384);
        }
        outputStream.pos = 0;
        outputStream.writeByte = function(_byte) {
          if (resizeOk && this.pos >= this.buffer.length) {
            var newBuffer = new Buffer(this.buffer.length * 2);
            this.buffer.copy(newBuffer);
            this.buffer = newBuffer;
          }
          this.buffer[this.pos++] = _byte;
        };
        outputStream.getBuffer = function() {
          if (this.pos !== this.buffer.length) {
            if (!resizeOk)
              throw new TypeError("outputsize does not match decoded input");
            var newBuffer = new Buffer(this.pos);
            this.buffer.copy(newBuffer, 0, 0, this.pos);
            this.buffer = newBuffer;
          }
          return this.buffer;
        };
        outputStream._coerced = true;
        return outputStream;
      };
      Bunzip.Err = Err;
      Bunzip.decode = function(input, output, multistream) {
        var inputStream = coerceInputStream(input);
        var outputStream = coerceOutputStream(output);
        var bz = new Bunzip(inputStream, outputStream);
        while (true) {
          if ("eof" in inputStream && inputStream.eof()) break;
          if (bz._init_block()) {
            bz._read_bunzip();
          } else {
            var targetStreamCRC = bz.reader.read(32) >>> 0;
            if (targetStreamCRC !== bz.streamCRC) {
              _throw(Err.DATA_ERROR, "Bad stream CRC (got " + bz.streamCRC.toString(16) + " expected " + targetStreamCRC.toString(16) + ")");
            }
            if (multistream && "eof" in inputStream && !inputStream.eof()) {
              bz._start_bunzip(inputStream, outputStream);
            } else break;
          }
        }
        if ("getBuffer" in outputStream)
          return outputStream.getBuffer();
      };
      Bunzip.decodeBlock = function(input, pos, output) {
        var inputStream = coerceInputStream(input);
        var outputStream = coerceOutputStream(output);
        var bz = new Bunzip(inputStream, outputStream);
        bz.reader.seek(pos);
        var moreBlocks = bz._get_next_block();
        if (moreBlocks) {
          bz.blockCRC = new CRC32();
          bz.writeCopies = 0;
          bz._read_bunzip();
        }
        if ("getBuffer" in outputStream)
          return outputStream.getBuffer();
      };
      Bunzip.table = function(input, callback, multistream) {
        var inputStream = new Stream();
        inputStream.delegate = coerceInputStream(input);
        inputStream.pos = 0;
        inputStream.readByte = function() {
          this.pos++;
          return this.delegate.readByte();
        };
        if (inputStream.delegate.eof) {
          inputStream.eof = inputStream.delegate.eof.bind(inputStream.delegate);
        }
        var outputStream = new Stream();
        outputStream.pos = 0;
        outputStream.writeByte = function() {
          this.pos++;
        };
        var bz = new Bunzip(inputStream, outputStream);
        var blockSize = bz.dbufSize;
        while (true) {
          if ("eof" in inputStream && inputStream.eof()) break;
          var position = inputStream.pos * 8 + bz.reader.bitOffset;
          if (bz.reader.hasByte) {
            position -= 8;
          }
          if (bz._init_block()) {
            var start = outputStream.pos;
            bz._read_bunzip();
            callback(position, outputStream.pos - start);
          } else {
            var crc = bz.reader.read(32);
            if (multistream && "eof" in inputStream && !inputStream.eof()) {
              bz._start_bunzip(inputStream, outputStream);
              console.assert(
                bz.dbufSize === blockSize,
                "shouldn't change block size within multistream file"
              );
            } else break;
          }
        }
      };
      Bunzip.Stream = Stream;
      Bunzip.version = pjson.version;
      Bunzip.license = pjson.license;
      module.exports = Bunzip;
    }
  });

  // src/zlib-browser-shim.js
  var zlib_browser_shim_exports = {};
  __export(zlib_browser_shim_exports, {
    gunzipSync: () => gunzipSync
  });
  function gunzipSync() {
    throw new Error("Gzip-compressed Level II volumes are not supported in the browser");
  }
  var init_zlib_browser_shim = __esm({
    "src/zlib-browser-shim.js"() {
    }
  });

  // node_modules/nexrad-level-2-data/src/gzipdecompress.js
  var require_gzipdecompress = __commonJS({
    "node_modules/nexrad-level-2-data/src/gzipdecompress.js"(exports, module) {
      var zlib = (init_zlib_browser_shim(), __toCommonJS(zlib_browser_shim_exports));
      var { RandomAccessFile, BIG_ENDIAN } = require_RandomAccessFile();
      module.exports = (raf) => {
        const data = zlib.gunzipSync(raf.buffer);
        return new RandomAccessFile(data, BIG_ENDIAN);
      };
    }
  });

  // node_modules/nexrad-level-2-data/src/decompress.js
  var require_decompress = __commonJS({
    "node_modules/nexrad-level-2-data/src/decompress.js"(exports, module) {
      var bzip = require_lib();
      var gzipDecompress = require_gzipdecompress();
      var { RandomAccessFile, BIG_ENDIAN } = require_RandomAccessFile();
      var { FILE_HEADER_SIZE } = require_constants();
      var decompress = (raf) => {
        const gZipHeader = raf.read(2);
        raf.seek(0);
        if (gZipHeader[0] === 31 && gZipHeader[1] === 139) return gzipDecompress(raf);
        if (raf.getLength() <= FILE_HEADER_SIZE) return raf;
        let headerSize = 0;
        const compressionRecord = readCompressionHeader(raf);
        if (compressionRecord.header !== "BZh") {
          raf.seek(0);
          raf.skip(FILE_HEADER_SIZE);
          headerSize = FILE_HEADER_SIZE;
          const fullCompressionRecord = readCompressionHeader(raf);
          if (fullCompressionRecord.header !== "BZh") {
            raf.seek(0);
            return raf;
          }
        }
        const positions = [];
        raf.seek(raf.getPos() - 8);
        while (raf.getPos() < raf.getLength()) {
          const size = Math.abs(raf.readSInt4());
          positions.push({
            pos: raf.getPos(),
            size
          });
          raf.seek(raf.getPos() + size);
        }
        const outBuffers = [raf.buffer.slice(0, headerSize)];
        positions.forEach((block) => {
          const compressed = raf.buffer.slice(block.pos, block.pos + block.size);
          const output = bzip.decodeBlock(compressed, 32);
          outBuffers.push(output);
        });
        const outBuffer = Buffer.concat(outBuffers);
        return new RandomAccessFile(outBuffer, BIG_ENDIAN);
      };
      var readCompressionHeader = (raf) => ({
        size: raf.readInt(),
        header: raf.readString(3),
        block_size: raf.readString(1)
      });
      module.exports = decompress;
    }
  });

  // node_modules/nexrad-level-2-data/src/parseheader.js
  var require_parseheader = __commonJS({
    "node_modules/nexrad-level-2-data/src/parseheader.js"(exports, module) {
      var { FILE_HEADER_SIZE } = require_constants();
      var parse = (raf) => {
        const identifier = raf.readString(6);
        if (identifier === "AR2V00" || identifier === "ARCHIV") {
          const header = {};
          header.version = raf.readString(2);
          raf.skip(".001".length);
          header.modified_julian_date = raf.readInt();
          header.milliseconds = raf.readInt();
          header.ICAO = raf.readString(4);
          raf.seek(0);
          header.raw = raf.read(FILE_HEADER_SIZE);
          return header;
        }
        raf.seek(0);
        return {};
      };
      module.exports = parse;
    }
  });

  // node_modules/nexrad-level-2-data/src/parsedata.js
  var require_parsedata = __commonJS({
    "node_modules/nexrad-level-2-data/src/parsedata.js"(exports, module) {
      var { RandomAccessFile, BIG_ENDIAN } = require_RandomAccessFile();
      var { Level2Record } = require_Level2Record();
      var { RADAR_DATA_SIZE } = require_constants();
      var decompress = require_decompress();
      var parseHeader = require_parseheader();
      var parseData = (file, options) => {
        const rafCompressed = new RandomAccessFile(file, BIG_ENDIAN);
        const data = [];
        const raf = decompress(rafCompressed);
        const header = parseHeader(raf);
        let messageOffset31 = 0;
        let recordNumber = 0;
        let r;
        let vcp = {};
        let hasGaps = false;
        let isTruncated = false;
        if (raf.getPos() < raf.getLength()) {
          do {
            try {
              r = Level2Record(raf, recordNumber, messageOffset31, header, options);
              recordNumber += 1;
            } catch (e) {
              options.logger.warn(e);
              isTruncated = true;
              r = { finished: true };
            }
            if (!r.finished) {
              if (r.message_type === 31) {
                const messageSize = r.actual_size ?? r.message_size;
                hasGaps = true;
                messageOffset31 += messageSize * 2 + 12 - RADAR_DATA_SIZE;
              }
              if ([1, 5, 7, 31].includes(r.message_type)) {
                if (r?.record?.reflect || r?.record?.velocity || r?.record?.spectrum || r?.record?.zdr || r?.record?.phi || r?.record?.rho) data.push(r);
                if ([5, 7].includes(r.message_type)) vcp = r;
              }
            }
          } while (!r.finished);
        }
        return {
          data: groupAndSortScans(data),
          header,
          vcp,
          isTruncated,
          hasGaps
        };
      };
      var groupAndSortScans = (scans) => {
        const groups = [];
        scans.forEach((scan) => {
          const { elevation_number: elevationNumber } = scan.record;
          if (groups[elevationNumber]) {
            groups[elevationNumber].push(scan);
          } else {
            groups[elevationNumber] = [scan];
          }
        });
        return groups;
      };
      module.exports = parseData;
    }
  });

  // node_modules/nexrad-level-2-data/src/combinedata.js
  var require_combinedata = __commonJS({
    "node_modules/nexrad-level-2-data/src/combinedata.js"(exports, module) {
      var combine = (...args) => {
        const rawData = args.flat(50);
        const output = {
          options: {},
          vcp: {},
          header: {},
          data: []
        };
        rawData.forEach((raw) => {
          output.elevation = raw.elevation ?? output.elevation;
          output.hasGaps = output.hasGaps || raw.hasGaps;
          output.isTruncated = output.isTruncated || raw.isTruncated;
          if (raw.options) output.options = { ...output.options, ...raw.options };
          if (raw.vcp) output.vcp = { ...output.vcp, ...raw.vcp };
          if (raw.header) output.header = { ...output.header, ...raw.header };
          if (raw.data) {
            raw.listElevations().forEach((elev) => {
              if (output.data[elev] === void 0) output.data[elev] = [];
              output.data[elev].push(...raw.data[elev]);
            });
          }
        });
        return output;
      };
      module.exports = combine;
    }
  });

  // node_modules/nexrad-level-2-data/src/index.js
  var require_src = __commonJS({
    "node_modules/nexrad-level-2-data/src/index.js"(exports, module) {
      var parseData = require_parsedata();
      var combineData = require_combinedata();
      var Level2Radar2 = class _Level2Radar {
        /**
         * Parses a Nexrad Level 2 Data archive or chunk. Provide `rawData` as a `Buffer`. Returns an object formatted per the [ICD FOR RDA/RPG - Build RDA 20.0/RPG 20.0 (PDF)](https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/2620002U.pdf), or as close as can reasonably be represented in a javascript object. Additional data accessors are provided in the returned object to pull out typical data in a format ready for processing.
         * Radar data is accessed through the get* methods
         *
         * @param {Buffer|Level2Radar} file Buffer with Nexrad Level 2 data. Alternatively a Level2Radar object, typically used internally when combining data.
         * @param {ParserOptions} [options] Parser options
         */
        constructor(file, options) {
          this.elevation = 1;
          if (file instanceof Buffer) {
            this.options = combineOptions(options);
            const {
              data,
              header,
              vcp,
              hasGaps,
              isTruncated
            } = parseData(file, this.options);
            this.data = data;
            this.header = header;
            this.vcp = vcp;
            this.hasGaps = hasGaps;
            this.isTruncated = isTruncated;
          } else if (typeof file === "object" && (file.data && file.header && file.vcp)) {
            this.data = file.data;
            this.elevation = file.elevation;
            this.header = file.header;
            this.options = file.options;
            this.vcp = file.vcp;
            this.hasGaps = file.hasGaps;
            this.isTruncated = file.isTruncated;
          } else {
            throw new Error("Unknown data provided");
          }
        }
        /**
         * Sets the elevation in use for get* methods
         *
         * @param {number} elevation Selected elevation number
         * @category Configuration
         */
        setElevation(elevation) {
          this.elevation = elevation;
        }
        /**
         * Returns an single azimuth value or array of azimuth values for the current elevation and scan (or all scans if not provided).
         * The order of azimuths in the returned array matches the order of the data in other get* functions.
         *
         * @param {number} [scan] Selected scan
         * @category Data
         * @returns {number|number[]} Azimuth angle
         */
        getAzimuth(scan) {
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getAzimuth invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            this._checkData();
            if (this?.data?.[this.elevation] === void 0) throw new Error(`getAzimuth invalid elevation selected: ${this.elevation}`);
            if (this?.data?.[this.elevation]?.[scan] === void 0) throw new Error(`getAzimuth invalid scan selected: ${scan}`);
            if (this?.data?.[this.elevation]?.[scan]?.record?.azimuth === void 0) throw new Error(`getAzimuth no data for elevation: ${this.elevation}, scan: ${scan}`);
            return this.data[this.elevation][scan].record.azimuth;
          }
          return this.data[this.elevation].map((i) => i.record.azimuth);
        }
        /**
         * Return the number of scans in the current elevation
         *
         * @category Metadata
         * @returns {number}
         */
        getScans() {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getScans no data for elevation: ${this.elevation}`);
          return this.data[this.elevation].length;
        }
        /**
         * Return message_header information for all scans or a specific scan for the selected elevation
         *
         * @category Metadata
         * @param {number} [scan] Selected scan, omit to return all scans for this elevation
         * @returns {MessageHeader}
         */
        getHeader(scan) {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getHeader invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            if (this?.data?.[this.elevation]?.[scan] === void 0) throw new Error(`getHeader invalid scan selected: ${scan}`);
            if (this?.data?.[this.elevation]?.[scan]?.record === void 0) throw new Error(`getHeader no data for elevation: ${this.elevation}, scan: ${scan}`);
            return this.data[this.elevation][scan].record;
          }
          return this.data[this.elevation].map((i) => i.record);
        }
        /**
         * Returns an Object of radar reflectivity data for the current elevation and scan (or all scans if not provided)
         *
         * @category Data
         * @param {number} [scan] Selected scan or null for all scans in elevation
         * @returns {HighResData|HighResData[]} Scan's high res reflectivity data, or an array of the data.
         */
        getHighresReflectivity(scan) {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getHighresReflectivity invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            if (this?.data?.[this.elevation]?.[scan] === void 0) throw new Error(`getHighresReflectivity invalid scan selected: ${scan}`);
            if (this?.data?.[this.elevation]?.[scan]?.record?.reflect === void 0) throw new Error(`getHighresReflectivity no data for elevation: ${this.elevation}, scan: ${scan}`);
            return this.data[this.elevation][scan].record.reflect;
          }
          return this.data[this.elevation].map((i) => i.record.reflect);
        }
        /**
         * Returns an Object of radar velocity data for the current elevation and scan (or all scans if not provided)
         *
         * @category Data
         * @param {number} [scan] Selected scan, or null for all scans in this elevation
         * @returns {HighResData|HighResData[]} Scan's high res velocity data, or an array of the data.
         */
        getHighresVelocity(scan) {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getHighresVelocity invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            if (this?.data?.[this.elevation]?.[scan] === void 0) throw new Error(`getHighresVelocity invalid scan selected: ${scan}`);
            if (this?.data?.[this.elevation]?.[scan]?.record?.reflect === void 0) throw new Error(`getHighresVelocity no data for elevation: ${this.elevation}, scan: ${scan}`);
            return this.data[this.elevation][scan].record.velocity;
          }
          return this.data[this.elevation].map((i) => i.record.velocity);
        }
        /**
         * Returns an Object of radar spectrum data for the current elevation and scan (or all scans if not provided)
         *
         * @category Data
         * @param {number} [scan] Selected scan, or null for all scans in this elevation
         * @returns {HighResData|HighResData[]} Scan's high res spectrum data, or an array of the data.
         */
        getHighresSpectrum(scan) {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getHighresSpectrum invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            if (this?.data?.[this.elevation]?.[scan] === void 0) throw new Error(`getHighresSpectrum invalid scan selected: ${scan}`);
            if (this?.data?.[this.elevation]?.[scan]?.record?.spectrum === void 0) throw new Error(`getHighresSpectrum no data for elevation: ${this.elevation}, scan: ${scan}`);
            return this.data[this.elevation][scan].record.spectrum;
          }
          return this.data[this.elevation].map((i) => i.record.spectrum);
        }
        /**
         * Returns an Object of radar differential reflectivity data for the current elevation and scan (or all scans if not provided)
         *
         * @category Data
         * @param {number} [scan] Selected scan or null for all scans in elevation
         * @returns {HighResData|HighResData[]} Scan's high res differential reflectivity data, or an array of the data.
         */
        getHighresDiffReflectivity(scan) {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getHighresDiffReflectivity invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            if (this?.data?.[this.elevation]?.[this.scan] === void 0) throw new Error(`getHighresDiffReflectivity invalid scan selected: ${this.scan}`);
            if (this?.data?.[this.elevation]?.[this.scan]?.record?.zdr === void 0) throw new Error(`getHighresDiffReflectivity no data for elevation: ${this.elevation}, scan: ${this.scan}`);
            return this.data[this.elevation][this.scan].record.zdr;
          }
          return this.data[this.elevation].map((i) => i.record.zdr);
        }
        /**
         * Returns an Object of radar differential phase data for the current elevation and scan (or all scans if not provided)
         *
         * @category Data
         * @param {number} [scan] Selected scan or null for all scans in elevation
         * @returns {HighResData|HighResData[]} Scan's high res differential phase data, or an array of the data.
         */
        getHighresDiffPhase(scan) {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getHighresDiffPhase invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            if (this?.data?.[this.elevation]?.[this.scan] === void 0) throw new Error(`getHighresDiffPhase invalid scan selected: ${this.scan}`);
            if (this?.data?.[this.elevation]?.[this.scan]?.record?.phi === void 0) throw new Error(`getHighresDiffPhase no data for elevation: ${this.elevation}, scan: ${this.scan}`);
            return this.data[this.elevation][this.scan].record.phi;
          }
          return this.data[this.elevation].map((i) => i.record.phi);
        }
        /**
         * Returns an Object of radar correlation coefficient data for the current elevation and scan (or all scans if not provided)
         *
         * @category Data
         * @param {number} [scan] Selected scan or null for all scans in elevation
         * @returns {HighResData|HighResData[]} Scan's high res correlation coefficient data, or an array of the data.
         */
        getHighresCorrelationCoefficient(scan) {
          this._checkData();
          if (this?.data?.[this.elevation] === void 0) throw new Error(`getHighresCorrelationCoefficient invalid elevation selected: ${this.elevation}`);
          if (scan !== void 0) {
            if (this?.data?.[this.elevation]?.[this.scan] === void 0) throw new Error(`getHighresCorrelationCoefficient invalid scan selected: ${this.scan}`);
            if (this?.data?.[this.elevation]?.[this.scan]?.record?.rho === void 0) throw new Error(`getHighresCorrelationCoefficient no data for elevation: ${this.elevation}, scan: ${this.scan}`);
            return this.data[this.elevation][this.scan].record.rho;
          }
          return this.data[this.elevation].map((i) => i.record.rho);
        }
        /**
         * List all available elevations
         *
         * @category Metadata
         * @returns {number[]}
         */
        listElevations() {
          return Object.keys(this.data).map((key) => +key);
        }
        _checkData() {
          if (this.data.length === 0) throw new Error("No data found in file");
        }
        /**
         * Combines the data returned by multiple runs of the Level2Data constructor. This is typically used in "chunks" mode to combine all azimuths from one revolution into a single data set. data can be provided as an array of Level2Radar objects, individual Level2Data parameters or any combination thereof.
         *
         * The combine function blindly combines data and the right-most argument will overwrite any previously provided data. Individual azimuths located in Level2Radar.data[] will be appended. It is up to the calling routine to properly manage the parsing of related chunks and send it in to this routine.
         *
         * @param  {...Level2Radar} data Data to combine
         * @returns {Level2Radar} Combined data
         */
        static combineData(...data) {
          const combined = combineData(data);
          return new _Level2Radar(combined);
        }
      };
      var combineOptions = (newOptions) => {
        let logger = newOptions?.logger ?? console;
        if (logger === false) logger = nullLogger;
        return {
          ...newOptions,
          logger
        };
      };
      var nullLogger = {
        log: () => {
        },
        error: () => {
        },
        warn: () => {
        }
      };
      module.exports.Level2Radar = Level2Radar2;
    }
  });

  // src/level2-worker.js
  var import_buffer = __toESM(require_buffer(), 1);
  var import_nexrad_level_2_data = __toESM(require_src(), 1);

  // src/level2-analysis.js
  function circularMeanDegrees(left, right) {
    const leftRadians = left * Math.PI / 180;
    const rightRadians = right * Math.PI / 180;
    return (Math.atan2(
      Math.sin(leftRadians) + Math.sin(rightRadians),
      Math.cos(leftRadians) + Math.cos(rightRadians)
    ) * 180 / Math.PI + 360) % 360;
  }
  function destinationPoint(latitude, longitude, bearing, distanceKm) {
    const angularDistance = distanceKm / 6371;
    const bearingRadians = bearing * Math.PI / 180;
    const latitudeRadians = latitude * Math.PI / 180;
    const longitudeRadians = longitude * Math.PI / 180;
    const targetLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) + Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearingRadians)
    );
    const targetLongitude = longitudeRadians + Math.atan2(
      Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
      Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(targetLatitude)
    );
    return {
      latitude: targetLatitude * 180 / Math.PI,
      longitude: (targetLongitude * 180 / Math.PI + 540) % 360 - 180
    };
  }
  function pointDistanceKm(left, right) {
    const latitudeDelta = (right.latitude - left.latitude) * Math.PI / 180;
    const longitudeDelta = (right.longitude - left.longitude) * Math.PI / 180;
    const leftLatitude = left.latitude * Math.PI / 180;
    const rightLatitude = right.latitude * Math.PI / 180;
    const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }
  function momentValueAtRange(moment, rangeKm) {
    if (!moment?.moment_data?.length) return null;
    const gate = Math.round((rangeKm - moment.first_gate) / moment.gate_size);
    const value = moment.moment_data[gate];
    return Number.isFinite(value) ? value : null;
  }
  function detectVelocityCoupletsFromSweep(records) {
    if (!Array.isArray(records) || records.length < 2) return [];
    const sortedRecords = [...records].sort((left, right) => left.azimuth - right.azimuth);
    const volume = sortedRecords[0]?.volume;
    if (!Number.isFinite(volume?.latitude) || !Number.isFinite(volume?.longitude)) return [];
    const candidates = [];
    sortedRecords.forEach((record, index) => {
      const nextRecord = sortedRecords[(index + 1) % sortedRecords.length];
      const angularGap = (nextRecord.azimuth - record.azimuth + 360) % 360;
      if (angularGap <= 0 || angularGap > 1.5) return;
      const velocity = record.velocity;
      const nextVelocity = nextRecord.velocity;
      if (!velocity || !nextVelocity) return;
      const firstRange = Math.max(5, velocity.first_gate, nextVelocity.first_gate);
      const lastRange = Math.min(
        150,
        velocity.first_gate + velocity.gate_count * velocity.gate_size,
        nextVelocity.first_gate + nextVelocity.gate_count * nextVelocity.gate_size
      );
      for (let rangeKm = firstRange; rangeKm <= lastRange; rangeKm += velocity.gate_size) {
        const leftVelocity = momentValueAtRange(velocity, rangeKm);
        const rightVelocity = momentValueAtRange(nextVelocity, rangeKm);
        if (leftVelocity === null || rightVelocity === null || leftVelocity < -64 || leftVelocity > 64 || rightVelocity < -64 || rightVelocity > 64 || Math.sign(leftVelocity) === Math.sign(rightVelocity) || Math.min(Math.abs(leftVelocity), Math.abs(rightVelocity)) < 10) continue;
        const shear = Math.abs(leftVelocity - rightVelocity);
        if (shear < 35) continue;
        const reflectivity = Math.max(
          momentValueAtRange(record.reflect, rangeKm) ?? -Infinity,
          momentValueAtRange(nextRecord.reflect, rangeKm) ?? -Infinity
        );
        if (reflectivity < 20) continue;
        const hasAdjacentSupport = [-velocity.gate_size, velocity.gate_size].some((offset) => {
          const adjacentRange = rangeKm + offset;
          const adjacentLeft = momentValueAtRange(velocity, adjacentRange);
          const adjacentRight = momentValueAtRange(nextVelocity, adjacentRange);
          if (adjacentLeft === null || adjacentRight === null || adjacentLeft < -64 || adjacentLeft > 64 || adjacentRight < -64 || adjacentRight > 64 || Math.sign(adjacentLeft) === Math.sign(adjacentRight) || Math.min(Math.abs(adjacentLeft), Math.abs(adjacentRight)) < 10 || Math.abs(adjacentLeft - adjacentRight) < 30) return false;
          return Math.max(
            momentValueAtRange(record.reflect, adjacentRange) ?? -Infinity,
            momentValueAtRange(nextRecord.reflect, adjacentRange) ?? -Infinity
          ) >= 20;
        });
        if (!hasAdjacentSupport) continue;
        const bearing = circularMeanDegrees(record.azimuth, nextRecord.azimuth);
        candidates.push({
          ...destinationPoint(volume.latitude, volume.longitude, bearing, rangeKm),
          shear,
          rangeKm,
          bearing,
          reflectivity
        });
      }
    });
    const clusters = [];
    candidates.sort((left, right) => right.shear - left.shear).some((candidate) => {
      if (clusters.every((cluster) => pointDistanceKm(cluster, candidate) >= 8)) {
        clusters.push(candidate);
      }
      return clusters.length >= 20;
    });
    return clusters.map((candidate) => ({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      shearMs: Math.round(candidate.shear * 10) / 10,
      rangeKm: Math.round(candidate.rangeKm * 10) / 10,
      reflectivityDbz: Math.round(candidate.reflectivity),
      bearing: Math.round(candidate.bearing)
    }));
  }

  // src/level2-worker.js
  globalThis.Buffer = import_buffer.Buffer;
  var { Level2Radar } = import_nexrad_level_2_data.default;
  var CANVAS_SIZE = 900;
  var PRODUCT_FIELDS = Object.freeze({
    reflectivity: "reflect",
    velocity: "velocity",
    differentialReflectivity: "zdr",
    correlationCoefficient: "rho"
  });
  var radar = null;
  var coupletCache = null;
  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }
  function interpolateColor(stops, value) {
    if (!Number.isFinite(value)) return [0, 0, 0, 0];
    for (let index = 1; index < stops.length; index += 1) {
      const [upperValue, upperColor] = stops[index];
      const [lowerValue, lowerColor] = stops[index - 1];
      if (value <= upperValue) {
        const ratio = clamp((value - lowerValue) / (upperValue - lowerValue), 0, 1);
        return [
          Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * ratio),
          Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * ratio),
          Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * ratio),
          220
        ];
      }
    }
    const color = stops.at(-1)[1];
    return [color[0], color[1], color[2], 220];
  }
  var REFLECTIVITY_STOPS = [
    [5, [0, 0, 150]],
    [15, [0, 100, 255]],
    [25, [0, 180, 255]],
    [35, [0, 200, 0]],
    [45, [255, 255, 0]],
    [55, [255, 136, 0]],
    [65, [255, 0, 0]],
    [75, [255, 0, 255]]
  ];
  var VELOCITY_STOPS = [
    [-64, [0, 0, 170]],
    [-40, [0, 85, 255]],
    [-15, [0, 190, 255]],
    [-5, [220, 255, 255]],
    [0, [255, 255, 255]],
    [5, [255, 245, 210]],
    [15, [255, 170, 0]],
    [40, [255, 85, 0]],
    [64, [220, 0, 0]]
  ];
  var ZDR_STOPS = [
    [-4, [45, 45, 160]],
    [-1, [0, 150, 255]],
    [0, [230, 230, 230]],
    [1, [255, 255, 0]],
    [3, [255, 130, 0]],
    [6, [210, 0, 100]],
    [8, [120, 0, 130]]
  ];
  var RHO_STOPS = [
    [0.65, [80, 30, 120]],
    [0.8, [220, 0, 140]],
    [0.9, [255, 100, 0]],
    [0.95, [255, 220, 0]],
    [0.98, [80, 210, 80]],
    [1, [0, 170, 255]],
    [1.05, [30, 60, 180]]
  ];
  function productColor(product, value) {
    if (product === "reflectivity") {
      return value < 5 || value > 100 ? [0, 0, 0, 0] : interpolateColor(REFLECTIVITY_STOPS, value);
    }
    if (product === "velocity") {
      return value < -64 || value > 64 ? [0, 0, 0, 0] : interpolateColor(VELOCITY_STOPS, value);
    }
    if (product === "differentialReflectivity") {
      return value < -4 || value > 8 ? [0, 0, 0, 0] : interpolateColor(ZDR_STOPS, value);
    }
    return value < 0.65 || value > 1.05 ? [0, 0, 0, 0] : interpolateColor(RHO_STOPS, value);
  }
  function selectSweep(product) {
    const field = PRODUCT_FIELDS[product];
    const candidates = radar.listElevations().map((elevation) => {
      const records = radar.data[elevation]?.map((item) => item.record) || [];
      const productRecords = records.filter((record) => record[field]?.moment_data?.length);
      if (!productRecords.length) return null;
      const angle = Math.min(...productRecords.map((record) => Number(record.elevation_angle)));
      return { elevation, records: productRecords, angle };
    }).filter(Boolean).sort((left, right) => left.angle - right.angle);
    if (!candidates.length) throw new Error(`This volume does not contain ${product}`);
    return candidates[0];
  }
  function detectVelocityCouplets() {
    if (coupletCache) return coupletCache;
    let sweep;
    try {
      sweep = selectSweep("velocity");
    } catch {
      coupletCache = [];
      return coupletCache;
    }
    coupletCache = detectVelocityCoupletsFromSweep(sweep.records);
    return coupletCache;
  }
  function renderProduct(product) {
    if (!radar) throw new Error("No Level II volume is loaded");
    const field = PRODUCT_FIELDS[product];
    if (!field) throw new Error(`Unsupported Level II product: ${product}`);
    const sweep = selectSweep(product);
    const firstRecord = sweep.records[0];
    const volume = firstRecord.volume;
    const moments = sweep.records.map((record) => record[field]);
    const maxRangeKm = Math.min(
      460,
      Math.max(...moments.map((moment) => moment.first_gate + moment.gate_count * moment.gate_size))
    );
    const radialLookup = new Array(720);
    sweep.records.forEach((record) => {
      const index = Math.round(record.azimuth * 2) % 720;
      radialLookup[index] = record[field];
    });
    let lastSeen = null;
    for (let pass = 0; pass < 2; pass += 1) {
      for (let index = 0; index < radialLookup.length; index += 1) {
        if (radialLookup[index]) lastSeen = radialLookup[index];
        else if (lastSeen) radialLookup[index] = lastSeen;
      }
      radialLookup.reverse();
    }
    const canvas = new OffscreenCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const context = canvas.getContext("2d", { alpha: true });
    const image = context.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const center = CANVAS_SIZE / 2;
    const kmPerPixel = maxRangeKm * 2 / CANVAS_SIZE;
    for (let y = 0; y < CANVAS_SIZE; y += 1) {
      const dy = y + 0.5 - center;
      for (let x = 0; x < CANVAS_SIZE; x += 1) {
        const dx = x + 0.5 - center;
        const rangeKm = Math.hypot(dx, dy) * kmPerPixel;
        if (rangeKm > maxRangeKm) continue;
        const azimuth = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        const moment = radialLookup[Math.round(azimuth * 2) % 720];
        if (!moment) continue;
        const gate = Math.floor((rangeKm - moment.first_gate) / moment.gate_size);
        if (gate < 0 || gate >= moment.moment_data.length) continue;
        const color = productColor(product, moment.moment_data[gate]);
        if (!color[3]) continue;
        const offset = (y * CANVAS_SIZE + x) * 4;
        image.data[offset] = color[0];
        image.data[offset + 1] = color[1];
        image.data[offset + 2] = color[2];
        image.data[offset + 3] = color[3];
      }
    }
    context.putImageData(image, 0, 0);
    return {
      bitmap: canvas.transferToImageBitmap(),
      latitude: Number(volume.latitude),
      longitude: Number(volume.longitude),
      maxRangeKm,
      elevationAngle: sweep.angle,
      site: radar.header.ICAO,
      hasGaps: radar.hasGaps,
      isTruncated: radar.isTruncated,
      couplets: detectVelocityCouplets()
    };
  }
  self.addEventListener("message", (event) => {
    const { id, type, buffer, product } = event.data || {};
    try {
      if (type === "load") {
        radar = new Level2Radar(import_buffer.Buffer.from(buffer), { logger: false });
        coupletCache = null;
        self.postMessage({ id, type: "loaded", site: radar.header.ICAO });
        return;
      }
      if (type === "render") {
        const result = renderProduct(product);
        self.postMessage({ id, type: "rendered", ...result }, [result.bitmap]);
        return;
      }
      throw new Error("Unknown Level II worker request");
    } catch (error) {
      self.postMessage({ id, type: "error", message: error?.message || "Level II processing failed" });
    }
  });
})();
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)
*/
