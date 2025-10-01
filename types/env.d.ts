declare namespace NodeJS {
  interface ProcessEnv {
    ACCESS_TOKEN_SECRET_KEY: string;
    ACCESS_TOKEN_EXPIRE_TIME: string;
    REFRESH_TOKEN_EXPIRE_TIME: string;
    DATABASE_URL: string;
    REFRESH_TOKEN_SECRET_KEY: string;
    CACHE_TEMPORARY_TOKEN_PREFIX: string;
    CACHE_TEMPORARY_TOKEN_EXPIRES_IN_SECONDS: string;
  }
}
