export enum Environment {
  development = 'development',
  production = 'production',
  staging = 'staging',
  testnet = 'testnet',
}

export enum LogLevel {
  error = 'error',
  warning = 'warning',
  notice = 'notice',
  info = 'info',
  debug = 'debug',
}

export enum LogFormat {
  json = 'json',
  simple = 'simple',
}

export enum Chain {
  Mainnet = 1,
  Goerli = 5,
  Holesky = 17000,
}
