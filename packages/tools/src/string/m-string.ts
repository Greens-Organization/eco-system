import {
  camelCase,
  deburr,
  kebabCase,
  snakeCase,
  startCase,
} from 'es-toolkit/string';

const NAME_EXCEPTIONS = [
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'if',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'so',
  'the',
  'to',
  'up',
  'yet',
] as const;

class MString {
  private _value: string;

  constructor(value: string) {
    this._value = value ?? '';
  }

  // --- Funções customizadas ---

  capitalize(): MString {
    this._value = this._value
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        if (
          index === 0 ||
          !NAME_EXCEPTIONS.includes(word as (typeof NAME_EXCEPTIONS)[number])
        ) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(' ');
    return this;
  }

  // --- Wrappers es-toolkit ---

  deburr(): MString {
    this._value = deburr(this._value);
    return this;
  }

  startCase(): MString {
    this._value = startCase(this._value);
    return this;
  }

  kebabCase(): MString {
    this._value = kebabCase(this._value);
    return this;
  }

  camelCase(): MString {
    this._value = camelCase(this._value);
    return this;
  }

  snakeCase(): MString {
    this._value = snakeCase(this._value);
    return this;
  }

  // --- Métodos terminais (retornam string) ---

  getInitials(): string {
    const names = this._value.trim().split(' ').filter(Boolean);
    const first = names[0]?.[0]?.toUpperCase() ?? '';
    if (names.length <= 1) return first;
    return first + (names[names.length - 1]?.[0]?.toUpperCase() ?? '');
  }

  // --- Saída ---

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  valueOf(): string {
    return this._value;
  }
}

const mstring = (value: string) => new MString(value);

export { MString, mstring };
