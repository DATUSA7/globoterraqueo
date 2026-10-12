import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// 1. ESTILOS LÍQUIDOS Y RESPONSIVOS (Inyectados para compatibilidad móvil)
const estiloResponsivo = document.createElement('style');
estiloResponsivo.innerHTML = `
    #mensaje-llegada {
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-family: sans-serif;
        font-size: 3rem; /* Computadora */
        font-weight: bold;
        text-shadow: 2px 2px 10px rgba(0,0,0,0.6);
        display: none; 
        pointer-events: none;
        z-index: 10;
        text-align: center;
        width: 90%;
    }
    #btn-reiniciar {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(21, 29, 48, 0.9);
        color: #f3f4f6;
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.8rem 1.5rem;
        font-family: sans-serif;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        display: none; 
        z-index: 20;
        backdrop-filter: blur(5px);
        transition: all 0.2s ease;
    }
    /* 📱 MEDIA QUERIES PARA PANTALLAS MÓVILES */
    @media (max-width: 768px) {
        #mensaje-llegada {
            font-size: 1.8rem; /* Texto más pequeño para que no se corte en smartphones */
            top: 40%;
        }
        #btn-reiniciar {
            top: auto;
            bottom: 30px; /* En móviles es más cómodo presionar botones abajo con el pulgar */
            right: 50%;
            transform: translateX(50%); /* Centrado perfectamente en la parte inferior */
            width: 80%;
            text-align: center;
        }
    }
`;
document.head.appendChild(estiloResponsivo);

// Crear los elementos usando las clases de los estilos responsivos anteriores
const letrero = document.createElement('div');
letrero.id = 'mensaje-llegada';
letrero.innerHTML = '¡Guerita llega a CDMX!';
document.body.appendChild(letrero);

const btnReiniciar = document.createElement('button');
btnReiniciar.id = 'btn-reiniciar';
btnReiniciar.innerHTML = '🔄 Reiniciar viaje';
document.body.appendChild(btnReiniciar);

// Hover del botón
btnReiniciar.addEventListener('mouseenter', () => {
    btnReiniciar.style.background = '#e01e69';
    btnReiniciar.style.borderColor = '#e01e69';
});
btnReiniciar.addEventListener('mouseleave', () => {
    btnReiniciar.style.background = 'rgba(21, 29, 48, 0.9)';
    btnReiniciar.style.borderColor = 'rgba(255, 255, 255, 0.15)';
});

// 2. CONFIGURACIÓN DEL RENDERER Y ESCENA
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita a 2 para no destruir la batería del celular
document.body.appendChild(renderer.domElement);

/* =====================================================
   SISTEMA DE AUDIO POSICIONAL
===================================================== */
const listener = new THREE.AudioListener();
camera.add(listener);

const airplaneSound = new THREE.PositionalAudio(listener);
const audioLoader = new THREE.AudioLoader();
let audioLoaded = false;
let userInteracted = false;

audioLoader.load(
  '/airplane.mp3',
  (buffer) => {
    airplaneSound.setBuffer(buffer);
    airplaneSound.setLoop(true); 
    airplaneSound.setVolume(1.0);
    airplaneSound.setRefDistance(5);
    airplaneSound.setMaxDistance(100);
    airplaneSound.setRolloffFactor(1.2);
    audioLoaded = true;
  },
  undefined,
  (error) => {
    console.error('Error cargando audio:', error);
  }
);

window.addEventListener(
  'click',
  async () => {
    userInteracted = true;
    await listener.context.resume();
    if (audioLoaded && !airplaneSound.isPlaying && fraction < 1) {
      airplaneSound.play();
    }
  },
  { once: true }
);

const controls = new OrbitControls(camera, renderer.domElement);

// Ajustar distancia inicial de la cámara según el dispositivo
const esMovil = window.innerWidth < 768;
camera.position.set(0, esMovil ? 14 : 10, esMovil ? 18 : 15); // Más lejos en móvil para encuadrar bien
controls.enableDamping = true; 

// 3. ILUMINACIÓN
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// 4. CREACIÓN DEL GLOBO TERRÁQUEO
const earthGroup = new THREE.Group(); 
scene.add(earthGroup);

const earthGeometry = new THREE.SphereGeometry(5, 64, 64);
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('/textures/earth_color.jpg'); 

