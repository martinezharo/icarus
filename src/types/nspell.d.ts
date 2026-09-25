/**
 * Minimal ambient typings for `nspell`, which ships none. Only the slice of
 * the API the app uses is declared.
 * https://github.com/wooorm/nspell/issues/14
 */
declare module 'nspell' {
  export interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): void;
    remove(word: string): void;
  }

  export default function nspell(
    aff: string | Uint8Array,
    dic: string | Uint8Array,
  ): NSpell;
}
