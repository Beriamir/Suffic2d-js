import AABB from "./AABB.js"
import Pool from "./Pool.js"

export default class DynamicTree {
  #nodes
  #root
  #stack
  #rotation
  #rotationType
  constructor() {
    this.#nodes = new Pool(() => {
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
    this.#root = null
    this.#stack = []
    this.#rotation = true
    this.#rotationType = {
      NONE: 0,
      BF: 1,
      BG: 2,
      CE: 3,
      CD: 4
    }
  }
  get height() {
    return this.#nodes.at(this.#root).height
  }
  #findBestSibling(node) {
    let sibling = this.#root
    let siblingArea = this.#nodes.at(sibling).aabb.perimeter

    let inheritedCost = 0
    let directCost = this.#nodes
      .at(sibling)
      .aabb.unionPerimeter(this.#nodes.at(node).aabb)

    let bestSibling = sibling // We need to find the best sibling
    let bestCost = directCost

    while (this.#nodes.at(sibling).height > 0) {
      const cost = directCost + inheritedCost

      // Remember the current best sibling
      if (cost < bestCost) {
        bestSibling = sibling
        bestCost = cost
      }

      inheritedCost += directCost - siblingArea

      const child1 = this.#nodes.at(sibling).child1
      const child2 = this.#nodes.at(sibling).child2

      // How promising is child1?
      let leaf1 = this.#nodes.at(child1).height === 0
      let area1 = 0
      let lowerCost1 = Infinity

      const directCost1 = this.#nodes
        .at(child1)
        .aabb.unionPerimeter(this.#nodes.at(node).aabb)

      if (leaf1) {
        const cost1 = directCost1 + inheritedCost

        if (cost1 < bestCost) {
          bestSibling = child1
          bestCost = cost1
        }
      } else {
        area1 = this.#nodes.at(child1).aabb.perimeter
        lowerCost1 =
          inheritedCost +
          directCost1 +
          Math.min(this.#nodes.at(node).aabb.perimeter - area1, 0)
      }

      // Is child2 better?
      let leaf2 = this.#nodes.at(child2).height === 0
      let area2 = 0
      let lowerCost2 = Infinity

      const directCost2 = this.#nodes
        .at(node)
        .aabb.unionPerimeter(this.#nodes.at(child2).aabb)

      if (leaf2) {
        const cost2 = directCost2 + inheritedCost

        if (cost2 < bestCost) {
          bestSibling = child2
          bestCost = cost2
        }
      } else {
        area2 = this.#nodes.at(child2).aabb.perimeter
        lowerCost2 =
          inheritedCost +
          directCost2 +
          Math.min(this.#nodes.at(node).aabb.perimeter - area2, 0)
      }

      if (leaf1 && leaf2) {
        break
      }

      if (bestCost <= lowerCost1 && bestCost <= lowerCost2) {
        break
      }

      // Tie breaker
      if (lowerCost1 === lowerCost2) {
        const meanX = this.#nodes.at(node).aabb.meanX
        const meanY = this.#nodes.at(node).aabb.meanY
        const mean1X = this.#nodes.at(child1).aabb.meanX
        const mean1Y = this.#nodes.at(child1).aabb.meanY
        const mean2X = this.#nodes.at(child2).aabb.meanX
        const mean2Y = this.#nodes.at(child2).aabb.meanY

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
  #rotate(node) {
    if (this.#nodes.at(node).height < 2) {
      return
    }

    const B = this.#nodes.at(node).child1
    const C = this.#nodes.at(node).child2

    if (this.#nodes.at(B).height === 0 && this.#nodes.at(C).height > 0) {
      // B is leaf and C is internal node
      const F = this.#nodes.at(C).child1
      const G = this.#nodes.at(C).child2

      const costBase = this.#nodes.at(C).aabb.perimeter
      const costBF = this.#nodes
        .at(B)
        .aabb.unionPerimeter(this.#nodes.at(G).aabb)
      const costBG = this.#nodes
        .at(F)
        .aabb.unionPerimeter(this.#nodes.at(B).aabb)

      if (costBase <= costBF && costBase <= costBG) {
        return
      }

      if (costBF < costBG) {
        // Swap B and F
        this.#nodes.at(node).child1 = F
        this.#nodes.at(C).child1 = B

        this.#nodes.at(B).parent = C
        this.#nodes.at(F).parent = node

        this.#nodes
          .at(B)
          .aabb.union(this.#nodes.at(G).aabb, this.#nodes.at(C).aabb)
        this.#nodes
          .at(F)
          .aabb.union(this.#nodes.at(C).aabb, this.#nodes.at(node).aabb)

        this.#nodes.at(C).height =
          1 + Math.max(this.#nodes.at(B).height, this.#nodes.at(G).height)
        this.#nodes.at(node).height =
          1 + Math.max(this.#nodes.at(F).height, this.#nodes.at(C).height)
      } else {
        // Swap B and G
        this.#nodes.at(node).child1 = G
        this.#nodes.at(C).child2 = B

        this.#nodes.at(B).parent = C
        this.#nodes.at(G).parent = node

        this.#nodes
          .at(F)
          .aabb.union(this.#nodes.at(B).aabb, this.#nodes.at(C).aabb)
        this.#nodes
          .at(G)
          .aabb.union(this.#nodes.at(C).aabb, this.#nodes.at(node).aabb)

        this.#nodes.at(C).height =
          1 + Math.max(this.#nodes.at(F).height, this.#nodes.at(B).height)
        this.#nodes.at(node).height =
          1 + Math.max(this.#nodes.at(G).height, this.#nodes.at(C).height)
      }
    } else if (this.#nodes.at(C).height === 0 && this.#nodes.at(B).height > 0) {
      // C is leaf and B is internal node
      const D = this.#nodes.at(B).child1
      const E = this.#nodes.at(B).child2

      const costBase = this.#nodes.at(B).aabb.perimeter
      const costCE = this.#nodes
        .at(D)
        .aabb.unionPerimeter(this.#nodes.at(C).aabb)
      const costCD = this.#nodes
        .at(C)
        .aabb.unionPerimeter(this.#nodes.at(E).aabb)

      if (costBase <= costCE && costBase <= costCD) {
        return
      }

      if (costCE < costCD) {
        // Swap C and E
        this.#nodes.at(node).child2 = E
        this.#nodes.at(B).child2 = C

        this.#nodes.at(E).parent = node
        this.#nodes.at(C).parent = B

        this.#nodes
          .at(D)
          .aabb.union(this.#nodes.at(C).aabb, this.#nodes.at(B).aabb)
        this.#nodes
          .at(B)
          .aabb.union(this.#nodes.at(E).aabb, this.#nodes.at(node).aabb)

        this.#nodes.at(B).height =
          1 + Math.max(this.#nodes.at(D).height, this.#nodes.at(C).height)
        this.#nodes.at(node).height =
          1 + Math.max(this.#nodes.at(B).height, this.#nodes.at(E).height)
      } else {
        // Swap C and D
        this.#nodes.at(node).child2 = D
        this.#nodes.at(B).child1 = C

        this.#nodes.at(D).parent = node
        this.#nodes.at(C).parent = B

        this.#nodes
          .at(C)
          .aabb.union(this.#nodes.at(E).aabb, this.#nodes.at(B).aabb)
        this.#nodes
          .at(B)
          .aabb.union(this.#nodes.at(D).aabb, this.#nodes.at(node).aabb)

        this.#nodes.at(B).height =
          1 + Math.max(this.#nodes.at(C).height, this.#nodes.at(E).height)
        this.#nodes.at(node).height =
          1 + Math.max(this.#nodes.at(B).height, this.#nodes.at(D).height)
      }
    } else {
      // Full swap
      const D = this.#nodes.at(B).child1
      const E = this.#nodes.at(B).child2
      const F = this.#nodes.at(C).child1
      const G = this.#nodes.at(C).child2

      const areaB = this.#nodes.at(B).aabb.perimeter
      const areaC = this.#nodes.at(C).aabb.perimeter
      const costBase = areaB + areaC

      let bestRotation = this.#rotationType.NONE
      let baseCost = costBase

      // Cost of swapping B and F
      const costBF =
        areaB + this.#nodes.at(B).aabb.unionPerimeter(this.#nodes.at(G).aabb)
      if (costBF < baseCost) {
        bestRotation = this.#rotationType.BF
        baseCost = costBF
      }

      // Cost of swapping B and G
      const costBG =
        areaB + this.#nodes.at(F).aabb.unionPerimeter(this.#nodes.at(B).aabb)
      if (costBG < baseCost) {
        bestRotation = this.#rotationType.BG
        baseCost = costBG
      }

      // Cost of swapping C and E
      const costCE =
        areaC + this.#nodes.at(D).aabb.unionPerimeter(this.#nodes.at(C).aabb)
      if (costCE < baseCost) {
        bestRotation = this.#rotationType.CE
        baseCost = costCE
      }

      // Cost of swapping C and D
      const costCD =
        areaC + this.#nodes.at(C).aabb.unionPerimeter(this.#nodes.at(E).aabb)
      if (costCD < baseCost) {
        bestRotation = this.#rotationType.CD
        baseCost = costCD
      }

      switch (bestRotation) {
        case this.#rotationType.NONE: {
          break
        }

        case this.#rotationType.BF: {
          this.#nodes.at(node).child1 = F
          this.#nodes.at(C).child1 = B

          this.#nodes.at(F).parent = node
          this.#nodes.at(B).parent = C

          this.#nodes
            .at(B)
            .aabb.union(this.#nodes.at(G).aabb, this.#nodes.at(C).aabb)
          this.#nodes
            .at(F)
            .aabb.union(this.#nodes.at(C).aabb, this.#nodes.at(node).aabb)

          this.#nodes.at(C).height =
            1 + Math.max(this.#nodes.at(B).height, this.#nodes.at(G).height)
          this.#nodes.at(node).height =
            1 + Math.max(this.#nodes.at(F).height, this.#nodes.at(C).height)
          break
        }

        case this.#rotationType.BG: {
          this.#nodes.at(node).child1 = G
          this.#nodes.at(C).child2 = B

          this.#nodes.at(G).parent = node
          this.#nodes.at(B).parent = C

          this.#nodes
            .at(F)
            .aabb.union(this.#nodes.at(B).aabb, this.#nodes.at(C).aabb)
          this.#nodes
            .at(G)
            .aabb.union(this.#nodes.at(C).aabb, this.#nodes.at(node).aabb)

          this.#nodes.at(C).height =
            1 + Math.max(this.#nodes.at(F).height, this.#nodes.at(B).height)
          this.#nodes.at(node).height =
            1 + Math.max(this.#nodes.at(G).height, this.#nodes.at(C).height)
          break
        }

        case this.#rotationType.CE: {
          this.#nodes.at(node).child2 = E
          this.#nodes.at(B).child2 = C

          this.#nodes.at(E).parent = node
          this.#nodes.at(C).parent = B

          this.#nodes
            .at(D)
            .aabb.union(this.#nodes.at(C).aabb, this.#nodes.at(B).aabb)
          this.#nodes
            .at(B)
            .aabb.union(this.#nodes.at(E).aabb, this.#nodes.at(node).aabb)

          this.#nodes.at(B).height =
            1 + Math.max(this.#nodes.at(D).height, this.#nodes.at(C).height)
          this.#nodes.at(node).height =
            1 + Math.max(this.#nodes.at(B).height, this.#nodes.at(E).height)
          break
        }

        case this.#rotationType.CD: {
          this.#nodes.at(node).child2 = D
          this.#nodes.at(B).child1 = C

          this.#nodes.at(D).parent = node
          this.#nodes.at(C).parent = B

          this.#nodes
            .at(C)
            .aabb.union(this.#nodes.at(E).aabb, this.#nodes.at(B).aabb)
          this.#nodes
            .at(B)
            .aabb.union(this.#nodes.at(D).aabb, this.#nodes.at(node).aabb)

          this.#nodes.at(B).height =
            1 + Math.max(this.#nodes.at(C).height, this.#nodes.at(E).height)
          this.#nodes.at(node).height =
            1 + Math.max(this.#nodes.at(B).height, this.#nodes.at(D).height)
          break
        }

        default: {
          break
        }
      }
    }
  }
  insertBody(data, margin = null) {
    const node = this.#nodes.allocate()

    if (!margin) {
      margin = this.#nodes.at(node).margin
    }

    this.#nodes.at(node).aabb.copy(data.aabb)
    this.#nodes.at(node).aabb.enlarge(margin)
    this.#nodes.at(node).data = data

    data.node = node

    if (this.#root === null) {
      this.#root = node
      return
    }

    const sibling = this.#findBestSibling(node)
    const oldParent = this.#nodes.at(sibling).parent
    const newParent = this.#nodes.allocate()
    this.#nodes.at(newParent).parent = oldParent
    this.#nodes.at(newParent).child1 = sibling
    this.#nodes.at(newParent).child2 = node

    this.#nodes.at(sibling).parent = newParent
    this.#nodes.at(node).parent = newParent

    if (oldParent === null) {
      this.#root = newParent
    } else {
      if (this.#nodes.at(oldParent).child1 === sibling) {
        this.#nodes.at(oldParent).child1 = newParent
      } else {
        this.#nodes.at(oldParent).child2 = newParent
      }
    }

    // Refit
    let ancestor = newParent

    while (ancestor !== null) {
      const c1 = this.#nodes.at(ancestor).child1
      const c2 = this.#nodes.at(ancestor).child2

      this.#nodes
        .at(c1)
        .aabb.union(this.#nodes.at(c2).aabb, this.#nodes.at(ancestor).aabb)
      this.#nodes.at(ancestor).height =
        1 + Math.max(this.#nodes.at(c1).height, this.#nodes.at(c2).height)

      if (this.#rotation) {
        this.#rotate(ancestor)
      }

      ancestor = this.#nodes.at(ancestor).parent
    }
  }
  removeBody(data) {
    const node = data.node

    if (node === this.#root) {
      this.#nodes.deallocate(this.#root)
      this.#root = null
      return
    }

    const parent = this.#nodes.at(node).parent
    const grandParent = this.#nodes.at(parent).parent
    const sibling =
      this.#nodes.at(parent).child1 === node
        ? this.#nodes.at(parent).child2
        : this.#nodes.at(parent).child1

    if (grandParent !== null) {
      if (this.#nodes.at(grandParent).child1 === parent) {
        this.#nodes.at(grandParent).child1 = sibling
      } else {
        this.#nodes.at(grandParent).child2 = sibling
      }

      this.#nodes.at(sibling).parent = grandParent

      this.#nodes.deallocate(parent)
      this.#nodes.deallocate(node)

      // Refit
      let ancestor = grandParent

      while (ancestor !== null) {
        const child1 = this.#nodes.at(ancestor).child1
        const child2 = this.#nodes.at(ancestor).child2

        this.#nodes.at(ancestor).aabb = this.#nodes
          .at(child1)
          .aabb.union(
            this.#nodes.at(child2).aabb,
            this.#nodes.at(ancestor).aabb
          )
        this.#nodes.at(ancestor).height =
          1 +
          Math.max(this.#nodes.at(child1).height, this.#nodes.at(child2).height)

        if (this.#rotation) this.#rotate(ancestor)

        ancestor = this.#nodes.at(ancestor).parent
      }
    } else {
      const oldParent = this.#nodes.at(sibling).parent

      this.#root = sibling
      this.#nodes.at(this.#root).parent = null

      this.#nodes.deallocate(oldParent)
      this.#nodes.deallocate(node)
    }
  }
  updateBody(data, margin) {
    const node = data.node

    if (!this.#nodes.at(node).aabb.contains(data.aabb)) {
      this.removeBody(data)
      this.insertBody(data, margin)
    }
  }
  queryAABB(aabb, result = []) {
    this.#stack.length = 0
    this.#stack.push(this.#root)

    while (this.#stack.length) {
      const node = this.#stack.pop()

      if (node === null) continue

      if (this.#nodes.at(node).aabb.overlaps(aabb)) {
        if (this.#nodes.at(node).height === 0) {
          result.push(this.#nodes.at(node).data)
          continue
        }

        this.#stack.push(this.#nodes.at(node).child1)
        this.#stack.push(this.#nodes.at(node).child2)
      }
    }

    return result
  }
  traverse(callback) {
    this.#stack.length = 0
    this.#stack.push(this.#root)

    while (this.#stack.length) {
      const node = this.#stack.pop()

      if (node === null) continue

      if (!callback(this.#nodes.at(node))) {
        this.#stack.push(this.#nodes.at(node).child1)
        this.#stack.push(this.#nodes.at(node).child2)
      }
    }
  }
}
