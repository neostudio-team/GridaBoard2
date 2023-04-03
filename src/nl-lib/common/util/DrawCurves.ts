
// export const PATH_THICKNESS_SCALE = 16384;
// export const PATH_THICKNESS_SCALE_DET = 0.00006103515625;

import { IPoint, IPointForce } from "../structures";


export const PATH_THICKNESS_SCALE = 1;
export const PATH_THICKNESS_SCALE_DET = 1;



/**
 *
 * @param p1
 */
const pointBegin = (p1: IPoint): string => {
  // return ("M" + p1.x + "," + p1.y);
  const x1 = p1.x * PATH_THICKNESS_SCALE_DET;
  const y1 = p1.y * PATH_THICKNESS_SCALE_DET;

  return ("M" + x1 + "," + y1);
};

const pointBegin_arr = (p1: IPoint) => {
  // return ("M" + p1.x + "," + p1.y);
  const x1 = p1.x * PATH_THICKNESS_SCALE_DET;
  const y1 = p1.y * PATH_THICKNESS_SCALE_DET;

  return ["M", x1, y1];
};



/**
 *
 * @param p1
 * @param p2
 * @param p3
 */


const point3Curve_arr = (p1: IPoint, p2: IPoint, p3: IPoint) => {
  // return ("C" + p1.x + ", " + p1.y + "," + p2.x + ", " + p2.y + "," + p3.x + "," + p3.y);
  const x1 = p1.x * PATH_THICKNESS_SCALE_DET;
  const x2 = p2.x * PATH_THICKNESS_SCALE_DET;
  const x3 = p3.x * PATH_THICKNESS_SCALE_DET;


  const y1 = p1.y * PATH_THICKNESS_SCALE_DET;
  const y2 = p2.y * PATH_THICKNESS_SCALE_DET;
  const y3 = p3.y * PATH_THICKNESS_SCALE_DET;

  return ["C", x1, y1, x2, y2, x3, y3];
};

const point3Curve = (p1: IPoint, p2: IPoint, p3: IPoint): string => {
  // return ("C" + p1.x + ", " + p1.y + "," + p2.x + ", " + p2.y + "," + p3.x + "," + p3.y);
  const x1 = p1.x * PATH_THICKNESS_SCALE_DET;
  const x2 = p2.x * PATH_THICKNESS_SCALE_DET;
  const x3 = p3.x * PATH_THICKNESS_SCALE_DET;


  const y1 = p1.y * PATH_THICKNESS_SCALE_DET;
  const y2 = p2.y * PATH_THICKNESS_SCALE_DET;
  const y3 = p3.y * PATH_THICKNESS_SCALE_DET;

  return ("C" + x1 + ", " + y1 + "," + x2 + ", " + y2 + "," + x3 + "," + y3);
};


/**
 *
 * @param points
 */
export const drawLinePath = (points: IPoint[]): string => {
  const len = points.length;
  if (len < 1) return "";

  let path = "";
  path += "M" + points[0].x + "," + points[0].y;

  for (let i = 1; i < len; i++) {
    const p = points[i];
    path += " L" + p.x + ", " + p.y;
  }


  for (let i = len - 2; i >= 0; i--) {
    const p = points[i];
    path += " L" + p.x + ", " + p.y;
  }

  path += " z";


  return path;
};


/**
 *
 * @param points
 */
export const drawCurvePath = (points: IPoint[]): string => {
  if (points.length < 1) {
    return "";
  }
  let bezier = "";
  bezier += "M" + points[0].x + "," + points[0].y;

  const n = points.length - 1;
  let controlPoints = [];

  for (let i = 0; i < n; i++) {
    const p = points[i];

    if (controlPoints.length < 5) {
      controlPoints.push(p);
      continue;
    }
    
    const endPoint = {
      x: (controlPoints[2].x + p.x) / 2,
      y: (controlPoints[2].y + p.y) / 2,
    };

    bezier += point3Curve(controlPoints[1], controlPoints[2], endPoint);
    controlPoints = [endPoint, p];
  }
  const p = points[n];

  while (controlPoints.length < 5) {
    controlPoints.push(p);
  }
  bezier += point3Curve(controlPoints[1], controlPoints[2], p);

  return bezier;
};


