import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as QMath from './math.js';

const SPHERE_RADIUS = 1.0;
const NUM_ARC_POINTS = 64;

const ARROW_SHAFT_RADIUS = 0.015;
const ARROW_HEAD_LENGTH = 0.12;
const ARROW_HEAD_RADIUS = 0.05;


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
  
  const axis = arcPlaneNormal.clone().normalize();
  
  const stepAngle = angle / (numPoints - 1);

  const qStep = new THREE.Quaternion().setFromAxisAngle(axis, stepAngle);

  const points = [];
  const currentPoint = vStart.clone();
  
  for (let i = 0; i < numPoints; i++) {
    points.push(currentPoint.clone());
    currentPoint.applyQuaternion(qStep);
  }

  return points;
}


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
    linewidth: 2, 
    transparent: true,
    opacity: 0.8
  });

  const arc = new THREE.Line(arcGeometry, arcMaterial);
  scene.add(arc);
  return arc;
}


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
    const { 
        shaftRadius = ARROW_SHAFT_RADIUS, 
        headLength = ARROW_HEAD_LENGTH, 
        headRadius = ARROW_HEAD_RADIUS 
    } = options;

    const length = vEnd.length();
    const material = new THREE.MeshBasicMaterial({ color: colorHex });
    const arrowGroup = new THREE.Group();

    if (length < 1e-5) return arrowGroup;

    const shaftLength = length - headLength;
    if (shaftLength > 0) {
        const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 8);
        const shaft = new THREE.Mesh(shaftGeometry, material);

        shaft.position.y = shaftLength / 2;
        
        arrowGroup.add(shaft);
    }
    
    const headGeometry = new THREE.ConeGeometry(headRadius, headLength, 12);
    const head = new THREE.Mesh(headGeometry, material);
    
    head.position.y = length - headLength / 2;

    arrowGroup.add(head);

   
    const direction = vEnd.clone().normalize();
    
    const upVector = new THREE.Vector3(0, 1, 0); 
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, direction);
    
    arrowGroup.setRotationFromQuaternion(quaternion);

    scene.add(arrowGroup);
    return arrowGroup;
}


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight); 
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x303030);

const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x888888, 
    wireframe: false, 
    transparent: true,
    opacity: 0.1,
    depthWrite: false 
});
const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphereMesh);


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


const originSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.025, 12, 12), 
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(originSphere);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,10,7);
scene.add(light);


const R = SPHERE_RADIUS;
const PI = Math.PI;

const n_X = new THREE.Vector3(1, 0, 0); 
const n_Y = new THREE.Vector3(0, 1, 0); 
const n_Z = new THREE.Vector3(0, 0, 1); 


let vStart = new THREE.Vector3(0, R, 0);
drawArc(scene, generateArcPoints(vStart, n_X, PI, NUM_ARC_POINTS), 0xff0000); 
vStart = new THREE.Vector3(0, -R, 0);
drawArc(scene, generateArcPoints(vStart, n_X, PI, NUM_ARC_POINTS), 0xff0000); 

vStart = new THREE.Vector3(R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Y, PI, NUM_ARC_POINTS), 0x00ff00); 
vStart = new THREE.Vector3(-R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Y, PI, NUM_ARC_POINTS), 0x00ff00);

vStart = new THREE.Vector3(R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Z, PI, NUM_ARC_POINTS), 0x0000ff); 
vStart = new THREE.Vector3(-R, 0, 0);
drawArc(scene, generateArcPoints(vStart, n_Z, PI, NUM_ARC_POINTS), 0x0000ff);

const theta = PI / 4; 
const phi = PI / 3;  

const stateVectorSpherical = new THREE.Vector3(
    R * Math.sin(theta) * Math.cos(phi),
    R * Math.sin(theta) * Math.sin(phi),
    R * Math.cos(theta)                  
);


let orthoSize = 2.5; 
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -orthoSize * aspect, orthoSize * aspect,
    orthoSize, -orthoSize,
    0.1, 1000
);
camera.up.set(0,0,1);
camera.position.set(-2.5, -2.5, 2.5); 
camera.lookAt(0,0,0);

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.set(0, 0, 0);     
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.zoomSpeed = 1.2;         
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
  controls.update();    
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

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); 
}


function createColorBox(color) {
    const colorbox = document.createElement('div');
    colorbox.className = 'color-box';
    colorbox.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
    return colorbox;
}

function updateCoordinates(id, { x, y, z }) {
    const element = document.getElementById(id);
    const coords = element.querySelector('.coordinates');
    coords.textContent = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;
}

function createCoordinateBox(x, y, z) {
    const coords = document.createElement('div');
    coords.className = 'coordinates';
    coords.textContent = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`;
    return coords;
}

function createDeleteBtn(wrapper,id) {
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';

    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        wrapper.remove();
        deleteQbit(id);
    });

    return deleteBtn;
}

function createResetBtn(id) {
    const resetBtn = document.createElement('div');
    resetBtn.className = 'reset-btn';
    resetBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i>`;

    resetBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        reset(id);
    });

    return resetBtn;
}


