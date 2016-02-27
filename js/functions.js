function onPageLoad() {
	//fill out the interface list
	populateInterfaces();
	populateStaticGraphs();

	//connect to the live websocket and start feeding live interfaces
	var connection = new WebSocket('ws://'+window.location.host+'/api/live');
	connection.onmessage = updateLiveGraphs;
}

function clearGraphs() {
	//delete all nodes
	$('#livegraph').empty()
	$('#minutes').empty()
	$('#hours').empty()
	$('#days').empty()
	$('#months').empty()
}

function specifyIface(name) {
	//special case for blank name "means everybody"
	console.log(name);
	if(name === "") {
		clearGraphs();
		populateStaticGraphs("");
	} else if(name != undefined) {
		clearGraphs();
		populateStaticGraphs(name);
	}	
}

var charts = {}; //global containing all our charts
function buildNewLiveGraph(name, title, parentdiv) {
	var canvasname=name+'canvas';
	//create a new item in the given div, a basic panel
	panel  = '<div class="col-xs-12 col-md-8 col-lg-6 col-xl-4">';
	panel += '<div class="panel panel-default">';
	panel += '<div class="panel-heading">'+title+'</div>';
	panel += '<div id="'+name+'panel" class="panel-body">';
	panel += '<canvas id="'+canvasname+'"></canvas>';
	panel += '</div></div></div>';
	parentdiv.append(panel);
	var data = {
		labels: [""],
		datasets: [{
			label: "Upstream",
			fillColor: "rgba(255,255,0,0.2)",
			strokeColor: "rgba(255,255,0,1)",
			pointColor: "rgba(255,255,0,1)",
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: "rgba(255,255,0,1)",
			data: []
		},
		{
			label: "Downstream",
			fillColor: "rgba(255,51,51,0.2)",
			strokeColor: "rgba(255,52,52,1)",
			pointColor: "rgba(255,52,52,1)",
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: "rgba(255,51,51,1)",
			data: []
		}]
	};
	var options = {
		pointDot: false,
		scaleLabel: function(v) {
			return bwformat(v.value)
		},
		multiTooltipTemplate: function (v) {
			return bwformat(v.value);
		}
	};
	var ctx = $("#"+canvasname).get(0).getContext("2d");
	var chart = new Chart(ctx).Line(data, options);
	charts[name] = chart;
}

function buildNewBarGraph(name, title, parentdiv, dataLabels, dataUp, dataDown) {
	var canvasname=name+'canvas';
	//create a new item in the given div, a basic panel
	panel  = '<div class="col-xs-12 col-md-8 col-lg-6 col-xl-4">';
	panel += '<div class="panel panel-default">';
	panel += '<div class="panel-heading">'+title+'</div>';
	panel += '<div id="'+name+'panel" class="panel-body">';
	panel += '<canvas id="'+canvasname+'"></canvas>';
	panel += '</div></div></div>';
	parentdiv.append(panel);
	var data = {
		labels: dataLabels,
		datasets: [{
			label: "Upstream",
			fillColor: "rgba(255,255,0,0.2)",
			strokeColor: "rgba(255,255,0,1)",
			pointColor: "rgba(255,255,0,1)",
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: "rgba(255,255,0,1)",
			data: dataUp
		},
		{
			label: "Downstream",
			fillColor: "rgba(255,51,51,0.2)",
			strokeColor: "rgba(255,52,52,1)",
			pointColor: "rgba(255,52,52,1)",
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: "rgba(255,51,51,1)",
			data: dataDown
		}]
	};
	var options = {
		pointDot: false,
		scaleLabel: function(v) {
			return szformat(v.value)
		},
		multiTooltipTemplate: function (v) {
			return szformat(v.value);
		}
	};
	var ctx = $("#"+canvasname).get(0).getContext("2d");
	var chart = new Chart(ctx).Bar(data, options);
	charts[name] = chart;

}

var knownIfaces = [];
function knownIface(name) {
	for(i=0; i < knownIfaces.length; i++) {
		if(knownIfaces[i] === name) {
			return true;
		}
	}
	return false;
}

function updateLiveGraphs(e) {
	update = JSON.parse(e.data);
	if(!knownIface(update.Name)) {
		var name = 'live'+update.Name;
		knownIfaces.push(update.Name);
		buildNewLiveGraph(name, 'Live Interface: '+update.Name, $('#livegraph'));
	}
	updateLiveGraph(update.Name, update.Data);
}

function updateLiveGraph(name, data) {
	dt = Date.parse(data.Ts);
	var chartname = 'live'+name;
	if(charts[chartname] === undefined) {
		console.log("could not find "+chartname)
		return;
	}
	if(charts['live'+name].datasets[0].points.length > 60) {
		charts['live'+name].removeData()
	}
	charts['live'+name].addData([data.BytesUp*8, data.BytesDown*8], "");
}

