import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 5);
scene.add(light);


camera.position.z = 3;

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();




let lightMode = false; 

const themeBtn = document.getElementById('themeBtn');
themeBtn.addEventListener('click', () => {
  lightMode = !lightMode;

  if(lightMode){
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    renderer.setClearColor(0xffffff); 
  } else {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    renderer.setClearColor(0x111111); 
  }
});

const uiContainer = document.getElementById('ui-container');
const toggleBtn = document.getElementById('toggleBtn');

toggleBtn.addEventListener('click', () => {
  uiContainer.classList.toggle('closed');  
  toggleBtn.classList.toggle('open');      
});


