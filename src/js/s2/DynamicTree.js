import AABB from './AABB.js'

export default class DynamicTree {
  constructor() {
    this.uid = 0
    this.root = null
    this.nodes = []
    this.freeList = -1
    this.stack = []
    this.rotation = true
    this.rotationType = {
      NONE: 0,
      BF: 1,
      BG: 2,
      CE: 3,
      CD: 4
    }

    this.grow(16)
  }

  grow(capacity) {
    const start = this.nodes.length
    const end = start + capacity

    for (let i = start; i < end; i++) {
      this.nodes[i] = {
        id: this.uid++,
        aabb: new AABB(),
        margin: 10,
        height: 0,

        data: null,
        parent: null,
        child1: null,
        child2: null
      }
      this.nodes[i].next = i + 1
    }

    this.nodes[end - 1].next = this.freeList
    this.freeList = start
  }

  allocate() {
    if (this.freeList < 0) {
      this.grow(this.nodes.length)
    }

    const index = this.freeList

    this.freeList = this.nodes[index].next
    this.nodes[index].next = -1
    this.nodes[index].allocated = true

    return index
  }

  free(index) {
    if (!this.nodes[index].allocated) {
      return
    }

    this.nodes[index].next = this.freeList
    this.nodes[index].allocated = false
    this.freeList = index
  }