function createElement(color, x, y, z, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'element';
    wrapper.setAttribute('id', id);

    const colorbox = createColorBox(color);
    const coords = createCoordinateBox(x, y, z);
    const resetBtn = createResetBtn(id);
    const deleteBtn = createDeleteBtn(wrapper,id);


    const actionBtns = document.createElement('div');
    actionBtns.className = 'action-btns';
    actionBtns.appendChild(deleteBtn);
    actionBtns.appendChild(resetBtn);

    wrapper.appendChild(colorbox);
    wrapper.appendChild(coords);
    wrapper.appendChild(actionBtns);

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

function toggleLightScene() {
    scene.background = new THREE.Color(0xF0F0F0);
    scene.remove(grid);
    grid = new THREE.GridHelper(5, 10, 0xB0B0B0, 0xD0D0D0);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
}

function toggleDarkScene() {
    scene.background = new THREE.Color(0x303030);
    scene.remove(grid);
    grid = new THREE.GridHelper(5, 10, 0x606060, 0x404040);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
}

function registerToggleBtnListener() {
    const uiContainer = document.getElementById('ui-container');
    const toggleBtn = document.getElementById('toggleBtn');


    toggleBtn.addEventListener('click', () => {
        uiContainer.classList.toggle('closed');
        toggleBtn.classList.toggle('open');
    });
}

function registerThemeBtnListener() {
    const themeBtn = document.getElementById('themeBtn');

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
        if (scene.background.equals(new THREE.Color(0x303030))) {
            toggleLightScene();
        } else {
            toggleDarkScene();
        }
    });

}

function registerXGateBtnListener() {
    const xbutton = document.getElementById('x-gate-btn');
    xbutton.addEventListener('click', () => applyGate(QMath.PAULI_X));

}

function registerYGateBtnListener() {
    const ybutton = document.getElementById('y-gate-btn');
    ybutton.addEventListener('click', () => applyGate(QMath.PAULI_Y));
}

function registerZGateBtnListener() {
    const zbutton = document.getElementById('z-gate-btn');
    zbutton.addEventListener('click', () => applyGate(QMath.PAULI_Z));
}


function registerHGateBtnListener() {
    const hbutton = document.getElementById('h-gate-btn');
    hbutton.addEventListener('click', () => applyGate(QMath.HADAMARD));
}

function registerSGateBtnListener() {
    const sbutton = document.getElementById('s-gate-btn');
    sbutton.addEventListener('click', () => applyGate(QMath.S_GATE));
}

function registerPHBtnListener() {
    const phbutton = document.getElementById('ph-gate-btn');

    phbutton.addEventListener('click', () => {
        let degree = document.getElementById('phase-degrees').value;
        applyGate(QMath.PHASE_GATE(degree / 180.0 * Math.PI));
    });

}

function registerAddBtnListener() {

    const listContainer = document.getElementById('listContainer');

    const vecXInput = document.getElementById('vecX');
    const vecYInput = document.getElementById('vecY');
    const vecZInput = document.getElementById('vecZ');


    const addBtn = document.getElementById('addBtn').addEventListener
        ('click', () => {

            const coordinateX = parseFloat(vecXInput.value);
            const coordinateY = parseFloat(vecYInput.value);
            const coordinateZ = parseFloat(vecZInput.value);

            if (isNaN(coordinateX) || isNaN(coordinateY) || isNaN(coordinateZ)) {
                alert("You must enter numbers");
                return;
            }


            if (coordinateX == 0 && coordinateY == 0 && coordinateZ == 0) {
                alert("Please give a non null vector");
                return;
            }

            const normalized = normalize(coordinateX, coordinateY, coordinateZ);

            const randColor = Math.floor(Math.random() * 0xFFFFFF);
            let randomID = getRandomIntInclusive(100000, 999999);
            const newElement = createElement(randColor, normalized.x, normalized.y, normalized.z, randomID);

            listContainer.appendChild(newElement);

            addNewQbit(randomID, normalized.x, normalized.y, normalized.z, randColor);
        });
}


function registerPhaseInputListener() {
const phaseInput = document.getElementById('phase-degrees');

phaseInput.addEventListener('input', () => {
    if (phaseInput.value.length > 3) {
        phaseInput.value = phaseInput.value.slice(0, 3);
    }
});
phaseInput.addEventListener('click', (e) => {
    e.stopPropagation();
});

}

function registerClearBtnListener() {
const clearBtn = document.getElementById('clearBtn');

    clearBtn.addEventListener("click", () => {
        Array.from(listContainer.children).forEach(children => children.remove());
        clear();
    });

}


function RegisterListeners() {
    registerToggleBtnListener();

    document.addEventListener('DOMContentLoaded', () => {
        registerThemeBtnListener();
        registerXGateBtnListener();
        registerYGateBtnListener();
        registerZGateBtnListener();
        registerHGateBtnListener();
        registerSGateBtnListener();
        registerPHBtnListener();
        registerAddBtnListener();
        registerPhaseInputListener();
        registerClearBtnListener();;
    });
}


RegisterListeners();