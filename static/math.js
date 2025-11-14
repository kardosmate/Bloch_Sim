import * as THREE from 'three';

// --- Komplex szám helperek ---
// komplex szám: { re: number, im: number }
const C = (re, im = 0) => ({ re, im });

function add(a, b) { return C(a.re + b.re, a.im + b.im); }
function sub(a, b) { return C(a.re - b.re, a.im - b.im); }
function mul(a, b) {
  return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}
function scale(a, k) {
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

// --- Vektor / mátrix műveletek ---
// vektor: [C,...] ; mátrix: [[C,...], [...], ...] (sorok)
function isVector(vec) {
  return Array.isArray(vec);
}

// --- Kvantumállapot -> Bloch koordináták ---
export function stateToBloch(state) {
  if (state.length !== 2) throw new Error('Csak egyqubites állapotok támogatottak');
  const [alpha, beta] = state;

  const alphaConj = conj(alpha);
  const alphaBeta = mul(alphaConj, beta);

  const x = 2 * alphaBeta.re;
  const y = 2 * alphaBeta.im;
  const z = abs2(alpha) - abs2(beta);

  return new THREE.Vector3(x, y, z);
}

// --- Bloch koordináták -> kvantumállapot ---
export function blochToState({ x, y, z }) {
  const norm = Math.sqrt(x * x + y * y + z * z);
  
  if (norm < 1e-9) {
    return [C(1,0), C(0,0)];
  }

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
  if (s < 1e-12) return vec; // Ne osszunk nullával
  const norm = 1/Math.sqrt(s);
  return vec.map(v => scale(v, norm));
}

// --- Alap bázis vektorok (egy qubit) ---
export const ket0 = [C(1,0), C(0,0)];
export const ket1 = [C(0,0), C(1,0)];
// |+> állapot
export const ketPlus = normalize([C(1,0), C(1,0)]);
// |-> állapot
export const ketMinus = normalize([C(1,0), C(-1,0)]);


// --- Pauli és Hadamard mátrixok ---
export const PAULI_X = [
  [C(0,0), C(1,0)],
  [C(1,0), C(0,0)]
];

export const PAULI_Y = [
  [C(0,0), C(0,-1)], // -i
  [C(0,1), C(0,0)]   // +i
];

export const PAULI_Z = [
  [C(1,0), C(0,0)],
  [C(0,0), C(-1,0)]
];

const H = (1 / Math.sqrt(2));
export const HADAMARD = [
  [C(H,0), C(H,0)],
  [C(H,0), C(-H,0)]
];

export const S_GATE = [
  [C(1,0), C(0,0)],
  [C(0,0), C(0,1)]
];

const T_ANGLE = Math.PI / 4;
export const T_GATE = [
  [C(1,0), C(0,0)],
  [C(0,0), C(Math.cos(T_ANGLE), Math.sin(T_ANGLE))]
];

export function PHASE_GATE(theta) {
  return [
    [C(1,0), C(0,0)],
    [C(0,0), C(Math.cos(theta), Math.sin(theta))]
  ];
}

// --- Gate alkalmazó segédfüggvény ---
function applyGate(gateMatrix, stateVector) {
  return matrixVectorMultiply(gateMatrix, stateVector);
}

export function applyAndConvert(cartesian, gateMatrix) {
  const state = blochToState(cartesian);
  const newstate = applyGate(gateMatrix, state);
  return stateToBloch(newstate);
}

// --- FŐ EXPORTÁLT KAPU FÜGGVÉNYEK ---


export function applyPauliX(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyPauliX is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(PAULI_X, state));
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

export function applyPauliY(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyPauliY is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(PAULI_Y, state));
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

export function applyPauliZ(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyPauliZ is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(PAULI_Z, state));
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

export function applyHadamard(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyHadamard is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(HADAMARD, state));
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

export function applySGate(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applySGate is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(S_GATE, state));
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

export function applyTGate(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyTGate is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(T_GATE, state));
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

export function applyPhaseGate(blochVec, theta) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyPhaseGate is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const phaseGateMatrix = PHASE_GATE(theta);
  const newState = normalize(applyGate(phaseGateMatrix, state));
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}