/// <reference types="web-bluetooth" />

import {
  PEN_PACKET_START,
  PEN_PACKET_END,
  PEN_SERVICE_UUID_16,
  PEN_CHARACTERISTICS_WRITE_UUID_16,
  PEN_CHARACTERISTICS_NOTIFICATION_UUID_16,
  PEN_SERVICE_UUID_128,
  PEN_CHARACTERISTICS_WRITE_UUID_128,
  PEN_CHARACTERISTICS_NOTIFICATION_UUID_128,
} from "./pencomm_const";

import { unescapePacket } from "./pen_util_func";
import getText from "GridaBoard/language/language";
import pen_prefixes from "./pen_prefixes.json";

export async function deviceSelectDlg(): Promise<BluetoothDevice> {
  console.log("********* Requesting any Bluetooth Device... **********");
  
  const options = pen_prefixes;
  options.filters[0].services.push(PEN_SERVICE_UUID_16);
  options.filters[0].services.push(PEN_SERVICE_UUID_128);
  // let result = await Bluetooth.requestDeviceAsync(options);

  let result = { device: null, type: "null" };

  try {
    // let mobileNavigatorObject: any = window.navigator;
    const device = await navigator.bluetooth.requestDevice(options);
    result = { type: 'success', device };
  }
  catch (error) {
    if (error.code === 8) {
      // User Cancelled or not found adapther
      if(error.message.indexOf("adapter") !== -1){
        //블루투스 어뎁터 없음
        alert(getText("noBluetoothAdapter"));
      }
      result = { device: null, type: 'cancel' };
    }
    throw error;
  }

  if (result.type === 'cancel') {
    return null;
  }

  return result.device;
}

const devDeviceDlg = async ()=>{
  const webBluetooth = navigator.bluetooth as any;
  if(webBluetooth.getDevices === undefined) return false;

  try{
    const devices = await webBluetooth.getDevices();
    console.log(devices);
    
    if(devices[0] !== undefined && devices[0].gatt.connected !== true){
      let isConnect = false;
      let i  = 0;
      for(i = 0; i < devices.length; i++){
        try { 
          await devices[i].gatt.connect();
          isConnect = true;
        }
        catch(error) {
          isConnect = false;
        }

        if(isConnect) break ;
      }
      if(isConnect){
        return devices[i];
      }else{
        return false;
      }
    }else{
      return false;
    }
  }catch(e){
    return false;
  }
}

enum DEVICE_STATE {
  disconnected = 0,
  connecting = 1,
  connected = 2,
}

type GetServiceReturnType = {
  service: BluetoothRemoteGATTService,
  writeSocket: BluetoothRemoteGATTCharacteristic,
  notifyIndicate: BluetoothRemoteGATTCharacteristic,
};

type BT_UUID_DEFINITION = {
  service: string | number,
  write: string | number,
  noti: string | number,
};

const PEN_BT_UUID: { [key: string]: BT_UUID_DEFINITION } = {
  // for F30, and future devices
  "new": {
    service: PEN_SERVICE_UUID_128,
    write: PEN_CHARACTERISTICS_WRITE_UUID_128,
    noti: PEN_CHARACTERISTICS_NOTIFICATION_UUID_128,
  },

  // for F51, F50, F121, F120
  "old": {
    service: PEN_SERVICE_UUID_16,
    write: PEN_CHARACTERISTICS_WRITE_UUID_16,
    noti: PEN_CHARACTERISTICS_NOTIFICATION_UUID_16,
  }
}

export class PenCommBase {

  protocolHandler: ProtocolHandlerBase = null;
  btDevice: BluetoothDevice = null;

  _btWriteSocket: BluetoothRemoteGATTCharacteristic = null;
  _btNotifyIndicate: BluetoothRemoteGATTCharacteristic = null;

  // this._bluetooth_MTU = 1024;

  _bt_buffer = new Uint8Array(0);
  // this.modelNameString = null;

  inConnecting = false;
  inDisconnecting = false;
  connected = false;

  _state = DEVICE_STATE.disconnected;

  btServer: BluetoothRemoteGATTServer = null;


  /**
   *
   * @param protocolHandler
   */
  constructor(protocolHandler: ProtocolHandlerBase) {
    this.protocolHandler = protocolHandler;
  }



  /**
   *
   * @param uuids
   * @param server
   */
  async getServiceProcess(uuids: BT_UUID_DEFINITION, server: BluetoothRemoteGATTServer): Promise<GetServiceReturnType> {
    console.log(`  2-1. M1 getPrimaryService, connected:${server.connected}`);
    const service = await server.getPrimaryService(uuids.service);

    console.log(`  2-2. M1 getCharacteristic, connected:${server.connected}`);
    const writeSocket = await service.getCharacteristic(uuids.write);

    console.log(`  2-3. M1 getCharacteristic, connected:${server.connected}`);
    const notifyIndicate = await service.getCharacteristic(uuids.noti);

    return { service, writeSocket, notifyIndicate };
  }


