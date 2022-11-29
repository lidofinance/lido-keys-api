export function prepareQuery(queryFields: string | string[] | undefined, allowedFields: string[]): string[] {
  return toList(queryFields).filter((field) => allowedFields.includes(field));
}

export function toList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  const values = value.split(',');

  return values;
}
