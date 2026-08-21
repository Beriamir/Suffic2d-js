import pyramid from "../../examples/pyramid.js"
import boxStacks from "../../examples/box-stacks.js"
import circleStacks from "../../examples/circle-stacks.js"
import capsuleStacks from "../../examples/capsule-stacks.js"
import jenga from "../../examples/jenga.js"
import overlaps from "../../examples/overlaps.js"
import restitution from "../../examples/restitution.js"
import friction from "../../examples/friction.js"
import mixShapes from "../../examples/mix-shapes.js"
import compounds from "../../examples/compounds.js"
import stress0 from "../../examples/stress-0.js"
import stress1 from "../../examples/stress-1.js"
import stress2 from "../../examples/stress-2.js"

export default class SceneManager {
  constructor(s2, world) {
    this.s2 = s2 
    this.world = world
    this.scene = 'Pyramid'
    this.scenes = {
      Pyramid: pyramid,
      "Box Stacks": boxStacks,
      "Circle Stacks": circleStacks,
      "Capsule Stacks": capsuleStacks,
      Jenga: jenga,
      Overlaps: overlaps,
      Restitution: restitution,
      Friction: friction,
      "Mix Shapes": mixShapes,
      Compounds: compounds,
      "Stress 0": stress0,
      "Stress 1": stress1,
      "Stress 2": stress2
    }
  }
  
  restart() {
    this.switch(this.scene)
  }
  
  switch(scene) {
    this.world.clear()
    this.scenes[scene](this.s2, this.world)
  }
  
  getList(out = []) {
    for (const key of Object.keys(this.scenes)) {
      out.push(key)
    }
    
    return out
  }
}