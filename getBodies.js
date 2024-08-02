import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const sceneMiddle = new THREE.Vector3(0, 0, 0);
const loader = new GLTFLoader();
const modelPath = 'static/models/teddyHead.gltf'; // Update this path to your model

function loadModel() {
    return new Promise((resolve, reject) => {
        loader.load(modelPath, (gltf) => {
            const mesh = gltf.scene;
            mesh.scale.set(1, 1, 1); // Scale model to appropriate size
            resolve(mesh);
        }, undefined, (error) => {
            reject(new Error('An error happened while loading the model: ' + error.message));
        });
    });
}

async function getBody(world) {
    const size = 0.1 + Math.random() * 0.15;
    const range = 2;
    const density = size * 0.1;
    let angle = Math.random() * 2 * Math.PI;
    let x = Math.random() * range - range * 0.5;
    let y = Math.random() * range - range * 0.5;
    let z = Math.random() * range - range * 0.5;

    // Create physics body
    const body = new CANNON.Body({
        mass: density,
        position: new CANNON.Vec3(x, y, z),
    });
    body.addShape(new CANNON.Sphere(size));

    // Set initial velocity to simulate orbit
    body.velocity.set(-Math.sin(angle), 0, Math.cos(angle));

    // Add the body to the physics world
    world.addBody(body);

    // Load 3D model and create visual mesh
    let mesh = await loadModel();

    function update() {
        const orbitSpeed = 1;
        let pos = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
        let dir = pos.clone().sub(sceneMiddle).normalize();
        body.applyForce(dir.multiplyScalar(-orbitSpeed), body.position);
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    }

    return { mesh, body, update };
}

export { getBody };