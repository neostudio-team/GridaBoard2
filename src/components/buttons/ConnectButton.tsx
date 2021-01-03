/* eslint-disable no-unused-vars */
import React, { Component, useState } from "react";

import '../../styles/buttons.css';
import Tooltip, { TooltipProps } from '@material-ui/core/Tooltip';
import { Theme, Typography, withStyles } from '@material-ui/core';
import PenManager from '../../neosmartpen/pencomm/PenManager'
import { NeoSmartpen, PenEventName, } from '../../neosmartpen';
import GridaToolTip from "../../styles/GridaToolTip";
import { useSelector } from "react-redux";
import { RootState } from "../../store/rootReducer";

type Props = {
  onPenLinkChanged: (e) => void;
}
const ConnectButton = (props: Props) => {

  /**
   * @param {{pen:NeoSmartpen, mac:string, event:PenEvent}} e
   */
  const onPenLinkChanged = e => {
    props.onPenLinkChanged(e);
  };

  const handleConnectPen = () => {
    const penManager = PenManager.getInstance();
    const new_pen: NeoSmartpen = penManager.createPen();

    if (new_pen.connect()) {
      new_pen.addEventListener(PenEventName.ON_CONNECTED, onPenLinkChanged);
      new_pen.addEventListener(PenEventName.ON_DISCONNECTED, onPenLinkChanged);
    }
  };

  const num_pens = useSelector((state: RootState) => state.appConfig.num_pens);

  return (
    <div className="btn-group-vertical neo_shadow" style={{ marginBottom: 10 }}>
      <button id="btn_connect" type="button" className="btn btn-neo btn-neo-vertical"
        onClick={() => handleConnectPen()}>
        <GridaToolTip open={true} placement="left" tip={{
          head: "Pen Connect",
          msg: "블루투스를 통해 펜을 연결합니다. 블루투스 통신이 가능한 환경에서만 동작합니다.",
          tail: "Shift + 1~7 각 펜의 내용을 감추기/보이기, P 모든 펜의 획을 감추기/보이기"
        }} title={undefined}>
          <div className="c2 ">
            <img src='../../icons/icon_smartpen_connected_p.png' className="toggle-off hover-image"></img>
            <img src='../../icons/icon_smartpen_disconnected_n.png' className="toggle-off normal-image"></img>
            <img src='../../icons/icon_smartpen_connected_n.png' className="toggle-on normal-image"></img>
            <img src='../../icons/icon_smartpen_disconnected_p.png' className="toggle-on hover-image"></img>

            <span id="pen_id" className="pen-badge badge badge-pill badge-light">{num_pens}</span>
          </div>
        </GridaToolTip>
      </button>
    </div>
  );
}

export default ConnectButton;