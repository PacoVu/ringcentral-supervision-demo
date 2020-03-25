import React, { Component } from 'react';

import ReactStoreIndicator from 'react-score-indicator'
import axios from "axios";

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
        cannotRecord: true,
        recordingButtonName: 'Start Recording',
        isRecording: false,
        buttonName: 'Enable Translation',
        doTranslation:  false,
        dialogue: [],
        phoneStatus: "idle",
        id: 0,
        customer : {
          sentenceSentimentScore: 0,
          wordCount: 0,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        },
        agent: {
          sentenceSentimentScore: 0,
          wordCount: 0,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        }
    };
    this.negativestepsColors = ['#3da940','#3da940','#3da940','#53b83a','#84c42b','#f1bc00','#ed8d00','#d12000']
    this.isLoggedIn = false;
    /* For testing in localhost */
    //this.eventSource = new EventSource('http://localhost:5000/events');
    /* For testing in remote server */
    this.eventSource = new EventSource('/events');
  }

  async componentDidMount() {
    this.eventSource.addEventListener('transcriptUpdate', (e) => this.updateTranscript(JSON.parse(e.data)));
    this.eventSource.addEventListener('phoneEvent', (e) => this.updatePhoneStatus(e.data));
    //this.eventSource.addEventListener('closedConnection', () => this.stopUpdates());
  }

  updateTranscript(data) {
      this.update = true
      // this is for just updating interim results from watson
      for (let i = 0; i < this.state.dialogue.length; i++) {
        if (this.state.dialogue[i].index === data.index){
          let items = [...this.state.dialogue];
          let item = {...items[i]};
          item.text = data.text;
          item.translation = data.translation;
          item.sentiment = data.sentenceSentimentScore;
          items[i] = item;

          this.setState(prevState => ({
              ...prevState,
              dialogue: items,        // update the value of specific key
              id: data.id
          }))
          this.update = false
          break
        }
      }
      // if the data is a new sentence, add to the dialog array
      if (this.update){
        this.state.dialogue.unshift(data)
        this.setState(prevState => ({
              ...prevState,
              dialogue: this.state.dialogue,
              id: data.id
        }))
      }
      if (data.final){
        if (data.id == 0){
          this.setState(prevState => ({
                  ...prevState,
                  customer : {
                    wordCount: data.wordCount,
                    sentimentScore: data.analysis.sentimentScore,
                    sadnessScore: data.analysis.sadnessScore,
                    joyScore: data.analysis.joyScore,
                    fearScore: data.analysis.fearScore,
                    disgustScore: data.analysis.disgustScore,
                    angerScore: data.analysis.angerScore
                  }
          }))
        }else{
          this.setState(prevState => ({
                  ...prevState,
                  agent : {
                    wordCount: data.wordCount,
                    sentimentScore: data.analysis.sentimentScore,
                    sadnessScore: data.analysis.sadnessScore,
                    joyScore: data.analysis.joyScore,
                    fearScore: data.analysis.fearScore,
                    disgustScore: data.analysis.disgustScore,
                    angerScore: data.analysis.angerScore
                  }
          }))
        }
      }
  }

  updatePhoneStatus(phoneStatus) {
    var cannotRecord = true
      if (phoneStatus === "connected"){
        this.clearTranscript()
        cannotRecord = false
      }
      this.setState(prevState => ({
            ...prevState,
            cannotRecord: cannotRecord,
            phoneStatus: phoneStatus
      }))
  }

