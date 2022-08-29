class PageInfo {
    section: number;
    owner: number;
    book: number;
    page: number;
    constructor(s: number, o: number, b: number, p: number) {
      this.section = s;
      this.owner = o;
      this.book = b;
      this.page = p;
    }
  }
  
  class Dot {
    pageInfo: PageInfo;
    x: number;
    y: number;
    f: number;
    dotType: number; // 0: Down, 1: Move, 2: Up
    timeStamp: number;
    penTipType: number;
    color: number; // 하위 4byte rgba 순서로 사용
  
    constructor(
      x: number,
      y: number,
      f: number,
      type: number,
      timeStamp: number,
      tipType: number,
      color: number,
      pageInfo: PageInfo
    ) {
      this.x = x;
      this.y = y;
      this.f = f;
      this.dotType = type;
      this.timeStamp = timeStamp;
      this.penTipType = tipType;
      this.color = color;
      this.pageInfo = pageInfo;
    }
  }
  
  
  
  type StrokeOption = {
    id ?: string,
    penTipType ?: number,
    color ?: number,
    thickness ?: number,
    startTime ?: number,
    dotCount ?: number,
    mac ?: string,
    strokeType ?: number,
    updated ?: number,
    dots ?: string,
    transform ?: string
  }
  
  export default class Stroke {
    id = ""; // Firebase id
    penTipType = 0; // 0: Pen , 1: Eraser
    color = 0xFF000000;
    thickness = 1;
    startTime = 0;
    dotCount = 0;
    mac = "";
    /// 0 : 필기펜, 1 : 마커, 2: 형광펜
    strokeType = 0;
    updated = 0;
    dots = ""; // base64 string
    transform = ""; // base64 string
    pageInfo: PageInfo = new PageInfo(0,0,0,0);
    blobDots ?: Uint8Array | null = null;
    blobTransform ?: Uint8Array | null = null;
  
    constructor(dots ?: Dot[] | StrokeOption) {
      if(dots !== undefined){
        if(dots.constructor === Array){
          this.initFromDot(dots);
        }else{
          this.initFromStroke(dots as StrokeOption);
        }
      }
    }
    rowData(){
      const stroke = {
        id : this.id,
        penTipType : this.penTipType,
        color : this.color,
        thickness : this.thickness,
        startTime : this.startTime,
        dotCount : this.dotCount,
        mac : this.mac,
        strokeType : this.strokeType,
        updated : this.updated,
        dots : this.dots,
        transform : this.transform,
        pageInfo : this.pageInfo
      };
  
      return stroke;
    }
    private initFromDot(dots: Array<Dot>){
      if(dots.length < 4){
        return "4개 이상의 dot이 필요합니다";
      }
      const fisrtDot = dots[0];
      this.penTipType = fisrtDot.penTipType;
      this.color = fisrtDot.color;
      this.thickness = 0.1;
      this.startTime = fisrtDot.timeStamp;
      this.dotCount = dots.length;
      this.mac = "";
      this.strokeType = 0;
      this.updated = 0;
      this.dots = "";
      this.pageInfo = new PageInfo(fisrtDot.pageInfo.section, fisrtDot.pageInfo.owner, fisrtDot.pageInfo.book, fisrtDot.pageInfo.page);
  
  
  
      const dotBlob = DotToBlob(dots, this.startTime);
  
      this.blobDots = dotBlob;

      this.dots = blobToBase64(dotBlob);
    }
    private initFromStroke(st: StrokeOption) {
      this.id = st.id || "";
      this.penTipType = st.penTipType || 0;
      this.color = st.color || 0xFF000000;
      this.thickness = st.thickness || 1;
      this.startTime = st.startTime || 0;
      this.dotCount = st.dotCount || 0;
      this.mac = st.mac || "";
      this.strokeType = st.strokeType || 0;
      this.updated = st.updated || 0;
      
  
      if (st.dots) {
        this.dots = st.dots;
        if (typeof st.dots === "string") {
          const binary_string = window.atob(st.dots);
          const len = binary_string.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
          }
          this.blobDots = bytes;
        }
      }
  
      if (st.transform) {
        this.transform = st.transform;
        if (typeof st.transform === "string") {
          const binary_string = window.atob(st.transform);
          const len = binary_string.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
          }
          this.blobTransform = bytes;
        }
      }
    }
    initData(data:Dot[] | StrokeOption){
      if(data.constructor === Array){
        this.initFromDot(data);
      }else{
        this.initFromStroke(data as StrokeOption);
      }
    }
    /**
     * Returns 'rgba(255,255,255,1)'
     * @returns {string}
     */
    getColor() {
      // if (this.penTipType === 1) { //Eraser
      //   return 'rgba(1,1,1,0)'
      // }
      const arr = new Uint8Array(4);
      const dv = new DataView(arr.buffer);
      dv.setUint32(0, this.color, false);
      const color = Array.from(arr);
  
      const rgb = color.slice(1, 4);
      const a = color[0] / 255;
      const hexColor = "rgba(" + rgb.toString() + "," + a + ")";
      return hexColor;
    }
  
    getDots() {
      const dots = Array<Dot>();
      let time = this.startTime;
      if(this.blobDots === null) return [];
      const dotBlob: Uint8Array = this.blobDots as Uint8Array;
  
      const dotSize = dotBlob.length / this.dotCount; // 16 or 17
      let shiftDot = 0;
      if (!(dotSize === 16 || dotSize === 17)) {
        console.log("invalid dot", dotBlob.length, dotSize, this.dotCount);
        return dots;
      }
      if (dotSize === 17) {
        shiftDot = 1;
      }
  
      for (let i = 0; i < this.dotCount; i++) {
        const st = i * dotSize;
        const end = st + dotSize;
        const d = dotBlob.slice(st, end);
  
        const deltaTime = d[0];
        const f = this.toFloat(d, 1 + shiftDot);
        const x = this.toFloat(d, 5 + shiftDot);
        const y = this.toFloat(d, 9 + shiftDot);
        let dotType = 1;
        if (i === 0) {
          dotType = 0;
        } else if (i === this.dotCount - 1) {
          dotType = 2;
        } else {
          dotType = 1;
        }
        time += deltaTime;
        const pageInfo = new PageInfo(0, 0, 0, 0);
        const dot: Dot = new Dot(x, y, f, dotType, time, this.penTipType, this.color, pageInfo);
        dots.push(dot);
      }
  
      return dots;
    }
  
    getCenter = () => {
      const dots = this.getDots();
      let sumX = 0;
      let sumY = 0;
      dots.forEach((d) => {
        sumX += d.x;
        sumY += d.y;
      });
      const aveX = sumX / dots.length;
      const aveY = sumY / dots.length;
      return { x: aveX, y: aveY };
    };
  
    private toFloat = (d: Uint8Array, index: number) => {
      const byte = d.slice(index, index + 4);
      const view = new DataView(byte.buffer);
      return view.getFloat32(0, true);
    };
  }
  

  export const DotToBlob = (dots:Array<Dot>, startTime:number)=>{
    const dotBlob = new Uint8Array(dots.length * 17);
    for(let i = 0; i < dots.length; i++){
      const dot = dots[i];
      const pos = new Float32Array(3)
      pos[0] = dot.f;
      pos[1] = dot.x;
      pos[2] = dot.y;
      const uintPos = new Uint8Array(pos.buffer); //length 12(float 1개당 4개)
      const d = new Uint8Array(17);
      const deltaTime = dot.timeStamp - startTime;
      const timeEndian = new Uint8Array(new Int16Array([deltaTime]).buffer);
      
      d[0] = timeEndian[0];
      d[1] = timeEndian[1];
      
      uintPos.forEach((el,idx)=>d[2+idx] = el);

      d[14] = (dot as any).angle.tx; // xtilt
      d[15] = (dot as any).angle.ty; // ytilt
      d[16] = (dot as any).angle.twist; // twist

      d.forEach((el,idx)=>dotBlob[i*17+idx]=el);
    }

    return dotBlob;
  }

  export const blobToBase64 = (dotBlob:Uint8Array)=>{
    let rowDots = "";
    for(let i = 0; i < dotBlob.length; i++){
      rowDots += String.fromCharCode(dotBlob[i]);
    }
    const dots = window.btoa(rowDots);

    return dots;
  }
  