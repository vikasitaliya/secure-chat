import * as THREE from 'three';

const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Create floating geometric shapes
const geometry = new THREE.IcosahedronGeometry(1, 0);
const material = new THREE.MeshStandardMaterial({
  color: 0xff8acc,
  emissive: 0x552244,
  wireframe: true,
  transparent: true,
  opacity: 0.4
});
const shape = new THREE.Mesh(geometry, material);
scene.add(shape);

const geometry2 = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
const material2 = new THREE.MeshStandardMaterial({
  color: 0x8a85ff,
  emissive: 0x333366,
  wireframe: true,
  transparent: true,
  opacity: 0.3
});
const shape2 = new THREE.Mesh(geometry2, material2);
shape2.position.x = 2;
shape2.position.y = 1;
shape2.position.z = -2;
scene.add(shape2);

// Add ambient light and point lights
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);
const light1 = new THREE.PointLight(0xff8acc, 1, 10);
light1.position.set(2, 3, 4);
scene.add(light1);
const light2 = new THREE.PointLight(0x8a85ff, 1, 10);
light2.position.set(-3, -1, 2);
scene.add(light2);

camera.position.z = 5;

// Mouse interaction
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
});

function animate() {
  requestAnimationFrame(animate);

  // Rotate shapes based on mouse
  shape.rotation.x += 0.01 + mouseY * 0.02;
  shape.rotation.y += 0.01 + mouseX * 0.02;
  shape2.rotation.x += 0.005;
  shape2.rotation.y += 0.01;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});