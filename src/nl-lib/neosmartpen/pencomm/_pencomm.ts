import { PenCommBase, ProtocolHandlerBase, deviceSelectDlg } from "./pencomm_base";
import { DeviceTypeEnum } from "./pencomm_enum";
import { PenCommEventEnum, makePenEvent } from "./pencomm_event";
import { intFromBytes, decimalToHex } from "./pen_util_func";
import { PEN_PACKET_START, PEN_PACKET_END } from "./pencomm_const";
import { INeoSmartpen } from "nl-lib/common/neopen";

// import { NeoSmartpen } from "./neosmartpen";



const bufferArray_first = new Uint8Array(
  [
    PEN_PACKET_START, // start packet
    // cmd (1)
    0x01,

    // length (2)
    0x2a, 0x00,

    // connection code (16)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,

    // app type (2)
    0x00, 0x00,

    // app version (16)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,

    // protocol version(8) 2.18
    0x32, 0x2e, 0x31, 0x38, 0x00, 0x00, 0x00, 0x00,
    PEN_PACKET_END,
  ] // end packet
);


// /**
//  *
//  * @param {number} typeNumber - 0:pen, 1:eraser, 2:player, on 2020/10/01
//  * @return {DeviceTypeEnum} - a member of DeviceTypeEnum
//  */
// function getPenType(typeNumber): DeviceTypeEnum {
//   let result = DeviceTypeEnum.PEN;
//   switch (typeNumber) {
//     case 0:
//       result = DeviceTypeEnum.PEN;
//       break;

//     case 1:
//       result = DeviceTypeEnum.ERASER;
//       break;

//     case 2:
//       result = DeviceTypeEnum.PLAYER;
//       break;

//     default:
//       result = DeviceTypeEnum.PEN;
//       console.error(`device type mismatch (not 0, 1, neither 2), Pen type from pen is ${typeNumber}`);
//       break;
//   }

//   return result;
// }


export default class PenComm extends ProtocolHandlerBase {
  /** @type {BluetoothDevice} */
  btDevice = null;

  // device information
  deviceInfo = {
    /** @type {string} */
    modelName: "", // NWP-F30 ~ NWP-F121HL

    /** @type {number} */
    protocolVer: 100, // 1.00 ==> 100

    firmwareVer: "",

    /** @type {DeviceTypeEnum} */
    deviceType: DeviceTypeEnum.NONE,

    /** @type {string} */
    mac: "00:00:00:00:00:00",
  };

  isPenDown = false;

  penCommBase = new PenCommBase(this);

  penHandler: INeoSmartpen;

  hoverSOBP = {
    isHover : false,
    section : -1,
    owner : -1,
    book : -1,
    page : -1,
    time : -1
  }

  private _strokeStartTime: number;

  private _currentTime: number;

  constructor(penHandler: INeoSmartpen) {
    super();
    this.penHandler = penHandler;
    this.setTimeStamp(0);
  }

  private get strokeStartTime(): number {
    return this._strokeStartTime;
  }

  private set strokeStartTime(value: number) {
    this._currentTime = value;
    this._strokeStartTime = value;
  }

  private setTimeStamp(value: number) {
    this._currentTime = value;
    this._strokeStartTime = value;
  }


  public get currentTime(): number {
    return this._currentTime;
  }
  private accTime = (delta: number) => {
    this._currentTime = this._currentTime + delta;
  }


  getMac = (): string => {
    return this.deviceInfo.mac;
  }

  /**
   * @return {string}
   */

  getModelName = () => {
    return this.deviceInfo.modelName;
  }

  /**
   * @return {number}
   */
  getProtocolVer = () => {
    return this.deviceInfo.protocolVer;
  }


  /**
   * @public
   * @return {BluetoothDevice}
   */
  getBtDevice = () => {
    return this.btDevice;
  }


  /**
   *
   * @param {BluetoothDevice} btDevice
   */
  connect = (btDevice) => {
    this.btDevice = btDevice;
    return this.penCommBase.connect(btDevice, this.onPhysicallyConnected);
  }