  /**
   *
   * @param server
   */
  getService = async (server: BluetoothRemoteGATTServer): Promise<GetServiceReturnType> => {
    let uuids = [PEN_BT_UUID.old, PEN_BT_UUID.new];
    if (server.device.name === "Smartpen dimo_d") {
      uuids = [PEN_BT_UUID.new, PEN_BT_UUID.old];
    }

    try {
      const result = await this.getServiceProcess(uuids[0], server);
      return result;
    } catch (e) {
      console.log(`  ==> failed`);
      if (e.message.indexOf("No Services matching UUID") > -1) {
        const result = await this.getServiceProcess(uuids[1], server);
        return result;
      } else {
        throw e;
      }
    }
  }


  /**
   *
   * @param btDevice
   * @param protocolStartCallback
   */
  connect = async (btDevice: BluetoothDevice, protocolStartCallback: () => void): Promise<boolean> => {
    if (this._state !== DEVICE_STATE.disconnected)
      return false;

    this.connected = false;
    this.inConnecting = true;

    let server: BluetoothRemoteGATTServer = null;
    this.btServer = server;

    try {
      console.log("1. Connecting to GATT Server...");
      btDevice.addEventListener("gattserverdisconnected", this.onDeviceDisconnected);
      server = await btDevice.gatt.connect();
    }
    catch (e) {
      const isBTdevice = e.message.indexOf("adapter");
      if (isBTdevice > -1) console.log("Bluetooth LE dongle is not found");

      console.error(e);
      return false;
    }

    console.log(`2. get Service and Sockets, connected:${server.connected}`);

    try {
      const { writeSocket, notifyIndicate } = await this.getService(server);

      console.log("3. Add Event listeners");
      notifyIndicate.addEventListener("characteristicvaluechanged", this.onPenPacketReceived);
      await notifyIndicate.startNotifications();

      this.btDevice = btDevice;
      this._btWriteSocket = writeSocket;
      this._btNotifyIndicate = notifyIndicate;
      console.log("BLE Connected...");

      this.connected = true;
      this.inConnecting = false;


    }
    catch (e) {
      const isBTdevice = e.message.indexOf("adapter");
      if (isBTdevice > -1) console.log("Bluetooth LE dongle is not found");
      console.error(e);
      return false;
    }

    protocolStartCallback();
    // this.protocolHandler.onPhysicallyConnected();
    return true;
  }


  /**
   * disconnect function:
   */
  disconnect = () => {
    console.log(`     DISCONNECT operation`);
    this.inDisconnecting = true;
    const self = this;
    if (!self.connected || self.btDevice === null) {
      return;
    }

    if (self.btDevice !== null) {
      self.btDevice.gatt.disconnect();
    }
  }

  /**
   *
   */
  preDisconnected = () => {
    throw new Error("Not implemented: preDisconnected");
  }

  /**
   *
   */
  onDeviceDisconnected = () => {
    this.inDisconnecting = false;
    this.btDevice = null;
    this.btServer = null;

    this._btWriteSocket = null;
    this._btNotifyIndicate = null;

    this._bt_buffer = new Uint8Array(0);

    // 상위로 전달
    const handler = this.protocolHandler;
    if (handler) handler.onDisconnected();
    // this.protocolHandler = null;
  }

  /**
   *
   * @param buf
   */
  write = (buf: Uint8Array): Promise<void> => {
    return this._btWriteSocket.writeValue(buf);
  }


  /**
   * PEN PACKET PROCESSOR
   *
   * process raw packets from pen
   * slice packets in to a unit packet
   * process the unit packet command code
   * @param event
   */
  onPenPacketReceived = (event: any) => {
    // console.log("    handle Data");
    const self = this;

    const value = event.target.value;
    const data_length = event.target.value.byteLength;

    // 이전에 있던 buf에 concatenate
    const prev_buf = self._bt_buffer;
    const prev_len = prev_buf.length;
    let buffer = new Uint8Array(prev_buf.length + data_length);

    // https://stackoverflow.com/questions/14071463/how-can-i-merge-typedarrays-in-javascript
    buffer.set(prev_buf);
    for (let i = 0; i < value.byteLength; i++) {
      buffer[prev_len + i] = value.getUint8(i);
    }

    let start = buffer.indexOf(PEN_PACKET_START);
    let end = buffer.indexOf(PEN_PACKET_END);

    // let idx = 0;
    // let cnt = 0;

    // console.log("packet length: " + data_length);
    while (start !== -1 && end !== -1) {
      // console.log("   [" + cnt + "]  packet found: (" + (idx + start) + ", " + (idx + end) + ")");

      // buffer 잘라 주기
      const curCmdPacket = buffer.slice(start, end + 1);
      // idx += end;

      // escape code 처리
      const unescapedBuf = unescapePacket(curCmdPacket);

      // packet 처리
      if (unescapedBuf[0] === PEN_PACKET_START) {
        // pen command 처리
        this.protocolHandler.processUnitPacket(unescapedBuf);
      } else {
        // 위의 slice 처리가 이상하든지 메모리가 깨졌다.
      }

      // buffer 정리
      // cnt++;
      buffer = buffer.slice(end + 1);
      start = buffer.indexOf(PEN_PACKET_START);
      end = buffer.indexOf(PEN_PACKET_END);
    }

    self._bt_buffer = buffer;
  }
}

export class ProtocolHandlerBase {
  onPhysicallyConnected() {
    throw new Error("Not implemented: processUnitPacket");

  }
  onDisconnected() {
    throw new Error("Not implemented: processUnitPacket");
  }
  processUnitPacket(buf) {
    throw new Error("Not implemented: processUnitPacket");
  }
}

