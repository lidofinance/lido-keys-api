// for /keys query parsed by nest js
// in case of fields=signature -> query.fields = "signature"; toList("signature") ->  ["signature"]
// fields="signature,something" -> query.fields = "signature,something";  toList("signature,something") -> ["signature", "something"]
// without fields -> query.fields = undefined; toList(undefined) -> [];
// fields="signature",fields="something" -> query.fields = ["signature", "something"]; toList(["signature", "something"]) -> ["signature", "something"]
export const toList = (value: string | string[]): string[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  const values = value.split(',');

  return values;
};
