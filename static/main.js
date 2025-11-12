import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { applyPauliX, applyPauliY, applyPauliZ, applyHadamard } from './math.js';

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
scene.add(grid);

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

// Draw the initial state vector in yellow
drawVector(scene, stateVectorSpherical, 0xffffaa);

// ------------- EXAMPLE 2: Drawing a Cartesian Vector (e.g., |+> state) -------------

// Cartesian coordinates for the |+> state on the X-axis (1, 0, 0)
const cartesianVector = new THREE.Vector3(R, 0, 0);
drawVector(scene, cartesianVector, 0xffaaff);


// ------------- Orthographic camera -------------
let orthoSize = 2.5; // FRUSTUM SIZE CHANGED TO 2.5 FOR CLOSER VIEW
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -orthoSize * aspect, orthoSize * aspect,
    orthoSize, -orthoSize,
    0.1, 1000
);
camera.position.set(2.5, 2.5, 2.5); 
camera.lookAt(0,0,0);

// ------------- Controls (rotate around target + zoom to target) -------------
const controls = new OrbitControls(camera, renderer.domElement);

controls.target.set(0, 0, 0);     // pivot point = origin
controls.enablePan = false;       // optional: disable panning so user always orbits origin
controls.enableDamping = true;    // smooth motion
controls.dampingFactor = 0.08;
controls.zoomSpeed = 1.2;         // feel of wheel zoom
controls.rotateSpeed = 0.6;


// ------------- Handle resize properly -------------
function onResize() {
  aspect = window.innerWidth / window.innerHeight;
  const halfHeight = orthoSize;
  const halfWidth = orthoSize * aspect;

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize, false);
onResize();

// optional: double-click to reset view
window.addEventListener('dblclick', () => {
  // flies camera back to a nice default position
  camera.position.set(2.5, 2.5, 2.5); // UPDATED RESET POSITION
  camera.zoom = 1.0;
  camera.updateProjectionMatrix();
  controls.target.set(0,0,0);
  controls.update();
});

// ------------- Animation loop -------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();    // required for damping
  renderer.render(scene, camera);
}
animate();

var biggusStatus = new THREE.Vector3(1, 1, 0);

const cartesianVector2 = new THREE.Vector3(1, 1, 0);
drawVector(scene, cartesianVector2.normalize(), 0xff0000);

const xed = applyPauliZ(biggusStatus);
console.log("hihiha");
console.log(xed);
drawVector(scene, xed, 0xff0000);



/// QBIT API
function addNewQbit(x,y,z) {

}

function deleteQbit(index) {

}

function selectQbit(index) {

}

function applyGate(gate) {

}


document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const uiContainer = document.getElementById('ui-container');
    const themeBtn = document.getElementById('themeBtn');

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
          scene.add(grid);
        } else {  
          scene.background = new THREE.Color(0x303030);
          scene.remove(grid);
          grid = new THREE.GridHelper(5, 10, 0x606060, 0x404040);
          scene.add(grid);
        }
    });
});
