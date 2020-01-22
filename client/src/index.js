import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import AppBar from './AppBar'
import registerServiceWorker from './registerServiceWorker'

ReactDOM.render(<App />, document.getElementById('root'))
ReactDOM.render(<AppBar />, document.getElementById('menu_header'))

registerServiceWorker()
