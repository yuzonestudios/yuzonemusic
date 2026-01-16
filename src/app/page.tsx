"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Text, Stars } from "@react-three/drei";
import Lenis from "lenis";
import { Music, ArrowRight } from "lucide-react";
import styles from "./page.module.css";
import { Group } from "three";

// 3D Components
function FloatingNote({ position, rotation, scale, color }: any) {
    const meshRef = useRef<Group>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
            meshRef.current.position.y += Math.sin(state.clock.elapsedTime) * 0.002;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
                <mesh>
                    <torusGeometry args={[1, 0.3, 16, 32]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
                </mesh>
            </group>
        </Float>
    );
}

function Scene() {
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <FloatingNote position={[-3, 2, -5]} rotation={[0, 0, 0.5]} scale={0.5} color="#06b6d4" />
            <FloatingNote position={[4, -1, -4]} rotation={[0.5, 0.2, 0]} scale={0.7} color="#8b5cf6" />
            <FloatingNote position={[-4, -3, -6]} rotation={[0.2, 0.5, 0]} scale={0.4} color="#f43f5e" />


        </>
    );
}

export default function LandingPage() {
    useEffect(() => {
        const lenis = new Lenis();

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
        };
    }, []);

    return (
        <div className={styles.container}>
            {/* Background Canvas */}
            <div className={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 0, 5] }}>
                    <Scene />
                </Canvas>
            </div>
            <div className={styles.gradientOverlay} aria-hidden />

            {/* Content Overlay */}
            <main className={styles.main}>
                <nav className={styles.nav}>
                    <div className={styles.logo}>
                        <Music className="w-8 h-8 text-cyan-400" />
                        <span className={styles.logoText}>YUZONE</span>
                    </div>
                    <Link href="/login" className={styles.loginBtn}>
                        Sign In
                    </Link>
                </nav>

                <div className={styles.hero}>
                    <h1 className={styles.title}>
                        <span className={styles.gradientText}>Future of Music</span>
                        <br />
                        Is Here
                    </h1>
                    <p className={styles.subtitle}>
                        Experience music like never before with high-fidelity streaming,
                        immersive visualizations, and a community-driven platform.
                    </p>

                    <Link href="/login" className={styles.ctaBtn}>
                        Get Started
                        <ArrowRight size={20} />
                    </Link>
                </div>

                <div className={styles.features}>
                    <div className={styles.featureCard}>
                        <h3>High Quality</h3>
                        <p>Stream in crystal clear HD audio.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <h3>Ad Free</h3>
                        <p>No interruptions, just music.</p>
                    </div>
                    <div className={styles.featureCard}>
                        <h3>Global Charts</h3>
                        <p>Access top hits from around the world.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
