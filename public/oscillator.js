context = new (window.AudioContext || window.webkitAudioContext)();

if (!context.createGain)
  context.createGain = context.createGainNode;
if (!context.createDelay)
  context.createDelay = context.createDelayNode;
if (!context.createScriptProcessor)
  context.createScriptProcessor = context.createJavaScriptNode;


function Osc() {
  this.isPlaying = true;
}

Osc.prototype.play = function() {
  this.oscillator = context.createOscillator();
  this.oscillator.connect(context.destination);

  this.oscillator[this.oscillator.start ? 'start' : 'noteOn'](0);
};

Osc.prototype.stop = function() {
  this.oscillator.stop(0);
};

Osc.prototype.toggle = function() {
  (this.isPlaying ? this.stop() : this.play());
  this.isPlaying = !this.isPlaying;
};

Osc.prototype.changeFrequency = function(val) {
  this.oscillator.frequency.value = val;
};

Osc.prototype.changeDetune = function(val) {
  this.oscillator.detune.value = val;
};

Osc.prototype.changeType = function(type) {
  this.oscillator.type = type;
};