/**
 *
 * @param obj
 */
const clone = (obj: any): any => {
  if (obj === null || typeof obj !== "object") return obj;

  const copy = obj.constructor();

  for (const attr in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, attr)) {
      copy[attr] = clone(obj[attr]);
    }
  }
  return copy;
};

/**
 *
 * @param points
 * @param strokeThickness
 */
// Drawing Function
export const drawPath_arr = (points: IPointForce[], strokeThickness: number) => {
  if (points.length < 2) {
    return [];
  }

  const bezier = [];
  const scaled_pen_thickness = strokeThickness;

  // first 1.0f --> lineScale
  let x0, x1, x2, x3, y0, y1, y2, y3, p0, p1, p2, p3;
  let vx01, vy01, vx21, vy21;

  // unit tangent vectors 0->1 and 1<-2
  let norm, n_x0, n_y0, n_x2, n_y2;

  // the normals
  const temp = { x: 0, y: 0 };
  const endPoint = { x: 0, y: 0 };
  const controlPoint1 = { x: 0, y: 0 };
  const controlPoint2 = { x: 0, y: 0 };
  // the first actual points is treated as a midpoint
  x0 = points[0].x + 0.1;
  y0 = points[0].y;
  p0 = points[0].f;
  x1 = points[1].x + 0.1;
  y1 = points[1].y;
  p1 = points[1].f;
  vx01 = x1 - x0;
  vy01 = y1 - y0;
  // instead of dividing tangent/norm by two, we multiply norm by 2
  norm = Math.sqrt(vx01 * vx01 + vy01 * vy01 + 0.0001) * 2.0;
  vx01 = (vx01 / norm) * scaled_pen_thickness * p0;
  vy01 = (vy01 / norm) * scaled_pen_thickness * p0;
  n_x0 = vy01;
  n_y0 = -vx01;
  // Trip back path will be saved.
  const pathPointStore = [];
  temp.x = x0 + n_x0;
  temp.y = y0 + n_y0;

  endPoint.x = x0 + n_x0;
  endPoint.y = y0 + n_y0;
  controlPoint1.x = x0 - n_x0 - vx01;
  controlPoint1.y = y0 - n_y0 - vy01;
  controlPoint2.x = x0 + n_x0 - vx01;
  controlPoint2.y = y0 + n_y0 - vy01;
  //Save last path. I'll be back here....
  const ep = clone(endPoint);
  const cp1 = clone(controlPoint1);
  const cp2 = clone(controlPoint2);
  pathPointStore.push({
    endPoint: ep,
    controlPoint1: cp1,
    controlPoint2: cp2,
  });

  // drawing setting
  bezier.push(pointBegin_arr(temp));
  for (let i = 2; i < points.length - 1; i++) {
    x3 = points[i].x;
    // + 0.1f;
    y3 = points[i].y;
    p3 = points[i].f;
    x2 = (x1 + x3) / 2.0;
    y2 = (y1 + y3) / 2.0;
    p2 = (p1 + p3) / 2.0;
    vx21 = x1 - x2;
    vy21 = y1 - y2;
    norm = Math.sqrt(vx21 * vx21 + vy21 * vy21 + 0.0001) * 2.0;
    vx21 = (vx21 / norm) * scaled_pen_thickness * p2;
    vy21 = (vy21 / norm) * scaled_pen_thickness * p2;
    n_x2 = -vy21;
    n_y2 = vx21;
    if (norm < 0.6) {
      continue;
    }
    // The + boundary of the stroke
    endPoint.x = x2 + n_x2;
    endPoint.y = y2 + n_y2;
    controlPoint1.x = x1 + n_x0;
    controlPoint1.y = y1 + n_y0;
    controlPoint2.x = x1 + n_x2;
    controlPoint2.y = y1 + n_y2;
    bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

    // THe - boundary of the stroke
    endPoint.x = x0 - n_x0;
    endPoint.y = y0 - n_y0;
    controlPoint1.x = x1 - n_x2;
    controlPoint1.y = y1 - n_y2;
    controlPoint2.x = x1 - n_x0;
    controlPoint2.y = y1 - n_y0;
    const ep = clone(endPoint);
    const cp1 = clone(controlPoint1);
    const cp2 = clone(controlPoint2);
    pathPointStore.push({
      endPoint: ep,
      controlPoint1: cp1,
      controlPoint2: cp2,
    });
    x0 = x2;
    y0 = y2;
    p0 = p2;
    x1 = x3;
    y1 = y3;
    p1 = p3;
    vx01 = -vx21;
    vy01 = -vy21;
    n_x0 = n_x2;
    n_y0 = n_y2;
    //
  }
  // the last actual points is treated as a midpoint
  x2 = points[points.length - 1].x;
  // + 0.1f;
  y2 = points[points.length - 1].y;
  p2 = points[points.length - 1].f;
  vx21 = x1 - x2;
  vy21 = y1 - y2;
  norm = Math.sqrt(vx21 * vx21 + vy21 * vy21 + 0.0001) * 2.0;
  vx21 = (vx21 / norm) * scaled_pen_thickness * p2;
  vy21 = (vy21 / norm) * scaled_pen_thickness * p2;
  n_x2 = -vy21;
  n_y2 = vx21;
  endPoint.x = x2 + n_x2;
  endPoint.y = y2 + n_y2;
  controlPoint1.x = x1 + n_x0;
  controlPoint1.y = y1 + n_y0;
  controlPoint2.x = x1 + n_x2;
  controlPoint2.y = y1 + n_y2;
  bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

  endPoint.x = x2 - n_x2;
  endPoint.y = y2 - n_y2;
  controlPoint1.x = x2 + n_x2 - vx21;
  controlPoint1.y = y2 + n_y2 - vy21;
  controlPoint2.x = x2 - n_x2 - vx21;
  controlPoint2.y = y2 - n_y2 - vy21;
  bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

  endPoint.x = x0 - n_x0;
  endPoint.y = y0 - n_y0;
  controlPoint1.x = x1 - n_x2;
  controlPoint1.y = y1 - n_y2;
  controlPoint2.x = x1 - n_x0;
  controlPoint2.y = y1 - n_y0;
  bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

  // Trace back to the starting points
  // console.log("reverse start", pathPointStore)
  while (pathPointStore.length) {
    const repath = pathPointStore.pop();
    bezier.push(point3Curve_arr(repath.controlPoint1, repath.controlPoint2, repath.endPoint));
  }
  return bezier;
};





