import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as QMath from './math.js';

// The radius for the main sphere and circles
const SPHERE_RADIUS = 1.0; // Unit radius for Bloch Sphere
const NUM_ARC_POINTS = 64;

// Arrow constants for uniform look
const ARROW_SHAFT_RADIUS = 0.015;
const ARROW_HEAD_LENGTH = 0.12; // Slightly longer for visibility
const ARROW_HEAD_RADIUS = 0.05;

// ------------- Arc Generation Logic (Great Circles) -------------

/**
 * Generates an array of THREE.Vector3 points for an arc on a sphere 
 * centered at the origin, defined by its starting vector, the rotation axis,
 * and the angle to sweep.
 *
 * @param {THREE.Vector3} vStart The starting position vector of the arc.
 * @param {THREE.Vector3} arcPlaneNormal The axis of rotation (normal to the arc's plane).
 * @param {number} angle The angle in radians to sweep (e.g., Math.PI for a half circle).
 * @param {number} numPoints The total number of points to generate (incl. start/end).
 * @returns {THREE.Vector3[]} An array of points.
 */
function generateArcPoints(vStart, arcPlaneNormal, angle, numPoints) {
  if (numPoints <= 1) {
    return numPoints === 1 ? [vStart.clone()] : [];
  }
  
  // Ensure the axis is a normalized unit vector
  const axis = arcPlaneNormal.clone().normalize();
  
  // The small angle for each rotation step
  const stepAngle = angle / (numPoints - 1);

  // Create a Quaternion for one small rotation step
  const qStep = new THREE.Quaternion().setFromAxisAngle(axis, stepAngle);

  // Initialize and rotate
  const points = [];
  const currentPoint = vStart.clone();
  
  for (let i = 0; i < numPoints; i++) {
    points.push(currentPoint.clone());
    // Rotate the point for the next iteration
    currentPoint.applyQuaternion(qStep);
  }

  return points;
}

// NOTE: traceGatePath function removed as requested.

// ------------- Arc Drawing Utility Function -------------

/**
 * Draws a line using the generated points and adds it to the scene.
 *
 * @param {THREE.Scene} scene The scene to add the line to.
 * @param {THREE.Vector3[]} points The array of points defining the line.
 * @param {number} colorHex The color of the line (e.g., 0xFF0000).
 */
function drawArc(scene, points, colorHex) {
  const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
  
  const arcMaterial = new THREE.LineBasicMaterial({
    color: colorHex,
    linewidth: 2, // Note: linewidth is often ignored by WebGL renderer
    transparent: true,
    opacity: 0.8
  });

  const arc = new THREE.Line(arcGeometry, arcMaterial);
  scene.add(arc);
  return arc;
}

// ------------- Vector Drawing Utility Function (Arrow Head) -------------

/**
 * Draws a 3D arrow vector from the origin to a specified endpoint.
 *
 * @param {THREE.Scene} scene The scene to add the vector to.
 * @param {THREE.Vector3} vEnd The endpoint of the vector.
 * @param {number} colorHex The color of the vector.
 * @param {object} [options] Configuration options.
 * @returns {THREE.Group} A group containing the cylinder shaft and cone head.
 */
