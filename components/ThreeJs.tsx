import React, { memo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "../utils/loadMixamoAnimation";
import * as TWEEN from "@tweenjs/tween.js";
// import { join, resourceDir } from "@tauri-apps/api/path";
// import { convertFileSrc } from "@tauri-apps/api/core";
// import { BaseDirectory, exists } from "@tauri-apps/plugin-fs";

const ThreeJSComponent = memo(function ThreeJSComponent({
  clickerCount,
  eyePosition,
  setReady,
}: {
  clickerCount: number;
  eyePosition: { x: number; y: number };
  setReady: () => void;
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const cameraRef = useRef(null);
  const lightRef = useRef(new THREE.DirectionalLight(0xffffff, 1));
  const sceneRef = useRef(new THREE.Scene());
  const lookAtTargetRef = useRef(new THREE.Object3D());
  const initialPositionRef = useRef(new THREE.Vector3());
  const vrmContainerRef = useRef(new THREE.Object3D());
  const targetLookPositionRef = useRef(new THREE.Vector3(0, 0, 0)); // Target position for smooth scrolling for looking
  const helperRoot = new THREE.Group();
  const controls = useRef(null);
  const blinkInterval = 2.5; // Interval in seconds
  let lastBlinkTime = 0; // Time of the last blink
  const blinkDuration = 0.2; // Duration of the blink in seconds
  let isBlinking = false;

  const currentVrm = useRef(null);
  const currentMixer = useRef(null);
  const idleActionData = useRef(null);
  const loserActionData = useRef(null);
  const wavingActionData = useRef(null);
  const clappingActionData = useRef(null);
  const pose1ActionData = useRef(null);
  const happyActionData = useRef(null);
  const excitedActionData = useRef(null);
  const tapAnimations = [happyActionData, excitedActionData];
  const idleFBXUrl = "/assets/models/Idle.fbx";
  const loserFBXUrl = "/assets/models/Loser.fbx";
  const wavingFBXUrl = "/assets/models/Waving.fbx";
  const clappingFBXUrl = "/assets/models/Clapping.fbx";
  const pose1FBXUrl = "/assets/models/Pose_1.fbx";
  const happyFBXURL = "/assets/models/Happy.fbx";
  const excitedFBXURL = "/assets/models/Excited.fbx";

  const smileAndBowTimeoutRef = useRef(null); // Ref to store the smile timeout
  const expressionTimeoutRef = useRef(null);
  const clickerCountRef = useRef(clickerCount); // Ref to store the clicker count
  const prevClickerCountRef = useRef(0);
  const eyePositionRef = useRef(eyePosition); // Ref to store the eye position

  const [expressionPlaying, setExpressionPlaying] = useState(false);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [lastRandomExpression, setLastRandomExpression] = useState("");
  const [lastRandomAnimation, setLastRandomAnimation] = useState(null);
  const targetNeckRotationRef = useRef(0);
  const [animationsLoaded, setAnimationsLoaded] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  const tapExpressions = ["aa", "happy", "oh", "surprised"];

  const loadVRM = (modelUrl) => {
    const loader = new GLTFLoader();
    loader.crossOrigin = "anonymous";

    helperRoot.clear();

    loader.register((parser) => new VRMLoaderPlugin(parser, { helperRoot: helperRoot, autoUpdateHumanBones: true }));

    setAnimationsLoaded(false);

    loader.load(
      modelUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm;

        if (currentVrm.current) {
          VRMUtils.deepDispose(currentVrm.current.scene);
          vrmContainerRef.current.remove(currentVrm.current.scene);
        }

        currentVrm.current = vrm;
        vrm.lookAt.target = lookAtTargetRef.current;
        vrm.scene.visible = false;
        vrmContainerRef.current.add(vrm.scene);
        helperRoot.clear();

        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        VRMUtils.rotateVRM0(vrm);

        initialPositionRef.current.copy(vrmContainerRef.current.position);

        loadFBX();
      },
      (error) => console.error(error),
    );
  };

  // const checkAndLoadModel = async () => {
  //   const resourceDirPath = await resourceDir();
  //   const modelFile = await join("assets", "models", `${selectedWaifu.name}.vrm`);
  //   const fileSaved = await exists(modelFile, { baseDir: BaseDirectory.Resource });
  //   const filePath = await join(resourceDirPath, modelFile);
  //   const modelUrl = convertFileSrc(filePath);
  //   loadVRM(fileSaved ? modelUrl : "/assets/models/koko.vrm");
  // };

  // if (isSteam) {
  //   checkAndLoadModel();
  // } else {
  //   loadVRM(selectedWaifu.model_url ?? "/assets/models/koko.vrm");
  // }

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(22.0, window.innerWidth / window.innerHeight, 0.1, 20.0);
    camera.position.set(0.0, 1.0, 1.95);
    camera.add(lookAtTargetRef.current);
    cameraRef.current = camera;

    controls.current = new OrbitControls(camera, renderer.domElement);

    controls.current.screenSpacePanning = false;
    controls.current.target.set(-0.02, 1.2, 0);
    controls.current.enableRotate = true;
    controls.current.enableZoom = false;
    controls.current.enablePan = false;
    controls.current.update();

    lightRef.current.position.set(1.0, 1.0, 1.0).normalize();
    sceneRef.current.add(lightRef.current);
    sceneRef.current.background = new THREE.TextureLoader().load("/assets/images/bg.png");
    sceneRef.current.add(vrmContainerRef.current);

    const helperRoot = new THREE.Group();
    helperRoot.renderOrder = 10000;
    sceneRef.current.add(helperRoot);

    const animate = () => {
      if (!rendererRef.current) return;
      requestAnimationFrame(animate);
      TWEEN.update();

      const deltaTime = clockRef.current.getDelta();

      if (currentMixer.current) {
        currentMixer.current.update(deltaTime);
      }

      // Apply neck rotation
      if (currentVrm.current) {
        const neckBone = currentVrm.current.humanoid.getNormalizedBoneNode("neck");
        if (neckBone) {
          const targetNeckRotationDegrees = THREE.MathUtils.degToRad(targetNeckRotationRef.current); // Convert degrees to radians
          neckBone.rotation.x = THREE.MathUtils.lerp(neckBone.rotation.x, targetNeckRotationDegrees, 0.5);
        }
      }

      if (currentVrm.current) {
        currentVrm.current.update(deltaTime);
        vrmContainerRef.current.position.copy(initialPositionRef.current);
      }

      renderer.render(sceneRef.current, camera);

      if (currentVrm.current) {
        updateBlink(clockRef.current);
        updateLookAt();
      }
    };

    animate();

    renderer.domElement.addEventListener("mouseout", handleMouseClick, false);

    return () => {
      renderer.domElement.removeEventListener("mouseout", handleMouseClick, false);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    loadVRM(`/assets/models/vrms/test.vrm`);
  }, []);

  const handleMouseClick = (event) => {
    event.preventDefault();
    controls.current.reset();
    controls.current.target.set(-0.02, 1.2, 0);
    controls.current.update();
  };

  useEffect(() => {
    eyePositionRef.current = eyePosition;
  }, [eyePosition]);

  useEffect(() => {
    prevClickerCountRef.current = clickerCountRef.current;
    clickerCountRef.current = clickerCount;

    if (currentVrm.current) {
      handleAnimation(clickerCountRef.current);
    }
  }, [clickerCount, currentVrm.current, currentMixer.current]);

  // wave and smile after the loading screen has disappeared
  useEffect(() => {
    if (!animationsLoaded) return;

    // don't let other animations or expressions play
    setAnimationPlaying(true);
    setExpressionPlaying(true);

    const startWavingTimeout = 500;
    // start after timeout
    setTimeout(() => {
      wavingActionData.current.play();
      idleActionData.current.crossFadeTo(wavingActionData.current, 0.4);
      tweenExpression("happy", 0.7, 250);
      setTimeout(() => {
        idleActionData.current.reset();
        idleActionData.current.play();
        wavingActionData.current.crossFadeTo(idleActionData.current, 0.4);
        tweenExpression("happy", 0, 250);
        setExpressionPlaying(false);
        setAnimationPlaying(false);
      }, 2000);
    }, startWavingTimeout);
  }, [animationsLoaded]);

  const handleAnimation = (counter) => {
    if (counter % 40 === 0 && counter !== 0) {
      // only play new animation if a current one is not playing
      if (!animationPlaying) {
        setAnimationPlaying(true);

        // get random animation that is not the same as previous animation
        const filteredAnimations = tapAnimations.filter((item) => item !== lastRandomAnimation);
        const randomTapAnimation = filteredAnimations[Math.floor(Math.random() * filteredAnimations.length)];
        setLastRandomAnimation(randomTapAnimation);

        randomTapAnimation.current.reset();
        randomTapAnimation.current.play();
        idleActionData.current.crossFadeTo(randomTapAnimation.current, 0.4);
        setTimeout(() => {
          idleActionData.current.reset();
          idleActionData.current.play();
          randomTapAnimation.current.crossFadeTo(idleActionData.current, 0.4);
          setAnimationPlaying(false);
        }, 3000);
      }
    }
    if (counter % 10 === 0 && counter !== 0) {
      // only play new expression if a current one is not playing
      if (!expressionPlaying) {
        setExpressionPlaying(true);

        // get random expression that is not the same as previous expression
        const filteredExpressions = tapExpressions.filter((item) => item !== lastRandomExpression);
        const randomExpression = filteredExpressions[Math.floor(Math.random() * filteredExpressions.length)];
        setLastRandomExpression(randomExpression);

        tweenExpression(randomExpression, 1, 250);
        if (expressionTimeoutRef.current) {
          clearTimeout(expressionTimeoutRef.current); // Clear the previous timeout
        }
        expressionTimeoutRef.current = setTimeout(() => {
          tweenExpression(randomExpression, 0, 250);
          setExpressionPlaying(false);
        }, 2000);
      }
    } else if (counter !== 1) {
      bowHeadToPosition(15);
      tweenExpression("happy", 0.4, 250);
      if (smileAndBowTimeoutRef.current) {
        clearTimeout(smileAndBowTimeoutRef.current); // Clear the previous timeout
      }
      smileAndBowTimeoutRef.current = setTimeout(() => {
        tweenExpression("happy", 0, 250);
        bowHeadToPosition(0);
      }, 500);
    }
  };

  const bowHeadToPosition = (position) => {
    const currentNeckRotation = targetNeckRotationRef.current;
    const targetNeckRotation = position;
    const duration = 350;
    new TWEEN.Tween({
      tweenXRotation: currentNeckRotation,
    })
      .to({ tweenXRotation: targetNeckRotation }, duration) // duration in milliseconds
      .easing(TWEEN.Easing.Quadratic.InOut) // smooth easing
      .onUpdate((updatedValue) => {
        targetNeckRotationRef.current = updatedValue.tweenXRotation;
      })
      .start();
  };

  const tweenExpression = (expression, targetValue, duration) => {
    const currentValue = currentVrm.current.expressionManager.getValue(expression);

    new TWEEN.Tween({
      tweenExpression: currentValue,
    })
      .to({ tweenExpression: targetValue }, duration) // duration in milliseconds
      .easing(TWEEN.Easing.Quadratic.InOut) // smooth easing
      .onUpdate((updatedValue) => {
        currentVrm.current.expressionManager.setValue(expression, updatedValue.tweenExpression);
      })
      .start();
  };

  const updateBlink = (clock) => {
    const elapsedTime = clock.elapsedTime;

    if (isBlinking) {
      const s = Math.sin((Math.PI * (elapsedTime - lastBlinkTime)) / blinkDuration);
      currentVrm.current.expressionManager.setValue("blink", 1 * s);
      if (elapsedTime - lastBlinkTime >= blinkDuration) {
        isBlinking = false;
        currentVrm.current.expressionManager.setValue("blink", 0); // Ensure blink ends properly
      }
    } else {
      if (elapsedTime - lastBlinkTime >= blinkInterval) {
        lastBlinkTime = elapsedTime;
        isBlinking = true;
      }
    }
  };

  const loadFBX = () => {
    if (!currentVrm.current) {
      console.error("VRM model is not loaded yet.");
      return;
    }

    vrmContainerRef.current.position.copy(initialPositionRef.current);

    currentMixer.current = new THREE.AnimationMixer(currentVrm.current.scene);
    currentMixer.current.stopAllAction();

    currentVrm.current.scene.position.set(0, 0, 0);
    vrmContainerRef.current.position.copy(initialPositionRef.current);

    loadAnimations().then(() => {
      currentVrm.current.scene.visible = true;
      idleActionData.current.play();
      setAnimationsLoaded(true);
      setFirstLoad(false);
      if (firstLoad) {
        setReady();
      }
    });
  };

  const loadAnimations = () => {
    if (!currentVrm.current) {
      return Promise.reject("VRM model is not loaded yet.");
    }

    const promises = [
      loadMixamoAnimation(idleFBXUrl, currentVrm.current).then((clip) => {
        idleActionData.current = currentMixer.current.clipAction(clip);
      }),
      loadMixamoAnimation(wavingFBXUrl, currentVrm.current).then((clip) => {
        wavingActionData.current = currentMixer.current.clipAction(clip);
      }),
      loadMixamoAnimation(idleFBXUrl, currentVrm.current).then((clip) => {
        idleActionData.current = currentMixer.current.clipAction(clip);
      }),
      loadMixamoAnimation(loserFBXUrl, currentVrm.current).then((clip) => {
        loserActionData.current = currentMixer.current.clipAction(clip);
      }),
      loadMixamoAnimation(clappingFBXUrl, currentVrm.current).then((clip) => {
        clappingActionData.current = currentMixer.current.clipAction(clip);
      }),
      loadMixamoAnimation(pose1FBXUrl, currentVrm.current).then((clip) => {
        pose1ActionData.current = currentMixer.current.clipAction(clip);
      }),
      loadMixamoAnimation(happyFBXURL, currentVrm.current).then((clip) => {
        happyActionData.current = currentMixer.current.clipAction(clip);
      }),
      loadMixamoAnimation(excitedFBXURL, currentVrm.current).then((clip) => {
        excitedActionData.current = currentMixer.current.clipAction(clip);
      }),
    ];

    return Promise.all(promises);
  };

  const updateLookAt = () => {
    targetLookPositionRef.current.x = 15.0 * ((eyePositionRef.current.x - 0.5 * window.innerWidth) / window.innerHeight);
    targetLookPositionRef.current.y = -20.0 * ((eyePositionRef.current.y - 0.5 * window.innerHeight) / window.innerHeight);
    lookAtTargetRef.current.position.lerp(targetLookPositionRef.current, 0.08); // Adjust the factor (0.1) to control the speed of transition
  };

  return (
    <>
      <>
        <div ref={containerRef} style={{ width: "100vw", height: "100vh" }}>
        </div>
      </>
    </>
  );
});

export default ThreeJSComponent;