  disconnect = () => {
    this.penCommBase.disconnect();
  }

  write = (buf: Uint8Array): Promise<void> => {
    return this.penCommBase.write(buf);
  }


  onDisconnected = () => {
    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.ON_DISCONNECTED, { timeStamp: this.currentTime });

    this.penHandler.onDisconnected(e);
  }


  // PROCESS A UNIT PACKET GOTTEN FROm PEN
  //
  // unit packet should be start with 0xC0 and end by 0xC1
  processUnitPacket = (unit_packet: Uint8Array) => {
    // const this = this;
    const cmd = unit_packet[1];
    // console.log(`  processUnitPacket: 0x${cmd.toString(16)}  size(${unit_packet.length})`);
    switch (cmd) {

      // Pen up/down #1
      case 0x63:
        this.process_63_penupdown_v100(unit_packet);
        break;

      case 0x64:
        this.process_64_pageinfo_v100(unit_packet);
        break;

      case 0x65:
        this.process_65_penmove_v100(unit_packet);
        break;

      case 0x66:
        this.process_66_penmove_simple_v200(unit_packet);
        break;

      case 0x68:
        this.process_68_ndac_error_v100(unit_packet);
        break;


      case 0x69:
        this.process_69_pendown_v212(unit_packet);
        break;

      case 0x6a:
        this.process_6a_penup_v212(unit_packet);
        break;

      case 0x6b:
        this.process_6b_pageinfo_v212(unit_packet);
        break;

      case 0x6c:
        this.process_6c_penmove_v212(unit_packet);
        break;

      case 0x6f:
        this.process_6f_hovermove_v218(unit_packet);
        break;

      case 0x6d:
        this.process_6d_ndacerror_v212(unit_packet);
        break;


      case 0x81:
        this.process_81_device_first_info(unit_packet);
        break;

      case 0x82:
        this.process_82_pw_result(unit_packet);
        break;

      case 0x84:
        this.process_84_device_status(unit_packet);
        break;

      case 0x85:
        this.process_85_config_response(unit_packet);
        break;


      case 0x91:
        this.process_91_realtime_mode_response(unit_packet);
        break;

      default:
        break;
    }
  }

  onPhysicallyConnected = () => {
    console.log("BT protocol #1 ->");
    console.log("4. send first packet");

    // CMD 0x01
    this.write(bufferArray_first); // request Pen information
  }

  /**
   * process response packet from cmd 0x01
   * 디바이스이름, 펌웨어버전, 회사 이름, 펜 종류, 필압센서 종류 등의 reposnse
   *
   * @param buf
   */
  process_81_device_first_info = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *  1:  1 - cmd (0x81)
     *  2:  1 - error code
     *  3:  2 - length
     *
     *  5: 16 - device name
     * 21: 16 - firmware version
     * 37:  8 - protocol version
     * 45: 16 - company name
     * 61:  2 - device type (0,:pen, 2:eraser, 3:player)
     * 63:  6 - MAC address
     * 69:  1 - FS (0:FSR, 1:FSC, 2:up/down, 3:FSIR)
     * 70:  4 - device color type id
     */

    const Errcode = buf[2];

    const modelNameArry = []; //NWP-F30 ~ NWP-F121HL
    for (let i = 5; i < 16; i++) {
      if (buf[i] > 0) modelNameArry.push(buf[i] & 0xff);
    }
    const modelNameString = String.fromCharCode.apply(null, modelNameArry);


    const firmwareVersionArry = []; //NWP-F30 ~ NWP-F121HL
    for (let i = 21; i < 37; i++) {
      if (buf[i] > 0) firmwareVersionArry.push(buf[i] & 0xff);
    }
    const firmwareVersionString = String.fromCharCode.apply(null, firmwareVersionArry);


    const protocolVer = (buf[37] - 0x30) * 100 + (buf[39] - 0x30) * 10 + (buf[40] - 0x30);
    console.log(`    BT protocol #1 <- connection result: ${Errcode} ${protocolVer}`);

    this.deviceInfo.modelName = modelNameString;
    this.deviceInfo.protocolVer = protocolVer;
    this.deviceInfo.firmwareVer = firmwareVersionString;
    // this.deviceInfo.mac = intFromBytes(buf, 63, 6).toString(16).toUpperCase();
    this.deviceInfo.mac = decimalToHex(buf[63], 2) + ":" +
      decimalToHex(buf[64], 2) + ":" +
      decimalToHex(buf[65], 2) + ":" +
      decimalToHex(buf[66], 2) + ":" +
      decimalToHex(buf[67], 2) + ":" +
      decimalToHex(buf[68], 2);

    //
    const typeNumber = intFromBytes(buf, 61, 2);

    function getPenType_on_81(number) {
      let result = DeviceTypeEnum.PEN;
      switch (number) {
        case 0:
        case 1:
          result = DeviceTypeEnum.PEN;
          break;

        case 2:
          result = DeviceTypeEnum.ERASER;
          break;

        case 3:
          result = DeviceTypeEnum.FSIR;
          break;

        default:
          result = DeviceTypeEnum.PEN;
          console.error(`device type mismatch (not 0, 1, neither 2), Pen type from pen is ${typeNumber}`);
          break;
      }

      return result;
    }
    this.deviceInfo.deviceType = getPenType_on_81(typeNumber);

    // t.deviceType = getPenType(typeNumber);

    // CMD 0x04, 펜 설정을 확인하는 패킷을 보낸다. request pen status
    const bufferArray = new Uint8Array([0xc0, 0x04, 0x00, 0x00, 0xc1]);
    console.log(`    BT protocol #2 -> request pen status`);

    this.write(bufferArray);
  }


  /**
   * 펜 설정 확인의 response (CMD 0x04의 결과)
   * @param buf
   */
  process_84_device_status = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x82)
     *  2:  1 - error code
     *  3:  2 - length
     *
     *  5:  1 - locked or not (0:no password, 1:password locked)
     *  6:  1 - retry limit
     *  7:  1 - current retry count
     *  8:  8 - uint64, millisecond tick from 1970/01/01
     * 16:  2 - auto power off time (unit: minutes)
     * 18:  2 - maximum force (< 0x3ff)
     * 20:  1 - storage capacity % (100%)
     * 21:  1 - pencap auto on/off (0:false, 1:true)
     * 22:  1 - auto power on
     * 23:  1 - beep on
     * 24:  1 - hover on
     * 25:  1 - battery status (MSB:in charging, LSB 7bits: 100%)
     * 26:  1 - offline stroke store or not
     * 27:  1 - pressure sensor step (0~4, 0 is most sensitive)
     * 28:  1 - usb mode (0:disk, 1:bulk)
     * 29:  1 - down sampling (0:off, 1:on)
     * 30: 16 - BT model name
     * 46:  1 - data transfer mode (0:event, 1:requset/response, from 2.10 deleted)
     * 47:  1 - ndac error code offline store or not (0:false, 1:true)
     * 48: 21 - reserverd
     */

    // } else if ( buf[0] == PEN_PACKET_START && buf[1] == 0x84 ) {
    // response
    const isPwLocked = buf[5];
    const penMemory = buf[20];
    const penBattery = buf[25];
    console.log(`    BT protocol #2 <- IsLock? ${isPwLocked} memory:${penMemory}%, battery:${penBattery}%`);

    let bufferArray;
    if (isPwLocked === 1) {

      const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PASSWORD_REQUIRED, { timeStamp: this.currentTime });
      this.penHandler.onPasscodeRequired(e);
      // const passcode = prompt("please enter passcode");

      // // input passcode
      // console.log("    BT protocol #3 -> input passcode ");
      // bufferArray = new Uint8Array([0xc0, 0x02, 0x10, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xc1]);

      // bufferArray[4] = passcode.charCodeAt(0);
      // bufferArray[5] = passcode.charCodeAt(1);
      // bufferArray[6] = passcode.charCodeAt(2);
      // bufferArray[7] = passcode.charCodeAt(3);
      // console.log("    passcode1 :" + bufferArray[4]);
      // console.log("    passcode2 :" + bufferArray[5]);
      // console.log("    passcode3 :" + bufferArray[6]);
      // console.log("    passcode4 :" + bufferArray[7]);

      // this.write(bufferArray);
      // // g_btWriteSocket.writeValue(bufferArray);
    } // unlocked
    else {
      // request online
      console.log("    BT protocol #4 -> request online data");
      bufferArray = new Uint8Array([0xc0, 0x11, 0x02, 0x00, 0xff, 0xff, 0xc1]);
      // g_btWriteSocket.writeValue(bufferArray);
      this.write(bufferArray);
    }
  }

  /**
   * CMD 0x02
   * @param passcode
   */
  sendPasscode(passcode: string) {

    console.log("    BT protocol #3 -> input passcode ");
    const bufferArray = new Uint8Array([0xc0, 0x02, 0x10, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xc1]);

    for (let i=0; i<passcode.length; i++) {
      bufferArray[4+i] = passcode.charCodeAt(i);
    }
 
    // g_btWriteSocket.writeValue(bufferArray);
    this.write(bufferArray);
  }


  /**
   * 패스워드 송신 후의 reponse
   * @param buf
   */
  process_82_pw_result = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *  1:  1 - cmd (0x81)
     *  2:  1 - error code
     *  3:  2 - length
     *  5:  1 - password response (0:pw needed, 1:success(or not needed), 2:pen was reset, 3:system error)
     *  6:  1 - retry limit
     *  7:  1 - current retry count
     */

    // response check passcode
    const pwCheckResult = buf[5];

    /** @type {number} */
    const retryCount = buf[6];
    const maxCount = buf[7];

    if (pwCheckResult === 1) {
      // passcode OK
      console.log("    BT protocol #3 <- passcode none ==> OK ");
      console.log("    BT protocol #4 -> request online data");

      // request online
      const bufferArray = new Uint8Array([0xc0, 0x11, 0x02, 0x00, 0xff, 0xff, 0xc1]);
      // g_btWriteSocket.writeValue(bufferArray);
      this.write(bufferArray);
    } else {
      console.log(`    BT protocol #3 <- passcode NG ${retryCount}/${maxCount}`);
      // retry input passcode
      //alert("wrong passcode");
      const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PASSWORD_REQUIRED, { retryCount, timeStamp: this.currentTime });
      this.penHandler.onPasscodeRequired(e);
    }
  }


  /**
   * Set transfer mode, by 5th byte
   * offline store mode (0:off, 1:offline while realtime available, 100:both of realtime and offline)
   * @param val
   */
  setTransferMode(val: number) {
    /**
     *  0:  1 - header
     *  1:  1 - cmd (0x05)
     *  2:  2 - length (0x02)
     *  4:  1 - attribute type (0x07)
     *  5:  1 - offline store mode (0:off, 1:offline while realtime available, 100:both of realtime and offline)
     */

    if (val !== 0 && val !== 1 && val !== 100) return;

    const bufferArray = new Uint8Array([0xc0, 0x05, 0x02, 0x00, 0x07, val, 0xc1]);
    // g_btWriteSocket.writeValue(bufferArray);
    this.write(bufferArray);
  }


  /**
   * hover on/off (0:hover mode off, 1:hover mode on)
   * @param val
   */
  setHoverMode(val: number) {
    /**
     *  0:  1 - header
     *  1:  1 - cmd (0x05)
     *  2:  2 - length (0x02)
     *  4:  1 - attribute type (0x06)
     *  5:  1 - hover on/off (0:hover mode off, 1:hover mode on)
     */

    val &= 0x01;
    const bufferArray = new Uint8Array([0xc0, 0x05, 0x02, 0x00, 0x06, val, 0xc1]);
    // g_btWriteSocket.writeValue(bufferArray);
    this.write(bufferArray);
  }


  /**
   * pen up/down, protocol version 1.00
   * @param buf
   */
  process_63_penupdown_v100 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x63)
     *  2:  2 - length
     *
     *  4:  1 - up/down (0:down, 1:up)
     *  5:  8 - timestamp
     * 13:  1 - pen tip type (0:normal, 1:eraser)
     * 14:  4 - color (argb)
    */

    const isPenDown = buf[4] === 0;
    const penTipMode = buf[13];
    const penId = this.getMac();
    const timeStamp = intFromBytes(buf, 5, 8);   // ARGB
    this.setTimeStamp(timeStamp);

    if (isPenDown) {
      console.log("------------ Pen down --------------");
      this.isPenDown = true;

      const event = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PEN_DOWN, { penTipMode, timeStamp, penId });
      this.penHandler.onPenDown(event);

      return;
    } else {
      console.log("^^^^^^^^^^^^^^ pen up ^^^^^^^^^^^^^");
      this.isPenDown = false;

      const event = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PEN_UP, { penTipMode, timeStamp });
      this.penHandler.onPenUp(event);

      return;
    }
  }

  /**
   * page information,
   * pen down 직후, pen up 직후에 전송되어 옴
   * @param buf
   */
  process_64_pageinfo_v100 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x64)
     *  2:  2 - length
     *
     *  4:  3 - owner
     *  7:  1 - section
     *  8:  4 - note id
     * 12:  4 - page id
    */

    const section = buf[7];
    const owner = intFromBytes(buf, 4, 3);
    const book = intFromBytes(buf, 8, 4);
    const page = intFromBytes(buf, 12, 4);
    //console.log('owner:' + ownerId + ', book:' + bookId + ', page:' + pageId);

    let eventMode = PenCommEventEnum.PAGE_INFO;
    if (!this.isPenDown) {
      eventMode = PenCommEventEnum.PAGE_INFO_HOVER;
    }

    const e = makePenEvent(this.deviceInfo.deviceType, eventMode, { section, owner, book, page, timeStamp: this.currentTime });

    // console.log("    #1 INFO");
    const isHover = eventMode === PenCommEventEnum.PAGE_INFO_HOVER;

    if(isHover){
      this.hoverSOBP = { time: Date.now(), isHover, section, owner, book, page }
    }else{
      this.hoverSOBP.isHover = false;
    }

    // console.log( "0x64");
    this.penHandler.onPageInfo(e, isHover);

    return;
  }


  /**
   * Pen Move, protocol version 1.00
   * @param buf
   */
  private process_65_penmove_v100 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x65)
     *  2:  2 - length
     *  4:  1 - time diff
     *
     *  5:  2 - force
     *  7:  2 - x
     *  9:  2 - y
     * 11:  1 - float x
     * 12:  1 - float y
     * 13:  1 - x tilt
     * 14:  1 - y tilt
     * 15:  2 - twist (0~180, 360 degree => 180)
    */

    const timediff = buf[4];
    this.accTime(timediff);

    const force = intFromBytes(buf, 5, 2);
    const dotX = intFromBytes(buf, 7, 2);
    const dotY = intFromBytes(buf, 9, 2);
    const dotFx = intFromBytes(buf, 11, 1);
    const dotFy = intFromBytes(buf, 12, 1);

    const x = dotX + dotFx / 100;
    const y = dotY + dotFy / 100;

    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PEN_MOVE, { force, x, y, timediff, timeStamp: this.currentTime });
    // e.force = force;
    // e.x = x;
    // e.y = y;
    // e.timediff = timediff;

    console.log(`    #1 MOVE ( ${x}, ${y} )`);
    this.penHandler.onPenMove(e);

    return;
  }


  /**
   * pen move, for slow connection, protocol version 2.00
   * @param buf
   */
  private process_66_penmove_simple_v200 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x66)
     *  2:  2 - length
     *  4:  1 - time diff
     *
     *  5:  2 - x
     *  7:  2 - y
     *  9:  1 - float x
     * 10:  1 - float y
    */

    const timediff = buf[4];
    this.accTime(timediff);

    const force = 100;
    const dotX = intFromBytes(buf, 5, 2);
    const dotY = intFromBytes(buf, 7, 2);
    const dotFx = intFromBytes(buf, 9, 1);
    const dotFy = intFromBytes(buf, 10, 1);

    const x = dotX + dotFx / 100;
    const y = dotY + dotFy / 100;

    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PEN_MOVE, { force, x, y, timediff, timeStamp: this.currentTime });
    // e.force = force;
    // e.x = x;
    // e.y = y;
    // e.timediff = timediff;

    console.log(`    #2 MOVE ( ${x}, ${y} )`);
    this.penHandler.onPenMove(e);

    return;
  }


  /**
   * On NDAC Error, protocol v1.00
   * @param buf
   */
  process_68_ndac_error_v100 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x68)
     *  2:  2 - length
     *  4:  1 - time diff
     *
     *  5:  2 - force
     *  7:  1 - image brightness
     *  8:  1 - exposure time
     *  9:  1 - NDAC process time
     * 10:  2 - label count
     * 12:  1 - ndac error code
    */

    // const this = this;
    const timediff = buf[4];
    this.accTime(timediff);

    const force = intFromBytes(buf, 5, 2);

    const brightness = buf[7];
    const exposureTime = buf[8];
    const ndacProcessTime = buf[9];

    const labelCount = intFromBytes(buf, 10, 2);
    const ndacErrorCode = buf[12];
    const ndacClassType = buf[14];
    const penId = this.getMac();

    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.ERROR,
      {
        timeStamp: this.currentTime,
        timediff,
        force,
        brightness,
        exposureTime,
        ndacProcessTime,
        labelCount,
        ndacErrorCode,
        ndacClassType,
        penId
      });
    // this.isPenDown = true;

    console.log("    PEN DOWN");
    this.penHandler.onPenDown(e);
  }


  /**
   * pen down, v2.12
   * @param buf
   */
  process_69_pendown_v212 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x69)
     *  2:  2 - length
     *  4:  1 - event count
     *
     *  5:  8 - timeStamp
     *  13:  1 - pen tip type (0:normal, 1:eraser)
     *  14:  4 - pen tip color (argb)
    */
    // console.log("    PEN DOWN");

    const timeStamp = intFromBytes(buf, 5, 8);   // ARGB
    this.setTimeStamp(timeStamp);

    const penTipMode = buf[13];
    const color = intFromBytes(buf, 14, 4);   // ARGB
    const penId = this.getMac();

    this.isPenDown = true;

    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PEN_DOWN, { penTipMode, color, timeStamp, penId });
    this.penHandler.onPenDown(e);
  }

  /**
   * pen up, v2.12
   * @param buf
   */
  process_6a_penup_v212 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x6A)
     *  2:  2 - length
     *  4:  1 - event count
     *
     *  5:  8 - timestamp
     *
     * 13:  2 - dot count (down-up 사이에 BT로 전송한 dot code 개수)
     * 15:  2 - total image count (down-up 사이에 촬영된 이미지 개수)
     * 17:  2 - proc image count (처리한 이미지 개수)
     * 19:  2 - success image count (처리에 성공한 이미지 개수)
     * 21:  2 - valid image count (밝기 등으로 유효한 이미지 개수)
    */
    // console.log("    PEN UP");

    const timeStamp = intFromBytes(buf, 5, 8);   // ARGB
    this.setTimeStamp(timeStamp);

    // const dotCount = intFromBytes(buf, 13, 2);
    const totalImageCount = intFromBytes(buf, 15, 2);
    // const procImageCount = intFromBytes(buf, 17, 2);
    const successImageCount = intFromBytes(buf, 19, 2);
    const validImageCount = intFromBytes(buf, 21, 2);

    // console.log(`totalImageCount: ${totalImageCount} `);
    // console.log(`procImageCount: ${procImageCount} `);
    // console.log(`successImageCount: ${successImageCount} `);
    // console.log(`validImageCount: ${validImageCount} `);

    const successRate_ndac = successImageCount / totalImageCount;
    const successRate_optical = validImageCount / totalImageCount;

    this.isPenDown = false;

    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PEN_UP, { successRate_ndac, successRate_optical, timeStamp });
    this.penHandler.onPenUp(e);
  }

  /**
   * page info packet, v2.12
   * @param buf
   */
  process_6b_pageinfo_v212 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x6B)
     *  2:  2 - length
     *  4:  1 - event count
     *
     *  5:  3 - owner
     *  8:  1 - section
     *  9:  4 - book
     * 13:  4 - page
    */


    const owner = intFromBytes(buf, 5, 3);
    const section = intFromBytes(buf, 8, 1);
    const book = intFromBytes(buf, 9, 4);
    const page = intFromBytes(buf, 13, 4);

    let eventMode = PenCommEventEnum.PAGE_INFO;
    if (!this.isPenDown) {
      eventMode = PenCommEventEnum.PAGE_INFO_HOVER;
    }

    const e = makePenEvent(this.deviceInfo.deviceType, eventMode, { section, owner, book, page, timeStamp: this.currentTime });
    const isHover = eventMode === PenCommEventEnum.PAGE_INFO_HOVER;

    if(isHover){
      this.hoverSOBP = { time: Date.now(), isHover, section, owner, book, page }
    }else{
      this.hoverSOBP.isHover = false;
    }

    // console.log("0x6b");

    // console.log(`    PEN INFO, page address: ${o}.${b}.${p} ${isHover ? "HOVER" : "PEN DOWN"} `);
    this.penHandler.onPageInfo(e, isHover);
  }


  /**
   * pen move, v2.12
   * @param buf
   */
  process_6c_penmove_v212 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x6C)
     *  2:  2 - length
     *  4:  1 - event count
     *  5:  1 - delta time
     *
     *  6:  2 - force
     *  8:  2 - x
     * 10:  2 - y
     * 12:  1 - float x
     * 13:  1 - float y
     *
     * 14:  1 - x tilt
     * 15:  1 - y tilt
     * 16:  2 - twist
    */
    // pen down moving (or hover moving, in firmware <2.18 )
    const timediff = buf[5];
    this.accTime(timediff);

    let force = intFromBytes(buf, 6, 2);
    const dotX = intFromBytes(buf, 8, 2);
    const dotY = intFromBytes(buf, 10, 2);
    const dotFx = intFromBytes(buf, 12, 1);
    const dotFy = intFromBytes(buf, 13, 1);


    const x = dotX + dotFx / 100;
    const y = dotY + dotFy / 100;
    
    switch (this.deviceInfo.modelName) {
      case 'NWP-F30':  
      case 'NWP-F30K': { //디모
        force += 600;
        break;
      }
      case 'NWP-F80': { //라미
        force += 300;
        break;
      }
      default: break;
    }

    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.PEN_MOVE, { x, y, force, timediff, timeStamp: this.currentTime });
    this.penHandler.onPenMove(e);
  }


  /**
   * pen dot hover, v2.18
   * @param buf
   */
  process_6f_hovermove_v218 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x6F)
     *  2:  2 - length
     *  4:  1 - delta time
     *
     *  8:  2 - x
     * 10:  2 - y
     * 12:  1 - float x
     * 13:  1 - float y
    */

    const timediff = buf[4];
    this.accTime(timediff);

    const force = 0;
    const dotX = intFromBytes(buf, 5, 2);
    const dotY = intFromBytes(buf, 7, 2);
    const dotFx = intFromBytes(buf, 9, 1);
    const dotFy = intFromBytes(buf, 10, 1);

    const x = dotX + dotFx / 100;
    const y = dotY + dotFy / 100;
    const e = makePenEvent(DeviceTypeEnum.PEN, PenCommEventEnum.PEN_MOVE_HOVER, { x, y, force, timediff, timeStamp: this.currentTime });
    
    if(this.hoverSOBP.isHover && Date.now() - this.hoverSOBP.time > 1000){
      const pageInfoEvent = makePenEvent(
        this.deviceInfo.deviceType, 
        PenCommEventEnum.PAGE_INFO_HOVER, 
        { section : this.hoverSOBP.section, owner : this.hoverSOBP.owner, book : this.hoverSOBP.book, page : this.hoverSOBP.page, timeStamp: this.currentTime }
      );
      this.hoverSOBP.time = Date.now();
      this.penHandler.onPageInfo(pageInfoEvent, true);
    }

    this.penHandler.onHoverMove(e);
  }

  /**
   * NDAC Error, v2.12
   * @param buf
   */
  process_6d_ndacerror_v212 = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x6D)
     *  2:  2 - length
     *  4:  1 - event count
     *  5:  1 - delta time
     *
     *  6:  2 - force
     *  8:  1 - image brightness
     *  9:  1 - exposure time
     * 10:  1 - NDAC process time
     * 11:  2 - label count
     * 13:  1 - ndac error code
     * 14:  1 - class type (0:G3C6, 1:N3C6)
     * 15:  1 - error count (down부터 카운트, 초기화:0)
    */

    const timediff = buf[5];
    this.accTime(timediff);

    const force = intFromBytes(buf, 6, 2);

    const brightness = buf[8];
    const exposureTime = buf[9];
    const ndacProcessTime = buf[10];

    const labelCount = intFromBytes(buf, 11, 2);
    const ndacErrorCode = buf[13];
    const ndacClassType = buf[14];
    const continuousErrorCount = buf[15];

    const options = {
      timeStamp: this.currentTime,

      timediff,
      force,

      brightness,
      exposureTime,
      ndacProcessTime,
      labelCount,
      ndacErrorCode,
      ndacClassType,
      continuousErrorCount,
    }

    const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.CODE_ERROR, options);
    this.penHandler.onNcodeError(e);
  }


  /**
   * response at pen configuration (ex. hover mode)
   * @param buf
   */
  process_85_config_response = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x85)
     *  2:  1 - error code
     *  3:  2 - length
     *  5:  1 - type
     *  6:  1 - result (0:success, 1:fail)
    */
    // const error_code = buf[2];
    const res_type = buf[6];
    console.log(`    response from pen: ${res_type === 0 ? "success" : "fail:" + res_type.toString(16)}`);
  }


  /**
   * response, 실시간 필기 데이터 요청에 따른
   * @param buf
   */
  process_91_realtime_mode_response = (buf: Uint8Array) => {
    /**
     *  0:  1 - header
     *
     *  1:  1 - cmd (0x91)
     *  2:  1 - error code
     *  3:  2 - length
    */

    const Errcode = buf[2];

    if (Errcode === 0) {
      console.log("    BT protocol #4 <- You can write.");
      console.log("    Device info ");
      console.log("         modelName: " + this.deviceInfo.modelName);
      console.log("         protocolVer: " + this.deviceInfo.protocolVer / 100);
      console.log("         deviceType: " + this.deviceInfo.deviceType);

      let errorCode = 0;
      let infoMessage = "";

      // callback
      if (this.deviceInfo.protocolVer < 218) {
        errorCode = 1;
        infoMessage = `need to upgrade firmware greater than 2.18 (current version=${this.deviceInfo.protocolVer / 100})`;
      }

      const e = makePenEvent(this.deviceInfo.deviceType, PenCommEventEnum.ON_CONNECTED, { errorCode, infoMessage, timeStamp: this.currentTime });
      this.penHandler.onConnected(e);

      // set auto hover mode
      if (this.deviceInfo.protocolVer >= 218) {
        this.setHoverMode(1); // enable hover
      }
    } else {
      console.log("BT protocol #4 <- error : " + Errcode);
    }
  }

}

export { deviceSelectDlg };