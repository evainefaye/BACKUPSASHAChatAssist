$(document).ready(function () {

	chat = $.connection.myHub;
	// Functions called by the Hub

	//Temporary Function
	chat.client.getUser = function () {
		if (typeof (chat.server.userId) == 'undefined') {
			userId = prompt("Enter your ATTUID:", "");
			userId = $.trim(userId);
			if (userId == "" || userId == null) {
				chat.client.getUserRecurse();
				return;
			}
			chat.server.saveUserName(userId);
		}
	};

	chat.client.getUserRecurse = function () {
		chat.client.getUser();
	}
	//End temporary function

	chat.client.connectChat = function (userId, userName, smpSessionId) {
		chat.server.addToGroup(smpSessionId);
		chat.server.broadcastToGroup(smpSessionId, "Connected to " + userName + "(" + userName + ")");
	}

	chat.client.userNotFound = function (userId) {
		$("<div title='Alert!'>User ID '" + userId + "' is not found.</div>").dialog({
			modal: true,
			buttons: {
				Ok: function () {
					$(this).dialog("close");
				}
			}
		});
	};

	chat.client.debug = function (message) {
		console.log(message);
	}

	// Loads a list of Sasha clients from the database (used at startup and/or reconnect)
	chat.client.refreshSashaSessions = function (sashaSessionRecords) {
		$.each($.parseJSON(sashaSessionRecords), function (idx, sashaSession) {
			if (sashaSession.sessionStartTime != "") {
				connectionId = sashaSession.connectionId;
				userId = sashaSession.userId;
				userName = sashaSession.userName;
				sessionElapsedTime = sashaSession.sessionStartTime;
				sessionStartTime = sashaSession.sessionStartTime;
				sessionStartTime = new Date(sessionStartTime);
				sessionStartTime = formatLocalTime(sessionStartTime);
				if ($("table#registeredSashaSessions tr#" + connectionId).length == 0) {
					$("table#registeredSashaSessions tbody").append("<tr id='" + connectionId + "'><td class='hidden'><input type=radio name='connectionId' value='" + connectionId + "'></td><td>" + userName + "</td><td>" + userId + "</td><td class='center'>" + localTime + "</td><td class=sessionDuration><span class='session' id=timerAge_" + connectionId + "></span></td><td class='stepName milestone'> Populate on Next Action</td><td class='stepDuration lastAgentActivityTime'><span class='step' id=lastActivityTime_" + connectionId + ">Populate on Next Action</span></td></tr>");
					time = new Date(sessionElapsedTime);
					year = time.getFullYear();
					month = time.getMonth();
					day = time.getDate();
					hour = time.getHours();
					minute = time.getMinutes();
					second = time.getSeconds();
					$("#timerAge_" + connectionId).countdown('destroy');
					$("#timerAge_" + connectionId).countdown({
						since: new Date(year, month, day, hour, minute, second),
						compact: true,
						layout: '{d<} {dn} {dl} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
						format: 'yowdhMS',
						onTick: checkSessionTime
					});
					$('#registeredSashaSessions tbody tr').on('click', function () {
						$(this).find('td input:radio').prop('checked', true);
						$('.selectedRow').removeClass('selectedRow');
						$(this).addClass('selectedRow');
						$('div#interactionPanel').show();
						$('button#requestData').click();
					});
				}
				sortTable();
			}
		})
	}

	// Receive Chat Message
	chat.client.broadcastMessage = function (name, message) {
		time = getChatLocalTime();
		name = time + "  " + name;
		// Html encode display name and message. 
		var encodedName = $('<div />').text(name).html();
		var encodedMsg = $('<div />').text(message).html();
		// Add the message to the page. 
		$('#discussion').append('<li><strong>' + encodedName + '</strong>:&nbsp;&nbsp;' + encodedMsg + '</li>');
		$('div.container').scrollTop($('div.container')[0].scrollHeight - $('div.container')[0].clientHeight);
	};

	// Add Sasha Client
	chat.client.addSashaSession = function (connectionId, userId, userName, sessionStartTime) {
		if ($("table#registeredSashaSessions tr#" + connectionId).length == 0 && sessionStartTime != "") {
			localtime = formatLocalTime(sessionStartTime);
			$("table#registeredSashaSessions tbody").append("<tr id='" + connectionId + "'><td class='hidden'><input type=radio name='connectionId' value='" + connectionId + "'></td><td>" + userName + "</td><td>" + userId + "</td><td class='center'>" + localTime + "</td><td class=sessionDuration><span class='session' id=timerAge_" + connectionId + "></span></td><td class='stepName milestone'>Populate on Next Action</td><td class='stepDuration lastAgentActivityTime'><span class='step' id=lastActivityTime_" + connectionId + ">Populate on Next Action</span></td></tr>");
			time = new Date(sessionStartTime);
			year = time.getFullYear();
			month = time.getMonth();
			day = time.getDate();
			hour = time.getHours();
			minute = time.getMinutes();
			second = time.getSeconds();
			$("#timerAge_" + connectionId).countdown('destroy');
			$("#timerAge_" + connectionId).countdown({
				since: new Date(year, month, day, hour, minute, second),
				compact: true,
				layout: '{d<} {dn} {dl} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
				format: 'yowdhMS',
				onTick: checkSessionTime
			});
			sortTable();
			$('#registeredSashaSessions tbody tr').on('click', function () {
				$(this).find('td input:radio').prop('checked', true);
				$('.selectedRow').removeClass('selectedRow');
				$(this).addClass('selectedRow');
				$('div#interactionPanel').show();
				$('button#requestData').click();
			});
		}
	};

	// Remove Sasha Client
	chat.client.removeSashaSession = function (connectionId) {
		$("span#timerAge_" + connectionId).countdown("destroy");
		$("table#registeredSashaSessions tr#" + connectionId).hide();
		setTimeout(function () {
			$("table#registeredSashaSessions tr#" + connectionId).remove();
		}, 500);
	}

	// Advise Caller that the Chat request was not received due to popup blocker
	chat.client.reportPopupBlock = function () {
		chat.client.broadcastMessage("SYSTEM", "Requested chat failed to open, appears the user may have a popup blocker active");
	}

	// Receive requested SASHA Dictonary Data
	chat.client.receiveSashaData = function (smpSessionId, jsonData) {
		parseSashaData(smpSessionId, jsonData);
	};

	chat.client.updateSashaMilestone = function (connectionId, milestone) {
		$("tr#" + connectionId + " > td.milestone").html(milestone);
	}

	chat.client.updateMonitor = function (connectionId, milestone, lastAgentActivityTime) {
		$("tr#" + connectionId + " > td.milestone").html(milestone);
		time = new Date(lastAgentActivityTime);
		year = time.getFullYear();
		month = time.getMonth();
		day = time.getDate();
		hour = time.getHours();
		minute = time.getMinutes();
		second = time.getSeconds();
		$("#lastActivityTime_" + connectionId).countdown('destroy');
		$("#lastActivityTime_" + connectionId).countdown({
			since: new Date(year, month, day, hour, minute, second),
			compact: true,
			layout: '{d<} {dn} {dl} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
			format: 'yowdhMS',
			onTick: checkStepTime
		});
	}

	// Start the connection.
	$.connection.hub.start().done(function () {
		$("#message").keyup(function (event) {
			if (event.keyCode == 13) {
				$("#sendmessage").click();
			}
		});
		$('#sendmessage').click(function () {
			if ($("#message").val().trim() != "") {
				// Call the Send method on the hub. 
				chat.server.broadcastMessage($('#message').val());
				// Clear text box and reset focus for next comment. 
				$('#message').val('').focus();
			}
		});
		// Add connection to the monitor group
		chat.server.registerMonitor();
		// Get list of connected sasha clients from database;
		chat.server.refreshSashaSessionsCaller();
	});

	// Setup request data button
	$("button#requestData").off("click.requestData").on("click.requestData", function () {
		if (typeof ($("input[type=radio][name=connectionId]:checked").val()) == "undefined") {
			$("span#errorText").html("Must have a connection selected to request dictionary data from!");
			return;
		} else {
			gatherFromConnection = $("input[type=radio][name=connectionId]:checked").val();
		}
		fieldData = $("textarea#fields").val().trim();
		setupPage();
		if (fieldData.length > 0) {
			$("span#errorText").html("");
			fields = fieldData.split(",");
			chat.server.pullSashaData(gatherFromConnection, fields);
		} else {
			$("span#errorText").html("Enter at least one field value to retrieve!");
		}
	});

	// Setup Request Chat Button
	$("button#requestChat").off("click.requestChat").on("click.requestChat", function () {
		if (typeof ($("input[type=radio][name=connectionId]:checked").val()) == "undefined") {
			$("span#errorText").html("Must have a connection selected to request a chat with!");
			return;
		}
		requestChat($("input[type=radio][name=connectionId]:checked").val());
	});

	// Setup Save Dictionary Button
	$("button#saveDictionary").off("click.saveDictionary").on("click.requestChat", function () {
		if (typeof ($("input[type=radio][name=connectionId]:checked").val()) == "undefined") {
			$("span#errorText").html("Must have a connection selected to request a remote dictionary save!");
			return;
		}
		chat.server.saveDictionary($("input[type=radio][name=connectionId]:checked").val());
	});
});

