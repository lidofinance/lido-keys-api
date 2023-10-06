export const mapSet = <A, B>(s: Set<A>, fn: (a: A) => B): Set<B> => {
  const res = new Set<B>();
  s.forEach((v) => res.add(fn(v)));

  return res;
};
