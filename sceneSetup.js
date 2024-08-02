import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// import { createPhysicsBox, world } from './physics.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export class SceneSetup {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.model = null;
    this.pentacleModel = null;
    // this.flyingCrossModel = null;
    // this.modelBody = null;
    this.mixer = null;
    this.pentacleMixer = null;
    this.lighting = {
      ambientLightColor: 0x414e50,
      ambientLightIntensity: 1.2,
      directionalLightColor: 0xe8e3b3,
      directionalLightIntensity: 0.47,
      spotLightColor: 0x8fafff,
      spotLightIntensity: 0.44,
    };
  }

  async initThreeJS() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    this.renderer.setClearColor(0x1f1e1c, 1);

    await this.loadPredefinedScene();

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5, // strength
      0.2, // radius
      0.9 // threshold
    );

    // Add HDR environment map
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('static/textures/kloppenheim_04_1k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
      this.scene.background = texture;
    });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.addLighting();
    await this.loadModels();
  }

  async loadPredefinedScene() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('static/models/scene.gltf');
    this.scene.add(gltf.scene);
    this.camera = gltf.cameras[0];
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    gltf.scene.traverse((child) => {
      if (child.isLight) {
        this.scene.add(child.clone());
      }
      // Apply sRGB encoding to diffuse textures
      if (child.isMesh && child.material.map) {
        child.material.map.encoding = THREE.sRGBEncoding;
      }
    });
  }

  addLighting() {
    this.ambientLight = new THREE.AmbientLight(this.lighting.ambientLightColor, this.lighting.ambientLightIntensity);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(this.lighting.directionalLightColor, this.lighting.directionalLightIntensity);
    this.directionalLight.position.set(5, 10, 7.5).normalize();
    this.scene.add(this.directionalLight);

    this.spotLight = new THREE.SpotLight(this.lighting.spotLightColor, this.lighting.spotLightIntensity);
    this.spotLight.position.set(15, 40, 35);
    this.spotLight.angle = -Math.PI / 2;
    this.spotLight.penumbra = 0.3;
    this.spotLight.decay = 2;
    this.spotLight.distance = 10;
    this.scene.add(this.spotLight);

  }

  async loadModels() {
    await this.loadModel('static/models/tobyPink.gltf', (gltf) => {
      this.model = gltf.scene;
      this.model.scale.set(0.4, 0.4, 0.4);
      this.model.visible = false;
      this.scene.add(this.model);

      // Apply sRGB encoding to diffuse textures
      this.model.traverse((child) => {
        if (child.isMesh && child.material.map) {
          child.material.map.encoding = THREE.sRGBEncoding;
        }
      });

      this.mixer = new THREE.AnimationMixer(this.model);
      const clips = gltf.animations;
      clips.forEach((clip) => {
        const action = this.mixer.clipAction(clip);
        action.play();
      });
    });

    await this.loadModel('static/models/pentaclePink.gltf', (gltf) => {
      this.pentacleModel = gltf.scene;
      this.pentacleModel.scale.set(0.45, 0.45, 0.45);
      this.pentacleModel.position.set(0, 0.6, 0);
      this.pentacleModel.visible = false;
      this.scene.add(this.pentacleModel);
      this.pentacleModel.rotation.y = -Math.PI / 2;


      this.pentacleMixer = new THREE.AnimationMixer(this.pentacleModel);
      const clips = gltf.animations;
      clips.forEach((clip) => {
        const action = this.pentacleMixer.clipAction(clip);
        action.play();
      });

      // Apply sRGB encoding to diffuse textures
      this.pentacleModel.traverse((child) => {
        if (child.isMesh && child.material.map) {
          child.material.map.encoding = THREE.sRGBEncoding;
        }
      });
    });
  }

  async loadModel(path, callback) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(path);
    callback(gltf);
  }
}

// Export function to load scene model
export const LoadGLTFByPath = (scene) => {
  const scenePath = 'static/models/scene.gltf';
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(scenePath, (gltf) => {
      scene.add(gltf.scene);
      resolve();
    }, undefined, (error) => {
      reject(error);
    });
  });
};