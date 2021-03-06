function AudioIn() {
  this.running_min = 0;
  this.running_max = 0;
  this.running_avg  = 0;
  this.samples = [];
  this.num_samples = 128;
  this.samples_idx = 0;
}
AudioIn.prototype.incoming = function(gain){
  if(this.samples_idx >= this.num_samples) {
    this.samples_idx = 0;

    var totals = this.samples.reduce(function(acc, v){
      return acc + v;
    }, 0) / this.num_samples;

    this.running_avg = Math.floor( (this.running_avg + totals) / 2 );
  }

  this.samples[this.samples_idx] = gain;
  this.samples_idx++;

  if (gain < this.running_min) { this.running_min = gain };
  if (gain > this.running_max) { this.running_max = gain };
}
AudioIn.prototype.runningAverage = function(){
  return this.running_avg;
}
AudioIn.prototype.currentAmplitude = function(){
  return this.samples[this.samples_idx-1];
}
AudioIn.prototype.sample = function() {
  var amp = this.currentAmplitude(),
      avg = this.runningAverage(),
      good_sample = true;

  if (amp <= avg/5 ) {
    console.log("too low", amp)
    good_sample = false;
  } else if (amp >= avg*5) {
    console.log("too high", amp)
    good_sample = false;
  }

  return {
    amplitude: this.currentAmplitude(),
    avg: this.runningAverage(),
    max: this.running_max,
    min: this.running_min,
    good_sample: good_sample
  }
};


var graphView = (function(){
  var els = {};
  return function(freq, amp){
    if(!els[freq]) {
      els[freq] = document.createElement("div");;
      document.body.appendChild(els[freq]);
    }
    els[freq].setAttribute("style", `height:${amp*2}px;`);
    els[freq].setAttribute("data-freq", freq);
  }
}())

function MasterSampler(config) {
  this.freq_samplers = [];  // instances of FrequencySampler
  this.samples = [];        // matrix of samples (integers)

  config.register = function register(self){
    // TODO: place saner limits on how many samples are saved;
    this.freq_samplers.push(self);
    this.samples.push(self.samples);
  }.bind(this);

  var fs = new FrequencySampler(config);
}
MasterSampler.prototype.play = function() {
  this.freq_samplers[this.freq_samplers.length-1].play();
}
MasterSampler.prototype.stop = function() {
  this.freq_samplers[this.freq_samplers.length-1].stop();
}
MasterSampler.prototype.summarize = function() {
  var samples = this.samples;
  var nrows = samples.length; // BUG: last row may not be full sample
  var nsamps = samples[0].length;
  var summary_row = [];
  for(var s=0; s<nsamps; s++) {
    var sum = 0;
    for(var r=0; r<nrows; r++) {
      sum += samples[r][s];
    }
    summary_row.push( Math.floor(sum/nrows) );
  }
  return summary_row;
}

function FrequencySampler(config) {
  this.config = config || {};

  var osc           = config.osc,
      audioIn       = config.audioIn,
      stepSize      = config.stepSize     || 1,
      offset        = config.offset       || 100,
      max           = config.max          || 1200,
      keep_looping  = config.keep_looping || true;

  this.freq = stepSize < 0 ? max : offset;
  this.stepSize = stepSize;
  this.initialStepSize = stepSize;
  this.offset = offset;
  this.max = max;
  this.keep_looping = keep_looping;

  this.samples = [];
  this.loudest = {
    freq: 0,
    amp: 0
  }

  this.intervalID = null;

  this.osc      = osc;
  this.audioIn  = audioIn;

  config.register(this);
}
FrequencySampler.prototype.stop = function(){
  clearInterval(this.intervalID);
  this.osc.changeFrequency(0);
}
FrequencySampler.prototype.play = function(){
  this.osc.changeFrequency(this.freq);
  setTimeout(function(){
    this.intervalID = setInterval(this._nextFreq.bind(this), 10);
  }.bind(this), 300); // pause before taking readings to avoid interferance
}
FrequencySampler.prototype._nextFreq = function() {
  var heard = this.audioIn.sample();
  if(!heard.good_sample) { return; }

  var amp = heard.amplitude;
  this.samples.push(amp);

  if(amp > this.loudest.amp) {
    this.loudest.amp = amp;
    this.loudest.freq = this.freq;
  }

  graphView(this.freq, amp);

  this.freq += this.stepSize;
  this.osc.changeFrequency(this.freq);

  if(this.freq > this.max || this.freq < this.offset) {
    clearInterval(this.intervalID);
    console.log("loudestFreq:", this.loudest.freq, this.loudest.amp);
    console.log("averageAmp:", heard.avg);

    // after each run, draw all gathered samples in d3.js line graph
    renderSamples( ms.summarize() );

    if (this.keep_looping) {
      this.stop();
      new FrequencySampler(this.config).play();
    }
  }
}

var osc = new Osc();
osc.play();
osc.changeFrequency(0);

var audioIn = new AudioIn();

var ms = new MasterSampler({osc, audioIn});

var socket = io();
socket.on('data', function(data) {
  audioIn.incoming(+data);
});
socket.on('error', function() {
  console.error(arguments)
});