  findBestSibling(node) {
    let sibling = this.root
    let siblingArea = this.nodes[sibling].aabb.perimeter

    let inheritedCost = 0
    let directCost = this.nodes[sibling].aabb.unionPerimeter(
      this.nodes[node].aabb
    )

    let bestSibling = sibling // We need to find the best sibling
    let bestCost = directCost

    while (this.nodes[sibling].height > 0) {
      const cost = directCost + inheritedCost

      if (cost < bestCost) {
        bestSibling = sibling
        bestCost = cost
      }

      inheritedCost += directCost - siblingArea

      const child1 = this.nodes[sibling].child1
      const child2 = this.nodes[sibling].child2

      let leaf1 = this.nodes[child1].height === 0
      let area1 = 0
      let lowerCost1 = Infinity

      const directCost1 = this.nodes[child1].aabb.unionPerimeter(
        this.nodes[node].aabb
      )

      if (leaf1) {
        const cost1 = directCost1 + inheritedCost

        if (cost1 < bestCost) {
          bestSibling = child1
          bestCost = cost1
        }
      } else {
        area1 = this.nodes[child1].aabb.perimeter
        lowerCost1 =
          inheritedCost +
          directCost1 +
          Math.min(this.nodes[node].aabb.perimeter - area1, 0)
      }

      let leaf2 = this.nodes[child2].height === 0
      let area2 = 0
      let lowerCost2 = Infinity

      const directCost2 = this.nodes[node].aabb.unionPerimeter(
        this.nodes[child2].aabb
      )

      if (leaf2) {
        const cost2 = directCost2 + inheritedCost

        if (cost2 < bestCost) {
          bestSibling = child2
          bestCost = cost2
        }
      } else {
        area2 = this.nodes[child2].aabb.perimeter
        lowerCost2 =
          inheritedCost +
          directCost2 +
          Math.min(this.nodes[node].aabb.perimeter - area2, 0)
      }

      if (leaf1 && leaf2) {
        break
      }

      if (bestCost <= lowerCost1 && bestCost <= lowerCost2) {
        break
      }

      if (lowerCost1 === lowerCost2) {
        const meanX = this.nodes[node].aabb.meanX
        const meanY = this.nodes[node].aabb.meanY
        const mean1X = this.nodes[child1].aabb.meanX
        const mean1Y = this.nodes[child1].aabb.meanY
        const mean2X = this.nodes[child2].aabb.meanX
        const mean2Y = this.nodes[child2].aabb.meanY

        const dx1 = mean1X - meanX
        const dy1 = mean1Y - meanY
        const dx2 = mean2X - meanX
        const dy2 = mean2Y - meanY

        lowerCost1 = dx1 * dx1 + dy1 * dy1
        lowerCost2 = dx2 * dx2 + dy2 * dy2
      }

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
    if (this.nodes[node].height < 2) {
      return
    }

    const B = this.nodes[node].child1
    const C = this.nodes[node].child2

    if (this.nodes[B].height === 0 && this.nodes[C].height > 0) {
      // B is leaf and C is internal node
      const F = this.nodes[C].child1
      const G = this.nodes[C].child2

      const costBase = this.nodes[C].aabb.perimeter
      const costBF = this.nodes[B].aabb.unionPerimeter(this.nodes[G].aabb)
      const costBG = this.nodes[F].aabb.unionPerimeter(this.nodes[B].aabb)

      if (costBase <= costBF && costBase <= costBG) {
        return
      }

      if (costBF < costBG) {
        // Swap B and F
        this.nodes[node].child1 = F
        this.nodes[C].child1 = B

        this.nodes[B].parent = C
        this.nodes[F].parent = node

        this.nodes[B].aabb.union(this.nodes[G].aabb, this.nodes[C].aabb)
        this.nodes[F].aabb.union(this.nodes[C].aabb, this.nodes[node].aabb)

        this.nodes[C].height =
          1 + Math.max(this.nodes[B].height, this.nodes[G].height)
        this.nodes[node].height =
          1 + Math.max(this.nodes[F].height, this.nodes[C].height)
      } else {
        // Swap B and G
        this.nodes[node].child1 = G
        this.nodes[C].child2 = B

        this.nodes[B].parent = C
        this.nodes[G].parent = node

        this.nodes[F].aabb.union(this.nodes[B].aabb, this.nodes[C].aabb)
        this.nodes[G].aabb.union(this.nodes[C].aabb, this.nodes[node].aabb)

        this.nodes[C].height =
          1 + Math.max(this.nodes[F].height, this.nodes[B].height)
        this.nodes[node].height =
          1 + Math.max(this.nodes[G].height, this.nodes[C].height)
      }
    } else if (this.nodes[C].height === 0 && this.nodes[B].height > 0) {
      // C is leaf and B is internal node
      const D = this.nodes[B].child1
      const E = this.nodes[B].child2

      const costBase = this.nodes[B].aabb.perimeter
      const costCE = this.nodes[D].aabb.unionPerimeter(this.nodes[C].aabb)
      const costCD = this.nodes[C].aabb.unionPerimeter(this.nodes[E].aabb)

      if (costBase <= costCE && costBase <= costCD) {
        return
      }

      if (costCE < costCD) {
        // Swap C and E
        this.nodes[node].child2 = E
        this.nodes[B].child2 = C

        this.nodes[E].parent = node
        this.nodes[C].parent = B

        this.nodes[D].aabb.union(this.nodes[C].aabb, this.nodes[B].aabb)
        this.nodes[B].aabb.union(this.nodes[E].aabb, this.nodes[node].aabb)

        this.nodes[B].height =
          1 + Math.max(this.nodes[D].height, this.nodes[C].height)
        this.nodes[node].height =
          1 + Math.max(this.nodes[B].height, this.nodes[E].height)
      } else {
        // Swap C and D
        this.nodes[node].child2 = D
        this.nodes[B].child1 = C

        this.nodes[D].parent = node
        this.nodes[C].parent = B

        this.nodes[C].aabb.union(this.nodes[E].aabb, this.nodes[B].aabb)
        this.nodes[B].aabb.union(this.nodes[D].aabb, this.nodes[node].aabb)

        this.nodes[B].height =
          1 + Math.max(this.nodes[C].height, this.nodes[E].height)
        this.nodes[node].height =
          1 + Math.max(this.nodes[B].height, this.nodes[D].height)
      }
    } else {
      // Full swap
      const D = this.nodes[B].child1
      const E = this.nodes[B].child2
      const F = this.nodes[C].child1
      const G = this.nodes[C].child2

      const areaB = this.nodes[B].aabb.perimeter
      const areaC = this.nodes[C].aabb.perimeter
      const costBase = areaB + areaC

      let bestRotation = this.rotationType.NONE
      let baseCost = costBase

      // Cost of swapping B and F
      const costBF =
        areaB + this.nodes[B].aabb.unionPerimeter(this.nodes[G].aabb)
      if (costBF < baseCost) {
        bestRotation = this.rotationType.BF
        baseCost = costBF
      }

      // Cost of swapping B and G
      const costBG =
        areaB + this.nodes[F].aabb.unionPerimeter(this.nodes[B].aabb)
      if (costBG < baseCost) {
        bestRotation = this.rotationType.BG
        baseCost = costBG
      }

      // Cost of swapping C and E
      const costCE =
        areaC + this.nodes[D].aabb.unionPerimeter(this.nodes[C].aabb)
      if (costCE < baseCost) {
        bestRotation = this.rotationType.CE
        baseCost = costCE
      }

      // Cost of swapping C and D
      const costCD =
        areaC + this.nodes[C].aabb.unionPerimeter(this.nodes[E].aabb)
      if (costCD < baseCost) {
        bestRotation = this.rotationType.CD
        baseCost = costCD
      }

      switch (bestRotation) {
        case this.rotationType.NONE: {
          break
        }

        case this.rotationType.BF: {
          this.nodes[node].child1 = F
          this.nodes[C].child1 = B

          this.nodes[F].parent = node
          this.nodes[B].parent = C

          this.nodes[B].aabb.union(this.nodes[G].aabb, this.nodes[C].aabb)
          this.nodes[F].aabb.union(this.nodes[C].aabb, this.nodes[node].aabb)

          this.nodes[C].height =
            1 + Math.max(this.nodes[B].height, this.nodes[G].height)
          this.nodes[node].height =
            1 + Math.max(this.nodes[F].height, this.nodes[C].height)
          break
        }

        case this.rotationType.BG: {
          this.nodes[node].child1 = G
          this.nodes[C].child2 = B

          this.nodes[G].parent = node
          this.nodes[B].parent = C

          this.nodes[F].aabb.union(this.nodes[B].aabb, this.nodes[C].aabb)
          this.nodes[G].aabb.union(this.nodes[C].aabb, this.nodes[node].aabb)

          this.nodes[C].height =
            1 + Math.max(this.nodes[F].height, this.nodes[B].height)
          this.nodes[node].height =
            1 + Math.max(this.nodes[G].height, this.nodes[C].height)
          break
        }

        case this.rotationType.CE: {
          this.nodes[node].child2 = E
          this.nodes[B].child2 = C

          this.nodes[E].parent = node
          this.nodes[C].parent = B

          this.nodes[D].aabb.union(this.nodes[C].aabb, this.nodes[B].aabb)
          this.nodes[B].aabb.union(this.nodes[E].aabb, this.nodes[node].aabb)

          this.nodes[B].height =
            1 + Math.max(this.nodes[D].height, this.nodes[C].height)
          this.nodes[node].height =
            1 + Math.max(this.nodes[B].height, this.nodes[E].height)
          break
        }

        case this.rotationType.CD: {
          this.nodes[node].child2 = D
          this.nodes[B].child1 = C

          this.nodes[D].parent = node
          this.nodes[C].parent = B

          this.nodes[C].aabb.union(this.nodes[E].aabb, this.nodes[B].aabb)
          this.nodes[B].aabb.union(this.nodes[D].aabb, this.nodes[node].aabb)

          this.nodes[B].height =
            1 + Math.max(this.nodes[C].height, this.nodes[E].height)
          this.nodes[node].height =
            1 + Math.max(this.nodes[B].height, this.nodes[D].height)
          break
        }

        default: {
          break
        }
      }
    }
  }

  insertBody(data, margin = null) {
    const node = this.allocate()

    if (!margin) {
      margin = this.nodes[node].margin
    }

    this.nodes[node].aabb.copy(data.aabb)
    this.nodes[node].aabb.enlarge(margin)
    this.nodes[node].data = data

    data.node = node

    if (this.root === null) {
      this.root = node
      return
    }

    const sibling = this.findBestSibling(node)
    const oldParent = this.nodes[sibling].parent
    const newParent = this.allocate()
    this.nodes[newParent].parent = oldParent
    this.nodes[newParent].child1 = sibling
    this.nodes[newParent].child2 = node

    this.nodes[sibling].parent = newParent
    this.nodes[node].parent = newParent

    if (oldParent === null) {
      this.root = newParent
    } else {
      if (this.nodes[oldParent].child1 === sibling) {
        this.nodes[oldParent].child1 = newParent
      } else {
        this.nodes[oldParent].child2 = newParent
      }
    }

    // Refit
    let ancestor = newParent

    while (ancestor !== null) {
      const c1 = this.nodes[ancestor].child1
      const c2 = this.nodes[ancestor].child2

      this.nodes[c1].aabb.union(this.nodes[c2].aabb, this.nodes[ancestor].aabb)
      this.nodes[ancestor].height =
        1 + Math.max(this.nodes[c1].height, this.nodes[c2].height)

      if (this.rotation) {
        this.rotate(ancestor)
      }

      ancestor = this.nodes[ancestor].parent
    }
  }

  removeBody(data) {
    const node = data.node

    if (node === this.root) {
      this.free(this.root)
      this.root = null
      return
    }

    const parent = this.nodes[node].parent
    const grandParent = this.nodes[parent].parent
    const sibling =
      this.nodes[parent].child1 === node
        ? this.nodes[parent].child2
        : this.nodes[parent].child1

    if (grandParent !== null) {
      if (this.nodes[grandParent].child1 === parent) {
        this.nodes[grandParent].child1 = sibling
      } else {
        this.nodes[grandParent].child2 = sibling
      }

      this.nodes[sibling].parent = grandParent

      this.free(parent)
      this.free(node)

      // Refit
      let ancestor = grandParent

      while (ancestor !== null) {
        const child1 = this.nodes[ancestor].child1
        const child2 = this.nodes[ancestor].child2

        this.nodes[ancestor].aabb = this.nodes[child1].aabb.union(
          this.nodes[child2].aabb,
          this.nodes[ancestor].aabb
        )
        this.nodes[ancestor].height =
          1 + Math.max(this.nodes[child1].height, this.nodes[child2].height)

        if (this.rotation) this.rotate(ancestor)

        ancestor = this.nodes[ancestor].parent
      }
    } else {
      const oldParent = this.nodes[sibling].parent

      this.root = sibling
      this.nodes[this.root].parent = null

      this.free(oldParent)
      this.free(node)
    }
  }

  updateBody(data, margin) {
    const node = data.node

    if (!this.nodes[node].aabb.contains(data.aabb)) {
      this.removeBody(data)
      this.insertBody(data, margin)
    }
  }

  queryAABB(aabb, result = []) {
    this.stack.length = 0
    this.stack.push(this.root)

    while (this.stack.length) {
      const node = this.stack.pop()

      if (node === null) continue

      if (this.nodes[node].aabb.overlaps(aabb)) {
        if (this.nodes[node].height === 0) {
          result.push(this.nodes[node].data)
          continue
        }

        this.stack.push(this.nodes[node].child1)
        this.stack.push(this.nodes[node].child2)
      }
    }

    return result
  }

  traverse(callback) {
    this.stack.length = 0
    this.stack.push(this.root)

    while (this.stack.length) {
      const node = this.stack.pop()

      if (node === null) continue

      if (!callback(this.nodes[node])) {
        this.stack.push(this.nodes[node].child1)
        this.stack.push(this.nodes[node].child2)
      }
    }
  }
}
