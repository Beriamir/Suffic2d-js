import pyramid from "../../examples/pyramid.js"
import verticalStacks from "../../examples/vertical-stacks.js"
import circleStacks from "../../examples/circle-stacks.js"
import capsuleStacks from "../../examples/capsule-stacks.js"
import jenga from "../../examples/jenga.js"
import restitution from "../../examples/restitution.js"
import friction from "../../examples/friction.js"
import mixShapes from "../../examples/mix-shapes.js"
import compounds from "../../examples/compounds.js"

export default class SceneManager {
  constructor(s2, world) {
    this.s2 = s2 
    this.world = world
    this.scene = 'Pyramid'
    this.scenes = {
      Pyramid: pyramid,
      "Vertical Stacks": verticalStacks,
      "Circle Stacks": circleStacks,
      "Capsule Stacks": capsuleStacks,
      Jenga: jenga,
      Restitution: restitution,
      Friction: friction,
      "Mix Shapes": mixShapes,
      Compounds: compounds
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