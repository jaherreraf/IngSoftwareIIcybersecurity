import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber'; 
import { useGLTF } from '@react-three/drei';
function LogoModel() {
    const { scene } = useGLTF('../assets/malware'); 
    const ref = useRef();

    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.y += 0.005; 
        }
    });

    return (
        <primitive 
            object={scene} 
            ref={ref} 
            scale={0.5} 
            position={[0, 0, 0]} 
        />
    );
}

export default function Animated3DLogo() { // Exportamos el componente final
    return (
        <Canvas style={{ width: '64px', height: '64px' }} camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={1.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <LogoModel /> 
        </Canvas>
    );
}