import React from "react";
import styled, { keyframes } from "styled-components";

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 0.5px solid rgba(0,0,0,0.2);
    padding: 1em 15em;
    color: rgba(45, 140, 255, 1);
    p{
        font-size: 2em;
        font-weight: 600;
    }
`
const Span = styled.div<{size: number}>`
    font-size: ${props => props.size}em;
`
const Main = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 15em;
    font-size: 1em;
    a{
        color: rgba(45, 140, 255, 1);
    }
`
const Content = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin: 0 5em 2em;
    padding: 2em;
    border-bottom: 0.5px solid rgba(0,0,0,0.2);
    ${Span}{
        height: 3em;
    }
`
const Button = styled.button`
    border: none;
    border-radius: 10px;
    background-color: rgba(14, 114, 237, 1);
    color: white;
    font-size: 1em;
    padding: 0.8em 2.5em;
    width: 11em;
    cursor: pointer;
    &:hover{
        background-color: rgba(237, 114, 14, 1);
        span{
            padding-right: 20px;
        }
        span:after{
            opacity: 1;
            right: 0;
        }
    }
    span{
        position: relative;
        transition: 0.5s;
    }
    span:after{
        content: "\\00bb";
        font-size: 1.1em;
        position: absolute;
        opacity: 0;
        right: -20px;
        transition: 0.5s;
    }
    
`
const Footer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    ${Span}{
        height: 5em;
    }
    ${Span}:last-child{
        margin-top: auto;
        color: grey;
        font-family: Roboto;
        /* font-size: 0.8em; */
        letter-spacing: 0.03em;
    }
`

const storm = keyframes`
    0%{
        transform: translate3d( 0, 0, 0) translateZ(0)
    }
    25%{
        transform: translate3d( 4px, 0, 0) translateZ(0)
    }
    50%{
        transform: translate3d( -3px, 0, 0) translateZ(0)
    }
    75%{
        transform: translate3d( 2px, 0, 0) translateZ(0)
    }
    100%{
        transform: translate3d( 0, 0, 0) translateZ(0)
    }
`

const Pop = styled.button`
    position: fixed;
    right: 0;
    margin-right: 2em;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    border-radius: 60px;
    height: 60px;
    width: 60px;
    background-color: rgba(14, 114, 237, 1);
    cursor: pointer;
    svg{
        stroke: white;
        fill: none;
        width: 25px;
        height: 25px;
    }
    &:hover svg{
        animation: ${storm} 0.5s ease-in-out both;
        animation-delay: 0.1s;
    }
`

const executeNeoCloud = () => {
    /*
    HKEY_CLASSES_ROOT에 sample key 추가
    sample 밑에 shell, open, command 순으로 하위 key 추가
    sample key에 문자열값 URL protocol 추가
    command key의 기본값에 "실행시킬 file path" "%1" 입력
    */
    window.location.assign("sample2://");
    
}

const BeforeGrida = () => {
    return(
        <React.Fragment>
            <Header>
                <p>NEOLAB</p>
                <a href="https://gridaboard.io/" target="_self" rel="noreferrer noopener">GridaBoard</a>
            </Header>
            <Main>
                <Content>
                    <Span size={1.2}>Neo Cloud 클라이언트를 설치한 후 아래 <b>Neo Cloud 시작</b>을(를) 클릭합니다</Span>
                    <Span size={1}>&quot;Neo Cloud 시작&quot;을 클릭하면 <a href="https://www.neostudio.io/nlc_termofuse/ko/">서비스 약관</a> 
                        및 <a href="https://www.neostudio.io/nlc_privacy/ko/">개인정보 처리방침</a>에 동의한다는 것입니다.</Span>
                    <Button onClick={executeNeoCloud}><span>Neo Cloud 시작 </span></Button>
                </Content>
                <Footer>
                    <Span size={0.8}>Neo Cloud 클라이언트가 설치되어 있지 않습니까? <a>지금 다운로드</a></Span>
                    <Span size={0.8}> © NEOLAB Convergence Inc. All Rights</Span>
                </Footer>
            </Main>
            <Pop>
                <svg xmlns="http://www.w3.org/2000/svg">
                    <path stroke="none" d="M0 0h24v24H0z" />
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 3.6c5 6 7 10.5 7.5 16.2" />
                    <path d="M6.4 19c3.5 -3.5 6 -6.5 14.5 -6.4" />
                    <path d="M3.1 10.75c5 0 9.814 -.38 15.314 -5" />
                </svg>
            </Pop>     
        </React.Fragment>
    )
}

export default BeforeGrida;