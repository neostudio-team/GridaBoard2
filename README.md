# Gridaboard v2

### npm install 시 react-virtualized가 react@^17.0.1 에서 문제를 일으킨다.
    npm install --legacy-peer-deps react-virtualized
로 따로 설치해 줘야 한다

### 한글 문자열을 i18n해야 한다

문자열 찾기에서 정규식 표현으로 다음을 넣고 한글 문자열을 찾은 다음, localization을 해야.
```["'].[ㄱ-ㅎㅏ-ㅣ가-힣]+.*[."]```

### Fabric.js가 들어가면 electron에서 compile이 안된다.
이는 canvas 2.6.1을 쓰면서 nan 2.14.1을 쓰기 때문으로, nan 2.14.0을 쓰게 하면 된다.
npm uninstall nan && npm install nan@2.14.0

https://www.npmjs.com/package/canvas
https://github.com/Automattic/node-canvas/wiki/Installation:-Windows

아래의 두개 package를 설치하고, "영문" 버전의 visual studio 2019 community를 C++ 데스크탑 어플리케이션 개발용으로 설치

C:/GTK
C:/libjpeg-turbo64

###
Dev ver. bluetooth.getDevices 사용법
1. chrome://flags/#enable-web-bluetooth-new-permissions-backend Enabled로 변경
2. chrome://flags/#enable-experimental-web-platform-features Enabled로 변경

The new permissions backend is implemented behind the chrome://flags/#enable-web-bluetooth-new-permissions-backend. The new backend will persist device permissions granted through requestDevice() until the permission is reset in Site Settings or the Page Info dialog box.

The getDevices() and watchAdvertisements() are implemented behind the chrome://flags/#enable-experimental-web-platform-features flag for Chrome 85.0.4165.0 or greater. The recommended use of these APIs is to use getDevices() to retrieve an array of permitted BluetoothDevices and then calling watchAdvertisements() on these devices to start a scan. When advertisement packets are detected from the devices, the advertisementreceived Event will be fired on the device that it corresponds to. At this point, the Bluetooth device is in range and can be connected to.

Please give this new feature a try, and file any bugs at https://crbug.com using the Blink>Bluetooth component.
(*https://stackoverflow.com/questions/60604388/web-bluetooth-get-paired-devices-list)




This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `yarn build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
# Gridaboard v2
