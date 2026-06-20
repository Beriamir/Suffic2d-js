import AABB from "./AABB.js"
import Pool from "./Pool.js"

export default class DynamicTree {
  #_nodes
  #_root
  #_stack
  #_rotation
  #_rotationType
  constructor() {
    this.#_nodes = new Pool(() => {
      return {
        aabb: new AABB(),
        margin: 10,
        height: 0,
        data: null,
        parent: null,
        child1: null,
        child2: null
      }
    }, 16)
    this.#_root = null
    this.#_stack = []
    this.#_rotation = true
    this.#_rotationType = {
      NONE: 0,
      BF: 1,
      BG: 2,
      CE: 3,
      CD: 4
    }
  }
  get height() {
    return this.#_nodes.at(this.#_root).height
  }
  get nodesSize() {
    return this.#_nodes.size
  }
  findBestSibling(node) {
    let sibling = this.#_root
    let siblingArea = this.#_nodes.at(sibling).aabb.perimeter

    let inheritedCost = 0
    let directCost = this.#_nodes
      .at(sibling)
      .aabb.unionPerimeter(this.#_nodes.at(node).aabb)

    let bestSibling = sibling // We need to find the best sibling
    let bestCost = directCost

    while (this.#_nodes.at(sibling).height > 0) {
      const cost = directCost + inheritedCost

      // Remember the current best sibling
      if (cost < bestCost) {
        bestSibling = sibling
        bestCost = cost
      }

      inheritedCost += directCost - siblingArea

      const child1 = this.#_nodes.at(sibling).child1
      const child2 = this.#_nodes.at(sibling).child2

      // How promising is child1?
      let leaf1 = this.#_nodes.at(child1).height === 0
      let area1 = 0
      let lowerCost1 = Infinity

      const directCost1 = this.#_nodes
        .at(child1)
        .aabb.unionPerimeter(this.#_nodes.at(node).aabb)

      if (leaf1) {
        const cost1 = directCost1 + inheritedCost

        if (cost1 < bestCost) {
          bestSibling = child1
          bestCost = cost1
        }
      } else {
        area1 = this.#_nodes.at(child1).aabb.perimeter
        lowerCost1 =
          inheritedCost +
          directCost1 +
          Math.min(this.#_nodes.at(node).aabb.perimeter - area1, 0)
      }

      // Is child2 better?
      let leaf2 = this.#_nodes.at(child2).height === 0
      let area2 = 0
      let lowerCost2 = Infinity

      const directCost2 = this.#_nodes
        .at(node)
        .aabb.unionPerimeter(this.#_nodes.at(child2).aabb)

      if (leaf2) {
        const cost2 = directCost2 + inheritedCost

        if (cost2 < bestCost) {
          bestSibling = child2
          bestCost = cost2
        }
      } else {
        area2 = this.#_nodes.at(child2).aabb.perimeter
        lowerCost2 =
          inheritedCost +
          directCost2 +
          Math.min(this.#_nodes.at(node).aabb.perimeter - area2, 0)
      }

      if (leaf1 && leaf2) {
        break
      }

      if (bestCost <= lowerCost1 && bestCost <= lowerCost2) {
        break
      }

      // Tie breaker
      if (lowerCost1 === lowerCost2) {
        const meanX = this.#_nodes.at(node).aabb.meanX
        const meanY = this.#_nodes.at(node).aabb.meanY
        const mean1X = this.#_nodes.at(child1).aabb.meanX
        const mean1Y = this.#_nodes.at(child1).aabb.meanY
        const mean2X = this.#_nodes.at(child2).aabb.meanX
        const mean2Y = this.#_nodes.at(child2).aabb.meanY

        const dx1 = mean1X - meanX
        const dy1 = mean1Y - meanY
        const dx2 = mean2X - meanX
        const dy2 = mean2Y - meanY

        lowerCost1 = dx1 * dx1 + dy1 * dy1
        lowerCost2 = dx2 * dx2 + dy2 * dy2
      }

      // Descend
      if (lowerCost1 < lowerCost2) {
        sibling = child1
        siblingArea = area1
        directCost = directCost1
      } else {
        sibling = child2
        siblingArea = area2
        directCost = directCost2
      }
    }

    return bestSibling
  }
  rotate(node) {
    if (this.#_nodes.at(node).height < 2) {
      return
    }

    const B = this.#_nodes.at(node).child1
    const C = this.#_nodes.at(node).child2

    if (this.#_nodes.at(B).height === 0 && this.#_nodes.at(C).height > 0) {
      // B is leaf and C is internal node
      const F = this.#_nodes.at(C).child1
      const G = this.#_nodes.at(C).child2

      const costBase = this.#_nodes.at(C).aabb.perimeter
      const costBF = this.#_nodes
        .at(B)
        .aabb.unionPerimeter(this.#_nodes.at(G).aabb)
      const costBG = this.#_nodes
        .at(F)
        .aabb.unionPerimeter(this.#_nodes.at(B).aabb)

      if (costBase <= costBF && costBase <= costBG) {
        return
      }

      if (costBF < costBG) {
        // Swap B and F
        this.#_nodes.at(node).child1 = F
        this.#_nodes.at(C).child1 = B

        this.#_nodes.at(B).parent = C
        this.#_nodes.at(F).parent = node

        this.#_nodes
          .at(B)
          .aabb.union(this.#_nodes.at(G).aabb, this.#_nodes.at(C).aabb)
        this.#_nodes
          .at(F)
          .aabb.union(this.#_nodes.at(C).aabb, this.#_nodes.at(node).aabb)

        this.#_nodes.at(C).height =
          1 + Math.max(this.#_nodes.at(B).height, this.#_nodes.at(G).height)
        this.#_nodes.at(node).height =
          1 + Math.max(this.#_nodes.at(F).height, this.#_nodes.at(C).height)
      } else {
        // Swap B and G
        this.#_nodes.at(node).child1 = G
        this.#_nodes.at(C).child2 = B

        this.#_nodes.at(B).parent = C
        this.#_nodes.at(G).parent = node

        this.#_nodes
          .at(F)
          .aabb.union(this.#_nodes.at(B).aabb, this.#_nodes.at(C).aabb)
        this.#_nodes
          .at(G)
          .aabb.union(this.#_nodes.at(C).aabb, this.#_nodes.at(node).aabb)

        this.#_nodes.at(C).height =
          1 + Math.max(this.#_nodes.at(F).height, this.#_nodes.at(B).height)
        this.#_nodes.at(node).height =
          1 + Math.max(this.#_nodes.at(G).height, this.#_nodes.at(C).height)
      }
    } else if (
      this.#_nodes.at(C).height === 0 &&
      this.#_nodes.at(B).height > 0
    ) {
      // C is leaf and B is internal node
      const D = this.#_nodes.at(B).child1
      const E = this.#_nodes.at(B).child2

      const costBase = this.#_nodes.at(B).aabb.perimeter
      const costCE = this.#_nodes
        .at(D)
        .aabb.unionPerimeter(this.#_nodes.at(C).aabb)
      const costCD = this.#_nodes
        .at(C)
        .aabb.unionPerimeter(this.#_nodes.at(E).aabb)

      if (costBase <= costCE && costBase <= costCD) {
        return
      }

      if (costCE < costCD) {
        // Swap C and E
        this.#_nodes.at(node).child2 = E
        this.#_nodes.at(B).child2 = C

        this.#_nodes.at(E).parent = node
        this.#_nodes.at(C).parent = B

        this.#_nodes
          .at(D)
          .aabb.union(this.#_nodes.at(C).aabb, this.#_nodes.at(B).aabb)
        this.#_nodes
          .at(B)
          .aabb.union(this.#_nodes.at(E).aabb, this.#_nodes.at(node).aabb)

        this.#_nodes.at(B).height =
          1 + Math.max(this.#_nodes.at(D).height, this.#_nodes.at(C).height)
        this.#_nodes.at(node).height =
          1 + Math.max(this.#_nodes.at(B).height, this.#_nodes.at(E).height)
      } else {
        // Swap C and D
        this.#_nodes.at(node).child2 = D
        this.#_nodes.at(B).child1 = C

        this.#_nodes.at(D).parent = node
        this.#_nodes.at(C).parent = B

        this.#_nodes
          .at(C)
          .aabb.union(this.#_nodes.at(E).aabb, this.#_nodes.at(B).aabb)
        this.#_nodes
          .at(B)
          .aabb.union(this.#_nodes.at(D).aabb, this.#_nodes.at(node).aabb)

        this.#_nodes.at(B).height =
          1 + Math.max(this.#_nodes.at(C).height, this.#_nodes.at(E).height)
        this.#_nodes.at(node).height =
          1 + Math.max(this.#_nodes.at(B).height, this.#_nodes.at(D).height)
      }
    } else {
      // Full swap
      const D = this.#_nodes.at(B).child1
      const E = this.#_nodes.at(B).child2
      const F = this.#_nodes.at(C).child1
      const G = this.#_nodes.at(C).child2

      const areaB = this.#_nodes.at(B).aabb.perimeter
      const areaC = this.#_nodes.at(C).aabb.perimeter
      const costBase = areaB + areaC

      let bestRotation = this.#_rotationType.NONE
      let baseCost = costBase

      // Cost of swapping B and F
      const costBF =
        areaB + this.#_nodes.at(B).aabb.unionPerimeter(this.#_nodes.at(G).aabb)
      if (costBF < baseCost) {
        bestRotation = this.#_rotationType.BF
        baseCost = costBF
      }

      // Cost of swapping B and G
      const costBG =
        areaB + this.#_nodes.at(F).aabb.unionPerimeter(this.#_nodes.at(B).aabb)
      if (costBG < baseCost) {
        bestRotation = this.#_rotationType.BG
        baseCost = costBG
      }

      // Cost of swapping C and E
      const costCE =
        areaC + this.#_nodes.at(D).aabb.unionPerimeter(this.#_nodes.at(C).aabb)
      if (costCE < baseCost) {
        bestRotation = this.#_rotationType.CE
        baseCost = costCE
      }

      // Cost of swapping C and D
      const costCD =
        areaC + this.#_nodes.at(C).aabb.unionPerimeter(this.#_nodes.at(E).aabb)
      if (costCD < baseCost) {
        bestRotation = this.#_rotationType.CD
        baseCost = costCD
      }

      switch (bestRotation) {
        case this.#_rotationType.NONE: {
          break
        }

        case this.#_rotationType.BF: {
          this.#_nodes.at(node).child1 = F
          this.#_nodes.at(C).child1 = B

          this.#_nodes.at(F).parent = node
          this.#_nodes.at(B).parent = C

          this.#_nodes
            .at(B)
            .aabb.union(this.#_nodes.at(G).aabb, this.#_nodes.at(C).aabb)
          this.#_nodes
            .at(F)
            .aabb.union(this.#_nodes.at(C).aabb, this.#_nodes.at(node).aabb)

          this.#_nodes.at(C).height =
            1 + Math.max(this.#_nodes.at(B).height, this.#_nodes.at(G).height)
          this.#_nodes.at(node).height =
            1 + Math.max(this.#_nodes.at(F).height, this.#_nodes.at(C).height)
          break
        }

        case this.#_rotationType.BG: {
          this.#_nodes.at(node).child1 = G
          this.#_nodes.at(C).child2 = B

          this.#_nodes.at(G).parent = node
          this.#_nodes.at(B).parent = C

          this.#_nodes
            .at(F)
            .aabb.union(this.#_nodes.at(B).aabb, this.#_nodes.at(C).aabb)
          this.#_nodes
            .at(G)
            .aabb.union(this.#_nodes.at(C).aabb, this.#_nodes.at(node).aabb)

          this.#_nodes.at(C).height =
            1 + Math.max(this.#_nodes.at(F).height, this.#_nodes.at(B).height)
          this.#_nodes.at(node).height =
            1 + Math.max(this.#_nodes.at(G).height, this.#_nodes.at(C).height)
          break
        }

        case this.#_rotationType.CE: {
          this.#_nodes.at(node).child2 = E
          this.#_nodes.at(B).child2 = C

          this.#_nodes.at(E).parent = node
          this.#_nodes.at(C).parent = B

          this.#_nodes
            .at(D)
            .aabb.union(this.#_nodes.at(C).aabb, this.#_nodes.at(B).aabb)
          this.#_nodes
            .at(B)
            .aabb.union(this.#_nodes.at(E).aabb, this.#_nodes.at(node).aabb)

          this.#_nodes.at(B).height =
            1 + Math.max(this.#_nodes.at(D).height, this.#_nodes.at(C).height)
          this.#_nodes.at(node).height =
            1 + Math.max(this.#_nodes.at(B).height, this.#_nodes.at(E).height)
          break
        }

        case this.#_rotationType.CD: {
          this.#_nodes.at(node).child2 = D
          this.#_nodes.at(B).child1 = C

          this.#_nodes.at(D).parent = node
          this.#_nodes.at(C).parent = B

          this.#_nodes
            .at(C)
            .aabb.union(this.#_nodes.at(E).aabb, this.#_nodes.at(B).aabb)
          this.#_nodes
            .at(B)
            .aabb.union(this.#_nodes.at(D).aabb, this.#_nodes.at(node).aabb)

          this.#_nodes.at(B).height =
            1 + Math.max(this.#_nodes.at(C).height, this.#_nodes.at(E).height)
          this.#_nodes.at(node).height =
            1 + Math.max(this.#_nodes.at(B).height, this.#_nodes.at(D).height)
          break
        }

        default: {
          break
        }
      }
    }
  }
  insertBody(data, margin = null) {
    const node = this.#_nodes.allocate()

    if (!margin) {
      margin = this.#_nodes.at(node).margin
    }

    this.#_nodes.at(node).aabb.copy(data.aabb)
    this.#_nodes.at(node).aabb.enlarge(margin)
    this.#_nodes.at(node).data = data

    data.node = node

    if (this.#_root === null) {
      this.#_root = node
      return
    }

    const sibling = this.findBestSibling(node)
    const oldParent = this.#_nodes.at(sibling).parent
    const newParent = this.#_nodes.allocate()
    this.#_nodes.at(newParent).parent = oldParent
    this.#_nodes.at(newParent).child1 = sibling
    this.#_nodes.at(newParent).child2 = node

    this.#_nodes.at(sibling).parent = newParent
    this.#_nodes.at(node).parent = newParent

    if (oldParent === null) {
      this.#_root = newParent
    } else {
      if (this.#_nodes.at(oldParent).child1 === sibling) {
        this.#_nodes.at(oldParent).child1 = newParent
      } else {
        this.#_nodes.at(oldParent).child2 = newParent
      }
    }

    // Refit
    let ancestor = newParent

    while (ancestor !== null) {
      const c1 = this.#_nodes.at(ancestor).child1
      const c2 = this.#_nodes.at(ancestor).child2

      this.#_nodes
        .at(c1)
        .aabb.union(this.#_nodes.at(c2).aabb, this.#_nodes.at(ancestor).aabb)
      this.#_nodes.at(ancestor).height =
        1 + Math.max(this.#_nodes.at(c1).height, this.#_nodes.at(c2).height)

      if (this.#_rotation) {
        this.rotate(ancestor)
      }

      ancestor = this.#_nodes.at(ancestor).parent
    }
  }
  removeBody(data) {
    const node = data.node

    if (node === this.#_root) {
      this.#_nodes.deallocate(this.#_root)
      this.#_root = null
      return
    }

    const parent = this.#_nodes.at(node).parent
    const grandParent = this.#_nodes.at(parent).parent
    const sibling =
      this.#_nodes.at(parent).child1 === node
        ? this.#_nodes.at(parent).child2
        : this.#_nodes.at(parent).child1

    if (grandParent !== null) {
      if (this.#_nodes.at(grandParent).child1 === parent) {
        this.#_nodes.at(grandParent).child1 = sibling
      } else {
        this.#_nodes.at(grandParent).child2 = sibling
      }

      this.#_nodes.at(sibling).parent = grandParent

      this.#_nodes.deallocate(parent)
      this.#_nodes.deallocate(node)

      // Refit
      let ancestor = grandParent

      while (ancestor !== null) {
        const child1 = this.#_nodes.at(ancestor).child1
        const child2 = this.#_nodes.at(ancestor).child2

        this.#_nodes.at(ancestor).aabb = this.#_nodes
          .at(child1)
          .aabb.union(
            this.#_nodes.at(child2).aabb,
            this.#_nodes.at(ancestor).aabb
          )
        this.#_nodes.at(ancestor).height =
          1 +
          Math.max(
            this.#_nodes.at(child1).height,
            this.#_nodes.at(child2).height
          )

        if (this.#_rotation) this.rotate(ancestor)

        ancestor = this.#_nodes.at(ancestor).parent
      }
    } else {
      const oldParent = this.#_nodes.at(sibling).parent

      this.#_root = sibling
      this.#_nodes.at(this.#_root).parent = null

      this.#_nodes.deallocate(oldParent)
      this.#_nodes.deallocate(node)
    }
  }
  updateBody(data, margin) {
    const node = data.node

    if (!this.#_nodes.at(node).aabb.contains(data.aabb)) {
      this.removeBody(data)
      this.insertBody(data, margin)
    }
  }
  queryAABB(aabb, result = []) {
    this.#_stack.length = 0
    this.#_stack.push(this.#_root)

    while (this.#_stack.length) {
      const node = this.#_stack.pop()

      if (node === null) continue

      if (this.#_nodes.at(node).aabb.overlaps(aabb)) {
        if (this.#_nodes.at(node).height === 0) {
          result.push(this.#_nodes.at(node).data)
          continue
        }

        this.#_stack.push(this.#_nodes.at(node).child1)
        this.#_stack.push(this.#_nodes.at(node).child2)
      }
    }

    return result
  }
  traverse(callback) {
    this.#_stack.length = 0
    this.#_stack.push(this.#_root)

    while (this.#_stack.length) {
      const node = this.#_stack.pop()

      if (node === null) continue

      if (!callback(this.#_nodes.at(node))) {
        this.#_stack.push(this.#_nodes.at(node).child1)
        this.#_stack.push(this.#_nodes.at(node).child2)
      }
    }
  }
}
