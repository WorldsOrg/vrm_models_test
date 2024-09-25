"use client";

import { useClick } from "@/hooks/useClick";

// Component imports
import ThreeJSComponent from "@/components/ThreeJs";
import { useEffect, useRef, useState } from "react";
import HeartComponent from "@/components/Heart/HeartComponent";

// Main Home component
export default function Home() {
  const heartContainerRef = useRef(null);
  const [hearts, setHearts] = useState([]);
  const [eyePosition, setEyePosition] = useState({ x: 10, y: 10 });
  const [modelReady, setModelReady] = useState(false);
  const [clickerCount, setClickerCount] = useState(1);
  const [testAnimation, setTestAnimation] = useState(false);
  
  const { handleClick } = useClick({
    setHearts,
    heartContainerRef,
    setEyePosition,
    setClickerCount,
  });
  
  const setReady = () => {
    setModelReady(true);
  };

  useEffect(() => {
    if (!modelReady || !heartContainerRef.current) return;
    if (heartContainerRef.current) {
      heartContainerRef.current.addEventListener("click", handleClick);
    }
    return () => {
      if (heartContainerRef.current) {
        heartContainerRef.current.removeEventListener("click", handleClick);
      }
    };
  }, [heartContainerRef.current, modelReady, handleClick]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative text-center">
      
      <ThreeJSComponent clickerCount={clickerCount} eyePosition={eyePosition} setReady={setReady} testAnimation={testAnimation} setTestAnimation={setTestAnimation} />
      <div className="fixed inset-0 flex text-center left-1/4 items-center justify-center z-10 top-28 w-1/2 h-[80vh]">
        <div className="relative inset-0 z-10 w-1/2 h-[80vh]" ref={heartContainerRef}>
          <HeartComponent hearts={hearts} />
          {!testAnimation && <button onClick={() => setTestAnimation(true)} className="mt-4 p-2 bg-blue-500 text-white rounded">Animate</button>}
        </div>
      </div>
    </div>
  );
}
