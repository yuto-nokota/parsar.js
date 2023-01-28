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
function load_sarfile ( sarfile_url ) {
  var xhr = new XMLHttpRequest();
  xhr.responseType = "text"
  xhr.open('GET', sarfile_url , true);
  xhr.onload = function () {
    sarfiles[sarfile_url] = xhr.responseText;
    if ( xhr.status == '200' ) {
      post_load_sarfile ( sarfile_url );
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
  console.log(sarfile_url);
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
    if ( !data[d] ) data[d] = {};
    if ( headers[1].search(/CPU|DEV|IFACE/) >= 0 ) {
      var subkey = headers[1] + '-' + tmp[1];
      if ( !data[d][subkey] ) data[d][subkey] = {};
      for ( var j=2; j<headers.length; ++j ) {
        data[d][subkey][headers[j]] = tmp[j];
      }
    } else {
      for ( var j=1; j<headers.length; ++j ) {
        data[d][headers[j]] = tmp[j];
      }
    }
  }
  console.log(data);
  return data;
}

function create_svg_line ( x1, y1, x2, y2 ) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1',x1);
  line.setAttribute('y1',y1);
  line.setAttribute('x2',x2);
  line.setAttribute('y2',y2);
  line.setAttribute('stroke', '#000000');
  line.setAttribute('stroke-width', 2);
  line.setAttribute('stroke-dasharray', "none");
  line.setAttribute('stroke-linejoin', 'miter'); 
  line.setAttribute('stroke-linecap', 'butt'); //切れ目 butt round square inherit
  line.setAttribute("opacity", 1);
  line.setAttribute('fill-opacity', 1);
  line.setAttribute('stroke-opacity', 1);
  line.setAttribute('transform', 'rotate(0)');
  return line;
}

function create_svg ( w, h ) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewbox', '0 0 ' + w + ' ' + h);
  svg.setAttribute('style', 'background-color:#ffffff;');
  return svg;
}

function svg_test () {
  const svg = create_svg ( 200, 200 );
  svg.appendChild(create_svg_line(10,20,190,150));
  document.getElementById('debug').appendChild(svg);
}

function onload_function () {
  svg_test();
  if ( !_GET['sardir'] ) return;
  for ( var i=0; i<31; ++i ) {
    load_sarfile(_GET['sardir'] + '/sar' + ('0'+i).slice(-2) );
  }
}