function drawVector(scene, vEnd, colorHex, options = {}) {
    // Use constants defined at the top of the file
    const { 
        shaftRadius = ARROW_SHAFT_RADIUS, 
        headLength = ARROW_HEAD_LENGTH, 
        headRadius = ARROW_HEAD_RADIUS 
    } = options;

    const length = vEnd.length();
    console.log(length);
    console.log(vEnd);
    const material = new THREE.MeshBasicMaterial({ color: colorHex });
    const arrowGroup = new THREE.Group();

    // Ensure the vector has length greater than 0
    if (length < 1e-5) return arrowGroup;

    // --- 1. Shaft (Cylinder) ---
    const shaftLength = length - headLength;
    if (shaftLength > 0) {
        const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 8);
        const shaft = new THREE.Mesh(shaftGeometry, material);

        // Position the cylinder so its base is at the origin (0,0,0) before rotation
        shaft.position.y = shaftLength / 2;
        
        // Add to group
        arrowGroup.add(shaft);
    }
    
    // --- 2. Arrow Head (Cone) ---
    const headGeometry = new THREE.ConeGeometry(headRadius, headLength, 12);
    const head = new THREE.Mesh(headGeometry, material);
    
    // Position the cone so its base is at the end of the shaft
    head.position.y = length - headLength / 2;

    // Add to group
    arrowGroup.add(head);

    // --- 3. Orientation and Positioning ---
    // The arrow is initially drawn along the positive Y-axis (cylinder default)
    
    // Create a vector representing the arrow's desired direction (from origin)
    const direction = vEnd.clone().normalize();
    
    // Calculate the quaternion needed to rotate the group from (0, 1, 0) to 'direction'
    const upVector = new THREE.Vector3(0, 1, 0); 
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, direction);
    
    // Apply rotation to the whole group
    arrowGroup.setRotationFromQuaternion(quaternion);

    scene.add(arrowGroup);
    return arrowGroup;
}


// ------------- Basic scene + renderer -------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight); // Initial set size
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x303030);

// Sphere representation
const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x888888, 
    wireframe: false, 
    transparent: true,
    opacity: 0.1,
    // FIX: Set depthWrite to false so the transparent sphere doesn't obscure objects behind it
    depthWrite: false 
});
const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphereMesh);


// small helper objects so you can perceive rotation / zoom
// Grid helper size scaled up for better viewing
let grid = new THREE.GridHelper(5, 10, 0x606060, 0x404040);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const axesArrowOpts = {
    shaftRadius: 0.005,
    headLength: 0.03,
    headRadius: 0.015
};
drawVector(scene, new THREE.Vector3(0.3,0,0), new THREE.Color(0xff0000), axesArrowOpts);
drawVector(scene, new THREE.Vector3(0,0.3,0), new THREE.Color(0x00ff00), axesArrowOpts);
drawVector(scene, new THREE.Vector3(0,0,0.3), new THREE.Color(0x0000ff), axesArrowOpts);


// Center sphere size is now half of its original small size (0.05 / 2 = 0.025)
const originSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.025, 12, 12), 
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(originSphere);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,10,7);
scene.add(light);

// ------------- Define Axis Normals and Constants -------------

const R = SPHERE_RADIUS;
const PI = Math.PI;

const n_X = new THREE.Vector3(1, 0, 0); 
const n_Y = new THREE.Vector3(0, 1, 0); 
const n_Z = new THREE.Vector3(0, 0, 1); 

// ------------- Draw Great Circles (Bloch Sphere Axes) -------------

// 1. X-Circle (YZ Plane) - Normal is X-Axis (RED)
let vStart = new THREE.Vector3(0, R, 0);
drawArc(scene, generateArcPoints(vStart, n_X, PI, NUM_ARC_POINTS), 0xff0000); 
vStart = new THREE.Vector3(0, -R, 0);
drawArc(scene, generateArcPoints(vStart, n_X, PI, NUM_ARC_POINTS), 0xff0000); 

// 2. Y-Circle (XZ Plane) - Normal is Y-Axis (GREEN)
vStart = new THREE.Vector3(R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Y, PI, NUM_ARC_POINTS), 0x00ff00); 
vStart = new THREE.Vector3(-R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Y, PI, NUM_ARC_POINTS), 0x00ff00);

// 3. Z-Circle (XY Plane) - Normal is Z-Axis (BLUE)
vStart = new THREE.Vector3(R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Z, PI, NUM_ARC_POINTS), 0x0000ff); 
vStart = new THREE.Vector3(-R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Z, PI, NUM_ARC_POINTS), 0x0000ff);

// ------------- Define Starting Quantum State Vector |psi> -------------

// Example State 1 (Spherical Coords) - Arbitrary starting position
const theta = PI / 4; // Polar angle (45 degrees from +Z)
const phi = PI / 3;   // Azimuthal angle (60 degrees from +X)

