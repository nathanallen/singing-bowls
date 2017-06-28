// adapted from https://bl.ocks.org/mbostock/1256572

var m = [20, 20, 30, 20],
  w = window.innerWidth - m[1] - m[3],
  h = window.innerHeight - m[0] - m[2];

var x,
  y,
  duration = 1500,
  delay = 500;

var color = d3.scale.category10();

var svg = d3.select("body").append("svg")
  .attr("width", w + m[1] + m[3])
  .attr("height", h + m[0] + m[2])
  .append("g")
  .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

var raw_samples,
  ids;

// A line generator, for the dark stroke.
var line = d3.svg.line()
  .interpolate("basis")
  .x(function(d) { return x(d.freq); })
  .y(function(d) { return y(d.amp); });

// A line generator, for the dark stroke.
var axis = d3.svg.line()
  .interpolate("basis")
  .x(function(d) { return x(d.freq); })
  .y(h);

// A area generator, for the dark stroke.
var area = d3.svg.area()
  .interpolate("basis")
  .x(function(d) { return x(d.freq); })
  .y1(function(d) { return y(d.amp); });

function renderSamples(raw) {
  var OFFSET = 500;
  data = raw.map(function(amp, i){
    return {id: 0, freq: i+OFFSET, amp: amp}
  })

  // Nest stock values by id.
  ids = d3.nest()
    .key(function(d) { return d.id; })
    .entries(raw_samples = data);

  // Parse freqs and numbers. We assume values are sorted by freq.
  // Also compute the maximum amp per id, needed for the y-domain.
  ids.forEach(function(s) {
    s.values.forEach(function(d) { d.freq = d.freq; d.amp = +d.amp; });
    s.maxPrice = d3.max(s.values, function(d) { return d.amp; });
    s.sumPrice = d3.sum(s.values, function(d) { return d.amp; });
  });

  // Sort by maximum amp, descending.
  ids.sort(function(a, b) { return b.maxPrice - a.maxPrice; });

  var g = svg.selectAll("g")
    .data(ids) // Main entry point
    .enter().append("g")
    .attr("class", "id");

  lines();
}

function lines() {
  x = d3.time.scale().range([0, w - 60]);
  y = d3.scale.linear().range([h / 4 - 20, 0]);

  // Compute the minimum and maximum freq across ids.
  x.domain([
    d3.min(ids, function(d) { return d.values[0].freq; }),
    d3.max(ids, function(d) { return d.values[d.values.length - 1].freq; })
  ]);

  var g = svg.selectAll(".id")
    .attr("transform", function(d, i) { return "translate(0," + (i * h / 4 + 10) + ")"; });

  g.each(function(d) {
    var e = d3.select(this);

    e.append("path")
      .attr("class", "line");

    // e.append("circle")
    //   .attr("r", 5)
    //   .style("fill", function(d) { return color(d.key); })
    //   .style("stroke", "#000")
    //   .style("stroke-width", "2px");

    // e.append("text")
    //   .attr("x", 12)
    //   .attr("dy", ".31em")
    //   .text(d.key);
  });

  function draw(k) {
    g.each(function(d) {
      var e = d3.select(this);
      y.domain([0, d.maxPrice]);

      e.select("path")
        .attr("d", function(d) { return line(d.values.slice(0, k + 1)); });

      e.selectAll("circle, text")
        .data(function(d) { return [d.values[k], d.values[k]]; })
        .attr("transform", function(d) { return "translate(" + x(d.freq) + "," + y(d.amp) + ")"; });
    });
  }

  var k = 1, n = ids[0].values.length;
  // d3.timer(function() {
  for(var z=0; z<n; z++){
    draw(k);
    if ((k += 2) >= n - 1) {
      draw(n - 1);
      return true;
    }
  }
  // });
}
