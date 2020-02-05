import React, { Component } from 'react';

import ReactStoreIndicator from 'react-score-indicator'
import axios from "axios";

export default class DataAnalytics extends Component {

  constructor(props) {
    super(props);
    this.state = {
      agent1:{
        id: 0,
        customer : {
          sentenceSentimentScore: 0,
          wordCount: 100,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        },
        agent: {
          sentenceSentimentScore: 0,
          wordCount: 20,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        }
      },
      agent2: {
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
      }
    };
    this.negativeStepColors = [
      '#3da940',
      '#3da940',
      '#3da940',
      '#53b83a',
      '#84c42b',
      '#f1bc00',
      '#ed8d00',
      '#d12000'
      ]

    this.eventSource = new EventSource('http://localhost:5000/analytics');
  }

  async componentDidMount() {
    this.eventSource.addEventListener('analyticsEvent', (e) => this.analyticsEvent(JSON.parse(e.data)));
  }

  analyticsEvent(data) {
    if (data.id == 0){
      this.setState(prevState => ({
          agent2: {                   // object that we want to update
              ...prevState.agent2,    // keep all other key-value pairs
              customer : {
                sentimentScore: data.analysis.sentimentScore,
                sadnessScore: data.analysis.sadnessScore,
                joyScore: data.analysis.joyScore,
                fearScore: data.analysis.fearScore,
                disgustScore: data.analysis.disgustScore,
                angerScore: data.analysis.angerScore
              }
          }
      }))
    }else{
      this.setState(prevState => ({
          agent2: {                   // object that we want to update
              ...prevState.agent2,    // keep all other key-value pairs
              agent : {
                sentimentScore: data.analysis.sentimentScore,
                sadnessScore: data.analysis.sadnessScore,
                joyScore: data.analysis.joyScore,
                fearScore: data.analysis.fearScore,
                disgustScore: data.analysis.disgustScore,
                angerScore: data.analysis.angerScore
              }
          }
      }))
    }
  }

  render() {
    // calculate speaking %
    /*
    const a1TotalWord = this.state.agent1.customer.wordCount + this.state.agent1.agent.wordCount
    this.a1Customer = (this.state.agent1.customer.wordCount / a1TotalWord) * 100
    this.a1Agent = (this.state.agent1.agent.wordCount / a1TotalWord) * 100

    const a2TotalWord = this.state.agent2.customer.wordCount + this.state.agent2.agent.wordCount
    this.a2Customer = (this.state.agent2.customer.wordCount / a2TotalWord) * 100
    this.a2Agent = (this.state.agent2.agent.wordCount / a2TotalWord) * 100
    */
    return (
      <div className="columns">
        <div><span className="reportHeader"> Customer</span></div>
        <div className="infoColumn">
        <ReactStoreIndicator
          value={this.state.agent1.customer.sentimentScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.customer.joyScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.customer.sadnessScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.customer.fearScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.customer.disgustScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.customer.angerScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        </div>
        <div><span className="reportHeader"> Agent</span></div>
        <div className="infoColumn">
        <ReactStoreIndicator
          value={this.state.agent2.agent.sentimentScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.agent.joyScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.agent.sadnessScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.agent.fearScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.agent.disgustScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.agent.angerScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        </div>
        <div className="textColumn">
          <div>Sentiment</div>
          <div>Sadness</div>
          <div>Joy</div>
          <div>Fear</div>
          <div>Disgust</div>
          <div>Anger</div>
        </div>
        <div><span className="reportHeader"> Customer</span></div>
        <div className="infoColumn">
        <ReactStoreIndicator
          value={this.state.agent1.agent.sentimentScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.agent.joyScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.agent.sadnessScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.agent.fearScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.agent.disgustScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent1.agent.angerScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        </div>
        <div><span className="reportHeader"> Agent</span></div>
        <div className="infoColumn">
        <ReactStoreIndicator
          value={this.state.agent2.customer.sentimentScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.customer.joyScore}
          maxValue={100}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.customer.sadnessScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.customer.fearScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.customer.disgustScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        <ReactStoreIndicator
          value={this.state.agent2.customer.angerScore}
          maxValue={100}
          stepColors={this.negativeStepColors}
          width={80}
        />
        </div>
        <div className="textColumn">
          <div>Sentiment</div>
          <div>Sadness</div>
          <div>Joy</div>
          <div>Fear</div>
          <div>Disgust</div>
          <div>Anger</div>
        </div>
      </div>
    );
  }
}
