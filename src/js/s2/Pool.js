export default class Pool {
  #_create
  #_objects
  #_freeList
  constructor(create, capacity = 16) {
    this.#_create = create
    this.#_objects = []
    this.#_freeList = -1
    this.#_grow(capacity)
  }
  get size() {
    return this.#_objects.length
  }
  #_grow(capacity) {
    const start = this.#_objects.length
    const end = start + capacity

    for (let i = start; i < end; ++i) {
      this.#_objects[i] = this.#_create()
      this.#_objects[i].next = i + 1
    }

    this.#_objects[end - 1].next = this.#_freeList
    this.#_freeList = start
  }
  at(index) {
    return this.#_objects[index]
  }
  allocate() {
    if (this.#_freeList < 0) {
      this.#_grow(this.#_objects.length)
    }

    const index = this.#_freeList

    this.#_freeList = this.#_objects[index].next
    this.#_objects[index].next = -1
    this.#_objects[index].allocated = true

    return index
  }
  deallocate(index) {
    if (!this.#_objects[index].allocated) {
      return
    }

    this.#_objects[index].next = this.#_freeList
    this.#_objects[index].allocated = false
    this.#_freeList = index
  }
}
