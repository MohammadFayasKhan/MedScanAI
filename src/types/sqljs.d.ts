/**
 * @file sqljs.d.ts
 * @description Type declarations for sql.js APIs used by the browser SQLite runtime.
 * @module Types
 */
declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface BindParams {
    [key: string]: string | number | null | Uint8Array;
  }

  export interface Statement {
    bind(values?: BindParams | unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  export interface Database {
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    close(): void;
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
