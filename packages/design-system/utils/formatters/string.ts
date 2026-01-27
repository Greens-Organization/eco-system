function capitalize(value: string): string {
  if (!value || value.length <= 0) return '';

  const exceptions = [
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
  ];

  return value
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !exceptions.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

function slugToTitle(slug: string): string {
  let title = slug.replace(/-/g, ' ');
  title = title.replace(/_/g, ' ');
  return capitalize(title);
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ');
  const firstInitial = names[0][0].toUpperCase();

  if (names.length === 1) {
    return firstInitial;
  }

  const lastInitial = names[names.length - 1][0].toUpperCase();
  return firstInitial + lastInitial;
}

function removeSpecialChars(
  str: string,
  keepNumbers = false,
  keepException = false
) {
  const allowedChars =
    'a-zA-Z' +
    (keepNumbers ? '0-9' : '') +
    'áàãâäéèêëíìîïóòõôöúùûü' +
    'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜ' +
    'çÇ&' +
    ' ' +
    (keepException ? '\\-\\+' : '');

  const regex = new RegExp(`[^${allowedChars}]`, 'g');
  return str.replace(regex, '');
}

function getAllowedPattern(keepNumbers = false, keepException = false): RegExp {
  const basePattern =
    'a-zA-Z0-9áàãâäéèêëíìîïóòõôöúùûüÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜçÇ&\\s';
  const exceptionChars = keepException ? '\\-\\+' : '';
  return new RegExp(
    `^[${keepNumbers ? basePattern : basePattern.replace('0-9', '')}${exceptionChars}]+$`
  );
}

function uuidFormatter(uuid: string) {
  if (!uuid || uuid.length <= 0) return '';
  const parts = uuid.split('-');
  const partsLength = parts.length;
  return `${parts[partsLength - 1]}`;
}

export {
  capitalize,
  getAllowedPattern,
  getInitials,
  removeSpecialChars,
  slugToTitle,
  uuidFormatter,
};