/*
  stopUpdates() {
    this.eventSource.close();
  }
*/

  clearTranscript() {
    this.setState(prevState => ({
              ...prevState,
              dialogue: [],
              id:0,
              customer: {
                wordCount: 0,
                sentimentScore: 0,
                sadnessScore: 0,
                joyScore: 0,
                fearScore: 0,
                disgustScore: 0,
                angerScore: 0
              },
              agent : {
                wordCount: 0,
                sentimentScore: 0,
                sadnessScore: 0,
                joyScore: 0,
                fearScore: 0,
                disgustScore: 0,
                angerScore: 0
              }
    }))
  }

  async recordingCall() {
    var isRecording = false
    if (this.state.isRecording){
        isRecording = false
        this.setState(prevState => ({
                ...prevState,
                isRecording: isRecording,
                recordingButtonName: 'Start Recording'
        }))
    }else{
        isRecording = true
        this.setState(prevState => ({
                ...prevState,
                isRecording: isRecording,
                recordingButtonName: 'Stop Recording'
        }))
    }
    const response = await axios.get("/enable_recording",
          { params: {enable: isRecording}
        })
  }

  async enableTranslation(agent) {
    var doTranslation = false

    if (this.state.doTranslation){
        doTranslation = false
        this.setState(prevState => ({
                ...prevState,
                doTranslation: doTranslation,
                buttonName: 'Enable Translation'
        }))
      }else{
        doTranslation = true
        this.setState(prevState => ({
                ...prevState,
                doTranslation: doTranslation,
                buttonName: 'Disable Translation'
        }))
    }

    const response = await axios.get("/enable_translation",
          { params: {enable: doTranslation}
        })
    console.log(response.data)
  }

  render() {
    if (this.state.doTranslation){
      this.conversation = this.state.dialogue.map(item =>
        {
        if (item.sentiment > 0.5)
          return <div>{item.index}. {item.name}: <div className="positive">{item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        else if (item.sentiment < -0.5)
          return <div>{item.index}. {item.name}: <div className="negative">{item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        else
          return <div>{item.index}. {item.name}: <div className="neutral">{item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        }
      );
    }else{
      this.conversation = this.state.dialogue.map(item =>
        {
        if (item.sentiment > 0.5)
          return <div>{item.index}. {item.name}: <div className="positive">{item.text}</div></div>
        else if (item.sentiment < -0.5)
          return <div>{item.index}. {item.name}: <div className="negative">{item.text}</div></div>
        else
          return <div>{item.index}. {item.name}: <div className="neutral">{item.text}</div></div>
        }
      );
    }

    const a1TotalWord = this.state.customer.wordCount + this.state.agent.wordCount
    this.Customer = (this.state.customer.wordCount / a1TotalWord) * 100
    this.Agent = (this.state.agent.wordCount / a1TotalWord) * 100

    return (
      <div className="App">
        <div className="columns">
          <span>Phone status: {this.state.phoneStatus} </span> &nbsp;
          <button onClick={() => this.clearTranscript()}>Clear Transcript</button> &nbsp;
          <button disabled={this.state.cannotRecord} onClick={() => this.recordingCall()}>{this.state.recordingButtonName}</button> &nbsp;
          <button onClick={() => this.enableTranslation(this.state.number)}>{this.state.buttonName}</button> &nbsp;
          <br/><br/>

        </div>
        <div className="columns">
          <div className="conversations">
            {this.conversation}
          </div>
          <div><span className="reportHeader"> Customer: (Speaking chance => {this.Customer.toFixed(1)}% - Spoken => {this.state.customer.wordCount} words)</span></div>
          <div className="analysisBlock">
            <div className="infoColumn">
            <ReactStoreIndicator
              value={this.state.customer.sentimentScore}
              maxValue={100}
              width={90}
              lineWidth={10}
            />
            <ReactStoreIndicator
              value={this.state.customer.joyScore}
              maxValue={100}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.customer.sadnessScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.customer.fearScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.customer.disgustScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.customer.angerScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            </div>
            <div className="textColumn">
              <div>Sentiment</div>
              <div>Joy</div>
              <div>Sadness</div>
              <div>Fear</div>
              <div>Disgust</div>
              <div>Anger</div>
            </div>
          </div><br/><br/>
          <div><span className="reportHeader"> Agent: (Speaking chance => {this.Agent.toFixed(1)}% - Spoken => {this.state.agent.wordCount} words)</span></div>
          <div className="analysisBlock">
            <div className="infoColumn">
            <ReactStoreIndicator
              value={this.state.agent.sentimentScore}
              maxValue={100}
              width={90}
              lineWidth={10}
            />
            <ReactStoreIndicator
              value={this.state.agent.joyScore}
              maxValue={100}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.agent.sadnessScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.agent.fearScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.agent.disgustScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            <ReactStoreIndicator
              value={this.state.agent.angerScore}
              maxValue={100}
              stepsColors={this.negativestepsColors}
              width={90}
            />
            </div>
            <div className="textColumn">
              <div>Sentiment</div>
              <div>Joy</div>
              <div>Sadness</div>
              <div>Fear</div>
              <div>Disgust</div>
              <div>Anger</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
