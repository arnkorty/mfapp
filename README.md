# Getting Started

## 迷你版简化版前端微服务框架

## Usage
```javascript
import {mfAppRegister, mfAppRun} from 'mfapp';
mfAppRegister({
  name: 'react-app',
  entry: 'http://localhost:2344/reactapp',
  match: (location) => location.href === '/react-app',
  hooks: {
    mounted: () => {},
    unmounted: () => {},
    bootstrap: () => {}
  }
})
mfAppRegister({
  name: 'vue-app',
  entry: 'http://localhost:2344/vueapp',
  match: (location) => location.href === '/vue-app',
  hooks: {
    mounted: () => {},
    unmounted: () => {},
    bootstrap: () => {}
  }
})
mfAppRun()
```

```html
<react-app />
<vue-app />
```
