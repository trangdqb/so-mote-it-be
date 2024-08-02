import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { HandLandmarker } from './handLandmarker.js';
import { perlin } from './perlinNoise.js';
import { getBody } from './getBodies.js';
import { SceneSetup } from './sceneSetup.js';
import { getParticleSystem } from './getParticleSystem.js';

let scene, camera, renderer, composer, controls;
let clock = new THREE.Clock();
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
let bodies = [];
const handLandmarker = new HandLandmarker();
const sceneSetup = new SceneSetup();
let noiseOffset = 0;
const noiseSpeed = 0.01;
let particleSystem = null;

function generateRandomSpinDirection() {
  return (Math.random() - 0.5) * 0.01;
}

async function init() {
  await sceneSetup.initThreeJS();
  scene = sceneSetup.scene;
  camera = sceneSetup.camera;
  renderer = sceneSetup.renderer;
  composer = sceneSetup.composer;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.3;

  await handLandmarker.initHandLandmarker();

  const checkModelLoaded = setInterval(() => {
    if (sceneSetup.model) {
      particleSystem = getParticleSystem({
        camera: sceneSetup.camera,
        emitter: sceneSetup.model,
        parent: sceneSetup.scene,
        rate: 50.0,
        texture: 'static/textures/star.png', // Ensure this path is correct
      });
      clearInterval(checkModelLoaded);
    }
  }, 100);

  window.addEventListener('resize', handleWindowResize, false);

  animate();
}

async function addBodies() {
  for (let i = 0; i < 10; i++) {
    const body = await getBody(world); // Await the async function
    body.mesh.visible = false; // Set initial visibility to false
    bodies.push(body);
    scene.add(body.mesh);
    world.addBody(body.body);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  world.step(delta);
  composer.render(scene, camera);

  if (sceneSetup.model) {
    if (handLandmarker.predictions.length > 0) {
      let hand1 = handLandmarker.predictions[0];
      let hand2 = handLandmarker.predictions.length > 1 ? handLandmarker.predictions[1] : null;

      if (handLandmarker.isMiddleAndIndexFingersUp(hand1)) {
        if (!sceneSetup.model.visible) {
          sceneSetup.spinDirection = generateRandomSpinDirection();
          if (particleSystem) particleSystem.start();
        }

        sceneSetup.model.visible = true;

        let indexFingerTip = {
          x: 1 - hand1[8].x,
          y: hand1[8].y,
          z: hand1[8].z,
        };

        let middleFingerTip = {
          x: 1 - hand1[12].x,
          y: hand1[12].y,
          z: hand1[12].z,
        };

        let averageFingerTip = {
          x: (indexFingerTip.x + middleFingerTip.x) / 2,
          y: (indexFingerTip.y + middleFingerTip.y) / 2,
          z: (indexFingerTip.z + middleFingerTip.z) / 2,
        };

        sceneSetup.model.position.set(averageFingerTip.x * 9 - 4, -averageFingerTip.y * 9 + 2, -averageFingerTip.z * 20 - 5);

        if (sceneSetup.modelBody) {
          sceneSetup.modelBody.position.set(averageFingerTip.x * 10 - 5, -averageFingerTip.y * 10 + 5, -averageFingerTip.z * 10);
        }

        if (particleSystem) particleSystem.updatePosition(sceneSetup.model.position);

        noiseOffset += noiseSpeed;
        sceneSetup.model.rotation.y += sceneSetup.spinDirection + perlin(noiseOffset) * 0.001;
      } else {
        sceneSetup.model.visible = false;
        if (particleSystem) particleSystem.stop();
      }

      if (hand2 && handLandmarker.areFourFingersUpAndThumbsDown(hand1, hand2)) {
        sceneSetup.pentacleModel.visible = true;
        if (sceneSetup.pentacleMixer) {
          sceneSetup.pentacleMixer.update(delta);
          let hand = handLandmarker.predictions[0];
          let landmarks = hand;
          let rotationY = (1 - landmarks[0].x) * 4 * Math.PI;
          sceneSetup.pentacleModel.rotation.set(0, rotationY, 0);
        }
      } else {
        sceneSetup.pentacleModel.visible = false;
      }

      if (hand2 && handLandmarker.areBothHandsIndexPinkyFingersUp(hand1, hand2)) {
        if (!bodies.length) {
          addBodies();
        }

        bodies.forEach(body => {
          body.mesh.visible = true;
          body.update();
        });
        controls.update();
      } else {
        bodies.forEach(body => {
          body.mesh.visible = false;
        });
      }
    } else {
      sceneSetup.model.visible = false;
      sceneSetup.pentacleModel.visible = false;
      if (particleSystem) particleSystem.stop();
      bodies.forEach(body => {
        body.mesh.visible = false;
      });
    }

    if (particleSystem) {
      particleSystem.update(0.016);
    }

    if (sceneSetup.mixer) {
      sceneSetup.mixer.update(delta);
    }
  }
}

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('DOMContentLoaded', init);