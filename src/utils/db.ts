import Enmap from "enmap";

export interface Guild {
  channelId: string | null;
  count: number;
  previousUserId: string | null;
  previousMessageId: string | null;
  users: Record<string, User>;
  history: {
    time: number;
    count: number;
  }[];
  settings: {
    oneByOne: boolean;
    resetOnFail: boolean;
    talking: boolean;
    noDeletion: boolean;
    pinMilestones: boolean;
    unlisted: boolean;
  };
}

export interface User {
  counts: number;
  fails: number;
}

const defaultGuildOptions: Guild = {
  channelId: null,
  count: 0,
  previousUserId: null,
  previousMessageId: null,
  users: {},
  history: [],
  settings: {
    oneByOne: false,
    resetOnFail: false,
    talking: true,
    noDeletion: true,
    pinMilestones: false,
    unlisted: false,
  },
};

const defaultUserOptions: User = {
  counts: 0,
  fails: 0,
};

export const db = {
  guilds: new Enmap<string, Guild>({
    name: "Guild",
    dataDir: "./db/guilds",
  }),
};

export const getGuild = (id: string) => ({
  ...db.guilds.ensure(id, defaultGuildOptions),
  set<P extends Path<Guild>, D = GetFieldType<Guild, P>>(val: D, path?: P) {
    if (!path) return db.guilds.set(id, val as any);
    else return db.guilds.set(id, val, path);
  },
  inc<P extends Path<Matching<Guild, number>>>(path?: P) {
    if (!path) return db.guilds.math(id, "+", 1);
    else return db.guilds.math(id, "+", 1, path);
  },
  delete<P extends Path<Guild>>(path?: P) {
    if (!path) return db.guilds.delete(id);
    else return db.guilds.delete(id, path);
  },
  getUser(userId: string) {
    return {
      ...(db.guilds.ensure(
        id,
        defaultUserOptions as any,
        `users.${userId}`
      ) as unknown as User),
      set<P extends Path<User>, D = GetFieldType<Guild, P>>(val: D, path?: P) {
        if (!path) return db.guilds.set(id, val as any, `users.${userId}`);
        else return db.guilds.set(id, val, `users.${id}.${path}`);
      },
      inc<P extends Path<Matching<User, number>>>(path?: P) {
        if (!path) return db.guilds.math(id, "+", 1, `users.${userId}`);
        else return db.guilds.math(id, "+", 1, `users.${userId}.${path}`);
      },
    };
  },
});

// type helpers
type Primitive = null | undefined | string | number | boolean | symbol | bigint;

type IsTuple<T extends readonly any[]> = number extends T["length"]
  ? false
  : true;
type TupleKey<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;
type ArrayKey = number;

type PathImpl<K extends string | number, V> = V extends Primitive
  ? `${K}`
  : `${K}` | `${K}.${Path<V>}`;

type Path<T> = T extends readonly (infer V)[]
  ? IsTuple<T> extends true
    ? {
        [K in TupleKey<T>]-?: PathImpl<K & string, T[K]>;
      }[TupleKey<T>]
    : PathImpl<ArrayKey, V>
  : {
      [K in keyof T]-?: PathImpl<K & string, T[K]>;
    }[keyof T];

type GetIndexedField<T, K> = K extends keyof T
  ? T[K]
  : K extends `${number}`
    ? "0" extends keyof T
      ? undefined
      : number extends keyof T
        ? T[number]
        : undefined
    : undefined;

type FieldWithPossiblyUndefined<T, Key> =
  | GetFieldType<Exclude<T, undefined>, Key>
  | Extract<T, undefined>;

type IndexedFieldWithPossiblyUndefined<T, Key> =
  | GetIndexedField<Exclude<T, undefined>, Key>
  | Extract<T, undefined>;

type GetFieldType<T, P> = P extends `${infer Left}.${infer Right}`
  ? Left extends keyof T
    ? FieldWithPossiblyUndefined<T[Left], Right>
    : Left extends `${infer FieldKey}[${infer IndexKey}]`
      ? FieldKey extends keyof T
        ? FieldWithPossiblyUndefined<
            IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>,
            Right
          >
        : undefined
      : undefined
  : P extends keyof T
    ? T[P]
    : P extends `${infer FieldKey}[${infer IndexKey}]`
      ? FieldKey extends keyof T
        ? IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>
        : undefined
      : undefined;

type Matching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
};
