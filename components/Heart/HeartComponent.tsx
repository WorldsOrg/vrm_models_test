import React from "react";
import { Heart } from "@/components/Heart/Heart";

const HeartComponent = React.memo(({ hearts }: { hearts: Array<{ x: number; y: number; id: number }> }) => {
  return (
    <>
      {hearts.map((heart) => (
        <Heart key={heart.id} x={heart.x} y={heart.y} />
      ))}
    </>
  );
});

HeartComponent.displayName = "HeartComponent";

export default HeartComponent;