const stateVectorSpherical = new THREE.Vector3(
    R * Math.sin(theta) * Math.cos(phi),
    R * Math.sin(theta) * Math.sin(phi),
    R * Math.cos(theta)                  
);





// ------------- Orthographic camera -------------
let orthoSize = 2.5; // FRUSTUM SIZE CHANGED TO 2.5 FOR CLOSER VIEW
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -orthoSize * aspect, orthoSize * aspect,
    orthoSize, -orthoSize,
    0.1, 1000
);
camera.up.set(0,0,1);
camera.position.set(-2.5, -2.5, 2.5); 
camera.lookAt(0,0,0);

// ------------- Controls (rotate around target + zoom to target) -------------
const controls = new OrbitControls(camera, renderer.domElement);

controls.target.set(0, 0, 0);     // pivot point = origin
controls.enablePan = false;       // optional: disable panning so user always orbits origin
controls.enableDamping = true;    // smooth motion
controls.dampingFactor = 0.08;
controls.zoomSpeed = 1.2;         // feel of wheel zoom
controls.rotateSpeed = 0.6;


function onResize() {
  aspect = window.innerWidth / window.innerHeight;
  const halfHeight = orthoSize;
  const halfWidth = orthoSize * aspect;

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize, false);
onResize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();    // required for damping
  renderer.setViewport(0,0, window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
  
}
animate();


class Qbit {
  constructor(
    id,
    initial = new THREE.Vector3(0,1,0),
    current = new THREE.Vector3(0,1,0),
    color = new THREE.Color(0xffffff),
  ) {
    this.id = id;
    this.initial = initial.clone();
    this.current = current.clone();
    this.color = color.clone();
    this.group = drawVector(scene, this.current, this.color);
  }

  refresh() {
    scene.remove(this.group);
    this.group = drawVector(scene, this.current, this.color);
    updateCoordinates(this.id, this.current);
  }

  reset() {
    this.current.copy(this.initial);
    }

    remove() {
        scene.remove(this.group);
    }
}

let qbits = [];
let selectedQbit = null;


function addNewQbit(id, x,y,z,hex) {
  let newqbit = new Qbit(id, new THREE.Vector3(x,y,z), new THREE.Vector3(x,y,z), new THREE.Color(hex));
  newqbit.refresh();
  qbits.push(newqbit);
}
function deleteQbit(id) {
  const qbit = getQbit(id)
  const index = qbits.indexOf(qbit);
  qbits.splice(index, 1);
  qbit.remove();
  selectedQbit = null;
}


function selectQbit(id) {
    if(selectedQbit != null) {
        const previousElement = document.getElementById(selectedQbit);
        previousElement.classList.remove('selectedVector');
    }
    selectedQbit = id;
    const selectedElement = document.getElementById(id);
    selectedElement.classList.add('selectedVector');
    
}

function applyGate(gate) {
  if(selectedQbit == null)
    return;

  let sQ = getQbit(selectedQbit);
  let current = sQ.current.clone();
  sQ.current = QMath.applyAndConvert(current, gate);
  sQ.refresh();
}

function reset(id) {
  let sQ = getQbit(id);
  sQ.current = sQ.initial.clone();
  sQ.refresh();
}

function clear() {
  qbits.forEach(qbit => qbit.remove());
  qbits = [];
  selectedQbit = null;
}

function getQbit(id) {
  for (let i = 0;i<qbits.length;i++){
    if(qbits[i].id === id) {
      return qbits[i];
    }
  }
  return null;
}


function updateCoordinates(id, { x, y, z }) {
    const element = document.getElementById(id);
    const coords = element.querySelector('.coordinates');
    coords.textContent = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;
}


