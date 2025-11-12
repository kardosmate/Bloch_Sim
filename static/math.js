import * as THREE from 'three';

// --- Komplex szám helperek ---
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

// --- Vektor / mátrix műveletek ---
// vektor: [C,...] ; mátrix: [[C,...], [...], ...] (sorok)
function isVector(vec) {
  return Array.isArray(vec);
}

// --- Kvantumállapot -> Bloch koordináták ---
// Ez belső használatra megmarad, {x, y, z} objektumot ad vissza
export function stateToBloch(state) {
  if (state.length !== 2) throw new Error('Csak egyqubites állapotok támogatottak');
  const [alpha, beta] = state;

  // α*β szorzat
  const alphaConj = conj(alpha);
  const alphaBeta = mul(alphaConj, beta);

  const x = 2 * alphaBeta.re;
  const y = 2 * alphaBeta.im;
  const z = abs2(alpha) - abs2(beta);

  // MÓDOSÍTVA: Objektum helyett közvetlenül THREE.Vector3-at adunk vissza
  return new THREE.Vector3(x, y, z);
}

// --- Bloch koordináták -> kvantumállapot ---
// A bemenet lehet {x,y,z} objektum VAGY THREE.Vector3,
// mivel mindkettőnek vannak .x, .y, .z tulajdonságai.
export function blochToState({ x, y, z }) {
  // Normalizálás biztos ami biztos
  const norm = Math.sqrt(x * x + y * y + z * z);
  
  // Kezeljük a 0,0,0 esetet (pl. kezdőpont)
  if (norm < 1e-9) {
    // Alapértelmezett állapot |0> (z=1)
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

// --- Debug segédfüggvények ---
function printState(vec) {
  vec.forEach((c, i) => console.log(`  [${i}] = ${toStr(c)}`));
  console.log('  norma (összeg |a|^2) =', vec.reduce((acc, x) => acc + abs2(x), 0).toFixed(6));
  console.log('');
}

function printBloch(bloch,) {
  const { x, y, z } = bloch;
  console.log(`  x = ${x.toFixed(4)}`);
  console.log(`  y = ${y.toFixed(4)}`);
  console.log(`  z = ${z.toFixed(4)}`);
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
// Ezek most THREE.Vector3-at fogadnak és adnak vissza.

/**
 * Pauli-X kapu alkalmazása.
 * @param {THREE.Vector3} blochVec A jelenlegi Bloch vektor.
 * @returns {THREE.Vector3} Az új Bloch vektor a kapu alkalmazása után.
 */
export function applyPauliX(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyPauliX is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  // A blochToState fogadja a Vector3-at, mivel annak van x,y,z tulajdonsága
  const state = blochToState(blochVec);
  
  // printState(state); // Debug
  const newState = normalize(applyGate(PAULI_X, state));
  // printState(newState); // Debug
  
  // MÓDOSÍTVA: stateToBloch már Vector3-at ad vissza
  const newBlochVec = stateToBloch(newState);
  // printBloch(newBlochCoords); // Debug
  
  // MÓDOSÍTVA: Közvetlenül visszaadjuk az új vektort
  return newBlochVec;
}

/**
 * Pauli-Y kapu alkalmazása.
 * @param {THREE.Vector3} blochVec A jelenlegi Bloch vektor.
 * @returns {THREE.Vector3} Az új Bloch vektor a kapu alkalmazása után.
 */
export function applyPauliY(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyPauliY is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(PAULI_Y, state));
  // MÓDOSÍTVA: stateToBloch már Vector3-at ad vissza
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

/**
 * Pauli-Z kapu alkalmazása.
 * @param {THREE.Vector3} blochVec A jelenlegi Bloch vektor.
 * @returns {THREE.Vector3} Az új Bloch vektor a kapu alkalmazása után.
 */
export function applyPauliZ(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyPauliZ is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(PAULI_Z, state));
  // MÓDOSÍTVA: stateToBloch már Vector3-at ad vissza
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

/**
 * Hadamard kapu alkalmazása.
 * @param {THREE.Vector3} blochVec A jelenlegi Bloch vektor.
 * @returns {THREE.Vector3} Az új Bloch vektor a kapu alkalmazása után.
 */
export function applyHadamard(blochVec) {
  if (!(blochVec instanceof THREE.Vector3)) {
    console.warn("Input to applyHadamard is not a THREE.Vector3. Attempting to use as {x,y,z}.");
  }
  const state = blochToState(blochVec);
  const newState = normalize(applyGate(HADAMARD, state));
  // MÓDOSÍTVA: stateToBloch már Vector3-at ad vissza
  const newBlochVec = stateToBloch(newState);
  return newBlochVec;
}

// --- EGYSZERŰ TESZT ---
function runTest() {
  console.log("--- Futtatom a Pauli-Z tesztet ---");
  
  // Kezdő állapot: |+> állapot (x=1, y=0, z=0)
  const initialStateVec = new THREE.Vector3(1, 0, 0);
  console.log("Kezdő vektor (|+>):", initialStateVec.x, initialStateVec.y, initialStateVec.z);
  
  // Várható állapot: |-> állapot (x=-1, y=0, z=0)
  // Mivel Z|+> = |->
  
  const finalStateVec = applyPauliZ(initialStateVec);
  
  console.log("Vektor Pauli-Z alkalmazása után (várható |->):", finalStateVec.x.toFixed(4), finalStateVec.y.toFixed(4), finalStateVec.z.toFixed(4));

  // Ellenőrzés
  if (Math.abs(finalStateVec.x - (-1)) < 1e-9 && Math.abs(finalStateVec.y) < 1e-9 && Math.abs(finalStateVec.z) < 1e-9) {
    console.log("TESZT SIKERES: |+> -> |->");
  } else {
    console.error("TESZT SIKERTELEN!");
  }
  console.log("------------------------------------");
}

// Teszt futtatása (a modul betöltésekor)
// Ezt a sort megjegyzésbe teheted, ha nem akarod, hogy automatikusan lefusson importáláskor.
runTest();