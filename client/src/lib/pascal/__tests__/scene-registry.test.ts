import * as THREE from "three";
import { sceneRegistry } from "@/lib/pascal/scene-registry";

beforeEach(() => {
  sceneRegistry.clear();
});

describe("register / getObject / getNodeId", () => {
  it("registers an object and retrieves it by nodeId", () => {
    const obj = new THREE.Object3D();
    sceneRegistry.register("node-1", obj);

    expect(sceneRegistry.getObject("node-1")).toBe(obj);
  });

  it("retrieves nodeId from a registered object", () => {
    const obj = new THREE.Object3D();
    sceneRegistry.register("node-2", obj);

    expect(sceneRegistry.getNodeId(obj)).toBe("node-2");
  });

  it("sets object.userData.nodeId on register", () => {
    const obj = new THREE.Object3D();
    sceneRegistry.register("node-3", obj);

    expect(obj.userData.nodeId).toBe("node-3");
  });

  it("returns undefined for unregistered nodeId", () => {
    expect(sceneRegistry.getObject("nonexistent")).toBeUndefined();
  });

  it("returns undefined for unregistered object", () => {
    const obj = new THREE.Object3D();
    expect(sceneRegistry.getNodeId(obj)).toBeUndefined();
  });
});

describe("unregister", () => {
  it("removes the object from both maps", () => {
    const obj = new THREE.Object3D();
    sceneRegistry.register("node-4", obj);
    sceneRegistry.unregister("node-4");

    expect(sceneRegistry.getObject("node-4")).toBeUndefined();
    expect(sceneRegistry.getNodeId(obj)).toBeUndefined();
  });

  it("does not throw when unregistering an unknown nodeId", () => {
    expect(() => sceneRegistry.unregister("nope")).not.toThrow();
  });
});

describe("getNodeId parent walking", () => {
  it("resolves a child object to the parent's nodeId via parent chain", () => {
    const parent = new THREE.Object3D();
    const child = new THREE.Object3D();
    parent.add(child);

    sceneRegistry.register("parent-node", parent);

    // child itself is NOT registered, but its parent is
    expect(sceneRegistry.getNodeId(child)).toBe("parent-node");
  });

  it("resolves a deeply nested child to the ancestor's nodeId", () => {
    const grandparent = new THREE.Object3D();
    const parent = new THREE.Object3D();
    const child = new THREE.Object3D();
    grandparent.add(parent);
    parent.add(child);

    sceneRegistry.register("gp-node", grandparent);

    expect(sceneRegistry.getNodeId(child)).toBe("gp-node");
  });
});

describe("getAllObjects", () => {
  it("returns a copy, not a reference to the internal map", () => {
    const obj = new THREE.Object3D();
    sceneRegistry.register("node-5", obj);

    const all = sceneRegistry.getAllObjects();
    all.delete("node-5");

    // Internal map should not have been affected
    expect(sceneRegistry.getObject("node-5")).toBe(obj);
  });

  it("contains all registered entries", () => {
    const a = new THREE.Object3D();
    const b = new THREE.Object3D();
    sceneRegistry.register("a", a);
    sceneRegistry.register("b", b);

    const all = sceneRegistry.getAllObjects();
    expect(all.size).toBe(2);
    expect(all.get("a")).toBe(a);
    expect(all.get("b")).toBe(b);
  });
});

describe("clear and size", () => {
  it("size reflects the number of registered objects", () => {
    expect(sceneRegistry.size).toBe(0);
    sceneRegistry.register("x", new THREE.Object3D());
    expect(sceneRegistry.size).toBe(1);
    sceneRegistry.register("y", new THREE.Object3D());
    expect(sceneRegistry.size).toBe(2);
  });

  it("clear removes everything and resets size to 0", () => {
    sceneRegistry.register("z", new THREE.Object3D());
    sceneRegistry.clear();

    expect(sceneRegistry.size).toBe(0);
    expect(sceneRegistry.getObject("z")).toBeUndefined();
  });
});
