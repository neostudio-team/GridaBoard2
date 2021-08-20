
export class NeoDot {
  dotType: number; // - 1:pen-down(first), 2:moving, 3:pen-up(last)
  deltaTime: number; // - time delta from the beginning of the stroke
  time: number; // - absolute time (unix timetick)
  f: number; // - force
  x: number; // - x
  y: number; // - y
  point ?: { x: number; y: number; f: any; }

  constructor(dot: NeoDot) {
    const { dotType, deltaTime, time, f, x, y } = dot;

    this.dotType = dotType;
    this.deltaTime = deltaTime;
    this.time = time;
    this.f = f;
    this.x = x;
    this.y = y;
  }

}
