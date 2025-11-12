// --- komplex szám helperek ---
// komplex szám: { re: number, im: number }
const C = (re, im = 0) => ({ re, im });

function add(a, b) { return C(a.re + b.re, a.im + b.im); }
function sub(a, b) { return C(a.re - b.re, a.im - b.im); }
function mul(a, b) {
  // (a+ib)(c+id) = (ac - bd) + i(ad + bc)
  return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}
function scale(a, k) { // k is real
  return C(a.re * k, a.im * k);
}
function conj(a) { return C(a.re, -a.im); }
function abs2(a) { return a.re * a.re + a.im * a.im; }
function toStr(a, digits = 4) {
  const r = a.re.toFixed(digits), i = a.im.toFixed(digits);
  if (Math.abs(a.im) < 1e-12) return `${r}`;
  if (a.im >= 0) return `${r}+${i}i`;
  return `${r}${i}i`;
}

// --- vektor / mátrix műveletek ---
// vektor: [C,...] ; mátrix: [[C,...], [...], ...] (sorok)
function isVector(vec) {
  return Array.isArray(vec);
}

// --- Kvantumállapot -> Bloch koordináták ---
export function stateToBloch(state) {
  if (state.length !== 2) throw new Error('Csak egyqubites állapotok támogatottak');
  const [alpha, beta] = state;

  // α*β szorzat
  const alphaConj = conj(alpha);
  const alphaBeta = mul(alphaConj, beta);

  const x = 2 * alphaBeta.re;
  const y = 2 * alphaBeta.im;
  const z = abs2(alpha) - abs2(beta);

  return { x, y, z };
}

// --- Bloch koordináták -> kvantumállapot ---
export function blochToState({ x, y, z }) {
  // Normalizálás biztos ami biztos
  const norm = Math.sqrt(x * x + y * y + z * z);
  const xn = x / norm, yn = y / norm, zn = z / norm;

  const theta = Math.acos(zn);
  const phi = Math.atan2(yn, xn);

  const alpha = C(Math.cos(theta / 2), 0);
  const beta = C(Math.sin(theta / 2) * Math.cos(phi), Math.sin(theta / 2) * Math.sin(phi));

  return [alpha, beta];
}

function matrixVectorMultiply(mat, vec) {
  const rows = mat.length;
  if (!Array.isArray(mat[0])) throw new Error('Mátrix formátum hibás');
  const cols = mat[0].length;
  if (vec.length !== cols) throw new Error('Méretek nem egyeznek (matrix cols != vec length)');
  const out = Array(rows).fill(null).map(() => C(0,0));
  for (let r = 0; r < rows; r++) {
    let acc = C(0,0);
    for (let c = 0; c < cols; c++) {
      acc = add(acc, mul(mat[r][c], vec[c]));
    }
    out[r] = acc;
  }
  return out;
}

function normalize(vec) {
  let s = 0;
  for (const v of vec) s += abs2(v);
  if (s === 0) return vec;
  const norm = 1/Math.sqrt(s);
  return vec.map(v => scale(v, norm));
}

// --- alap bázis vektorok (egy qubit) ---
const ket0 = [C(1,0), C(0,0)];
const ket1 = [C(0,0), C(1,0)];

// --- Pauli és Hadamard mátrixok ---
const PAULI_X = [
  [C(0,0), C(1,0)],
  [C(1,0), C(0,0)]
];

const PAULI_Y = [
  [C(0,0), C(0,-1)], // -i
  [C(0,1), C(0,0)]   // +i
];

const PAULI_Z = [
  [C(1,0), C(0,0)],
  [C(0,0), C(-1,0)]
];

const H = (1 / Math.sqrt(2));
const HADAMARD = [
  [C(H,0), C(H,0)],
  [C(H,0), C(-H,0)]
];

// --- gate alkalmazó segédfüggvény ---
function applyGate(gateMatrix, stateVector) {
  return matrixVectorMultiply(gateMatrix, stateVector);
}

export function applyPauliX(bloch) {
  const state = blochToState(bloch);
  const newState = normalize(applyGate(PAULI_X, state));
  const newBloch = stateToBloch(newState);
  return newBloch;
}

export function applyPauliY(bloch) {
  const state = blochToState(bloch);
  const newState = normalize(applyGate(PAULI_Y, state));
  const newBloch = stateToBloch(newState);
  return newBloch;
}

export function applyPauliZ(bloch) {
  const state = blochToState(bloch);
  const newState = normalize(applyGate(PAULI_Z, state));
  const newBloch = stateToBloch(newState);
  return newBloch;
}

export function applyHadamard(bloch) {
  const state = blochToState(bloch);
  const newState = normalize(applyGate(HADAMARD, state));
  const newBloch = stateToBloch(newState);
  return newBloch;
}