document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const uiContainer = document.getElementById('ui-container');
    const themeBtn = document.getElementById('themeBtn');
    const resetBtn = document.getElementById('resetBtn');

    const xbutton = document.getElementById('x-gate-btn');
    const ybutton = document.getElementById('y-gate-btn');
    const zbutton = document.getElementById('z-gate-btn');
    const hbutton = document.getElementById('h-gate-btn');
    const sbutton = document.getElementById('s-gate-btn');
    const phbutton = document.getElementById('ph-gate-btn');

    toggleBtn.addEventListener('click', () => {
        uiContainer.classList.toggle('closed');
        toggleBtn.classList.toggle('open');
    });

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
        if(scene.background.equals(new THREE.Color(0x303030))) {
          scene.background = new THREE.Color(0xF0F0F0);
          scene.remove(grid);
          grid = new THREE.GridHelper(5, 10, 0xB0B0B0, 0xD0D0D0);
          grid.rotation.x = Math.PI / 2;
          scene.add(grid);
        } else {  
          scene.background = new THREE.Color(0x303030);
          scene.remove(grid);
          grid = new THREE.GridHelper(5, 10, 0x606060, 0x404040);
          grid.rotation.x = Math.PI / 2;
          scene.add(grid);
        }
    });


    xbutton.addEventListener('click', () => applyGate(QMath.PAULI_X));
    ybutton.addEventListener('click', () => applyGate(QMath.PAULI_Y));
    zbutton.addEventListener('click', () => applyGate(QMath.PAULI_Z));
    hbutton.addEventListener('click', () => applyGate(QMath.HADAMARD));
    sbutton.addEventListener('click', () => applyGate(QMath.S_GATE));
    phbutton.addEventListener('click', () => {
        let degree = document.getElementById('phase-degrees').value;
        applyGate(QMath.PHASE_GATE(degree / 180.0 * Math.PI));
    });

});

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); 
}

function createElement(color, x, y, z, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'element';
    wrapper.setAttribute('id', id);

    const colorBox = document.createElement('div');
    colorBox.className = 'color-box';
    colorBox.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;

    const coords = document.createElement('div');
    coords.className = 'coordinates';
    coords.textContent = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;


    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';


    const resetBtn = document.createElement('div');
    resetBtn.className = 'reset-btn';
    resetBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i>`;


    const actionBtns = document.createElement('div');
    actionBtns.className = 'action-btns';

    actionBtns.appendChild(deleteBtn);
    actionBtns.appendChild(resetBtn);

    wrapper.appendChild(colorBox);  
    wrapper.appendChild(coords);


    wrapper.appendChild(actionBtns);


    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        wrapper.remove();
        deleteQbit(id); 
    });


    resetBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        reset(id);
    });

    wrapper.addEventListener('click', () => {
        selectQbit(id);
    });

    return wrapper;
}

function normalize(x, y, z) {
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length < 1e-8) return { x: 0, y: 0, z: 0 };
    return { x: x / length, y: y / length, z: z / length };
}


const vecXInput = document.getElementById('vecX');
const vecYInput = document.getElementById('vecY');
const vecZInput = document.getElementById('vecZ');

const listContainer = document.getElementById('listContainer');

const addBtn = document.getElementById('addBtn').addEventListener
    ('click', () => {


        const coordinateX = parseFloat(vecXInput.value);
        const coordinateY = parseFloat(vecYInput.value);
        const coordinateZ = parseFloat(vecZInput.value);

        if (isNaN(coordinateX) || isNaN(coordinateY) || isNaN(coordinateZ)) {
            alert("ahj te butus hat nyilvan kellenek szamok");
            return;
        }


        if (coordinateX == 0 || coordinateY==0 || coordinateZ==0) {
            alert("Please give a non null vektor");
            return;
        }

        const normalized = normalize(coordinateX, coordinateY, coordinateZ);

        const randColor = Math.floor(Math.random() * 0xFFFFFF);
        let randomID = getRandomIntInclusive(100000, 999999);
        const newElement = createElement(randColor, normalized.x, normalized.y, normalized.z, randomID);

        listContainer.appendChild(newElement);

        addNewQbit(randomID, normalized.x, normalized.y, normalized.z, randColor);
    });


const phaseInput = document.getElementById('phase-degrees');

phaseInput.addEventListener('input', () => {
    if (phaseInput.value.length > 3) {
        phaseInput.value = phaseInput.value.slice(0, 3);
    }
});


phaseInput.addEventListener('click', (e) => {
    e.stopPropagation();
});
