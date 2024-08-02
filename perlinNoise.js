export function perlin(x) {
  x = x * 0.01; // Scale down the input
  return Math.sin(x) * 0.2 + Math.sin(x * 0.2) * 0.2 + Math.sin(x * 0.2) * 0.2;
}