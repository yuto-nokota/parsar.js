// Copyright (c) 2023 yuto-nokota. All rights reserved.

var _GET = (function () {
  var vars = {}; 
  var param = location.search.substring(1).split('&');
  for(var i = 0; i < param.length; i++) {
    var keySearch = param[i].search(/=/);
    var key = '';
    if ( keySearch != -1) key = param[i].slice(0, keySearch);
    var val = param[i].slice(param[i].indexOf('=', 0) + 1);
    if ( key != '') vars[key] = decodeURI(val);
  } 
  return vars; 
})();

function get2url () {
  var get_param_string='';
  for ( var key in _GET ) {
    if ( get_param_string === '' ) {
      get_param_string += '?' + key + '=' + _GET[key];
    } else {
      get_param_string += '&' + key + '=' + _GET[key];
    }
  }
  // TODO which is better ?
  //window.history.pushState(null, null, get_param_string);
  if ( !get_param_string ) {
    get_param_string = "?"
  }
  window.history.replaceState(null, null, encodeURI(get_param_string));
}

let sarfiles={};
let sardata={};
function load_sarfile ( sarfile_url ) {
  var xhr = new XMLHttpRequest();
  xhr.responseType = "text"
  xhr.open('GET', sarfile_url , true);
  xhr.onload = function () {
    sarfiles[sarfile_url] = xhr.responseText;
    if ( xhr.status == '200' ) {
      sardata[sarfile_url] = post_load_sarfile( sarfile_url );
    } else {
      console.log('[INFO]'+xhr.status+' in load_sarfile('+sarfile_url+')');
    }
  }
  xhr.send();
}

function post_load_sarfile ( sarfile_url ) {
  let data={'restarts':[]};
  let headers=null;
  let lines = sarfiles[sarfile_url].split('\n');
  let tmp = lines[0].split(/\s\s*/);
  // FIXME Form correct date after 00:00- in next day.
  // const day_msec = 86400000;
  data['kernel-version'] = tmp[1];
  data['hostname']       = tmp[2].substring(1,tmp[2].length-1);
  data['date']           = tmp[3];
  data['architecture']   = tmp[4];
  data['CPUs']           = tmp[5].substring(1);
  for ( var i=1; i<lines.length; ++i ) {
    if ( lines[i].search(/^$/) >= 0 ) {
      if ( lines[i+1] ) {
        headers = lines[i+1].split(/\s\s*/);
      }
      if ( headers[1] == 'LINUX' && headers[2] == 'RESTART' ) {
        data['restarts'].push(
          new Date(Date.parse(data['date'] + ' ' + headers[0]))
        );
      }
      ++i;
      continue;
    }
    tmp = lines[i].split(/\s\s*/);
    // TODO How can i parse average?
    if ( tmp[0] == 'Average:' ) continue;
    var d = new Date(Date.parse(data['date'] + ' ' + tmp[0]))
    if ( headers[1].search(/CPU|DEV|IFACE/) >= 0 ) {
      var subheader = headers[1] + '-' + tmp[1];
      for ( var j=2; j<headers.length; ++j ) {
        if ( !data[headers[j]] ) data[headers[j]] = {};
        if ( !data[headers[j]][subheader] ) data[headers[j]][subheader] = [];
        data[headers[j]][subheader].push([d,tmp[j]]);
      }
    } else {
      for ( var j=1; j<headers.length; ++j ) {
        if ( !data[headers[j]] ) data[headers[j]] = [];
        data[headers[j]].push([d,tmp[j]]);
      }
    }
  }
  return data;
}

function create_svg_line ( from, to, color ) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1',from[0]);
  line.setAttribute('y1',from[1]);
  line.setAttribute('x2',to[0]);
  line.setAttribute('y2',to[1]);
  line.setAttribute('stroke', color );
  line.setAttribute('stroke-width', 2);
  line.setAttribute('stroke-dasharray', "none");
  line.setAttribute('stroke-linejoin', 'miter'); 
  line.setAttribute('stroke-linecap', 'butt');
  line.setAttribute("opacity", 1);
  line.setAttribute('fill-opacity', 1);
  line.setAttribute('stroke-opacity', 1);
  line.setAttribute('transform', 'rotate(0)');
  return line;
}