$.fn.addNewRow = function (key, value) {
	$(this).find("tbody").append("<tr><td>" + key + "</td><td>" + value + "</td></tr>");
};

function requestSashaData(requestFrom) {
	fieldData = $("input#fields").val().trim();
	setupPage();
	if (fieldData.length > 0) {
		$("span#errorText").html("");
		fields = fieldData.split(",");
		chat.server.pullSashaData(requestFrom, fields);
	} else {
		$("span#errorText").html("Enter at least one value to retrieve!");
	}
}

function parseSashaData(smpSessionId, json) {
	setupPage();
	$('div#interactionPanel').show();
	parsedData = $.parseJSON(json);
	$.each(parsedData, function (key, value) {
		value = value.replace(new RegExp('\\\\n', 'g'), '<br />');
		$("table#resultsTable").addNewRow(key, value);
	});
}

function setupPage() {
	$("#resultsTable > tbody").html("");
	$("span#errorText").html("");
	d = new Date();
	time = d.toLocaleString();
	$("span#lastUpdate").html(time);
}

function requestChat(connectionId) {
	chat.server.requestChat(connectionId);
}

function sortTable() {
	var rows = $('#registeredSashaClients tbody  tr').get();
	rows.sort(function (a, b) {
		var A = $(a).children('td').eq(1).text().toUpperCase();
		var B = $(b).children('td').eq(1).text().toUpperCase();
		if (A < B) {
			return -1;
		}
		if (A > B) {
			return 1;
		}
		return 0;
	});
	$.each(rows, function (index, row) {
		$('#registeredSashaClients').children('tbody').append(row);
	});
}

