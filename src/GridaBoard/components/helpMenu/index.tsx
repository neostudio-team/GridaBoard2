import React, {useState} from "react";
import {Button, makeStyles} from "@material-ui/core";
import getText, { languageType } from "../../language/language";
import helpData from "./textData.json";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { default as Slider, Settings, CustomArrowProps } from "react-slick";


const useStyle = makeStyles(theme=>({
	wrap : {
		right : "24px",
		bottom : "88px",
		position: "absolute",
		width: "380px",
		height: "552px",
		overflow: "hidden",
		
		background: theme.custom.white[90],
		boxShadow : theme.custom.shadows[0],
		borderRadius : "12px"
	},
	slider: {
		minHeight:"320px",
		"& div" : {
			outline: "none"
		},
	},
	sliderImg: {
		display: "flex !important",
		justifyContent: "center"
	},
	content: {
		padding: "24px",
		paddingBottom: "0px",
		"& > div" : {
			position: "relative",
		},
		"& > div:first-child":{
			fontFamily : "Roboto",
			fontStyle : "normal",
			fontWeight : "bold",
			fontSize : "14px",
			lineHeight : "16px",
			display : "flex",
			alignItems : "center",
			letterSpacing : "0.25px",
			minHeight: "16px",
			color: theme.palette.primary.main
		},
		"& > div:nth-child(2)": {
			marginTop : "12px",
			fontFamily : "Roboto",
			fontStyle : "normal",
			fontWeight : "bold",
			fontSize : "20px",
			lineHeight : "23px",
			display : "flex",
			alignItems : "center",
			letterSpacing : "0.25px",
			color : theme.palette.text.primary
		},
		"& > div:nth-child(3)" : {
			marginTop : "8px",
			fontFamily : "Roboto",
			fontStyle : "normal",
			fontWeight : "bold",
			fontSize : "14px",
			lineHeight : "16px",
			letterSpacing : "0.25px",
			color : theme.palette.text.secondary
		},
	},
	buttonDiv : {
		position: "absolute",
		right: "24px",
		bottom: "24px",
		"& > *:first-child" : {
			marginRight: "8px"
		}
	},
	buttonStart: {
		"& > *": {
			width: "162px"
		},
	},
	buttonNormal : {
		"& > *": {
			width: "72px"
		},
	}
}));

// type Props = {
// 	onHeaderClick ?: ()=>void,
// 	className ?: clas
// }
interface Props extends  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	mainNo : number,
	subNo : number,
	onHeaderClick ?: (ref)=>void,
	setHelpMenu: (boolean)=>void
}
//우선 데이터 하나짜리
const HelpViewer = (props : Props)=>{
	const classes = useStyle();
	let myHelpData = helpData[languageType] === undefined? helpData["ko"] : helpData[languageType];
	myHelpData = myHelpData["main" + props.mainNo].sub[props.subNo-1].text;
	const imageUrl = `/helpImg/${languageType}/main${props.mainNo}/sub${props.subNo}`;
	const images = Array.from({length:myHelpData.length}, (el,idx)=>`${imageUrl}/${idx+1}.png`);
	let slider = null as Slider;
	let [nowView,setNowView] = useState(0);

	const goPrev = ()=>{
		if(nowView == 0){
			//스킵
			props.setHelpMenu(false);
		}
		slider.slickPrev();
	}
	const goNext = ()=>{
		if(myHelpData[nowView].link !== null){
			// window.open("about:blank").location.href = "/nbs_v2.json.gz";
			// var href = "https://drive.google.com/file/d/1l4C0q8xe6JIZPYEY6DdUFQLeGlikbayR";
			// var href = "/2P_test.pdf";
			// var anchor = document.createElement('a');
			// anchor.href = href;
			// anchor.download = href;
			// document.body.appendChild(anchor);
			// anchor.click();
			// document.body.removeChild(anchor);
			// fetch("/2P_test.pdf").then(function(t) {
			// 	return t.blob().then((b)=>{
			// 		var a = document.createElement("a");
			// 		a.href = URL.createObjectURL(b);
			// 		a.setAttribute("download", "test.pdf");
			// 		a.click();
			// 	}
			// 	);
			// });
			// var xhr = new XMLHttpRequest();
			// xhr.responseType = 'blob';
			// xhr.onload = function () {
			// 	var a = document.createElement('a');
			// 	a.href = window.URL.createObjectURL(xhr.response); // xhr.response is a blob
			// 	a.download = "test.pdf"; // Set the file name.
			// 	a.style.display = 'none';
			// 	document.body.appendChild(a);
			// 	a.click();
			// };
			// xhr.open('GET', "https://drive.google.com/file/d/1l4C0q8xe6JIZPYEY6DdUFQLeGlikbayR");
			// xhr.send();
			slider.slickNext();
		}else if(nowView == myHelpData.length-1){
			props.setHelpMenu(false);
		}else{
			slider.slickNext();
		}
	}

	const sliderSettings : Settings = {
		dots: false,
		infinite: false,
		speed: 500,
		slidesToShow: 1,
		slidesToScroll: 1,
		draggable: false,
		arrows: false,
		// beforeChange: (prev, current) => {
		afterChange: (current) => {
			setNowView(current)
		}
	}

	return (
		<div id="testtest" className={`${classes.wrap} ${props.className}`}/*  onClick={(evt)=>{alert(1)}} */ >
			<Slider ref={e=>slider=e} {...sliderSettings} className={classes.slider}>
				{
					images.map((el, idx)=>(
					<div key={idx} className={classes.sliderImg} >
						<img src={el}/>
					</div>
				))}
			</Slider>
			<div className={classes.content}>
				<div>{nowView != 0 ? `${nowView}/${myHelpData.length-1}` : ""}</div>
				<div>{myHelpData[nowView].subtitle}</div>
				<div>{myHelpData[nowView].subtext.replace("\\n","\n")}</div>
			</div>
			<div className={`${classes.buttonDiv} ${nowView == 0 ? classes.buttonStart : classes.buttonNormal}`}> {/* 버튼 */}
				<Button onClick={goPrev} variant="contained" color="secondary"> 
					{
						nowView == 0 ? 
							getText("helpMenu_skip")
						: getText("helpMenu_prev")
					}
				</Button>
				<Button onClick={goNext} variant="contained" color="primary">
					{
						nowView == 0 ? 
							getText("helpMenu_start")
						: nowView == myHelpData.length-1 ?
							getText("helpMenu_end")
						: myHelpData[nowView].link ? 
							getText("helpMenu_download")
						: getText("helpMenu_next")
					}
				</Button>
			</div>
		</div>
	)
}

export default HelpViewer;