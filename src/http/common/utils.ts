export function filterFields(query: string, transformMap: { [key: string]: string }): string[] {
  const fields = query.split(',').reduce((result, field) => {
    const transformedField = transformMap[field.toLowerCase()];
    return transformedField ? result.concat([transformedField]) : result;
  }, []);

  return fields;
}

// <T>(value: T | T[]): T[[]

export const toList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [value];
};
