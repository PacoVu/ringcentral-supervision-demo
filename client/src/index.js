import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import AppBar from './AppBar'
import DataAnalytics from './DataAnalytics'
import registerServiceWorker from './registerServiceWorker'

ReactDOM.render(<App />, document.getElementById('root'))
ReactDOM.render(<AppBar />, document.getElementById('login'))
//ReactDOM.render(<DataAnalytics />, document.getElementById('analytics'))
registerServiceWorker()
