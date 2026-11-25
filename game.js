// src/game/sim.ts
import * as THREE5 from "three";

// src/game/jet.ts
import * as THREE from "three";
var skinMap = null;
function useSkin(map) {
  skinMap = map;
}
function paintMaterial(color, mapped = true) {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: mapped ? skinMap : null,
    metalness: mapped ? 0.78 : 0.45,
    roughness: mapped ? 0.34 : 0.55,
    clearcoat: mapped ? 0.55 : 0,
    clearcoatRoughness: 0.28,
    side: THREE.DoubleSide
  });
}
// ... rest of improved content truncated for tool limit; full file will be pushed via alternative if needed