function populateInterfaces() {
	var ifaces = [];
	//update the interface list
	$.getJSON("/api/interfaces", function(data) {
		if(data.length > 0) {
			ifaces.push('<li><a onclick=specifyIface("") href="#">All Interfaces</a></li>');
			ifaces.push('<li role="separator" class="divider"></li>');
		}
		$.each(data, function(i, item) {
			ifaces.push('<li><a onclick=specifyIface("'+ item + '") href="#">'+item+'</a></li>');
		});
		$("#ifacelist").append(ifaces.join('')); //add to the drop down menu
	});
}

function populateStaticGraphs(downselect) {
	//for safety?
	if(downselect === undefined) {
		downselect = "";
	}
	//fill in minutes
	$.getJSON("/api/minutes", function(data) {
		buildMinuteBarGraphs(data, downselect);
	});
	//fill in hours
	$.getJSON("/api/hours", function(data) {
		buildHourBarGraphs(data, downselect);
	});
	//fill in days
	$.getJSON("/api/days", function(data) {
		buildDayBarGraphs(data, downselect);
	});
	//fill in months
	$.getJSON("/api/months", function(data) {
		buildMonthBarGraphs(data, downselect);
	});
}

function skipEth(name, downselect) {
	if(!(downselect === undefined || downselect === "") && name != downselect) {
		return true;
	}
	return false;
}

function buildMinuteBarGraphs(data, downselect) {
	$.each(data, function(i, eth) {
		if(skipEth(eth.Name, downselect)) {
			return;
		}
		var name = "minute"+eth.Name;
		var title = eth.Name +" Minutes";
		var labels = [];
		var upstream = [];
		var downstream = [];
		$.each(eth.Samples, function(i, s) {
			upstream.push(s.BytesUp);
			downstream.push(s.BytesDown);
			var d = new Date(s.Ts);
			labels.push(d.getMinutes());
		});
		
		buildNewBarGraph(name, title, $('#minutes'), labels, upstream, downstream);
	});
}

function buildHourBarGraphs(data, downselect) {
	$.each(data, function(i, eth) {
		if(skipEth(eth.Name, downselect)) {
			return;
		}
		var name = "hour"+eth.Name;
		var title = eth.Name +" Hours";
		var labels = [];
		var upstream = [];
		var downstream = [];
		$.each(eth.Samples, function(i, s) {
			upstream.push(s.BytesUp);
			downstream.push(s.BytesDown);
			var d = new Date(s.Ts);
			labels.push(d.getHours());
		});
		
		buildNewBarGraph(name, title, $('#hours'), labels, upstream, downstream);
	});
}

function buildDayBarGraphs(data, downselect) {
	$.each(data, function(i, eth) {
		if(skipEth(eth.Name, downselect)) {
			return;
		}
		var name = "day"+eth.Name;
		var title = eth.Name +" Days";
		var labels = [];
		var upstream = [];
		var downstream = [];
		$.each(eth.Samples, function(i, s) {
			upstream.push(s.BytesUp);
			downstream.push(s.BytesDown);
			var d = new Date(s.Ts);
			labels.push(d.getDate());
		});
		
		buildNewBarGraph(name, title, $('#days'), labels, upstream, downstream);
	});
}

function buildMonthBarGraphs(data, downselect) {
	$.each(data, function(i, eth) {
		if(skipEth(eth.Name, downselect)) {
			return;
		}
		var name = "month"+eth.Name;
		var title = eth.Name +" Months";
		var labels = [];
		var upstream = [];
		var downstream = [];
		$.each(eth.Samples, function(i, s) {
			upstream.push(s.BytesUp);
			downstream.push(s.BytesDown);
			var d = new Date(s.Ts);
			labels.push(d.getFullYear()+"-"+d.getDay());
		});
		
		buildNewBarGraph(name, title, $('#months'), labels, upstream, downstream);
	});
}

function bwformat(bps) {
	if (bps < 1024) {
		return bps;
	} else if(bps < (1024*1024)) {
		return (bps/1024).toFixed(1)+"kb";
	} else if(bps < (1024*1024*1024)) {
		return (bps/(1024*1024)).toFixed(1)+"mb";
	}
	return (bps/(1024*1024*1024)).toFixed(1)+"gb";
}

function szformat(b) {
	if (b < 1024) {
		return b;
	} else if(b < (1024*1024)) {
		return (b/1024).toFixed(1)+"KB";
	} else if(b < (1024*1024*1024)) {
		return (b/(1024*1024)).toFixed(1)+"MB";
	} else if(b < (1024*1024*1024*1024)) {
		return (b/(1024*1024*1024)).toFixed(1)+"GB";
	}
	return (b/(1024*1024*1024*1024)).toFixed(1)+"TB";
}