const earthMaterial = new THREE.MeshStandardMaterial({ 
    map: earthTexture,
    roughness: 0.8,
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earthGroup.add(earth);

// 5. LÓGICA GEOGRÁFICA
function latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

const posAlemania = latLongToVector3(51.1657, 10.4515, 5);
const posMexico = latLongToVector3(23.6345, -102.5528, 5);

const midPoint = new THREE.Vector3().addVectors(posAlemania, posMexico).multiplyScalar(0.5);
midPoint.normalize().multiplyScalar(6.8); 

const flightCurve = new THREE.QuadraticBezierCurve3(posAlemania, midPoint, posMexico);

// 6. CARGA DEL AVIÓN
const avionContainer = new THREE.Group();
earthGroup.add(avionContainer); 
avionContainer.add(airplaneSound);

const loader = new GLTFLoader();
loader.load('/avion.glb', (gltf) => {
    const modeloAvion = gltf.scene;
    modeloAvion.scale.set(0.05, 0.05, 0.05); 
    modeloAvion.rotation.y = Math.PI; 
    avionContainer.add(modeloAvion);
});

let fraction = 0;
const speed = 0.0015; 

// --- MARCADORES CON CANVAS CORREGIDO ---
function crearMarcador(nombre, posicion, color) {
    const grupoMarcador = new THREE.Group();
    grupoMarcador.position.copy(posicion);

    const puntoGeo = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 16),
        new THREE.MeshBasicMaterial({ color: color })
    );
    grupoMarcador.add(puntoGeo);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.font = 'Bold 32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(nombre, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.y = 0.5; 
    sprite.scale.set(1.5, 0.75, 1);
    grupoMarcador.add(sprite);

    earthGroup.add(grupoMarcador);
    return grupoMarcador;
}

crearMarcador("Alemania", posAlemania, 0xffcc00); 
crearMarcador("México", posMexico, 0x10b981);    

// --- TRAYECTORIA ---
const puntosCurva = flightCurve.getPoints(60); 
const geometriaTrayectoria = new THREE.BufferGeometry().setFromPoints(puntosCurva);

const materialTrayectoria = new THREE.LineDashedMaterial({ 
    color: 0xffffff, 
    dashSize: 0.3,  
    gapSize: 0.2,   
    transparent: true,
    opacity: 0.4
});

const lineaVuelo = new THREE.Line(geometriaTrayectoria, materialTrayectoria);
lineaVuelo.computeLineDistances(); 
earthGroup.add(lineaVuelo);

function reiniciarVuelo() {
    fraction = 0; 
    letrero.style.display = 'none'; 
    btnReiniciar.style.display = 'none'; 

    if (audioLoaded && userInteracted && !airplaneSound.isPlaying) {
        airplaneSound.play();
    }
}

btnReiniciar.addEventListener('click', reiniciarVuelo);

// 7. BUCLE DE ANIMACIÓN RESPONSIVO
// Variable auxiliar para cálculos matemáticos reutilizables (evita crear basura en memoria)
const matrixRotation = new THREE.Matrix4();

function animate() {
    requestAnimationFrame(animate);

    if (fraction < 1) {
        earthGroup.rotation.y += 0.0003;

        if (avionContainer.children.length > 0) {
            fraction += speed;

            if (fraction >= 1) {
                fraction = 1;
                if (airplaneSound.isPlaying) airplaneSound.stop();
                letrero.style.display = 'block'; 
                btnReiniciar.style.display = 'block'; 
            }

            // 1. Mover el contenedor a la posición de la curva
            const newPos = flightCurve.getPoint(fraction);
            avionContainer.position.copy(newPos);

            // 2. Obtener el vector Tangente (hacia dónde avanza el avión en este instante)
            const tangent = flightCurve.getTangentAt(fraction).normalize();

            // 3. Obtener el vector Normal (apunta directamente hacia el cielo desde el centro de la tierra)
            const upVector = newPos.clone().normalize();

            // 4. Calcular el vector Binormal (perpendicular al avance y al cielo) para estabilizar las alas
            const binormal = new THREE.Vector3().crossVectors(upVector, tangent).normalize();

            // 5. Re-calcular la tangente ortogonal para garantizar un ángulo de 90° perfecto
            const correctedTangent = new THREE.Vector3().crossVectors(binormal, upVector).normalize();

            // 6. Construir una Matriz de Orientación pura basada en los 3 ejes reales de vuelo
            // Eje X (alas) = binormal, Eje Y (techo) = upVector, Eje Z (nariz) = correctedTangent
            matrixRotation.makeBasis(binormal, upVector, correctedTangent);

            // 7. Aplicar la rotación absoluta mediante un Cuaternión (Elimina por completo el derrape o lookAt roto)
            avionContainer.quaternion.setFromRotationMatrix(matrixRotation);
        }
    }

    controls.update(); 
    renderer.render(scene, camera);
}

animate();

// 8. CORRECCIÓN DINÁMICA DE VIEWPORT (Capa responsiva adaptativa)
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    // Ajustar interactivamente la distancia de la cámara en caliente si rotan el teléfono
    if (width < 768) {
        controls.minDistance = 10;
        controls.maxDistance = 30;
    } else {
        controls.minDistance = 5;
        controls.maxDistance = 25;
    }
});