function create_svg_path ( vertexes, color ) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let cmd = 'M ' + vertexes[0][0] + ',' + vertexes[0][1];
  for ( var i=1; i<vertexes.length; ++i ) {
    cmd += ' ' + vertexes[i][0] + ',' +vertexes[i][1];
  }
  path.setAttribute('d', cmd );
  path.setAttribute('fill', "none" );
  path.setAttribute('stroke', color );
  path.setAttribute('stroke-width', 2);
  path.setAttribute('stroke-dasharray', "none");
  path.setAttribute('stroke-linejoin', 'miter'); 
  path.setAttribute('stroke-linecap', 'butt');
  path.setAttribute("opacity", 1);
  path.setAttribute('fill-opacity', 1);
  path.setAttribute('stroke-opacity', 1);
  path.setAttribute('transform', 'rotate(0)');
  return path;
}

function create_svg_text ( position, string, color, attributes ) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x',position[0]);
  text.setAttribute('y',position[1]);
  text.setAttribute('stroke', "none" );
  text.setAttribute('fill', color );
  text.setAttribute("opacity", 1);
  text.setAttribute('fill-opacity', 1);
  text.setAttribute('stroke-opacity', 1);
  text.setAttribute('transform', 'rotate(0)');
  for ( var key in attributes ) {
    text.setAttribute(key, attributes[key] );
  }
  text.textContent = string;
  return text;
}

function create_svg ( w, h ) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewbox', '0 0 ' + w + ' ' + h);
  svg.setAttribute('style', 'background-color:#ffffff;');
  return svg;
}

function minmax ( x ) {
  var min = x[0];
  var max = x[0];
  for ( var i=1; i<x.length; ++i ) {
    if ( x[i] > max ) max = x[i];
    if ( x[i] < min ) min = x[i];
  }
  return [ min, max ];
}

function create_graph_line ( data, from, to, w, h, color ) {
  const scale = 0.9;
  var rateX =   w * scale / ( to[0] - from[0] );
  var rateY = - h * scale / ( to[1] - from[1] );
  var offsetX = w * ( 1 - scale ) / 2;
  var offsetY = h * ( 1 + scale ) / 2;
  return create_svg_path( data.map(x=>[(x[0]-from[0])*rateX+offsetX,
                                       (x[1]-from[1])*rateY+offsetY]
                                  ),color);
}

function svg_test () {
  var svg = create_svg ( 200, 200 );
  svg.appendChild(create_svg_line([10,20],[190,150],'#00ff00'));
  svg.appendChild(create_svg_line([190,150],[30,50],'#0000ff'));
  svg.appendChild(create_svg_path([[20,10],[20,50],[70,50],[100,180]],'#ff0000'));
  document.getElementById('debug').appendChild(svg);
  var svg = create_svg ( 200, 200 );
  svg.appendChild(create_graph_line([[-1,2],[0,-5],[1,3],[2,10],[3,2],[4,8]],[-2,-6],[5,12],200,200,'#00ffff'));
  svg.appendChild(create_graph_line([[0,-100],[0,100]],[-2,-6],[5,12],200,200,'#cccccc'));
  svg.appendChild(create_graph_line([[-100,0],[100,0]],[-2,-6],[5,12],200,200,'#cccccc'));
  svg.appendChild(create_svg_line([10,190],[190,190],'#000000'));
  svg.appendChild(create_svg_line([10,190],[10,10],'#000000'));
  svg.appendChild(create_svg_text([190,190],'x','#000000'));
  svg.appendChild(create_svg_text([10,10],'y','#000000',{'font-size':'20px'}));
  document.getElementById('debug').appendChild(svg);
  var svg = create_svg ( 200, 200 );
  document.getElementById('debug').appendChild(svg);
}

function onload_function () {
  svg_test();
  if ( !_GET['sardir'] ) return;
  for ( var i=0; i<31; ++i ) {
    load_sarfile(_GET['sardir'] + '/sar' + ('0'+i).slice(-2) );
  }
  setTimeout(console.log('------'),1000);
  setTimeout(console.log(sardata),5000);
}

