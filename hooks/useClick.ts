import { useCallback, useRef } from "react";

export const useClick = ({
  setHearts,
  heartContainerRef,
  setEyePosition,
  setClickerCount,
}) => {
const timeoutRef = useRef(null);
  
  const handleClick = useCallback(
    (evt) => {
      evt.preventDefault();
      // hideSnackbar();
      const rect = heartContainerRef.current.getBoundingClientRect();
      const x = evt.pageX - rect.left - Math.random();
      const y = evt.pageY - rect.top - Math.random() * 60;

      setEyePosition({ x: evt.clientX, y: evt.clientY });
      setHearts((prevHearts) => [...prevHearts, { x, y, id: Date.now() }]);
      setClickerCount((prevCount) => prevCount + 1);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setEyePosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }, 1500);
    },
    [setHearts, setEyePosition, heartContainerRef, setClickerCount],
  );

  return {
    handleClick,
  };
};
