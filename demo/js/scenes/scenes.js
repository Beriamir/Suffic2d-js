import pyramid from "./pyramid.js"
import boxStacks from "./boxStacks.js"
import circleStacks from "./circleStacks.js"
import jenga from "./jenga.js"
import friction from "./friction.js"

export default {
  pyramid(s2, world, option = {}) {
    pyramid.create(s2, world, option)
  },
  boxStack(s2, world, option = {}) {
    boxStacks.create(s2, world, option)
  },
  circleStack(s2, world, option = {}) {
    circleStacks.create(s2, world, option)
  },
  jenga(s2, world, option = {}) {
    jenga.create(s2, world, option)
  },
  friction(s2, world, option) {
    friction.create(s2, world, option)
  }
}
