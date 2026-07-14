export default class Pool {
  #create
  #objects
  #freeList
  constructor(create, capacity = 16) {
    this.#create = create
    this.#objects = []
    this.#freeList = -1
    this.#grow(capacity)
  }
  get size() {
    return this.#objects.length
  }
  #grow(capacity) {
    const start = this.#objects.length
    const end = start + capacity

    for (let i = start; i < end; ++i) {
      this.#objects[i] = this.#create()
      this.#objects[i].next = i + 1
    }

    this.#objects[end - 1].next = this.#freeList
    this.#freeList = start
  }
  at(index) {
    return this.#objects[index]
  }
  allocate() {
    if (this.#freeList < 0) {
      this.#grow(this.#objects.length)
    }

    const index = this.#freeList

    this.#freeList = this.#objects[index].next
    this.#objects[index].next = -1
    this.#objects[index].allocated = true

    return index
  }
  deallocate(index) {
    if (!this.#objects[index].allocated) {
      return
    }

    this.#objects[index].next = this.#freeList
    this.#objects[index].allocated = false
    this.#freeList = index
  }
}
