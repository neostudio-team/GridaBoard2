import React from "react";
import '../../styles/buttons.css';
import { useSelector } from 'react-redux';
import $ from "jquery";
import { RootState } from '../../store/rootReducer';
import { IconButton, SvgIcon } from '@material-ui/core';
import getText from "GridaBoard/language/language";
import SimpleTooltip from "../SimpleTooltip";
import { setHideCanvasMode } from "GridaBoard/store/reducers/gestureReducer";

const hideCanvasStyle = {
  marginLeft: "16px",
  padding: "8px"
} as React.CSSProperties;

const HideCanvasButton = () => {
  const hideCanvasMode = useSelector((state: RootState) => state.gesture.hideCanvasMode)

  const setEnable = (sw: boolean) => {
    if (sw) {
      const $elem = $("#btn_hidecanvas").find(".c2");
      $elem.addClass("checked");
      $('#btn_hidecanvas').css('background', '#E8ECF5');
      $('#btn_hidecanvas').css('borderRadius', '8px');
      $('#hidecanvas_svg_icon').css('color', '#688FFF');
    } else {
      const $elem = $("#btn_hidecanvas").find(".c2");
      $elem.removeClass("checked");
      $('#btn_hidecanvas').css('background', 'none');
      $('#hidecanvas_svg_icon').css('color', '#58627D');
    }
  }

  const onToggleHideCanvas = () => {
    setHideCanvasMode(!hideCanvasMode);
    setEnable(!hideCanvasMode);
  }

  setEnable(hideCanvasMode);

  return (
    <IconButton id="btn_hidecanvas" style={hideCanvasStyle} onClick={() => onToggleHideCanvas()}>
      <SimpleTooltip title={getText("nav_hideCanvas")}>
        <SvgIcon id="hidecanvas_svg_icon" className="c2 checked">
          <path
            d="M2.052 11.684C2.073 11.617 4.367 5 12 5c7.633 0 9.927 6.617 9.949 6.684l.105.316-.106.316C21.927 12.383 19.633 19 12 19c-7.633 0-9.927-6.617-9.949-6.684L1.946 12l.106-.316zM4.074 12c.502 1.154 2.575 5 7.926 5 5.348 0 7.422-3.842 7.926-5-.502-1.154-2.575-5-7.926-5-5.348 0-7.422 3.842-7.926 5zm5.81-2.116A3.02 3.02 0 0112 9c1.641 0 3 1.359 3 3 0 1.642-1.359 3-3 3a3.02 3.02 0 01-3-3 3.02 3.02 0 01.884-2.116z"
          />
        </SvgIcon>
      </SimpleTooltip>
    </IconButton>
  );
}
export default HideCanvasButton;