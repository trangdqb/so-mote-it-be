// physics.js
import * as CANNON from 'cannon-es';

export const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Set gravity

export const createPhysicsBox = (width, height, depth, mass) => {
  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({ mass });
  body.addShape(shape);
  return body;
};