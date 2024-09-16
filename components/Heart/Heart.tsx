import { useEffect, useState } from "react";
import styles from "./Heart.module.css";

type HeartProps = {
  x: number;
  y: number;
};

export const Heart = ({ x, y }: HeartProps) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
    }, 100);

    const removeTimer = setTimeout(() => {
      const heartElement = document.getElementById(`heart-${x}-${y}`);
      heartElement?.remove();
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [x, y]);

  return (
    <div id={`heart-${x}-${y}`}>
      <svg
        id={`heart-${x}-${y}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ top: y, left: x }} // Changed from right to left
        className={`${styles.animate_move_and_fade} absolute sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-red-500 animate-spin animate-bounce ${
          fade ? "opacity-0" : "opacity-100"
        } transition-opacity duration-1000 `}
      >
        <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
      </svg>
    </div>
  );
};