/**
 * uncompleted, kitty 2021/03/16
 * @param points
 * @param strokeThickness
 */
// Drawing Function
export const drawPath_chiselNip = (points: IPointForce[], strokeThickness: number) => {
  if (points.length < 3) {
    return [];
  }

  const bezier = [];
  const scaled_pen_thickness = strokeThickness;

  // first 1.0f --> lineScale
  let x0, x1, x2, x3, y0, y1, y2, y3, p0, p1, p2, p3;
  let vx01, vy01, vx21, vy21;

  // unit tangent vectors 0->1 and 1<-2
  let norm, n_x0, n_y0, n_x2, n_y2;

  // the normals
  const temp = { x: 0, y: 0 };
  const endPoint = { x: 0, y: 0 };
  const controlPoint1 = { x: 0, y: 0 };
  const controlPoint2 = { x: 0, y: 0 };
  // the first actual points is treated as a midpoint
  x0 = points[0].x + 0.1;
  y0 = points[0].y;
  p0 = points[0].f;
  x1 = points[1].x + 0.1;
  y1 = points[1].y;
  p1 = points[1].f;
  vx01 = x1 - x0;
  vy01 = y1 - y0;
  // instead of dividing tangent/norm by two, we multiply norm by 2
  norm = Math.sqrt(vx01 * vx01 + vy01 * vy01 + 0.0001) * 2.0;
  vx01 = (vx01 / 1) * scaled_pen_thickness * p0;      // kitty, 2021/03/17
  vy01 = (vy01 / norm) * scaled_pen_thickness * p0;
  n_x0 = vy01;
  n_y0 = -vx01;
  // Trip back path will be saved.
  const pathPointStore = [];
  temp.x = x0 + n_x0;
  temp.y = y0 + n_y0;

  endPoint.x = x0 + n_x0;
  endPoint.y = y0 + n_y0;
  controlPoint1.x = x0 - n_x0 - vx01;
  controlPoint1.y = y0 - n_y0 - vy01;
  controlPoint2.x = x0 + n_x0 - vx01;
  controlPoint2.y = y0 + n_y0 - vy01;
  //Save last path. I'll be back here....
  const ep = clone(endPoint);
  const cp1 = clone(controlPoint1);
  const cp2 = clone(controlPoint2);
  pathPointStore.push({
    endPoint: ep,
    controlPoint1: cp1,
    controlPoint2: cp2,
  });

  // drawing setting
  bezier.push(pointBegin_arr(temp));
  for (let i = 2; i < points.length - 1; i++) {
    x3 = points[i].x;
    // + 0.1f;
    y3 = points[i].y;
    p3 = points[i].f;
    x2 = (x1 + x3) / 2.0;
    y2 = (y1 + y3) / 2.0;
    p2 = (p1 + p3) / 2.0;
    vx21 = x1 - x2;
    vy21 = y1 - y2;
    norm = Math.sqrt(vx21 * vx21 + vy21 * vy21 + 0.0001) * 2.0;

    p2 = 500;
    vx21 = (vx21 / 1) * scaled_pen_thickness * p2; // kitty, 2021/03/17
    vy21 = (vy21 / norm) * scaled_pen_thickness * p2;
    n_x2 = -vy21;
    n_y2 = vx21;
    if (norm < 0.6) {
      continue;
    }
    // The + boundary of the stroke
    endPoint.x = x2 + n_x2;
    endPoint.y = y2 + n_y2;
    controlPoint1.x = x1 + n_x0;
    controlPoint1.y = y1 + n_y0;
    controlPoint2.x = x1 + n_x2;
    controlPoint2.y = y1 + n_y2;
    bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

    // THe - boundary of the stroke
    endPoint.x = x0 - n_x0;
    endPoint.y = y0 - n_y0;
    controlPoint1.x = x1 - n_x2;
    controlPoint1.y = y1 - n_y2;
    controlPoint2.x = x1 - n_x0;
    controlPoint2.y = y1 - n_y0;
    const ep = clone(endPoint);
    const cp1 = clone(controlPoint1);
    const cp2 = clone(controlPoint2);
    pathPointStore.push({
      endPoint: ep,
      controlPoint1: cp1,
      controlPoint2: cp2,
    });
    x0 = x2;
    y0 = y2;
    p0 = p2;
    x1 = x3;
    y1 = y3;
    p1 = p3;
    vx01 = -vx21;
    vy01 = -vy21;
    n_x0 = n_x2;
    n_y0 = n_y2;
    //
  }
  // the last actual points is treated as a midpoint
  x2 = points[points.length - 1].x;
  // + 0.1f;
  y2 = points[points.length - 1].y;
  p2 = points[points.length - 1].f;
  vx21 = x1 - x2;
  vy21 = y1 - y2;
  norm = Math.sqrt(vx21 * vx21 + vy21 * vy21 + 0.0001) * 2.0;
  vx21 = (vx21 / 1) * scaled_pen_thickness * p2; // kitty, 2021/03/17
  vy21 = (vy21 / norm) * scaled_pen_thickness * p2;
  n_x2 = -vy21;
  n_y2 = vx21;
  endPoint.x = x2 + n_x2;
  endPoint.y = y2 + n_y2;
  controlPoint1.x = x1 + n_x0;
  controlPoint1.y = y1 + n_y0;
  controlPoint2.x = x1 + n_x2;
  controlPoint2.y = y1 + n_y2;
  bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

  endPoint.x = x2 - n_x2;
  endPoint.y = y2 - n_y2;
  controlPoint1.x = x2 + n_x2 - vx21;
  controlPoint1.y = y2 + n_y2 - vy21;
  controlPoint2.x = x2 - n_x2 - vx21;
  controlPoint2.y = y2 - n_y2 - vy21;
  bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

  endPoint.x = x0 - n_x0;
  endPoint.y = y0 - n_y0;
  controlPoint1.x = x1 - n_x2;
  controlPoint1.y = y1 - n_y2;
  controlPoint2.x = x1 - n_x0;
  controlPoint2.y = y1 - n_y0;
  bezier.push(point3Curve_arr(controlPoint1, controlPoint2, endPoint));

  // Trace back to the starting points
  // console.log("reverse start", pathPointStore)
  while (pathPointStore.length) {
    const repath = pathPointStore.pop();
    bezier.push(point3Curve_arr(repath.controlPoint1, repath.controlPoint2, repath.endPoint));
  }
  return bezier;
};




