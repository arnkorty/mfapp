# Getting Started
## Install
```shell
# waiting...
```

## Usage
```javascript
import app, { store, h } from acapp;
const Counter = app.HTML({
  name: 'Counter'
  state: {},
  method: {
  },
  hook: {
  },
  view: () = (state) => {
    return (<div>
      <h1>${state}</h1>
      <button onclick='add(-1)'>-1</button>
      <button onclick='add(+1)'>+1</button>
    </div>) 
  },
})

app.mount('#app', Counter)
```
