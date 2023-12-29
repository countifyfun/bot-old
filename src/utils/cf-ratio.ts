export const cfRatio = (counts: number, fails: number) =>
  parseInt(((counts / (counts + fails)) * 100).toFixed(2));
