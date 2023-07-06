const crypto = require('crypto');
const fs = require('fs/promises');

/**
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

const memUsage = () => {
  const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
  const memoryData = process.memoryUsage();
  const memoryUsage = {
    rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
    heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
    heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
    external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
  };

  console.log(memoryUsage);
}

class RegistryKey {
  /**
   *
   *  @param {Object} operatorKey
   *  @param {number} operatorKey.index
   *  @param {string} operatorKey.operatorIndex
   *  @param {string} operatorKey.key
   *  @param {string} operatorKey.depositSignature
   *  @param {boolean} operatorKey.used
   */
  constructor(operatorKey) {
    this.index = operatorKey.index;
    this.operatorIndex = operatorKey.operatorIndex;
    this.key = operatorKey.key;
    this.depositSignature = operatorKey.depositSignature;
    this.used = operatorKey.used;
  }
}

class RegistryKeyBuffer {
  /**
   *
   *  @param {Object} operatorKey
   *  @param {number} operatorKey.index
   *  @param {string} operatorKey.operatorIndex
   *  @param {Buffer} operatorKey.key
   *  @param {Buffer} operatorKey.depositSignature
   *  @param {boolean} operatorKey.used
   */
  constructor(operatorKey) {
    this.index = operatorKey.index;
    this.operatorIndex = operatorKey.operatorIndex;
    this.key = operatorKey.key;
    this.depositSignature = operatorKey.depositSignature;
    this.used = operatorKey.used;
  }
}

class RegistryKeyObj {
  /**
   *
   *  @param {Object} operatorKey
   *  @param {number} operatorKey.index
   *  @param {string} operatorKey.operatorIndex
   *  @param {Key} operatorKey.key
   *  @param {DepositSignature} operatorKey.depositSignature
   *  @param {boolean} operatorKey.used
   */
  constructor(operatorKey) {
    this.index = operatorKey.index;
    this.operatorIndex = operatorKey.operatorIndex;
    this.key = operatorKey.key;
    this.depositSignature = operatorKey.depositSignature;
    this.used = operatorKey.used;
  }
}

class Key {
  /**
   *
   * @param {string | Buffer} key
   */
  constructor(key) {
    if (typeof key === 'string' && key.substring(0,2) === '0x') {
      this._key = Buffer.from(key, 'hex');
    } else if (typeof key === 'string') {
      this._key = Buffer.from(key, 'hex');
    } else if (key instanceof Buffer) {
      this._key = Buffer.from(key);
    } else {
      throw new TypeError('Key not a buffer or string');
    }

    Object.seal(this);
    Object.freeze(this);
  }

  toString() {
    return '0x' + this._key.toString('hex');
  }

  valueOf() {
    return this.key;
  }

  toJSON() {
    return '0x' + this._key.toString('hex');
  }

  get key() {
    return Buffer.from(this._key);
  }
}

class DepositSignature {
  /**
   *
   * @param {string | Buffer} ds
   */
  constructor(ds) {
    if (typeof ds === 'string' && ds.substring(0,2) === '0x') {
      this._ds = Buffer.from(ds, 'hex');
    } else if (typeof ds === 'string') {
      this._ds = Buffer.from(ds, 'hex');
    } else if (ds instanceof Buffer) {
      this._ds = Buffer.from(ds);
    } else {
      throw new TypeError('DS not a buffer or string');
    }

    Object.seal(this);
    Object.freeze(this);
  }

  toString() {
    return '0x' + this._ds.toString('hex');
  }

  valueOf() {
    return this.ds;
  }

  toJSON() {
    return '0x' + this._ds.toString('hex');
  }

  get ds() {
    return Buffer.from(this._ds);
  }
}

/**
 *
 * @param {number} length
 */
const randomKey = (length) => {
  // 0xace735a49f074864ceeecf541612526272c3f121f5dd098d15668f69d496e4ceefb6dd22f4527f972c33b345033907a1 - 98 length
  let buf = crypto.randomBytes(length);
  const ret = buf.toString('hex');
  buf = null;
  return ret;
}


/**
 *
 * @param {any} data
 * @returns {Promise<void>}
 */
const writeJson = async(mixed) => {
  const str = JSON.stringify(mixed);

  return fs.writeFile('./data.json', str, { encoding: 'utf-8' });
}

/**
 *
 * @param {number} N
 */
const genKeys = (N) => {
  /**
   * @type {RegistryKey[]}
   */
  const keys = [];

  for (let i = 1; i < N; i++) {
    const key = new RegistryKey({
      index: i,
      operatorIndex: i % 10,
      depositSignature: '0x' + randomKey(96),
      key: '0x' + randomKey(48),
      used: true,
    })

    keys.push(key);
  }

  return keys;
}

const genKeysBuffer = (N) => {
  /**
   * @type {RegistryKeyBuffer[]}
   */
  const keys = [];

  for (let i = 1; i < N; i++) {
    const key = new RegistryKeyBuffer({
      index: i,
      operatorIndex: i % 10,
      depositSignature: randomKey(96),
      key: randomKey(48),
      used: true,
    })

    keys.push(key);
  }

  return keys;//[...keys.map(key => ({...key}))];
}

/**
 *
 * @param {number} N
 * @returns {RegistryKey[]}
 */
const genKeysObj = (N) => {
  /**
   * @type {RegistryKeyObj[]}
   */
  const keys = [];

  for (let i = 1; i < N; i++) {
    const key = new RegistryKeyObj({
      index: i,
      operatorIndex: i % 10,
      depositSignature: new DepositSignature(randomKey(96)),
      key: new Key(randomKey(48)),
      used: true,
    })

    keys.push(key);
  }

  return keys;//[...keys.map(key => ({...key}))];
}

const wait = async () => {
  for (let i = 0; i < 100; i++) {
    await sleep(5000);
    memUsage();
  }
}

const main = async () => {
  memUsage();

  const keys = genKeysObj(500000);

  memUsage();

  await writeJson(keys);

  memUsage();

  await wait();
}

main().catch((e) => console.error(e));



