import mixShapes from './mix-shapes.js'

export default (s2, world, options = {
  count: 1000,
  size: 0.24,
  groundWidth: 20,
  centerX: 0,
  bottomY: 0
}) => {
  mixShapes(s2, world, options)
}
