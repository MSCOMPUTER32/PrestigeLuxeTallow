
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- Configuration ---
const CONFIG = {
    camera: {
        fov: 35, // Cinematic focal length
        near: 0.1,
        far: 100,
        initialZ: 2.2 // Very close
    },
    box: {
        width: 3,
        height: 3,
        depth: 3
    },
    goldColor: 0xffd700,
    bloom: {
        strength: 0.25,
        radius: 0.6,
        threshold: 0.1
    }
};

// --- Scene Setup ---
const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
// Scene background handled by CSS for gradient, keep THREE background null or coordinate
scene.background = null;

const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, CONFIG.camera.near, CONFIG.camera.far);
camera.position.set(0, 0, CONFIG.camera.initialZ);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); // Antialias off for post-processing performance usually
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.6;
canvasContainer.appendChild(renderer.domElement);

// --- Post Processing (The "Luxe" Glow) ---
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = CONFIG.bloom.threshold;
bloomPass.strength = CONFIG.bloom.strength;
bloomPass.radius = CONFIG.bloom.radius;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Lighting ---
// Environment for reflections (Gold needs things to reflect)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// Key Light (Warm Gold)
const keyLight = new THREE.SpotLight(0xfff0dd, 10);
keyLight.position.set(5, 5, 5);
keyLight.angle = Math.PI / 4;
keyLight.penumbra = 0.5;
scene.add(keyLight);

// Fill Light (Cooler)
const fillLight = new THREE.PointLight(0xcceeff, 5);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

// Back Light (Rim light for drama)
const backLight = new THREE.SpotLight(0xffd700, 8);
backLight.position.set(0, 5, -5);
backLight.lookAt(0, 0, 0);
scene.add(backLight);

// --- Textures & Materials ---
const textureLoader = new THREE.TextureLoader();
const loadTex = (path) => {
    const tex = textureLoader.load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
};

const textures = {
    front: loadTex('textures/front.jpg'),
    back: loadTex('textures/back.jpg'),
    top: loadTex('textures/top.jpg'),
    bottom: loadTex('textures/bottom.jpg'),
    left: loadTex('textures/left.jpg'),
    right: loadTex('textures/right.jpg')
};

const createMaterial = (texture) => {
    return new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        metalness: 0.6, // High metalness for foil look
        roughness: 0.35,
        envMapIntensity: 1.5,
    });
};

// Box Face Order: Right, Left, Top, Bottom, Front, Back
const materials = [
    createMaterial(textures.right),  // 0
    createMaterial(textures.left),   // 1
    createMaterial(textures.top),    // 2
    createMaterial(textures.bottom), // 3
    createMaterial(textures.front),  // 4
    createMaterial(textures.back)    // 5
];

const geometry = new THREE.BoxGeometry(CONFIG.box.width, CONFIG.box.height, CONFIG.box.depth);
const box = new THREE.Mesh(geometry, materials);
scene.add(box);

// Group to handle rotation independent of scroll for floating effect
const boxGroup = new THREE.Group();
boxGroup.add(box);
scene.add(boxGroup);

// --- Particles (Gold Dust) ---
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1500;
const posArray = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 20; // Spread out
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

// Create a simple circular texture programmatically or use points
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.03,
    color: CONFIG.goldColor,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// --- Animation / ScrollTrigger ---
// Full 6-Side Tour: Front -> Right -> Back -> Left -> Bottom -> Top

// Intro Fade In
gsap.to('.glass-panel', {
    opacity: 1,
    y: 0,
    duration: 1.5,
    ease: 'power3.out',
    delay: 0.5
});

// Setup a Timeline
const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "#content",
        start: "top top",
        end: "bottom bottom",
        scrub: 1
    }
});

// 1. Reveal (Front)
// t=0 to 2
const isMobile = window.innerWidth < 768;
const targetZ = isMobile ? 12.0 : 7.5; // significantly further back on mobile

tl.to('.glass-panel', { opacity: 0, duration: 0.5 }, 0);
tl.to(camera.position, { z: targetZ, duration: 2, ease: "none" }, 0);
tl.to('#step-reveal .info-block', { opacity: 1, duration: 1 }, 0.5); // Show Reveal UI

// 2. Front -> Right (Directions) [Mapped to Ingredients Text]
// Rotate Y to -90
// t=2 to 4
tl.to('#step-reveal .info-block', { opacity: 0, duration: 0.5 }, 2);
tl.to(box.rotation, { y: -Math.PI / 2, duration: 2, ease: "none" }, 2);
tl.fromTo('#step-right .info-block', { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 1 }, 2.5);

// 3. Right -> Back (Ingredients) [Mapped to Promise Text]
// Rotate Y to -180 (or PI)
// t=4 to 6
tl.to('#step-right .info-block', { opacity: 0, x: -50, duration: 0.5 }, 4);
tl.to(box.rotation, { y: -Math.PI, duration: 2, ease: "none" }, 4);
tl.fromTo('#step-back .info-block', { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 1 }, 4.5);

// 4. Back -> Left (Promise) [Mapped to Directions Text]
// Rotate Y to -270 (which is 90 deg)
// t=6 to 8
tl.to('#step-back .info-block', { opacity: 0, x: -50, duration: 0.5 }, 6);
tl.to(box.rotation, { y: -Math.PI * 1.5, duration: 2, ease: "none" }, 6);
tl.fromTo('#step-left .info-block', { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 1 }, 6.5);

// 5. Left -> Bottom (Foundation) [Mapped to Love Text]
// Rotate Y to -360 (0) and X to -90 (show bottom)
// t=8 to 10
tl.to('#step-left .info-block', { opacity: 0, x: -50, duration: 0.5 }, 8);
tl.to(box.rotation, { y: -Math.PI * 2, x: -Math.PI / 2, duration: 2, ease: "none" }, 8);
tl.fromTo('#step-bottom .info-block', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }, 8.5);

// 6. Bottom -> Top (Wake Up) [Mapped to Wake Up Text]
// Rotate X from -90 to +90 (Total 180 flip)
// t=10 to 12
tl.to('#step-bottom .info-block', { opacity: 0, y: -50, duration: 0.5 }, 10);
tl.to(box.rotation, { x: Math.PI / 2, duration: 2, ease: "none" }, 10);
tl.fromTo('#step-top .info-block', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }, 10.5);

// Hold
tl.to({}, { duration: 1 });

// --- Interaction / Parallax ---
const cursor = { x: 0, y: 0 };
window.addEventListener('mousemove', (event) => {
    cursor.x = event.clientX / window.innerWidth - 0.5;
    cursor.y = event.clientY / window.innerHeight - 0.5;
});

// --- Resize Handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Floating box group (Position only)
    boxGroup.position.y = Math.sin(elapsedTime * 0.5) * 0.1;

    // Mouse Parallax
    // We add to the 'base' position which is controlled by GSAP?
    // GSAP controls Z and Rotation. X/Y are free.

    const parallaxStrength = 0.5; // Subtle
    const targetX = cursor.x * parallaxStrength;
    const targetY = -cursor.y * parallaxStrength;

    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    // Particles rotation
    particlesMesh.rotation.y = -elapsedTime * 0.05; // Constant slow spin

    composer.render();
}
animate();