/**
 *
 * @param points
 * @param strokeThickness
 */
// Drawing Function
export const drawPath = (points: IPointForce[], strokeThickness: number): string => {
  if (points.length < 2) {
    return "";
  }

  let bezier = "";
  const scaled_pen_thickness = strokeThickness;

  // first 1.0f --> lineScale
  let x0, x1, x2, x3, y0, y1, y2, y3, p0, p1, p2, p3;
  let vx01, vy01, vx21, vy21;

  // unit tangent vectors 0->1 and 1<-2
  let norm, n_x0, n_y0, n_x2, n_y2;

  // the normals
  const temp = { x: 0, y: 0 };
  const endPoint = { x: 0, y: 0 };
  const controlPoint1 = { x: 0, y: 0 };
  const controlPoint2 = { x: 0, y: 0 };
  // the first actual points is treated as a midpoint
  x0 = points[0].x + 0.1;
  y0 = points[0].y;
  p0 = points[0].f;
  x1 = points[1].x + 0.1;
  y1 = points[1].y;
  p1 = points[1].f;
  vx01 = x1 - x0;
  vy01 = y1 - y0;
  // instead of dividing tangent/norm by two, we multiply norm by 2
  norm = Math.sqrt(vx01 * vx01 + vy01 * vy01 + 0.0001) * 2.0;
  vx01 = (vx01 / norm) * scaled_pen_thickness * p0;
  vy01 = (vy01 / norm) * scaled_pen_thickness * p0;
  n_x0 = vy01;
  n_y0 = -vx01;
  // Trip back path will be saved.
  const pathPointStore = [];
  temp.x = x0 + n_x0;
  temp.y = y0 + n_y0;

  endPoint.x = x0 + n_x0;
  endPoint.y = y0 + n_y0;
  controlPoint1.x = x0 - n_x0 - vx01;
  controlPoint1.y = y0 - n_y0 - vy01;
  controlPoint2.x = x0 + n_x0 - vx01;
  controlPoint2.y = y0 + n_y0 - vy01;
  //Save last path. I'll be back here....
  const ep = clone(endPoint);
  const cp1 = clone(controlPoint1);
  const cp2 = clone(controlPoint2);
  pathPointStore.push({
    endPoint: ep,
    controlPoint1: cp1,
    controlPoint2: cp2,
  });

  // drawing setting
  bezier += pointBegin(temp);
  for (let i = 2; i < points.length - 1; i++) {
    x3 = points[i].x;
    // + 0.1f;
    y3 = points[i].y;
    p3 = points[i].f;
    x2 = (x1 + x3) / 2.0;
    y2 = (y1 + y3) / 2.0;
    p2 = (p1 + p3) / 2.0;
    vx21 = x1 - x2;
    vy21 = y1 - y2;
    norm = Math.sqrt(vx21 * vx21 + vy21 * vy21 + 0.0001) * 2.0;
    vx21 = (vx21 / norm) * scaled_pen_thickness * p2;
    vy21 = (vy21 / norm) * scaled_pen_thickness * p2;
    n_x2 = -vy21;
    n_y2 = vx21;
    if (norm < 0.6) {
      continue;
    }
    // The + boundary of the stroke
    endPoint.x = x2 + n_x2;
    endPoint.y = y2 + n_y2;
    controlPoint1.x = x1 + n_x0;
    controlPoint1.y = y1 + n_y0;
    controlPoint2.x = x1 + n_x2;
    controlPoint2.y = y1 + n_y2;
    bezier += point3Curve(controlPoint1, controlPoint2, endPoint);

    // THe - boundary of the stroke
    endPoint.x = x0 - n_x0;
    endPoint.y = y0 - n_y0;
    controlPoint1.x = x1 - n_x2;
    controlPoint1.y = y1 - n_y2;
    controlPoint2.x = x1 - n_x0;
    controlPoint2.y = y1 - n_y0;
    const ep = clone(endPoint);
    const cp1 = clone(controlPoint1);
    const cp2 = clone(controlPoint2);
    pathPointStore.push({
      endPoint: ep,
      controlPoint1: cp1,
      controlPoint2: cp2,
    });
    x0 = x2;
    y0 = y2;
    p0 = p2;
    x1 = x3;
    y1 = y3;
    p1 = p3;
    vx01 = -vx21;
    vy01 = -vy21;
    n_x0 = n_x2;
    n_y0 = n_y2;
    //
  }
  // the last actual points is treated as a midpoint
  x2 = points[points.length - 1].x;
  // + 0.1f;
  y2 = points[points.length - 1].y;
  p2 = points[points.length - 1].f;
  vx21 = x1 - x2;
  vy21 = y1 - y2;
  norm = Math.sqrt(vx21 * vx21 + vy21 * vy21 + 0.0001) * 2.0;
  vx21 = (vx21 / norm) * scaled_pen_thickness * p2;
  vy21 = (vy21 / norm) * scaled_pen_thickness * p2;
  n_x2 = -vy21;
  n_y2 = vx21;
  endPoint.x = x2 + n_x2;
  endPoint.y = y2 + n_y2;
  controlPoint1.x = x1 + n_x0;
  controlPoint1.y = y1 + n_y0;
  controlPoint2.x = x1 + n_x2;
  controlPoint2.y = y1 + n_y2;
  bezier += point3Curve(controlPoint1, controlPoint2, endPoint);
  endPoint.x = x2 - n_x2;
  endPoint.y = y2 - n_y2;
  controlPoint1.x = x2 + n_x2 - vx21;
  controlPoint1.y = y2 + n_y2 - vy21;
  controlPoint2.x = x2 - n_x2 - vx21;
  controlPoint2.y = y2 - n_y2 - vy21;
  bezier += point3Curve(controlPoint1, controlPoint2, endPoint);

  endPoint.x = x0 - n_x0;
  endPoint.y = y0 - n_y0;
  controlPoint1.x = x1 - n_x2;
  controlPoint1.y = y1 - n_y2;
  controlPoint2.x = x1 - n_x0;
  controlPoint2.y = y1 - n_y0;
  bezier += point3Curve(controlPoint1, controlPoint2, endPoint);

  // Trace back to the starting points
  // console.log("reverse start", pathPointStore)
  while (pathPointStore.length) {
    const repath = pathPointStore.pop();
    bezier += point3Curve(
      repath.controlPoint1,
      repath.controlPoint2,
      repath.endPoint
    );
  }
  return bezier;
};

