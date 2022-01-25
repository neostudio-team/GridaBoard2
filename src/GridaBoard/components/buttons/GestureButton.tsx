import React from "react";
import '../../styles/buttons.css';
import { useSelector } from 'react-redux';
import $ from "jquery";
import { RootState } from '../../store/rootReducer';
import { IconButton, SvgIcon } from '@material-ui/core';
import getText from "GridaBoard/language/language";
import SimpleTooltip from "../SimpleTooltip";
import { setGestureMode } from "GridaBoard/store/reducers/gestureReducer";

const gestureStyle = {
  marginLeft: "16px",
  padding: "8px"
} as React.CSSProperties;

const GestureButton = () => {
  const gestureMode = useSelector((state: RootState) => state.gesture.gestureMode)

  const setEnable = (sw: boolean) => {
    if (sw) {
      const $elem = $("#btn_gesture").find(".c2");
      $elem.addClass("checked");
      $('#btn_gesture').css('background', '#E8ECF5');
      $('#btn_gesture').css('borderRadius', '8px');
      $('#gesture_svg_icon').css('color', '#688FFF');
    } else {
      const $elem = $("#btn_gesture").find(".c2");
      $elem.removeClass("checked");
      $('#btn_gesture').css('background', 'none');
      $('#gesture_svg_icon').css('color', '#58627D');
    }
  }

  const onToggleGesture = () => {
    setGestureMode(!gestureMode);
    setEnable(!gestureMode);
  }

  setEnable(gestureMode);

  return (
    <IconButton id="btn_gesture" style={gestureStyle} onClick={() => onToggleGesture()}>
      <SimpleTooltip title={getText("nav_gesture")}>
        <SvgIcon id="gesture_svg_icon" className="c2 checked">
          <path
            d="M16.677 4.408L18 2.833V7h-3.5l1.456-1.733c-.371-.575-1.008-1.05-1.904-1.442-.896-.392-1.911-.575-3.052-.575-1.134 0-2.156.183-3.052.575-.896.392-1.533.867-1.904 1.442L7.5 7H4V2.833l1.323 1.575c.525-.741 1.295-1.316 2.317-1.758C8.655 2.208 9.775 2 11 2s2.345.208 3.36.65c1.022.442 1.792 1.017 2.317 1.758zm-6.148 1.773A.283.283 0 0110.797 6c.121 0 .229.073.27.181l1.055 2.838v1.173c.99.2 1.735 1.058 1.735 2.084v1.518c0 1.154.959 2.09 2.141 2.09 1.658 0 3.002 1.311 3.002 2.929V23H8V12.124c0-.911.632-1.679 1.492-1.908V9.02l1.037-2.838z"
          />
        </SvgIcon>
      </SimpleTooltip>
    </IconButton>
  );
}
export default GestureButton;