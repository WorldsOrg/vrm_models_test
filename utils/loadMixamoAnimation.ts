import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { mixamoVRMRigMap } from "./mixamoVRMRigMap";
import { armatureVRMRigMap } from "./armatureVRMRigMap"; // Import your custom map

/**
 * Load Mixamo or Armature animation, convert for three-vrm use, and return it.
 *
 * @param {string} url A url of mixamo or armature animation data
 * @param {VRM} vrm A target VRM
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */
export function loadMixamoAnimation(url, vrm) {
  const loader = new FBXLoader(); // A loader which loads FBX
  return loader.loadAsync(url).then((asset) => {
    const name = asset.animations[0].name;
    const clip = THREE.AnimationClip.findByName(asset.animations, name); // extract the AnimationClip

    const tracks = []; // KeyframeTracks compatible with VRM will be added here

    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();
    const _vec3 = new THREE.Vector3();

    // Determine which rig map to use
    const rigMap = name.includes("mixamo.com") ? mixamoVRMRigMap : armatureVRMRigMap;

    // Handle different naming conventions for hips bone
    const hipsBoneName = name.includes("mixamo.com") ? "mixamorigHips" : "Hips"; // Adjust for non-mixamo rigs
    const motionHips = asset.getObjectByName(hipsBoneName);

    if (!motionHips) {
      console.error("No hips bone found in the rig!");
      return;
    }

    const motionHipsHeight = motionHips.position.y;
    const vrmHips = vrm.humanoid?.getNormalizedBoneNode("hips");
    const vrmHipsY = vrmHips?.getWorldPosition(_vec3).y;
    const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
    const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
    let firstQuaternionTrackLength: number | null = null;
    
    clip.tracks.forEach((track) => {
      // Convert each track for VRM use and push to `tracks`
      const trackSplitted = track.name.split(".");
      const rigName = trackSplitted[0];
      const vrmBoneName = rigMap[rigName];

      if (!vrmBoneName) {
        // If there is no corresponding VRM bone, skip this track
        return;
      }

      const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
      const rigNode = asset.getObjectByName(rigName);

      if (vrmNodeName != null && rigNode) {
        const propertyName = trackSplitted[1];

        // Store rotations of rest-pose.
        rigNode.getWorldQuaternion(restRotationInverse).invert();
        rigNode.parent.getWorldQuaternion(parentRestWorldRotation);

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          // Store the length of the first quaternion track's values
          if (firstQuaternionTrackLength === null) {
            firstQuaternionTrackLength = track.values.length;
          }

          // Check if the current track's values length is less than or equal to the first track's values length
          if (track.values.length > firstQuaternionTrackLength) {
            // Skip this track if its length is greater than the first track's length
            return;
          }
          // Retarget rotation of rig to NormalizedBone.
          for (let i = 0; i < track.values.length; i += 4) {
            const flatQuaternion = track.values.slice(i, i + 4);

            _quatA.fromArray(flatQuaternion);

            // Parent's rest world rotation * track rotation * rest world rotation inverse
            _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);

            _quatA.toArray(flatQuaternion);

            flatQuaternion.forEach((v, index) => {
              track.values[index + i] = v;
            });
          }

          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              track.values.map((v, i) => (vrm.meta?.metaVersion === "0" && i % 2 === 0 ? -v : v)),
            ),
          );
        } else if (track instanceof THREE.VectorKeyframeTrack) {
          if (vrmBoneName != "hips" || propertyName.toString() !== "position") {
            return;
          }
          const value = track.values.map((v, i) => (vrm.meta?.metaVersion === "0" && i % 3 !== 1 ? -v : v) * hipsPositionScale);
          tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
        }
      }
    });

    return new THREE.AnimationClip("vrmAnimation", clip.duration, tracks);
  });
}