// Gets the local time
getChatLocalTime = function () {
	var d = new Date();
	var time = ("00" + d.getHours()).substr(-2) + ":" + ("00" + d.getMinutes()).substr(-2) + ":" + ("00" + d.getSeconds()).substr(-2);
	var time = "[ " + time + " ]";
	return time;
};

// Formats UTC as Local time
formatLocalTime = function (UTCTime) {
	local = new Date(UTCTime)
	localTime = ("00" + local.getHours()).substr(-2) + ":" + ("00" + local.getMinutes()).substr(-2) + ":" + ("00" + local.getSeconds()).substr(-2);
	return localTime;
}

// Formats UTC as local date
formatLocalDate = function (UTCTime) {
	local = new Date(UTCTime)
	localDate = ("00" + local.getMonth()).substr(-2) + "/" + ("00" + local.getDate()).substr(-2) + "/" + local.getFullYear();
	return localDate;
}

function checkSessionTime(periods) {
	if ($.countdown.periodsToSeconds(periods) >= 600) {
		$(this).closest("span").addClass('attention');
	} else {
		$(this).closest("spsn").removeClass('attention');
	}
}

function checkStepTime(periods) {
	if ($.countdown.periodsToSeconds(periods) >= 300) {
		$(this).closest("span").addClass('attention');
	} else {
		$(this).closest("span").removeClass('attention');
	}
}