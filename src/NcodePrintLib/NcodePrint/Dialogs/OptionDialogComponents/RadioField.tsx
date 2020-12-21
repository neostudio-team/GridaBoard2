import React from 'react';
import { Box, Checkbox, TableCell, TableCellProps, Typography } from '@material-ui/core';
import GridaToolTip from '../../../../styles/GridaToolTip';
import { printOptionTip } from './ToolTips';
import { cellRadioStyle } from "./OptionLevel_0";

export type ITipType = { title: string, msg: string, tail: string };

interface Props extends TableCellProps {
  checked, handleChange, color, name, children, showHelp, tip?: ITipType,
  disabled?,
}


function TableCellRadioSub(props: Props) {
  const { disabled, checked, handleChange, color, name, children, tip, showHelp, ...rest } = props;
  console.log(`disabled === ${disabled}`)
  return (
    <Box display="flex" alignItems="center" justifyContent="left" >

      <Checkbox style={{ paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 6 }}
        disabled={disabled === true}
        checked={checked}
        onChange={handleChange}
        color={color}
        name={name}
      />
      { children}
    </Box>
  );
}


export function RadioField(props: Props) {

  const { checked, handleChange, color, name, children, tip, showHelp, ...rest } = props;
  let autoTip = tip;
  // const upper = value.toUpperCase();
  if (autoTip === undefined) {
    autoTip = printOptionTip[name];
  }
  return (
    < GridaToolTip open={showHelp} placement="left" tip={autoTip} >
      <Typography variant="subtitle1" component="h5">
        <TableCellRadioSub {...props} />
      </Typography>
    </GridaToolTip >
  )
}

