import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, model;
const selectedPartsNames = new Set();
const partTranslation = {
    "Head": "الجمجمة / الرأس",
    "Chest&Abdo": "الصدر والبطن",
    "Arm_L": "الطرف العلوي الأيسر", "Arm_R": "الطرف العلوي الأيمن",
    "Leg_L": "الطرف السفلي الأيسر", "Leg_R": "الطرف السفلي الأيمن",
    "Sensitive_Place1": "منطقة حساسة"
};

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const loader = new GLTFLoader();
    loader.load('models/bodyyy.glb', (gltf) => {
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center); 
        model.traverse(child => {
            if (child.isMesh) child.material = new THREE.MeshStandardMaterial({ color: 0x8da3b5 });
        });
        scene.add(model);
    });

    window.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);
}

function onMouseClick(e) {
    if (e.target.tagName !== 'CANVAS') return;
    const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        const translatedName = partTranslation[target.name] || target.name;
        
        if (!selectedPartsNames.has(translatedName)) {
            updateRegistry(translatedName);
            target.material = target.material.clone();
            target.material.emissive.setHex(0x00f2ff);
            gsap.to(target.material, { emissiveIntensity: 1, duration: 0.3 });
        }
    }
}

function updateRegistry(name) {
    const container = document.getElementById('selected-parts-registry');
    if (selectedPartsNames.size === 0) container.innerHTML = ''; 
    selectedPartsNames.add(name);
    
    const badge = document.createElement('span');
    badge.className = 'part-badge';
    badge.id = `badge-${name}`;
    badge.innerHTML = `${name} <i class="remove-btn" onclick="removePart('${name}')">×</i>`;
    container.appendChild(badge);
}

window.removePart = function(name) {
    selectedPartsNames.delete(name);
    const badge = document.getElementById(`badge-${name}`);
    if (badge) badge.remove();

    if (selectedPartsNames.size === 0) {
        document.getElementById('selected-parts-registry').innerHTML = '<span class="placeholder">اضغط على النموذج لتحديد الإصابة...</span>';
    }

    model.traverse(child => {
        const originalKey = Object.keys(partTranslation).find(key => partTranslation[key] === name);
        if (child.name === (originalKey || name)) {
            gsap.to(child.material.emissive, { r: 0, g: 0, b: 0, duration: 0.5 });
        }
    });
}

window.triggerFullAnalysis = async function() {
    const outputBox = document.getElementById('output-text');
    const panel = document.getElementById('analysis-panel');
    const submitBtn = document.getElementById('main-submit');

    if (selectedPartsNames.size === 0) return alert("يرجى تحديد جزء متضرر");

    panel.classList.remove('hidden');
    outputBox.innerHTML = '<div style="color: var(--cyan)">جاري تحليل البيانات عبر RAG Agent </div>';
    submitBtn.disabled = true;

    const payload = {
        parts: Array.from(selectedPartsNames),
        sex: document.getElementById('victim-sex').value,
        age: document.getElementById('victim-age').value,
        weapon: window.currentWeapon,
        description: document.getElementById('crime-result').value
    };

    try {
    const res = await fetch("fill__________________api_______________ key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    const data = await res.json();

    let finalText = "";

    if (Array.isArray(data) && data.length > 0) {
        finalText = data[0].output || data[0].text || JSON.stringify(data[0]);
    } else {
        finalText = data.output || data.text || JSON.stringify(data);
    }

    outputBox.innerHTML = `<div class="ai-content">${finalText.replace(/\n/g, '<br>')}</div>`;

} catch (e) {
    outputBox.innerHTML = '<div class="error">فشل في استلام رد من النظام الذكي.</div>';
}
}

window.resetSelections = () => location.reload();

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if(controls) controls.update();
    renderer.render(scene, camera);
}